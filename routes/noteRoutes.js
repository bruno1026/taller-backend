import express from "express";
import { createNote, getNotes, getNoteById, updateNote, descargarPDF, deleteNote } from "../controllers/noteController.js";
import { verificarToken, requireRole } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/", verificarToken, createNote);
router.get("/", verificarToken, getNotes);
router.get("/:id", verificarToken, getNoteById);
router.put("/:id", verificarToken, updateNote);
router.get("/:id/descargar", verificarToken, descargarPDF); 
router.delete("/:id", verificarToken, requireRole('superadmin', 'admin'), deleteNote);

export default router;