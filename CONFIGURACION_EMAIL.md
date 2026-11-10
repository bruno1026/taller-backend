# 📧 Configuración de Nodemailer para Gmail

## Configuración del Servicio de Correo

Este sistema utiliza **Nodemailer** para enviar correos electrónicos a los nuevos usuarios con sus credenciales de acceso.

## 📋 Pasos para Configurar Gmail

### 1. **Activar la Verificación en 2 Pasos**
   - Ve a tu [Cuenta de Google](https://myaccount.google.com/)
   - Navega a **Seguridad** → **Verificación en 2 pasos**
   - Activa la verificación en 2 pasos

### 2. **Generar una Contraseña de Aplicación**
   - Una vez activada la verificación en 2 pasos, ve a: [Contraseñas de Aplicación](https://myaccount.google.com/apppasswords)
   - Selecciona la aplicación: **Correo**
   - Selecciona el dispositivo: **Otro (nombre personalizado)**
   - Escribe un nombre como: "Sistema Taller Renault"
   - Haz clic en **Generar**
   - Google te mostrará una contraseña de 16 caracteres (ejemplo: `abcd efgh ijkl mnop`)
   - **¡Copia esta contraseña!** No podrás verla de nuevo

### 3. **Configurar el archivo .env**
   Edita el archivo `backend/.env` y actualiza las siguientes variables:

   ```env
   # Configuración de Email (Nodemailer)
   EMAIL_USER=tucorreo@gmail.com
   EMAIL_PASSWORD=abcd efgh ijkl mnop
   FRONTEND_URL=http://localhost:5173
   ```

   **Importante:**
   - `EMAIL_USER`: Tu dirección de Gmail completa
   - `EMAIL_PASSWORD`: La contraseña de aplicación de 16 caracteres (puede tener espacios)
   - `FRONTEND_URL`: La URL de tu frontend (para los enlaces en el correo)

### 4. **Verificar la Configuración**
   Reinicia el servidor backend:
   ```bash
   cd backend
   npm start
   ```

## 🔐 Otros Servicios de Correo

Si prefieres usar otro servicio de correo, puedes modificar el archivo `backend/utils/emailService.js`:

### Outlook/Hotmail
```javascript
const transporter = nodemailer.createTransporter({
  service: 'outlook',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
})
```

### Yahoo
```javascript
const transporter = nodemailer.createTransporter({
  service: 'yahoo',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
})
```

### SMTP Personalizado
```javascript
const transporter = nodemailer.createTransporter({
  host: 'smtp.tuservidor.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
})
```

## 📨 ¿Qué contiene el correo?

El correo de bienvenida incluye:
- ✅ Saludo personalizado con el nombre del usuario
- ✅ Credenciales de acceso (correo y contraseña)
- ✅ Información del taller asignado
- ✅ Botón directo para iniciar sesión
- ✅ Descripción de funcionalidades del sistema
- ✅ Recordatorio de seguridad para cambiar la contraseña
- ✅ Diseño profesional con el logo de Renault

## 🧪 Probar el Envío de Correos

1. Inicia sesión como administrador en el sistema
2. Ve a la sección de **Usuarios**
3. Haz clic en **+ Registrar usuario**
4. Completa el formulario con un correo real
5. El nuevo usuario recibirá un correo con sus credenciales

## ⚠️ Solución de Problemas

### Error: "Invalid login"
- Verifica que hayas activado la verificación en 2 pasos
- Asegúrate de estar usando una contraseña de aplicación, no tu contraseña normal de Gmail

### Error: "self signed certificate in certificate chain"
- Este error puede ocurrir en algunos entornos. Añade esto temporalmente al transporter:
  ```javascript
  tls: {
    rejectUnauthorized: false
  }
  ```

### No recibo correos
- Revisa la carpeta de **Spam**
- Verifica que el `EMAIL_USER` y `EMAIL_PASSWORD` estén correctos
- Revisa los logs del servidor para ver mensajes de error

## 📝 Notas Importantes

- ⚠️ **Nunca compartas tu contraseña de aplicación** en repositorios públicos
- ⚠️ El archivo `.env` está en `.gitignore` para proteger tus credenciales
- ✅ El sistema continúa funcionando aunque falle el envío del correo
- ✅ Los errores de correo se registran en la consola pero no detienen la creación del usuario

## 🎨 Personalizar la Plantilla del Correo

La plantilla HTML del correo se encuentra en:
```
backend/utils/emailService.js
```

Puedes modificar:
- Colores y estilos
- Contenido del mensaje
- Logo e imágenes
- Enlaces y botones
