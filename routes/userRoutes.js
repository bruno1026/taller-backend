import express from 'express'
import { verificarToken, requireRole } from '../middlewares/authMiddleware.js'
import upload from '../config/multer.js'
import {
  listarUsuarios,
  crearUsuario,
  actualizarUsuario,
  eliminarUsuario
} from '../controllers/userController.js'

const router = express.Router()

router.get('/', verificarToken, requireRole('admin'), listarUsuarios)
router.post('/', verificarToken, requireRole('admin'), upload.single('imagen'), crearUsuario)
router.put('/:id', verificarToken, requireRole('admin'), upload.single('imagen'), actualizarUsuario)
router.delete('/:id', verificarToken, requireRole('admin'), eliminarUsuario)

export default router
