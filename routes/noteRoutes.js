import express from "express";
import { createNote, getNotes, descargarPDF, deleteNote } from "../controllers/noteController.js";
import { verificarToken, requireRole } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/", verificarToken, createNote);
router.get("/", verificarToken, getNotes);
router.get("/:id/descargar", verificarToken, descargarPDF); 
router.delete("/:id", verificarToken, requireRole('admin'), deleteNote);


export default router;