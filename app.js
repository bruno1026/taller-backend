import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import authRoutes from "./routes/authRoutes.js";
import noteRoutes from "./routes/noteRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import fileRoutes from "./routes/fileRoutes.js";
import telegramRoutes from "./routes/telegramRoutes.js";
import { organizarPdfsSueltos } from "./controllers/fileController.js";
import { iniciarMonitoreoInterno } from "./services/telegramService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Carga de variables de entorno desde el archivo .env
dotenv.config();

const app = express();
const isProduction = process.env.NODE_ENV === "production";

// Configuracion de origenes CORS activos desde el archivo .env
const frontendEnv = process.env.FRONTEND_URL || "http://localhost:5174";
const allowAll = frontendEnv === "*";

// Unicamente los origenes activos sin duplicados ni puertos obsoletos
const allowedOrigins = allowAll
  ? ["*"]
  : [...new Set([
      frontendEnv,
      frontendEnv.replace("localhost", "127.0.0.1"),
      ...(process.env.FRONTEND_URLS || "")
        .split(",")
        .map(o => o.trim())
        .filter(Boolean)
    ])];

app.use(cors({
  origin: (origin, callback) => {
    // Permitir peticiones sin origen (curl, postman, server-side) o comodin *
    if (!origin || allowAll) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    console.warn("[WARN] CORS bloqueado para origen:", origin);
    return callback(null, false);
  },
  credentials: true
}));

app.options("*", cors());
app.use(express.json({ limit: "5mb" }));

// Creacion de directorios de almacenamiento si no existen
const pdfDir = path.join(__dirname, process.env.PDF_STORAGE || "storage/pdfs");
const logosDir = path.join(__dirname, "storage", "logos");
const usersDir = path.join(__dirname, "storage", "users");

fs.mkdirSync(pdfDir, { recursive: true });
fs.mkdirSync(logosDir, { recursive: true });
fs.mkdirSync(usersDir, { recursive: true });

// Conexion a base de datos MongoDB
if (process.env.MONGO_URI) {
  mongoose.connect(process.env.MONGO_URI)
    .then(async () => {
      console.log("[OK] MongoDB conectado exitosamente.");
      try {
        await organizarPdfsSueltos();
      } catch (errOrg) {
        console.warn("[WARN] Error al organizar carpetas:", errOrg.message);
      }
      try {
        await iniciarMonitoreoInterno();
      } catch (errBot) {
        console.warn("[WARN] No se pudo inicializar bot de Telegram:", errBot.message);
      }
    })
    .catch(err => console.error("[ERROR] Error al conectar a MongoDB:", err.message));
} else {
  console.error("[ERROR] Variable MONGO_URI no definida en el archivo .env.");
}

if (allowedOrigins.length > 0) {
  console.log(`[INFO] Origenes frontend permitidos por CORS: ${allowedOrigins.join(", ")}`);
}

if (process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
  console.log(`[INFO] Servicio de correo configurado para: ${process.env.EMAIL_USER}`);
} else {
  console.warn("[WARN] Configuracion de correo incompleta (EMAIL_USER / EMAIL_PASSWORD).");
}

// Rutas de la API REST
app.use("/api/auth", authRoutes);
app.use("/api/notes", noteRoutes);
app.use("/api/users", userRoutes);
app.use("/api/files", fileRoutes);
app.use("/api/telegram", telegramRoutes);

app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

// Servir archivos estaticos generados por el backend
app.use("/storage/pdfs", express.static(pdfDir));
app.use("/storage/logos", express.static(logosDir));
app.use("/storage/users", express.static(usersDir));

// Servir el frontend monolitico si existe la carpeta public generada por el build de Vite
const publicDir = path.join(__dirname, "public");
if (fs.existsSync(publicDir)) {
  app.use(express.static(publicDir));
  console.log("[INFO] Frontend monolitico detectado y servido desde public/.");

  // Soporte para rutas de cliente Vue Router (SPA)
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api") || req.path.startsWith("/storage") || req.path === "/health") {
      return next();
    }
    const indexPath = path.join(publicDir, "index.html");
    if (fs.existsSync(indexPath)) {
      return res.sendFile(indexPath);
    }
    next();
  });
}

const PORT = Number(process.env.PORT) || 3001;
app.listen(PORT, () => console.log(`[INFO] Servidor backend escuchando en el puerto ${PORT}`));
