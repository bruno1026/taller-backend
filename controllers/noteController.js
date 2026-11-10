import Note from "../models/Note.js";
import Workshop from "../models/Workshop.js";
import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Rutas a fuentes y recursos
const fontPath = path.join(__dirname, "..", "src", "fonts", "eras-itc-bold.ttf");
const fontTrebuche = path.join(__dirname, "..", "src", "fonts", "Trebuchet-MS-Italic.ttf");
const siluetaPath = path.join(__dirname, "..", "storage", "logos", "silueta.png");

// Función auxiliar para colores en PDF
function getColorDañoPDF(tipo) {
  const colores = {
    rayon: "#ef4444", // rojo
    aboyadura: "#f59e0b", // amarillo
    golpe: "#6003FC", // morado
    rotura: "#7c2d12", // marrón
    otro: "#6b7280" // gris
  };
  return colores[tipo] || colores.otro;
}

// Función auxiliar para labels en PDF
function getLabelDañoPDF(tipo) {
  const labels = {
    rayon: 'Rayón',
    aboyadura: 'Aboyadura', 
    golpe: 'Golpe',
    rotura: 'Rotura',
    otro: 'Otro'
  };
  return labels[tipo] || labels.otro;
}

// === Generador reutilizable de PDF ===
export const generateNotePDF = (nota, workshop) => {
  return new Promise((resolve, reject) => {
    try {
      const pdfDir = path.join(process.cwd(), "storage", "pdfs");
      if (!fs.existsSync(pdfDir)) fs.mkdirSync(pdfDir, { recursive: true });

      const filename = `nota_${nota._id}.pdf`;
      const pdfFullPath = path.join(pdfDir, filename);
      const relativePath = `/storage/pdfs/${filename}`;

      const doc = new PDFDocument({ margin: 40 });
      const stream = fs.createWriteStream(pdfFullPath);

      doc.pipe(stream);

      // Registrar fuentes con fallback seguro
      let boldFont = "Helvetica-Bold";
      let italicFont = "Helvetica-Oblique";

      if (fs.existsSync(fontPath)) {
        try {
          doc.registerFont("ErasBold", fontPath);
          boldFont = "ErasBold";
        } catch (e) {
          console.warn("⚠️ No se pudo cargar ErasBold:", e.message);
        }
      }

      if (fs.existsSync(fontTrebuche)) {
        try {
          doc.registerFont("Trebuchet", fontTrebuche);
          italicFont = "Trebuchet";
        } catch (e) {
          console.warn("⚠️ No se pudo cargar Trebuchet:", e.message);
        }
      }

      const taller = nota.taller || "Talisman";
      const tallerUpper = taller.toUpperCase();
      const colorTaller = tallerUpper.includes("LUTECIA") ? "#0066CC" : "#FBC02D";
      const palette = {
        primary: colorTaller,
        dark: "#111827",
        muted: "#6B7280",
        border: "#D1D5DB",
        light: "#F9FAFB",
        white: "#FFFFFF",
      };

      const romboPath = "M52.3 43l-23 43H23L0 43 22.9 0h6.5L6.5 43l19.6 36.9L45.7 43 34.3 21.5l3.3-6.1L52.3 43zM42.5 0h-6.6L13.1 43l14.7 27.6 3.2-6.1L19.6 43 39.2 6l19.6 37-22.9 43h6.6l22.8-43L42.5 0z";

      const defaultDireccion = tallerUpper.includes("LUTECIA")
        ? "Av. Carlos Hank Gonzales Mz176 Lt.15 Fracc. Rio de luz C.P 55100"
        : "Avenida Talismán 3603, Gustavo A. Madero, CDMX";
      const defaultTelefono = tallerUpper.includes("LUTECIA") ? "5563490611" : "5522433546";

      const direccion = workshop?.direccion || defaultDireccion;
      const telefono = workshop?.telefono || defaultTelefono;

      const drawHeader = (subtitle) => {
        doc.save();
        doc.fillColor(palette.primary).rect(0, 0, doc.page.width, 10).fill();
        doc.restore();

        doc.font(boldFont).fontSize(24).fillColor(palette.dark).text(`SERVICIO RENAULT ${tallerUpper}`, 40, 28, {
          width: doc.page.width - 160,
          align: "left",
        });

        doc.font("Helvetica-Bold").fontSize(9).fillColor(palette.muted).text(subtitle, 40, 57);

        const logoBoxX = doc.page.width - 98;
        const logoBoxY = 22;
        doc.save();
        doc.fillColor(palette.dark);
        doc.translate(logoBoxX + 12, logoBoxY + 8);
        doc.scale(0.6);
        doc.path(romboPath).fill();
        doc.restore();

        doc.font("Helvetica").fontSize(9).fillColor(palette.muted);
        doc.text(direccion, 40, 75, { width: doc.page.width - 160 });
        doc.text(`Tel: ${telefono}`, 40, 88, { width: doc.page.width - 160 });

        const notaIdStr = nota._id ? nota._id.toString().slice(-6) : "000000";
        const fechaNota = nota.fecha || nota.createdAt || new Date();
        doc.text(`No. Cliente: ${notaIdStr}`, 40, 101, { width: doc.page.width - 160, align: "left" });
        doc.text(`Fecha: ${new Date(fechaNota).toLocaleDateString("es-MX")}`, 40, 114, { width: doc.page.width - 160, align: "left" });

        doc.moveTo(40, 130).lineTo(doc.page.width - 40, 130).lineWidth(1).strokeColor(palette.border).stroke();
        doc.y = 146;
      };

      const drawFooter = () => {
        const footerY = doc.page.height - 10;
        doc.save();
        doc.fillColor(palette.primary).opacity(1.0).rect(0, footerY, doc.page.width, 10).fill();
        doc.restore();
      };

      // ===============================
      //  PÁGINA 1: NOTA DE SERVICIO
      // ===============================
      drawHeader("NOTA DE SERVICIO");

      // Barra visual de sección
      doc.save();
      doc.roundedRect(40, doc.y, doc.page.width - 80, 24, 6).fillAndStroke(palette.light, palette.border);
      doc.restore();
      doc.font("Helvetica-Bold").fontSize(11).fillColor(palette.dark).text("DATOS DEL CLIENTE", 52, doc.y + 8);
      doc.moveDown(2);

      // INFORMACIÓN DEL CLIENTE
      const infoY = doc.y;
      const col1X = 40;
      const cliente = nota.cliente || {};

      doc.font("Helvetica-Bold").fontSize(10).fillColor(palette.dark);
      doc.text(`Cliente: ${cliente.nombre || "N/A"}`, col1X, infoY);
      doc.text(`Vehículo: ${cliente.vehiculo || "N/A"}`, col1X, infoY + 15);
      doc.text(`Modelo: ${cliente.modelo || "N/A"}`, col1X, infoY + 30);
      doc.text(`Placas: ${cliente.placas || "N/A"}`, col1X, infoY + 45);
      doc.text(`Kilometraje: ${cliente.kilometraje || "N/A"}`, col1X, infoY + 60);
      doc.text(`Servicio: ${cliente.servicio || "N/A"}`, col1X, infoY + 75);

      doc.y = infoY + 98;

      if (nota.observaciones) {
        doc.moveDown(1);
        doc.font("Helvetica-Bold").fontSize(9).fillColor(palette.dark).text("Observaciones:", 40, doc.y, {
          align: "left",
          width: doc.page.width - 80,
        });
        doc.font("Helvetica").fontSize(9).fillColor(palette.dark).text(nota.observaciones, 40, doc.y + 2, {
          align: "left",
          width: doc.page.width - 80,
        });
        doc.moveDown(0.2);
      }

      if (nota.garantia) {
        const garantiaY = doc.y + 6;
        doc.save();
        doc.roundedRect(40, garantiaY, doc.page.width - 80, 26, 6).fillAndStroke("#FFF7CC", "#FBC02D");
        doc.restore();

        doc.font("Helvetica-Bold").fontSize(10).fillColor("#7A4B00")
          .text(`GARANTÍA: ${nota.garantia || "—"}`, 50, garantiaY + 8, {
            width: doc.page.width - 100,
            align: "left",
          });

        doc.y = garantiaY + 34;
      }

      // TABLA DE DETALLE DE SERVICIOS
      doc.moveDown(1);
      const detalleServicioTitleY = doc.y;
      doc.font("Helvetica-Bold")
        .fontSize(11)
        .fillColor(palette.dark)
        .text("DETALLE DE SERVICIO", 0, detalleServicioTitleY, {
          align: "center",
          width: doc.page.width,
          underline: false,
        });

      doc.moveDown(0.4);

      const pageWidth = doc.page.width;
      const margin = 25;
      const usableWidth = pageWidth - margin * 2;
      const rowHeight = 22;
      const tableTop = doc.y + 12;

      const colCantidad = margin;
      const colDescripcion = margin + 110;
      const colPrecio = pageWidth - margin - 100;

      // Encabezado tabla con fondo NEGRO y texto BLANCO
      doc.rect(margin, tableTop, usableWidth, rowHeight).fill(palette.dark);
      doc.fillColor("#FFFFFF")
        .font("Helvetica-Bold")
        .fontSize(10)
        .text("CANTIDAD", colCantidad + 10, tableTop + 7)
        .text("DESCRIPCIÓN", colDescripcion + 10, tableTop + 7)
        .text("PRECIO", colPrecio, tableTop + 7, { width: 120, align: "center" });

      doc.strokeColor("#000")
        .rect(margin, tableTop, usableWidth, rowHeight)
        .stroke();

      let y = tableTop + rowHeight;
      doc.font("Helvetica").fontSize(9);

      const items = nota.items || [];
      items.forEach((item) => {
        const isOdd = (Math.round((y - tableTop) / rowHeight) % 2) === 1;
        doc.rect(margin, y, usableWidth, rowHeight).fill(isOdd ? "#FFFFFF" : palette.light);

        doc.fillColor(palette.dark);
        doc.text(item.cantidad, colCantidad + 10, y + 7);
        doc.text(item.descripcion, colDescripcion + 10, y + 7, { width: 270 });
        doc.text(`$${Number(item.precio || 0).toFixed(2)}`, colPrecio, y + 7, {
          width: 120,
          align: "center",
        });

        doc.strokeColor("#000")
          .rect(margin, y, usableWidth, rowHeight)
          .stroke();
        y += rowHeight;
      });

      const totalNum = typeof nota.total === "number" && !isNaN(nota.total)
        ? nota.total
        : items.reduce((acc, item) => acc + (Number(item.cantidad) || 1) * (Number(item.precio) || 0), 0);

      // Total con color del taller y texto resaltado
      doc.rect(margin, y, usableWidth, rowHeight).fill(colorTaller);

      doc.fillColor(tallerUpper.includes("LUTECIA") ? "#FFFFFF" : "#000000")
        .font("Helvetica-Bold")
        .fontSize(11)
        .text("TOTAL:", margin, y + 7, {
          align: "right",
          width: usableWidth - 140,
        });

      doc.text(`$${totalNum.toFixed(2)}`, margin + usableWidth - 120, y + 7, {
        width: 120,
        align: "center",
      });

      doc.strokeColor("#000")
        .rect(margin, y, usableWidth, rowHeight)
        .stroke();

      drawFooter();

      // ===============================
      //  PÁGINA 2: INSPECCIÓN VISUAL (SI HAY DAÑOS)
      // ===============================
      const daños = nota.daños || [];
      if (daños.length > 0) {
        doc.addPage();
        drawHeader("INSPECCIÓN VISUAL");

        const diagramaTitleY = doc.y;
        doc.font("Helvetica-Bold").fontSize(14).fillColor(palette.dark).text("DIAGRAMA DE DAÑOS", 0, diagramaTitleY, {
          align: "center",
          width: doc.page.width,
          underline: false,
        });
        doc.moveDown(0.5);

        if (fs.existsSync(siluetaPath)) {
          try {
            const imageAsset = doc.openImage(siluetaPath);
            const imageWidth = 320;
            const imageHeight = Math.round((imageAsset.height / imageAsset.width) * imageWidth);
            const imageX = (doc.page.width - imageWidth) / 2;
            const imageY = doc.y + 10;

            doc.image(siluetaPath, imageX, imageY, { width: imageWidth });

            daños.forEach((daño, index) => {
              const circleX = imageX + (daño.x / 100) * imageWidth;
              const circleY = imageY + (daño.y / 100) * imageHeight;
              const color = getColorDañoPDF(daño.tipo);

              doc.save();
              doc.fillColor(color)
                .strokeColor("#000")
                .lineWidth(1)
                .circle(circleX, circleY, 8)
                .fill()
                .stroke();

              doc.fillColor("#FFF")
                .font("Helvetica-Bold")
                .fontSize(8)
                .text((index + 1).toString(), circleX - 3, circleY - 4);
              doc.restore();
            });

            doc.y = imageY + imageHeight + 20;
          } catch (error) {
            console.error("❌ Error al cargar la imagen de silueta:", error);
            doc.font("Helvetica").fontSize(10).text("No se pudo cargar el diagrama del vehículo", { align: "center" });
            doc.moveDown();
          }
        }

        const detalleDanosTitleY = doc.y;
        doc.font("Helvetica-Bold").fontSize(14).fillColor(palette.dark).text("DETALLE DE DAÑOS IDENTIFICADOS", 0, detalleDanosTitleY, {
          align: "center",
          width: doc.page.width,
          underline: false,
        });
        doc.moveDown(0.4);

        const damageTableX = 40;
        const damageTableWidth = doc.page.width - 80;
        const damageRowHeight = 20;
        let damageY = doc.y;

        doc.rect(damageTableX, damageY, damageTableWidth, damageRowHeight).fill(palette.dark);
        doc.fillColor("#FFFFFF").font("Helvetica-Bold").fontSize(10);
        doc.text("#", damageTableX + 8, damageY + 6, { width: 20, align: "left" });
        doc.text("TIPO", damageTableX + 35, damageY + 6, { width: 110, align: "left" });
        doc.text("DESCRIPCIÓN", damageTableX + 150, damageY + 6, { width: damageTableWidth - 160, align: "left" });
        doc.strokeColor("#000").rect(damageTableX, damageY, damageTableWidth, damageRowHeight).stroke();
        damageY += damageRowHeight;

        daños.forEach((daño, index) => {
          const tipoLabel = getLabelDañoPDF(daño.tipo);
          const color = getColorDañoPDF(daño.tipo);
          const zebra = index % 2 === 0 ? "#FFFFFF" : palette.light;

          doc.rect(damageTableX, damageY, damageTableWidth, damageRowHeight).fill(zebra);
          doc.strokeColor("#000").rect(damageTableX, damageY, damageTableWidth, damageRowHeight).stroke();

          doc.fillColor(palette.dark).font("Helvetica-Bold").fontSize(9);
          doc.text(String(index + 1), damageTableX + 8, damageY + 6, { width: 20, align: "left" });

          doc.save();
          doc.fillColor(color).circle(damageTableX + 35, damageY + 10, 3).fill();
          doc.restore();

          doc.fillColor(palette.dark).font("Helvetica-Bold").fontSize(9)
            .text(tipoLabel, damageTableX + 45, damageY + 6, { width: 100, align: "left" });

          doc.fillColor(palette.dark).font("Helvetica").fontSize(9)
            .text(daño.descripcion || "Sin descripción", damageTableX + 150, damageY + 6, {
              width: damageTableWidth - 160,
              align: "left",
            });

          damageY += damageRowHeight;
        });

        drawFooter();
      }

      doc.end();

      stream.on("finish", () => {
        resolve({ relativePath, fullPath: pdfFullPath });
      });
      stream.on("error", reject);

    } catch (err) {
      reject(err);
    }
  });
};

// === Crear una nueva nota y su PDF ===
export const createNote = async (req, res) => {
  try {
    const { taller, cliente, items, observaciones, garantia, daños = [] } = req.body;

    if (!taller || !cliente || !items || items.length === 0) {
      return res.status(400).json({ ok: false, msg: "Faltan datos requeridos" });
    }

    const workshop = await Workshop.findOne({ nombre: taller });
    const total = typeof req.body.total === "number" && !isNaN(req.body.total)
      ? Number(req.body.total)
      : items.reduce((acc, item) => acc + (Number(item.cantidad) || 1) * (Number(item.precio) || 0), 0);

    const nuevaNota = new Note({
      taller,
      cliente,
      items,
      observaciones,
      garantia,
      total,
      daños
    });

    await nuevaNota.save();

    // Generar PDF usando la función modular
    const pdfResult = await generateNotePDF(nuevaNota, workshop);
    nuevaNota.pdfPath = pdfResult.relativePath;
    await nuevaNota.save();

    console.log(`✅ PDF generado: ${nuevaNota.pdfPath} | Nota: ${nuevaNota._id}`);

    res.status(201).json({
      ok: true,
      msg: "Nota creada con éxito",
      nota: nuevaNota,
      pdf: nuevaNota.pdfPath,
    });

  } catch (error) {
    console.error("❌ Error en createNote:", error);
    res.status(500).json({ ok: false, msg: "Error al crear la nota", error: error.message });
  }
};

// === Eliminar una nota ===
export const deleteNote = async (req, res) => {
  try {
    const { id } = req.params;

    const nota = await Note.findById(id);
    if (!nota) {
      return res.status(404).json({ ok: false, msg: "Nota no encontrada" });
    }

    // Eliminar PDF físico si existe
    if (nota.pdfPath) {
      const cleanRelative = nota.pdfPath.replace(/^\/+/, "");
      const fullPdfPath = path.join(process.cwd(), cleanRelative);

      if (fs.existsSync(fullPdfPath)) {
        try {
          fs.unlinkSync(fullPdfPath);
        } catch (e) {
          console.warn("No se pudo eliminar el archivo físico:", e.message);
        }
      }
    }

    await Note.findByIdAndDelete(id);
    res.json({ ok: true, msg: "Nota eliminada correctamente" });

  } catch (error) {
    console.error("❌ Error en deleteNote:", error);
    res.status(500).json({ ok: false, msg: "Error al eliminar la nota", error: error.message });
  }
};

// === Obtener todas las notas ===
export const getNotes = async (req, res) => {
  try {
    const notes = await Note.find().sort({ createdAt: -1 });
    res.json(notes); 
  } catch (error) {
    console.error("❌ Error en getNotes:", error);
    res.status(500).json({ ok: false, msg: "Error al obtener notas", error: error.message });
  }
};

// === Descargar PDF de una nota (con auto-regeneración si falta en disco) ===
export const descargarPDF = async (req, res) => {
  try {
    const { id } = req.params;
    
    const nota = await Note.findById(id);
    if (!nota) {
      return res.status(404).json({ ok: false, msg: "Nota no encontrada" });
    }

    const pdfDir = path.join(process.cwd(), "storage", "pdfs");
    const expectedFilename = `nota_${nota._id}.pdf`;
    let pdfFullPath = path.join(pdfDir, expectedFilename);

    // Si el archivo no existe en disco, lo regeneramos automáticamente con los datos de Mongo
    if (!fs.existsSync(pdfFullPath)) {
      console.log(`⚠️ PDF físico no encontrado para nota ${nota._id}. Regenerando PDF al vuelo...`);
      const workshop = await Workshop.findOne({ nombre: nota.taller });
      const result = await generateNotePDF(nota, workshop);
      pdfFullPath = result.fullPath;
      nota.pdfPath = result.relativePath;
      await nota.save();
    }

    const rawName = (nota.cliente?.nombre || "servicio").trim();
    const safeClientName = rawName
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9_-]/g, "_");
    const filename = `nota_${nota._id.toString().slice(-6)}_${safeClientName}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`
    );

    const fileStream = fs.createReadStream(pdfFullPath);
    console.log(`✅ Descarga de PDF: ${filename} | Nota: ${nota._id}`);
    fileStream.pipe(res);

  } catch (error) {
    console.error("❌ Error en descargarPDF:", error);
    res.status(500).json({ ok: false, msg: "Error al descargar el PDF", error: error.message });
  }
};