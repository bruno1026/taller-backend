import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import fs from "fs";
import path from "path";

import authRoutes from "./routes/authRoutes.js";
import noteRoutes from "./routes/noteRoutes.js";
import userRoutes from "./routes/userRoutes.js";

const envFile = process.env.ENV_FILE || (process.env.NODE_ENV === "production" ? ".env.production" : ".env");
const resolvedEnvPath = path.resolve(envFile);

if (fs.existsSync(resolvedEnvPath)) {
  dotenv.config({ path: resolvedEnvPath });
  console.log(`✅ Variables cargadas desde: ${envFile}`);
} else {
  dotenv.config();
  console.warn(`⚠️ No se encontró ${envFile}. Usando configuración por defecto de dotenv.`);
}

const app = express();
const isProduction = process.env.NODE_ENV === "production";
const allowedOrigins = [
  process.env.FRONTEND_URL,
  ...(process.env.FRONTEND_URLS || "")
    .split(",")
    .map(o => o.trim())
    .filter(Boolean),
  ...(!isProduction ? ["http://localhost:5173", "http://localhost:5174", "http://127.0.0.1:5174"] : [])
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {

    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    console.warn("❌ CORS bloqueado:", origin);
    return callback(null, false); // 👈 IMPORTANTE (no error)
  },
  credentials: true
}));
app.options("*", cors());
app.use(express.json({ limit: "5mb" }));

// Crear carpetas si no existen
const pdfDir = path.join("storage", "pdfs");
const logosDir = path.join("storage", "logos");
const usersDir = path.join("storage", "users"); 

fs.mkdirSync(pdfDir, { recursive: true });
fs.mkdirSync(logosDir, { recursive: true });
fs.mkdirSync(usersDir, { recursive: true }); 

// Conexión a MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB conectado"))
  .catch(err => console.error("❌ Error en MongoDB:", err.message));

if (allowedOrigins.length > 0) {
  console.log(`✅ Frontend(s) permitido(s) por CORS: ${allowedOrigins.join(", ")}`);
} else {
  console.warn("⚠️ FRONTEND_URL/FRONTEND_URLS no están definidos. CORS podría bloquear solicitudes del frontend.");
}

if (process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
  console.log(`✅ Correos configurados con: ${process.env.EMAIL_USER}`);
} else {
  console.warn("⚠️ Configuración de correo incompleta (EMAIL_USER / EMAIL_PASSWORD).");
}

// Rutas
app.use("/api/auth", authRoutes);
app.use("/api/notes", noteRoutes);
app.use("/api/users", userRoutes);

app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

// Servir archivos estáticos
app.use("/storage/pdfs", express.static(pdfDir));
app.use("/storage/logos", express.static(logosDir));
app.use("/storage/users", express.static(usersDir)); 

const PORT = process.env.PORT || 3001;
// app.listen(PORT, () => console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`));
app.listen(PORT, () => console.log(`🚀 Servidor corriendo en puerto ${PORT}`));