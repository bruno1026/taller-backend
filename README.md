# Taller Notas - Backend API

## Descripcion del Sistema
API REST disenada para la gestion operativa de un taller mecanico especializado en vehiculos de la marca Renault. Provee la logica de negocio, persistencia de datos y servicios de apoyo para la recepcion de vehiculos, control de notas de servicio, generacion de ordenes de trabajo en formato PDF y gestion de solicitudes de cotizacion.

## Para Que Sirve
- Autenticacion de Personal: Control de acceso para administradores y tecnicos del taller con tokens seguros JWT y contrasenas encriptadas con bcrypt.
- Control de Notas de Servicio: Registro de vehiculos, kilometraje, piezas reemplazadas, mano de obra, observaciones tecnicas y costo total.
- Generacion de Documentos PDF: Creacion dinamica de comprobantes oficiales con desglose de servicios y garantia para entrega fisica o digital al cliente.
- Cotizaciones de Clientes: Recepcion y almacenamiento de solicitudes de presupuesto provenientes de la interfaz web publica.
- Notificaciones por Correo: Envio automatico de avisos de recepcion y estatus de servicio mediante servidor SMTP.

## Tecnologias Utilizadas
- Node.js: Entorno de ejecucion en el servidor.
- Express.js: Framework web para la creacion de endpoints RESTful.
- MongoDB y Mongoose: Base de datos documental NoSQL y modelado de esquemas.
- JSON Web Token (JWT): Mecanismo de autenticacion sin estado.
- Bcrypt: Cifrado unidireccional de credenciales.
- PDFKit: Motor para construccion programatica de documentos PDF.
- Multer: Manejo de carga de archivos (imagenes de perfil y logotipos).
- Nodemailer: Modulo para transporte de correo electronico.
- Dotenv y CORS: Manejo de variables de entorno y politicas de origen cruzado.

## Requisitos Previos
- Node.js version 18.0.0 o superior
- Instancia activa de MongoDB (local o MongoDB Atlas)
- Gestor de paquetes npm (o pnpm)

## Instrucciones de Instalacion

1. Navegar al directorio del backend:
```bash
cd backend
```

2. Instalar dependencias del proyecto:
```bash
npm install
```

3. Crear el archivo de variables de entorno:
Crear una copia de `.env.example` con el nombre `.env`:

En Linux / macOS:
```bash
cp .env.example .env
```

En Windows PowerShell:
```powershell
Copy-Item .env.example .env
```

4. Configurar las variables requeridas en `.env`:
```env
PORT=3001
MONGO_URI=mongodb://localhost:27017/taller_notas
JWT_SECRET=tu_clave_secreta_jwt
JWT_EXPIRES_IN=7d
PDF_STORAGE=storage/pdfs
EMAIL_USER=tu_correo@dominio.com
EMAIL_PASSWORD=tu_contrasena_de_aplicacion
FRONTEND_URL=http://localhost:5174
```

5. (Opcional) Cargar datos de prueba o usuario inicial:
```bash
node seed.js
```

6. Ejecutar el servidor en modo desarrollo:
```bash
npm run dev
```

7. Ejecutar en modo produccion:
```bash
npm start
```

El servidor quedara disponible en `http://localhost:3001/api`.

