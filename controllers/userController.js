import User from '../models/User.js'
import fs from 'fs'
import path from 'path'
import { enviarCorreoBienvenida } from '../utils/emailService.js'

const buildImageUrl = (req, imageUrl) => {
  if (!imageUrl) return ''
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) return imageUrl
  const base = `${req.protocol}://${req.get('host')}`.replace(/\/$/, '')
  const normalized = imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`
  return `${base}${normalized}`
}

export const listarUsuarios = async (req, res) => {
  try {
    const usuarios = await User.find().select('-contraseña')
    console.log(`✅ Listado de usuarios consultado. Total: ${usuarios.length}`)
    const data = usuarios.map(u => ({
      id: u._id,
      nombre: u.nombre,
      correo: u.correo,
      taller: u.taller,
      rol: u.rol,
      about: u.about,
      imageUrl: buildImageUrl(req, u.imageUrl)
    }))
    res.json({ ok: true, usuarios: data })
  } catch (error) {
    res.status(500).json({ ok: false, msg: 'Error al listar usuarios', error: error.message })
  }
}

export const crearUsuario = async (req, res) => {
  try {
    // Aceptar tanto 'contraseña' como 'password' para evitar problemas de encoding UTF-8
    const { nombre, correo, contraseña, password, taller, rol = 'empleado', about = '' } = req.body
    const passwordFinal = contraseña || password

    if (!nombre || !correo || !passwordFinal || !taller) {
      return res.status(400).json({ ok: false, msg: 'Faltan datos requeridos: nombre, correo, contraseña y taller' })
    }

    const existe = await User.findOne({ correo })
    if (existe) return res.status(400).json({ ok: false, msg: 'El correo ya está registrado' })

    const rolSeguro = ['admin', 'empleado'].includes(rol) ? rol : 'empleado'

    const usuario = new User({ nombre, correo, contraseña: passwordFinal, taller, rol: rolSeguro, about })

    if (req.file) {
      usuario.imageUrl = `/storage/users/${req.file.filename}`
    }

    await usuario.save()
    console.log(`✅ Usuario creado: ${usuario.correo} (${usuario.rol})`)

    // 📧 Enviar correo de bienvenida con las credenciales
    let correoEnviado = false
    let emailErrorMsg = ''
    try {
      const resultadoEmail = await enviarCorreoBienvenida(nombre, correo, passwordFinal, taller)
      if (resultadoEmail.success) {
        correoEnviado = true
        console.log(`✅ Correo de bienvenida enviado a: ${correo}`)
      } else {
        emailErrorMsg = resultadoEmail.error || 'No se pudo enviar el correo de bienvenida'
        console.warn(`⚠️ No se pudo enviar el correo de bienvenida a: ${correo}`)
      }
    } catch (emailError) {
      emailErrorMsg = emailError.message
      console.error('❌ Error al enviar correo:', emailError.message)
      // No detener la creación del usuario si falla el envío del correo
    }

    res.status(201).json({ ok: true, msg: correoEnviado ? 'Usuario creado y correo enviado' : 'Usuario creado, pero el correo no se pudo enviar', correoEnviado, emailError: emailErrorMsg, usuario: {
      id: usuario._id,
      nombre: usuario.nombre,
      correo: usuario.correo,
      taller: usuario.taller,
      rol: usuario.rol,
      about: usuario.about,
      imageUrl: buildImageUrl(req, usuario.imageUrl)
    } })
  } catch (error) {
    res.status(500).json({ ok: false, msg: 'Error al crear usuario', error: error.message })
  }
}

export const actualizarUsuario = async (req, res) => {
  try {
    const { id } = req.params
    // Aceptar tanto 'contraseña' como 'password' para evitar problemas de encoding UTF-8
    const { nombre, correo, contraseña, password, taller, rol, about, eliminarImagen } = req.body
    const passwordFinal = contraseña || password

    const usuario = await User.findById(id)
    if (!usuario) return res.status(404).json({ ok: false, msg: 'Usuario no encontrado' })

    if (nombre) usuario.nombre = nombre
    if (correo) usuario.correo = correo
    if (taller) usuario.taller = taller
    if (about !== undefined) usuario.about = about
    if (rol && ['admin', 'empleado'].includes(rol)) usuario.rol = rol
    if (passwordFinal && passwordFinal.trim() !== '') {
      if (passwordFinal.length < 6) {
        return res.status(400).json({ ok: false, msg: 'La contraseña debe tener al menos 6 caracteres' })
      }
      usuario.contraseña = passwordFinal
    }

    if (req.file) {
      if (usuario.imageUrl && usuario.imageUrl.startsWith('/storage/users/')) {
        const oldPath = path.join(process.cwd(), usuario.imageUrl)
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath)
      }
      usuario.imageUrl = `/storage/users/${req.file.filename}`
    } else if (eliminarImagen === 'true') {
      if (usuario.imageUrl && usuario.imageUrl.startsWith('/storage/users/')) {
        const oldPath = path.join(process.cwd(), usuario.imageUrl)
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath)
      }
      usuario.imageUrl = ''
    }

    await usuario.save()
    console.log(`✅ Usuario actualizado: ${usuario.correo} (${usuario.rol})`)

    res.json({ ok: true, msg: 'Usuario actualizado', usuario: {
      id: usuario._id,
      nombre: usuario.nombre,
      correo: usuario.correo,
      taller: usuario.taller,
      rol: usuario.rol,
      about: usuario.about,
      imageUrl: buildImageUrl(req, usuario.imageUrl)
    } })
  } catch (error) {
    res.status(500).json({ ok: false, msg: 'Error al actualizar usuario', error: error.message })
  }
}

export const eliminarUsuario = async (req, res) => {
  try {
    const { id } = req.params
    const usuario = await User.findById(id)
    if (!usuario) return res.status(404).json({ ok: false, msg: 'Usuario no encontrado' })

    if (usuario.imageUrl && usuario.imageUrl.startsWith('/storage/users/')) {
      const oldPath = path.join(process.cwd(), usuario.imageUrl)
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath)
    }

    await usuario.deleteOne()
    console.log(`✅ Usuario eliminado: ${usuario.correo}`)

    res.json({ ok: true, msg: 'Usuario eliminado' })
  } catch (error) {
    res.status(500).json({ ok: false, msg: 'Error al eliminar usuario', error: error.message })
  }
}
