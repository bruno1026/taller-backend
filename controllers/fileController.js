import fs from "fs";
import path from "path";
import mongoose from "mongoose";
import { ZipArchive } from "archiver";
import Note from "../models/Note.js";
import Workshop from "../models/Workshop.js";
import { generateNotePDF } from "./noteController.js";
import { sendTelegramMessage } from "../services/telegramService.js";

export const MESES_ES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"
];

const getPdfRootDir = () => path.join(process.cwd(), "storage", "pdfs");

const formatBytes = (bytes) => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
};

// Validar que la ruta solicitada no escape de storage/pdfs
const resolverRutaSegura = (rutaRelativa) => {
  if (!rutaRelativa) return null;
  const rootDir = path.resolve(getPdfRootDir());
  const clean = rutaRelativa.replace(/^\/+/, "");
  const resolved = path.resolve(rootDir, clean);

  if (!resolved.startsWith(rootDir)) {
    return null;
  }
  return resolved;
};

// Migración automática de PDFs sueltos a carpetas año/mes
export const organizarPdfsSueltos = async () => {
  try {
    const rootDir = getPdfRootDir();
    if (!fs.existsSync(rootDir)) return;

    const items = fs.readdirSync(rootDir);
    let migrados = 0;

    for (const item of items) {
      const itemPath = path.join(rootDir, item);
      const stat = fs.statSync(itemPath);

      if (stat.isFile() && item.endsWith(".pdf") && item.startsWith("nota_")) {
        const match = item.match(/^nota_([a-f0-9]{24})\.pdf$/i);
        let year = stat.mtime.getFullYear().toString();
        let monthName = MESES_ES[stat.mtime.getMonth()];
        let notaId = null;

        if (match && mongoose.connection?.readyState === 1) {
          notaId = match[1];
          try {
            const nota = await Note.findById(notaId);
            if (nota) {
              const d = nota.fecha || nota.createdAt || stat.mtime;
              const dateObj = new Date(d);
              if (!isNaN(dateObj.getTime())) {
                year = dateObj.getFullYear().toString();
                monthName = MESES_ES[dateObj.getMonth()];
              }
            }
          } catch (e) {
            // usar fecha del archivo
          }
        }

        const targetDir = path.join(rootDir, year, monthName);
        if (!fs.existsSync(targetDir)) {
          fs.mkdirSync(targetDir, { recursive: true });
        }

        const targetPath = path.join(targetDir, item);
        fs.renameSync(itemPath, targetPath);

        const newRelative = `/storage/pdfs/${year}/${monthName}/${item}`;
        if (notaId && mongoose.connection?.readyState === 1) {
          try {
            await Note.findByIdAndUpdate(notaId, { pdfPath: newRelative });
          } catch (e) {
            // ignorar
          }
        }

        migrados++;
      }
    }

    if (migrados > 0) {
      console.log(`[MIGRATION] Se organizaron ${migrados} notas PDF en estructura de año/mes.`);
    }
  } catch (error) {
    console.warn("[WARN] Error al organizar PDFs sueltos:", error.message);
  }
};

// Obtener estructura en árbol de años, meses y archivos
export const getFileTree = async (req, res) => {
  try {
    const rootDir = getPdfRootDir();
    if (!fs.existsSync(rootDir)) {
      fs.mkdirSync(rootDir, { recursive: true });
    }

    // Organizar archivos sueltos antes de leer el árbol
    await organizarPdfsSueltos();

    const rootEntries = fs.readdirSync(rootDir, { withFileTypes: true });
    const yearDirs = rootEntries
      .filter(e => e.isDirectory() && /^\d{4}$/.test(e.name))
      .map(e => e.name)
      .sort((a, b) => Number(b) - Number(a));

    let totalArchivos = 0;
    let totalBytes = 0;
    const yearsData = [];

    // Colección de todos los noteIds encontrados para enriquecer datos en un solo query
    const allNoteIds = [];
    const filesToEnrich = [];

    for (const year of yearDirs) {
      const yearPath = path.join(rootDir, year);
      const monthEntries = fs.readdirSync(yearPath, { withFileTypes: true });

      // Ordenar meses cronológicamente (más recientes primero)
      const monthDirs = monthEntries
        .filter(e => e.isDirectory() && MESES_ES.includes(e.name.toLowerCase()))
        .map(e => e.name.toLowerCase())
        .sort((a, b) => MESES_ES.indexOf(b) - MESES_ES.indexOf(a));

      let yearBytes = 0;
      let yearFilesCount = 0;
      const monthsData = [];

      for (const month of monthDirs) {
        const monthPath = path.join(yearPath, month);
        const fileEntries = fs.readdirSync(monthPath, { withFileTypes: true });

        const pdfFiles = fileEntries.filter(f => f.isFile() && f.name.toLowerCase().endsWith(".pdf"));
        let monthBytes = 0;
        const filesList = [];

        for (const f of pdfFiles) {
          const filePath = path.join(monthPath, f.name);
          const stat = fs.statSync(filePath);
          monthBytes += stat.size;

          const match = f.name.match(/^nota_([a-f0-9]{24})\.pdf$/i);
          const noteId = match ? match[1] : null;
          if (noteId) {
            allNoteIds.push(noteId);
          }

          const fileInfo = {
            filename: f.name,
            relativePath: `${year}/${month}/${f.name}`,
            url: `/storage/pdfs/${year}/${month}/${f.name}`,
            sizeBytes: stat.size,
            sizeFormatted: formatBytes(stat.size),
            modifiedAt: stat.mtime.toISOString(),
            createdAt: stat.birthtime ? stat.birthtime.toISOString() : stat.mtime.toISOString(),
            noteId,
            cliente: null,
            vehiculo: null,
            placas: null,
            taller: null,
            total: null,
          };

          filesList.push(fileInfo);
          filesToEnrich.push(fileInfo);
        }

        filesList.sort((a, b) => new Date(b.modifiedAt) - new Date(a.modifiedAt));

        yearBytes += monthBytes;
        yearFilesCount += filesList.length;

        monthsData.push({
          month,
          mesLabel: month.charAt(0).toUpperCase() + month.slice(1),
          fileCount: filesList.length,
          sizeBytes: monthBytes,
          sizeFormatted: formatBytes(monthBytes),
          files: filesList,
        });
      }

      totalBytes += yearBytes;
      totalArchivos += yearFilesCount;

      yearsData.push({
        year,
        fileCount: yearFilesCount,
        sizeBytes: yearBytes,
        sizeFormatted: formatBytes(yearBytes),
        months: monthsData,
      });
    }

    // Enriquecer archivos con datos de MongoDB
    if (allNoteIds.length > 0) {
      try {
        const notas = await Note.find({ _id: { $in: allNoteIds } })
          .select("cliente taller total createdAt fecha")
          .lean();

        const notaMap = new Map();
        for (const n of notas) {
          notaMap.set(n._id.toString(), n);
        }

        for (const file of filesToEnrich) {
          if (file.noteId && notaMap.has(file.noteId)) {
            const nota = notaMap.get(file.noteId);
            file.cliente = nota.cliente?.nombre || "Sin nombre";
            file.vehiculo = nota.cliente?.vehiculo || "";
            file.modelo = nota.cliente?.modelo || "";
            file.placas = nota.cliente?.placas || "";
            file.taller = nota.taller || "";
            file.total = nota.total || 0;
            file.servicio = nota.cliente?.servicio || "";
          }
        }
      } catch (err) {
        console.warn("[WARN] No se pudieron asociar notas en MongoDB:", err.message);
      }
    }

    res.json({
      ok: true,
      totalArchivos,
      totalBytes,
      totalFormatted: formatBytes(totalBytes),
      years: yearsData,
    });
  } catch (error) {
    console.error("Error en getFileTree:", error);
    res.status(500).json({ ok: false, msg: "Error al leer gestor de archivos", error: error.message });
  }
};

// Ver archivo en navegador (inline)
export const viewFile = async (req, res) => {
  try {
    let fullPath = resolverRutaSegura(req.query.path);

    // Si el archivo no existe en disco, verificar si corresponde a una nota registrada y regenerarlo
    if (!fullPath || !fs.existsSync(fullPath)) {
      const match = (req.query.path || "").match(/nota_([a-f0-9]{24})\.pdf$/i);
      if (match) {
        const noteId = match[1];
        const nota = await Note.findById(noteId);
        if (nota) {
          const workshop = await Workshop.findOne({ nombre: nota.taller });
          const genResult = await generateNotePDF(nota, workshop);
          fullPath = genResult.fullPath;
        }
      }
    }

    if (!fullPath || !fs.existsSync(fullPath)) {
      return res.status(404).json({ ok: false, msg: "Archivo no encontrado" });
    }

    const filename = path.basename(fullPath);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${filename}"`);

    const fileStream = fs.createReadStream(fullPath);
    fileStream.pipe(res);
  } catch (error) {
    console.error("Error en viewFile:", error);
    res.status(500).json({ ok: false, msg: "Error al visualizar el archivo", error: error.message });
  }
};

// Descargar archivo (attachment)
export const downloadFile = async (req, res) => {
  try {
    let fullPath = resolverRutaSegura(req.query.path);

    // Si el archivo no existe en disco, verificar si corresponde a una nota registrada y regenerarlo
    if (!fullPath || !fs.existsSync(fullPath)) {
      const match = (req.query.path || "").match(/nota_([a-f0-9]{24})\.pdf$/i);
      if (match) {
        const noteId = match[1];
        const nota = await Note.findById(noteId);
        if (nota) {
          const workshop = await Workshop.findOne({ nombre: nota.taller });
          const genResult = await generateNotePDF(nota, workshop);
          fullPath = genResult.fullPath;
        }
      }
    }

    if (!fullPath || !fs.existsSync(fullPath)) {
      return res.status(404).json({ ok: false, msg: "Archivo no encontrado" });
    }

    const filename = path.basename(fullPath);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`
    );

    const fileStream = fs.createReadStream(fullPath);
    fileStream.pipe(res);
  } catch (error) {
    console.error("Error en downloadFile:", error);
    res.status(500).json({ ok: false, msg: "Error al descargar el archivo", error: error.message });
  }
};

// Eliminar archivo de almacenamiento
export const deleteFile = async (req, res) => {
  try {
    const targetPath = req.query.path || req.body.path;
    const fullPath = resolverRutaSegura(targetPath);

    if (!fullPath || !fs.existsSync(fullPath)) {
      return res.status(404).json({ ok: false, msg: "Archivo no encontrado en el servidor" });
    }

    const filename = path.basename(fullPath);
    fs.unlinkSync(fullPath);

    // Si coincide con una nota en MongoDB, limpiar el pdfPath
    const match = filename.match(/^nota_([a-f0-9]{24})\.pdf$/i);
    if (match) {
      await Note.findByIdAndUpdate(match[1], { pdfPath: null });
    }

    // Limpiar carpeta de mes si quedó vacía
    const dirMonth = path.dirname(fullPath);
    try {
      const remainingInMonth = fs.readdirSync(dirMonth);
      if (remainingInMonth.length === 0) {
        fs.rmdirSync(dirMonth);
        const dirYear = path.dirname(dirMonth);
        const remainingInYear = fs.readdirSync(dirYear);
        if (remainingInYear.length === 0) {
          fs.rmdirSync(dirYear);
        }
      }
    } catch (e) {
      // Ignorar si no se pudo eliminar la carpeta
    }

    res.json({ ok: true, msg: `Archivo ${filename} eliminado correctamente` });
  } catch (error) {
    console.error("Error en deleteFile:", error);
    res.status(500).json({ ok: false, msg: "Error al eliminar el archivo", error: error.message });
  }
};

// Descargar respaldo completo en formato ZIP (PDFs estructurados + JSON de Mongo)
export const downloadBackupZip = async (req, res) => {
  try {
    const rootDir = getPdfRootDir();
    if (!fs.existsSync(rootDir)) {
      fs.mkdirSync(rootDir, { recursive: true });
    }

    // 1. Organizar archivos sueltos
    await organizarPdfsSueltos();

    // 2. Verificar que todas las notas en Mongo tengan su archivo PDF generado en disco
    try {
      const notasEnBD = await Note.find({}).lean();
      for (const nota of notasEnBD) {
        let pdfExiste = false;
        if (nota.pdfPath) {
          const full = resolverRutaSegura(nota.pdfPath);
          if (full && fs.existsSync(full)) {
            pdfExiste = true;
          }
        }

        if (!pdfExiste) {
          try {
            const workshop = await Workshop.findOne({ nombre: nota.taller });
            await generateNotePDF(nota, workshop);
          } catch (genErr) {
            console.warn(`[ZIP] No se pudo regenerar PDF para nota ${nota._id}:`, genErr.message);
          }
        }
      }
      // Re-organizar por si la regeneración creó archivos sueltos
      await organizarPdfsSueltos();
    } catch (dbErr) {
      console.warn("[ZIP] Error al verificar PDFs en base de datos:", dbErr.message);
    }

    // 3. Configurar respuesta de descarga ZIP
    const fechaStr = new Date().toISOString().slice(0, 10);
    const zipFilename = `respaldo_notas_${fechaStr}.zip`;

    res.setHeader("Content-Type", "application/zip");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${zipFilename}"; filename*=UTF-8''${encodeURIComponent(zipFilename)}`
    );

    const archive = new ZipArchive({
      zlib: { level: 9 },
    });

    archive.on("error", (err) => {
      console.error("[ZIP] Error en archiver:", err);
      if (!res.headersSent) {
        res.status(500).json({ ok: false, msg: "Error al compilar el archivo ZIP", error: err.message });
      }
    });

    archive.pipe(res);

    // 4. Agregar carpetas de PDFs conservando la estructura año/mes
    if (fs.existsSync(rootDir)) {
      const carpetas = fs.readdirSync(rootDir, { withFileTypes: true });
      for (const entry of carpetas) {
        const fullEntryPath = path.join(rootDir, entry.name);
        if (entry.isDirectory()) {
          archive.directory(fullEntryPath, entry.name);
        } else if (entry.isFile() && entry.name.endsWith(".pdf")) {
          archive.file(fullEntryPath, { name: entry.name });
        }
      }
    }

    // 5. Agregar exportación completa de MongoDB en formato JSON
    try {
      const todasLasNotas = await Note.find({}).lean();
      const backupPayload = {
        meta: {
          sistema: "Servicio Renault - Taller Notas",
          tipo: "Respaldo Completo de Base de Datos y Documentos",
          fechaGeneracion: new Date().toISOString(),
          totalNotas: todasLasNotas.length,
          usuarioSolicitante: {
            id: req.usuario?.id,
            nombre: req.usuario?.nombre,
            correo: req.usuario?.correo,
            rol: req.usuario?.rol,
          },
        },
        notas: todasLasNotas,
      };

      archive.append(JSON.stringify(backupPayload, null, 2), {
        name: "respaldo_datos_mongo.json",
      });

      const readmeContent = `RESPALDO DE NOTAS DE SERVICIO RENAULT\n` +
        `Fecha de emision: ${new Date().toLocaleString("es-MX", { timeZone: "America/Mexico_City" })}\n` +
        `Total de notas registradas: ${todasLasNotas.length}\n` +
        `Generado por: ${req.usuario?.nombre || "Usuario"} (${req.usuario?.rol || "admin"})\n\n` +
        `Contenido del archivo ZIP:\n` +
        `- Carpetas por Anio/Mes conteniendo todos los archivos PDF oficiales.\n` +
        `- respaldo_datos_mongo.json: Archivo estructurado con todos los registros completos de la base de datos MongoDB.\n`;

      archive.append(readmeContent, { name: "LEEME_RESPALDO.txt" });
    } catch (errJson) {
      console.warn("[ZIP] No se pudo adjuntar respaldo JSON:", errJson.message);
    }

    await archive.finalize();
  } catch (error) {
    console.error("[ZIP] Error general al generar respaldo ZIP:", error);
    if (!res.headersSent) {
      res.status(500).json({ ok: false, msg: "Error al generar el respaldo ZIP", error: error.message });
    }
  }
};

// Purga total de notas de MongoDB y archivos PDF de storage/pdfs
export const purgeAllNotesAndFiles = async (req, res) => {
  try {
    if (req.usuario?.rol !== "superadmin") {
      return res.status(403).json({
        ok: false,
        msg: "Acceso denegado. Solo el Superadministrador puede purgar la base de datos y archivos.",
      });
    }

    // 1. Contar y eliminar notas de MongoDB
    const notasAntes = await Note.countDocuments();
    const deleteResult = await Note.deleteMany({});
    const notasEliminadas = deleteResult.deletedCount ?? notasAntes;

    // 2. Eliminar recursivamente el contenido de storage/pdfs
    const rootDir = getPdfRootDir();
    let archivosEliminados = 0;

    if (fs.existsSync(rootDir)) {
      const limpiarDirectorio = (dirPath) => {
        const entries = fs.readdirSync(dirPath, { withFileTypes: true });
        for (const entry of entries) {
          const entryPath = path.join(dirPath, entry.name);
          if (entry.isDirectory()) {
            limpiarDirectorio(entryPath);
            try {
              fs.rmdirSync(entryPath);
            } catch (e) {
              fs.rmSync(entryPath, { recursive: true, force: true });
            }
          } else {
            try {
              fs.unlinkSync(entryPath);
              archivosEliminados++;
            } catch (e) {
              // continuar
            }
          }
        }
      };

      limpiarDirectorio(rootDir);
    } else {
      fs.mkdirSync(rootDir, { recursive: true });
    }

    // 3. Notificar a Telegram si está activo
    try {
      await sendTelegramMessage(
        `[SISTEMA - PURGA GENERAL]\n\n` +
        `El Superadministrador ${req.usuario?.nombre} (${req.usuario?.correo}) ha ejecutado una purga completa del sistema.\n` +
        `- Notas eliminadas en BD: ${notasEliminadas}\n` +
        `- Archivos PDF eliminados: ${archivosEliminados}\n` +
        `- Fecha y hora: ${new Date().toLocaleString("es-MX", { timeZone: "America/Mexico_City" })}`
      );
    } catch (telErr) {
      console.warn("[TELEGRAM] No se pudo notificar la purga a Telegram:", telErr.message);
    }

    return res.json({
      ok: true,
      msg: `Purga completada exitosamente. Se eliminaron ${notasEliminadas} notas de la base de datos y ${archivosEliminados} archivos PDF.`,
      notasEliminadas,
      archivosEliminados,
    });
  } catch (error) {
    console.error("[PURGE] Error al realizar la purga general:", error);
    return res.status(500).json({
      ok: false,
      msg: "Error al realizar la purga del sistema",
      error: error.message,
    });
  }
};
