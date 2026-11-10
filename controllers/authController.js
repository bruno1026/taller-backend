// controllers/authController.js
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Contact from "../models/Contact.js";
import fs from 'fs';
import path from 'path';
import { enviarCorreoRecuperacion, enviarCorreoContacto } from '../utils/emailService.js';

const generarToken = (usuario) => {
  return jwt.sign(
    { id: usuario._id, nombre: usuario.nombre, taller: usuario.taller, rol: usuario.rol },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );
};

// Construye URL absoluta para la imagen, aun si está guardada como ruta relativa
const buildImageUrl = (req, imageUrl) => {
  if (!imageUrl) return '';
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) return imageUrl;
  const base = `${req.protocol}://${req.get('host')}`.replace(/\/$/, '');
  const normalized = imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`;
  return `${base}${normalized}`;
};

// === Registrar usuario ===
export const registrar = async (req, res) => {
  try {
    const { nombre, correo, contraseña, taller, rol } = req.body;

    const existe = await User.findOne({ correo });
    if (existe) return res.status(400).json({ ok: false, msg: "El correo ya está registrado" });

    // Por seguridad, cualquier registro vía API será empleado
    const nuevoUsuario = new User({ nombre, correo, contraseña, taller, rol: 'empleado' });
    await nuevoUsuario.save();

    res.status(201).json({ ok: true, msg: "Usuario registrado correctamente" });
  } catch (error) {
    res.status(500).json({ ok: false, msg: "Error al registrar usuario", error: error.message });
  }
};

// === Iniciar sesión ===
export const login = async (req, res) => {
  try {
    const { correo, contraseña } = req.body;

    const usuario = await User.findOne({ correo });
    if (!usuario) {
      console.warn(`⚠️ Login fallido - usuario no encontrado: ${correo}`);
      return res.status(404).json({ ok: false, msg: "Usuario no encontrado" });
    }

    const esValida = await usuario.compararContraseña(contraseña);
    if (!esValida) {
      console.warn(`⚠️ Login fallido - contraseña incorrecta: ${correo}`);
      return res.status(401).json({ ok: false, msg: "Contraseña incorrecta" });
    }

    const token = generarToken(usuario);
    console.log(`✅ Inicio de sesión exitoso: ${usuario.correo} (${usuario.rol})`);

    res.json({
      ok: true,
      msg: "Inicio de sesión exitoso",
      token,
      usuario: { 
        id: usuario._id, 
        nombre: usuario.nombre, 
        correo: usuario.correo,
        taller: usuario.taller,
        rol: usuario.rol,
        about: usuario.about,
        imageUrl: buildImageUrl(req, usuario.imageUrl)
      }
    });
  } catch (error) {
    res.status(500).json({ ok: false, msg: "Error al iniciar sesión", error: error.message });
  }
};

// === Actualizar perfil de usuario ===
export const actualizarPerfil = async (req, res) => {
  try {
    const { nombre, taller, about, contraseña, eliminarImagen } = req.body;
    const usuarioId = req.usuario.id; // Del middleware verificarToken

    const usuario = await User.findById(usuarioId);
    if (!usuario) {
      return res.status(404).json({ ok: false, msg: "Usuario no encontrado" });
    }

    // Actualizar campos básicos
    if (nombre) usuario.nombre = nombre;
    if (taller && ["Talisman", "Lutecia"].includes(taller)) {
      usuario.taller = taller;
    }
    if (about !== undefined) usuario.about = about;

    // Actualizar contraseña si se proporciona
    if (contraseña && contraseña.trim() !== "") {
      if (contraseña.length < 6) {
        return res.status(400).json({ 
          ok: false, 
          msg: "La contraseña debe tener al menos 6 caracteres" 
        });
      }
      usuario.contraseña = contraseña; // El pre-save hook se encargará del hash
    }

    // Manejar upload de imagen
    if (req.file) {
      // Eliminar imagen anterior si existe
      if (usuario.imageUrl && usuario.imageUrl.startsWith('/storage/users/')) {
        const oldImagePath = path.join(process.cwd(), usuario.imageUrl);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }

      // Guardar nueva imagen
      const imageUrl = `/storage/users/${req.file.filename}`;
      usuario.imageUrl = imageUrl;
    } else if (eliminarImagen === 'true') {
      // Solicitud explícita de eliminar la imagen
      if (usuario.imageUrl && usuario.imageUrl.startsWith('/storage/users/')) {
        const oldImagePath = path.join(process.cwd(), usuario.imageUrl);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
      usuario.imageUrl = '';
    }

    await usuario.save();

    // Generar nuevo token si cambió el nombre o taller
    const token = generarToken(usuario);

    res.json({
      ok: true,
      msg: "Perfil actualizado correctamente",
      token, // Enviar nuevo token por si cambió nombre/taller
      usuario: {
        id: usuario._id,
        nombre: usuario.nombre,
        correo: usuario.correo,
        taller: usuario.taller,
        rol: usuario.rol,
        about: usuario.about,
        imageUrl: buildImageUrl(req, usuario.imageUrl)
      }
    });

  } catch (error) {
    console.error('Error al actualizar perfil:', error);
    res.status(500).json({ 
      ok: false, 
      msg: "Error al actualizar perfil", 
      error: error.message 
    });
  }
};

// === Solicitar recuperación de contraseña ===
export const solicitarRecuperacion = async (req, res) => {
  try {
    const { correo } = req.body

    if (!correo) {
      return res.status(400).json({ ok: false, msg: 'El correo es requerido' })
    }

    const usuario = await User.findOne({ correo })
    if (!usuario) {
      // Por seguridad, no revelamos si el correo existe o no
      return res.json({ ok: true, msg: 'Si el correo existe, recibirás un enlace de recuperación' })
    }

    // Generar token temporal (expira en 1 hora)
    const resetToken = jwt.sign(
      { id: usuario._id, correo: usuario.correo },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    )

    // Enviar correo con el enlace
    try {
      const resultado = await enviarCorreoRecuperacion(usuario.nombre, usuario.correo, resetToken)
      if (resultado.success) {
        console.log(`✅ Correo de recuperación enviado a: ${correo}`)
      } else {
        console.warn(`⚠️ No se pudo enviar el correo de recuperación a: ${correo}`)
      }
    } catch (emailError) {
      console.error('❌ Error al enviar correo de recuperación:', emailError.message)
      return res.status(500).json({ ok: false, msg: 'Error al enviar el correo de recuperación' })
    }

    res.json({ ok: true, msg: 'Si el correo existe, recibirás un enlace de recuperación' })
  } catch (error) {
    console.error('Error en recuperación:', error)
    res.status(500).json({ ok: false, msg: 'Error al procesar la solicitud', error: error.message })
  }
}

// === Resetear contraseña ===
export const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body

    if (!token || !password) {
      return res.status(400).json({ ok: false, msg: 'Token y contraseña son requeridos' })
    }

    if (password.length < 6) {
      return res.status(400).json({ ok: false, msg: 'La contraseña debe tener al menos 6 caracteres' })
    }

    // Verificar el token
    let decoded
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET)
    } catch (error) {
      return res.status(400).json({ ok: false, msg: 'Token inválido o expirado' })
    }

    // Buscar usuario y actualizar contraseña
    const usuario = await User.findById(decoded.id)
    if (!usuario) {
      return res.status(404).json({ ok: false, msg: 'Usuario no encontrado' })
    }

    usuario.contraseña = password
    await usuario.save()

    console.log(`✅ Contraseña restablecida para: ${usuario.correo}`)

    res.json({ ok: true, msg: 'Contraseña actualizada exitosamente' })
  } catch (error) {
    console.error('Error al resetear contraseña:', error)
    res.status(500).json({ ok: false, msg: 'Error al cambiar la contraseña', error: error.message })
  }
}

// === Enviar formulario de contacto / solicitud de servicio ===
export const enviarContacto = async (req, res) => {
  try {
    const { nombreCompleto, telefono, correo, servicio, modeloAuto = '', mensaje = '', asunto } = req.body;
    const servicioSolicitado = servicio || asunto || 'Servicio Mecánico General';

    if (!nombreCompleto || !telefono || !correo) {
      return res.status(400).json({ ok: false, msg: 'Nombre, teléfono y correo electrónico son requeridos' });
    }

    // 1. Guardar siempre en Base de Datos para garantizar persistencia inmediata
    let registroGuardado = null;
    try {
      registroGuardado = await Contact.create({
        nombreCompleto: nombreCompleto.trim(),
        telefono: telefono.trim(),
        correo: correo.trim(),
        servicio: servicioSolicitado,
        modeloAuto: modeloAuto.trim(),
        mensaje: mensaje.trim(),
      });
      console.log(`💾 Solicitud de servicio guardada en BD: ${nombreCompleto} (${servicioSolicitado})`);
    } catch (dbError) {
      console.warn('⚠️ No se pudo guardar la solicitud en BD:', dbError.message);
    }

    // 2. Enviar correo de notificación al taller
    const resultado = await enviarCorreoContacto({
      nombreCompleto,
      telefono,
      correo,
      servicio: servicioSolicitado,
      modeloAuto,
      mensaje
    });

    if (resultado.success || registroGuardado) {
      console.log(`✅ Solicitud procesada exitosamente: ${nombreCompleto} - ${correo}`);
      return res.json({
        ok: true,
        msg: '¡Tu solicitud ha sido enviada con éxito! Nos comunicaremos contigo a la brevedad.'
      });
    }

    if (['ETIMEDOUT', 'ESOCKET', 'ECONNECTION', 'EAI_AGAIN'].includes(resultado.errorCode)) {
      console.warn(`⚠️ Correo de contacto no entregado por timeout SMTP (${resultado.errorCode}).`);
      return res.status(202).json({
        ok: true,
        msg: 'Tu solicitud fue recibida. Te contactaremos pronto.'
      });
    }

    console.error('❌ Error al enviar correo de contacto:', resultado.error);
    res.status(500).json({ ok: false, msg: 'Error al enviar el mensaje' });
  } catch (error) {
    console.error('Error al procesar formulario de contacto:', error);
    res.status(500).json({ ok: false, msg: 'Error al enviar el mensaje', error: error.message });
  }
};