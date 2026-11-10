// routes/authRoutes.js
import express from "express";
import { registrar, login, actualizarPerfil, solicitarRecuperacion, resetPassword, enviarContacto } from "../controllers/authController.js";
import { verificarToken } from "../middlewares/authMiddleware.js";
import upload from "../config/multer.js"; // 👈 Importar multer

const router = express.Router();

router.post("/register", registrar);
router.post("/login", login);
router.put("/actualizar-perfil", verificarToken, upload.single('imagen'), actualizarPerfil); 
router.post("/recuperar-password", solicitarRecuperacion);
router.post("/reset-password", resetPassword);
router.post("/contacto", enviarContacto);

export default router;