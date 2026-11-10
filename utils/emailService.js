import nodemailer from 'nodemailer'
import fs from 'fs'
import path from 'path'

const getFrontendBaseUrl = () => {
  const raw = process.env.FRONTEND_URL || 'http://localhost:5174'
  return raw.trim().replace(/\/+$/, '')
}

const TRANSIENT_SMTP_ERRORS = ['ETIMEDOUT', 'ESOCKET', 'ECONNECTION', 'EAI_AGAIN']

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const sendMailWithRetry = async (transporter, mailOptions, maxRetries = 1) => {
  let attempt = 0
  let lastError = null

  while (attempt <= maxRetries) {
    try {
      return await transporter.sendMail(mailOptions)
    } catch (error) {
      lastError = error
      const isTransient = TRANSIENT_SMTP_ERRORS.includes(error.code)

      if (!isTransient || attempt === maxRetries) {
        throw error
      }

      console.warn(`⚠️ SMTP intento ${attempt + 1} falló (${error.code}). Reintentando...`)
      await delay(1200)
      attempt += 1
    }
  }

  throw lastError
}

const getBoolean = (value, fallback = false) => {
  if (value === undefined) return fallback
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase())
}

// Configurar el transporter de nodemailer
const createTransporter = (overrides = {}) => {
  const host = overrides.host || process.env.SMTP_HOST || 'smtp.gmail.com'
  const port = Number(overrides.port || process.env.SMTP_PORT || 465)
  const secure = overrides.secure !== undefined
    ? overrides.secure
    : (process.env.SMTP_SECURE !== undefined
    ? getBoolean(process.env.SMTP_SECURE)
    : port === 465)

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    },
    connectionTimeout: Number(process.env.SMTP_CONNECTION_TIMEOUT || 15000),
    greetingTimeout: Number(process.env.SMTP_GREETING_TIMEOUT || 10000),
    socketTimeout: Number(process.env.SMTP_SOCKET_TIMEOUT || 20000),
    requireTLS: !secure,
    tls: {
      minVersion: 'TLSv1.2'
    }
  })
}

const sendEmail = async (mailOptions) => {
  const primaryHost = process.env.SMTP_HOST || 'smtp.gmail.com'
  const primaryPort = Number(process.env.SMTP_PORT || 465)

  const transporter = createTransporter()
  try {
    return await sendMailWithRetry(transporter, mailOptions, 1)
  } catch (error) {
    const canFallbackTo587 =
      TRANSIENT_SMTP_ERRORS.includes(error.code) &&
      primaryHost === 'smtp.gmail.com' &&
      primaryPort === 465

    if (!canFallbackTo587) throw error

    console.warn('⚠️ SMTP 465 no respondió. Intentando fallback por 587...')
    const fallbackTransporter = createTransporter({ host: 'smtp.gmail.com', port: 587, secure: false })
    return sendMailWithRetry(fallbackTransporter, mailOptions, 1)
  }
}

// Plantilla HTML para el correo de bienvenida
const getWelcomeEmailTemplate = (nombre, correo, contraseña, taller) => {
  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          background-color: #f4f4f4;
          margin: 0;
          padding: 0;
        }
        .container {
          max-width: 600px;
          margin: 40px auto;
          background-color: #ffffff;
          border-radius: 10px;
          overflow: hidden;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header {
          background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
          padding: 30px;
          text-align: center;
        }
        .logo {
          width: 86px;
          height: 86px;
          margin: 0 auto 15px;
          display: inline-block;
          border: 0;
          outline: none;
          text-decoration: none;
          object-fit: contain;
        }
        .header h1 {
          color: #111827;
          margin: 0;
          font-size: 24px;
          font-weight: 600;
        }
        .header p {
          color: #374151;
          margin: 10px 0 0;
          font-size: 14px;
        }
        .content {
          padding: 40px 30px;
        }
        .greeting {
          color: #1f2937;
          font-size: 18px;
          margin-bottom: 20px;
        }
        .message {
          color: #4b5563;
          line-height: 1.6;
          margin-bottom: 30px;
        }
        .credentials-box {
          background: linear-gradient(135deg, #fff7ed 0%, #fef3c7 100%);
          border-left: 4px solid #fbbf24;
          padding: 20px;
          border-radius: 8px;
          margin: 25px 0;
        }
        .credentials-title {
          color: #92400e;
          font-weight: 600;
          font-size: 16px;
          margin-bottom: 15px;
          display: flex;
          align-items: center;
        }
        .credential-item {
          margin: 12px 0;
        }
        .credential-label {
          color: #78350f;
          font-weight: 600;
          font-size: 13px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 5px;
        }
        .credential-value {
          color: #1f2937;
          font-size: 15px;
          font-weight: 500;
          background-color: #ffffff;
          padding: 10px 15px;
          border-radius: 6px;
          border: 1px solid #fbbf24;
          word-break: break-all;
        }
        .warning-box {
          background-color: #fef2f2;
          border-left: 4px solid #ef4444;
          padding: 15px;
          border-radius: 8px;
          margin: 20px 0;
        }
        .warning-text {
          color: #991b1b;
          font-size: 13px;
          margin: 0;
        }
        .cta-button {
          display: inline-block;
          background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
          color: #ffffff;
          text-decoration: none;
          padding: 14px 32px;
          border-radius: 8px;
          font-weight: 600;
          font-size: 15px;
          margin: 25px 0;
          box-shadow: 0 4px 6px rgba(251, 191, 36, 0.3);
          transition: transform 0.2s;
        }
        .cta-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 8px rgba(251, 191, 36, 0.4);
        }
        .footer {
          background-color: #f9fafb;
          padding: 25px 30px;
          text-align: center;
          border-top: 1px solid #e5e7eb;
        }
        .footer-text {
          color: #6b7280;
          font-size: 13px;
          margin: 5px 0;
        }
        .footer-link {
          color: #fbbf24;
          text-decoration: none;
          font-weight: 500;
        }
        .divider {
          height: 1px;
          background-color: #e5e7eb;
          margin: 25px 0;
        }
        .info-list {
          color: #4b5563;
          font-size: 14px;
          line-height: 1.8;
          margin: 15px 0;
          padding-left: 20px;
        }
        .highlight {
          color: #fbbf24;
          font-weight: 600;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto 12px; border-collapse: collapse;">
            <tr>
              <td align="center" valign="middle" style="text-align: center; vertical-align: middle; line-height: 0;">
                <img src="cid:logoRenault" alt="Logo Renault" class="logo" width="86" height="86" />
              </td>
            </tr>
          </table>
          <h1>Bienvenido al Sistema</h1>
          <p>Servicio Especializado Renault</p>
        </div>

        <div class="content">
          <p class="greeting">¡Hola <strong>${nombre}</strong>!</p>
          
          <p class="message">
            Te damos la bienvenida al <strong>Sistema de Gestión de Talleres Renault</strong>. 
            Tu cuenta ha sido creada exitosamente y ya puedes acceder al sistema.
          </p>

          <p class="message">
            Has sido asignado al taller <span class="highlight">${taller}</span> y ahora formas parte de nuestro equipo.
          </p>

          <div class="credentials-box">
            <div class="credentials-title">
              🔐 Tus Credenciales de Acceso
            </div>
            
            <div class="credential-item">
              <div class="credential-label">Correo Electrónico</div>
              <div class="credential-value">${correo}</div>
            </div>
            
            <div class="credential-item">
              <div class="credential-label">Contraseña Temporal</div>
              <div class="credential-value">${contraseña}</div>
            </div>
          </div>

          <div class="warning-box">
            <p class="warning-text">
              <strong>⚠️ Importante:</strong> Por motivos de seguridad, te recomendamos cambiar tu contraseña 
              después de iniciar sesión por primera vez. Puedes hacerlo desde tu perfil.
            </p>
          </div>

          <div style="text-align: center;">
            <a href="${getFrontendBaseUrl()}/login" class="cta-button">
              Iniciar Sesión Ahora
            </a>
          </div>

          <div class="divider"></div>

          <p class="message" style="margin-top: 25px;">
            <strong>¿Qué puedes hacer en el sistema?</strong>
          </p>
          <ul class="info-list">
            <li>Generar notas de servicio profesionales de manera rápida</li>
            <li>Consultar el historial de notas generadas</li>
            <li>Actualizar tu información de perfil</li>
            <li>Gestionar información de clientes y vehículos</li>
          </ul>

          <p class="message">
            Si tienes alguna pregunta o necesitas ayuda, no dudes en contactar al administrador del sistema.
          </p>

          <p class="message" style="margin-top: 25px;">
            <strong>¡Bienvenido a bordo!</strong><br>
            Equipo de Servicio Especializado Renault
          </p>
        </div>

        <div class="footer">
          <p class="footer-text">
            Este correo fue enviado automáticamente por el Sistema de Gestión de Talleres Renault
          </p>
          <p class="footer-text">
            © ${new Date().getFullYear()} Servicio Especializado Renault. Todos los derechos reservados.
          </p>
          <p class="footer-text" style="margin-top: 15px;">
            <a href="${getFrontendBaseUrl()}" class="footer-link">Visitar Sistema</a>
          </p>
        </div>
      </div>
    </body>
    </html>
  `
}

// Plantilla HTML para el correo de recuperación
const getRecoveryEmailTemplate = (nombre, resetLink) => {
  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          background-color: #f4f4f4;
          margin: 0;
          padding: 0;
        }
        .container {
          max-width: 600px;
          margin: 40px auto;
          background-color: #ffffff;
          border-radius: 10px;
          overflow: hidden;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header {
          background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
          padding: 30px;
          text-align: center;
        }
        .logo {
          width: 86px;
          height: 86px;
          margin: 0 auto 15px;
          display: inline-block;
          border: 0;
          outline: none;
          text-decoration: none;
          object-fit: contain;
        }
        .header h1 {
          color: #111827;
          margin: 0;
          font-size: 26px;
          font-weight: 600;
        }
        .content {
          padding: 40px 30px;
          color: #333333;
          line-height: 1.6;
        }
        .greeting {
          font-size: 20px;
          color: #1a1a1a;
          margin-bottom: 20px;
          font-weight: 600;
        }
        .message {
          font-size: 16px;
          color: #555555;
          margin-bottom: 30px;
        }
        .button-container {
          text-align: center;
          margin: 35px 0;
        }
        .reset-button {
          display: inline-block;
          padding: 15px 40px;
          background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
          color: #1a1a1a;
          text-decoration: none;
          border-radius: 8px;
          font-weight: 600;
          font-size: 16px;
          box-shadow: 0 4px 6px rgba(251, 191, 36, 0.3);
          transition: all 0.3s ease;
        }
        .reset-button:hover {
          box-shadow: 0 6px 8px rgba(251, 191, 36, 0.4);
          transform: translateY(-2px);
        }
        .warning {
          background-color: #fef3c7;
          border-left: 4px solid #f59e0b;
          padding: 15px;
          margin: 25px 0;
          border-radius: 4px;
        }
        .warning-title {
          font-weight: 600;
          color: #92400e;
          margin: 0 0 8px 0;
          font-size: 15px;
        }
        .warning-text {
          margin: 0;
          color: #92400e;
          font-size: 14px;
        }
        .footer {
          background-color: #f9fafb;
          padding: 25px 30px;
          text-align: center;
          border-top: 1px solid #e5e7eb;
        }
        .footer-text {
          color: #6b7280;
          font-size: 13px;
          margin: 8px 0;
        }
        .footer-link {
          color: #fbbf24;
          text-decoration: none;
          font-weight: 500;
        }
        .footer-link:hover {
          text-decoration: underline;
        }
        .expiration-notice {
          text-align: center;
          font-size: 14px;
          color: #6b7280;
          margin-top: 20px;
          font-style: italic;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto 12px; border-collapse: collapse;">
            <tr>
              <td align="center" valign="middle" style="text-align: center; vertical-align: middle; line-height: 0;">
                <img src="cid:logoRenault" alt="Logo Renault" class="logo" width="86" height="86" />
              </td>
            </tr>
          </table>
          <h1>Recuperación de Contraseña</h1>
        </div>
        
        <div class="content">
          <p class="greeting">Hola ${nombre},</p>
          
          <p class="message">
            Hemos recibido una solicitud para restablecer la contraseña de tu cuenta en el Sistema de Gestión de Talleres Renault.
          </p>
          
          <p class="message">
            Para continuar con el proceso de recuperación, haz clic en el siguiente botón:
          </p>
          
          <div class="button-container">
            <a href="${resetLink}" class="reset-button">Restablecer Contraseña</a>
          </div>
          
          <p class="expiration-notice">
            ⏰ Este enlace expirará en 1 hora por motivos de seguridad
          </p>
          
          <div class="warning">
            <p class="warning-title">⚠️ Importante:</p>
            <p class="warning-text">
              Si no solicitaste este cambio, puedes ignorar este correo. Tu contraseña no será modificada.
            </p>
            <p class="warning-text" style="margin-top: 10px;">
              Por seguridad, nunca compartas este enlace con nadie.
            </p>
          </div>
          
          <p class="message" style="margin-top: 30px; font-size: 14px; color: #6b7280;">
            Si el botón no funciona, copia y pega el siguiente enlace en tu navegador:
          </p>
          <p style="word-break: break-all; color: #3b82f6; font-size: 13px;">
            ${resetLink}
          </p>
        </div>
        
        <div class="footer">
          <p class="footer-text">
            Este correo fue enviado automáticamente por el Sistema de Gestión de Talleres Renault
          </p>
          <p class="footer-text">
            © ${new Date().getFullYear()} Servicio Especializado Renault. Todos los derechos reservados.
          </p>
          <p class="footer-text" style="margin-top: 15px;">
            <a href="${getFrontendBaseUrl()}" class="footer-link">Visitar Sistema</a>
          </p>
        </div>
      </div>
    </body>
    </html>
  `
}

// Función para enviar correo de bienvenida
export const enviarCorreoBienvenida = async (nombre, correo, contraseña, taller) => {
  try {
    const logoPath = path.join(process.cwd(), 'storage', 'logos', 'logo-Renault.png')
    const attachments = fs.existsSync(logoPath)
      ? [{ filename: 'logo-Renault.png', path: logoPath, cid: 'logoRenault' }]
      : []

    const mailOptions = {
      from: `"Servicio Renault - Sistema de Gestión" <${process.env.EMAIL_USER}>`,
      to: correo,
      subject: '🔐 Bienvenido al Sistema de Gestión - Tus Credenciales de Acceso',
      html: getWelcomeEmailTemplate(nombre, correo, contraseña, taller),
      attachments
    }

    const info = await sendEmail(mailOptions)
    console.log('✅ Correo de bienvenida enviado:', info.messageId)
    return { success: true, messageId: info.messageId }
  } catch (error) {
    if (TRANSIENT_SMTP_ERRORS.includes(error.code)) {
      console.warn(`⚠️ Timeout SMTP en correo de bienvenida (${error.code}).`)
    } else {
      console.error('❌ Error al enviar correo de bienvenida:', error)
    }
    return { success: false, error: error.message, errorCode: error.code }
  }
}

// Plantilla HTML para el correo de solicitud de servicio / contacto
const getContactEmailTemplate = (datosOArgs, telefonoArg, correoArg, asuntoArg) => {
  const datos = typeof datosOArgs === 'object' && datosOArgs !== null
    ? {
        nombreCompleto: datosOArgs.nombreCompleto || 'Cliente',
        telefono: datosOArgs.telefono || 'No especificado',
        correo: datosOArgs.correo || '',
        servicio: datosOArgs.servicio || datosOArgs.asunto || 'Servicio Mecánico General',
        modeloAuto: datosOArgs.modeloAuto || 'No especificado',
        mensaje: datosOArgs.mensaje || ''
      }
    : {
        nombreCompleto: datosOArgs || 'Cliente',
        telefono: telefonoArg || 'No especificado',
        correo: correoArg || '',
        servicio: asuntoArg === 'sistema' ? 'Consulta del Sistema' : 'Servicio Mecánico',
        modeloAuto: 'No especificado',
        mensaje: ''
      };

  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          background-color: #0f172a;
          margin: 0;
          padding: 24px 12px;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          background-color: #18181b;
          border-radius: 16px;
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 16px 32px rgba(0, 0, 0, 0.4);
          color: #f4f4f5;
        }
        .header {
          background: linear-gradient(135deg, #eab308 0%, #ca8a04 100%);
          padding: 26px 24px;
          text-align: center;
        }
        .header-logo {
          width: 80px;
          height: auto;
          display: inline-block;
        }
        .header h1 {
          color: #09090b;
          margin: 10px 0 0;
          font-size: 24px;
          font-weight: 800;
          letter-spacing: -0.5px;
        }
        .subhead {
          color: #1c1917;
          font-size: 13px;
          font-weight: 600;
          margin-top: 4px;
        }
        .content {
          padding: 28px 24px;
        }
        .greeting {
          font-size: 20px;
          color: #ffffff;
          margin: 0 0 10px;
          font-weight: 700;
        }
        .message {
          font-size: 14px;
          color: #a1a1aa;
          margin: 0 0 18px;
          line-height: 1.5;
        }
        .info-box {
          background-color: #27272a;
          border: 1px solid rgba(234, 179, 8, 0.3);
          border-left: 4px solid #eab308;
          border-radius: 12px;
          padding: 14px 18px;
          margin: 16px 0 20px;
        }
        .info-row {
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        }
        .info-row:last-child {
          border-bottom: none;
        }
        .info-label {
          font-weight: 600;
          color: #eab308;
          font-size: 13px;
          padding: 9px 8px 9px 0;
          width: 35%;
        }
        .info-value {
          color: #f4f4f5;
          font-size: 13px;
          padding: 9px 0;
          word-break: break-word;
        }
        .cta-bar {
          margin: 22px 0 10px;
          text-align: center;
        }
        .btn-action {
          display: inline-block;
          background-color: #eab308;
          color: #000000 !important;
          font-weight: 700;
          font-size: 14px;
          padding: 11px 22px;
          border-radius: 10px;
          text-decoration: none;
        }
        .footer {
          background-color: #09090b;
          padding: 16px 20px;
          text-align: center;
          border-top: 1px solid rgba(255, 255, 255, 0.05);
        }
        .footer-text {
          color: #71717a;
          font-size: 11px;
          margin: 4px 0;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto; border-collapse: collapse;">
            <tr>
              <td align="center" valign="middle">
                <img src="cid:logoRenault" alt="Logo Renault" class="header-logo" width="70" />
              </td>
            </tr>
          </table>
          <h1>Nueva Solicitud de Servicio</h1>
          <div class="subhead">Taller Mecánico Especializado Renault</div>
        </div>
        
        <div class="content">
          <p class="greeting">¡Tienes un nuevo cliente interesado!</p>
          <p class="message">
            Un cliente ha enviado una solicitud de cotización/servicio a través del portal web. A continuación los detalles completos:
          </p>
          
          <div class="info-box">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse: collapse;">
              <tr class="info-row">
                <td class="info-label">Cliente</td>
                <td class="info-value"><strong>${datos.nombreCompleto}</strong></td>
              </tr>
              <tr class="info-row">
                <td class="info-label">Teléfono</td>
                <td class="info-value"><a href="tel:${datos.telefono}" style="color: #facc15; font-weight: 600;">${datos.telefono}</a></td>
              </tr>
              <tr class="info-row">
                <td class="info-label">Correo</td>
                <td class="info-value"><a href="mailto:${datos.correo}" style="color: #60a5fa; text-decoration: underline;">${datos.correo}</a></td>
              </tr>
              <tr class="info-row">
                <td class="info-label">Servicio Deseado</td>
                <td class="info-value"><span style="background: rgba(234, 179, 8, 0.15); color: #facc15; padding: 2px 8px; border-radius: 6px; font-weight: 700;">${datos.servicio}</span></td>
              </tr>
              <tr class="info-row">
                <td class="info-label">Modelo Renault</td>
                <td class="info-value">${datos.modeloAuto || 'No especificado'}</td>
              </tr>
              ${datos.mensaje ? `
              <tr class="info-row">
                <td class="info-label">Detalles / Síntomas</td>
                <td class="info-value" style="color: #e4e4e7; line-height: 1.4;">${datos.mensaje}</td>
              </tr>
              ` : ''}
            </table>
          </div>

          <div class="cta-bar">
            <a href="https://wa.me/52${datos.telefono.replace(/\D/g, '')}" class="btn-action">
              Contactar por WhatsApp
            </a>
          </div>
        </div>
        
        <div class="footer">
          <p class="footer-text">
            Notificación automática enviada desde el portal web oficial
          </p>
          <p class="footer-text">
            © ${new Date().getFullYear()} Servicio Mecánico Especializado Renault.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
};

// Función para enviar correo de recuperación de contraseña
export const enviarCorreoRecuperacion = async (nombre, correo, token) => {
  try {
    const resetLink = `${getFrontendBaseUrl()}/reset-password/${token}`
    const logoPath = path.join(process.cwd(), 'storage', 'logos', 'logo-Renault.png')
    const attachments = fs.existsSync(logoPath)
      ? [{ filename: 'logo-Renault.png', path: logoPath, cid: 'logoRenault' }]
      : []

    const mailOptions = {
      from: `"Servicio Renault - Sistema de Gestión" <${process.env.EMAIL_USER}>`,
      to: correo,
      subject: '🔑 Recuperación de Contraseña - Sistema de Gestión',
      html: getRecoveryEmailTemplate(nombre, resetLink),
      attachments
    }

    const info = await sendEmail(mailOptions)
    console.log('✅ Correo de recuperación enviado:', info.messageId)
    return { success: true, messageId: info.messageId }
  } catch (error) {
    if (TRANSIENT_SMTP_ERRORS.includes(error.code)) {
      console.warn(`⚠️ Timeout SMTP en correo de recuperación (${error.code}).`)
    } else {
      console.error('❌ Error al enviar correo de recuperación:', error)
    }
    return { success: false, error: error.message, errorCode: error.code }
  }
}

// Función para enviar correo de contacto / solicitud de servicio
export const enviarCorreoContacto = async (param1, telefonoParam, correoParam, asuntoParam) => {
  try {
    const datos = typeof param1 === 'object' && param1 !== null
      ? {
          nombreCompleto: param1.nombreCompleto || 'Cliente',
          telefono: param1.telefono || '',
          correo: param1.correo || '',
          servicio: param1.servicio || param1.asunto || 'Servicio Mecánico General',
          modeloAuto: param1.modeloAuto || 'No especificado',
          mensaje: param1.mensaje || ''
        }
      : {
          nombreCompleto: param1 || 'Cliente',
          telefono: telefonoParam || '',
          correo: correoParam || '',
          servicio: asuntoParam === 'sistema' ? 'Consulta del Sistema' : 'Servicio Mecánico',
          modeloAuto: 'No especificado',
          mensaje: ''
        };

    const logoPath = path.join(process.cwd(), 'storage', 'logos', 'logo-Renault.png')
    const attachments = fs.existsSync(logoPath)
      ? [{ filename: 'logo-Renault.png', path: logoPath, cid: 'logoRenault' }]
      : []

    const mailOptions = {
      from: `"Servicio Mecánico Renault" <${process.env.EMAIL_USER}>`,
      to: 'brunocorona.dev@gmail.com', // Correo del taller
      replyTo: datos.correo || process.env.EMAIL_USER, // Para responder directo al cliente
      subject: `📩 Solicitud de Servicio: ${datos.servicio} - ${datos.nombreCompleto}`,
      html: getContactEmailTemplate(datos),
      attachments
    }

    const info = await sendEmail(mailOptions)
    console.log('✅ Correo de contacto enviado:', info.messageId)
    return { success: true, messageId: info.messageId }
  } catch (error) {
    if (TRANSIENT_SMTP_ERRORS.includes(error.code)) {
      console.warn(`⚠️ Timeout SMTP en correo de contacto (${error.code}).`)
    } else {
      console.error('❌ Error al enviar correo de contacto:', error)
    }
    return { success: false, error: error.message, errorCode: error.code }
  }
}

export default {
  enviarCorreoBienvenida,
  enviarCorreoRecuperacion,
  enviarCorreoContacto
}
