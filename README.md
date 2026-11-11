# Taller Notas - Backend API

## Descripcion del Sistema
API REST profesional disenada para la administracion operativa integral de talleres mecanicos especializados en la marca Renault. Provee la logica de negocio, persistencia de datos, seguridad por roles y servicios automatizados para la recepcion de vehiculos, control de notas de servicio, generacion de comprobantes oficiales en PDF, monitoreo en tiempo real por Telegram y respaldo del almacenamiento.

## Modulos y Funcionalidades Principales

### 1. Sistema de Autenticacion y Jerarquia de Roles
- Superadministrador: Acceso total al sistema, configuracion del bot de Telegram, administracion de usuarios, descarga de respaldos ZIP y ejecucion de purga de base de datos.
- Administrador: Gestion de recepcion en talleres, consulta completa del historial de notas, acceso al gestor de archivos y descarga de respaldos.
- Tecnico Mecanico: Acceso a recepcion de talleres y consulta exclusiva de las notas de servicio generadas por su propia cuenta, sin permisos de eliminacion.

### 2. Control y Trazabilidad de Notas de Servicio
- Registro de vehiculos, kilometraje, piezas reemplazadas, mano de obra, garantias y calculo automatico de importes.
- Auditoria en cada nota: registro del usuario creador y bitacora de modificaciones con fecha y responsable.
- Restriccion estricta: los tecnicos solo pueden ver y editar sus propias notas de servicio. La eliminacion de notas esta reservada exclusivamente para administradores y superadministrador.

### 3. Gestor de Archivos y Respaldo Integral
- Organizacion cronologica automatica en carpetas estructuradas por Anio y Mes dentro del servidor.
- Regeneracion automatica de documentos PDF en caliente si un archivo fisico fue removido del almacenamiento.
- Generacion y descarga de Respaldo ZIP completo: comprime todos los documentos PDF organizados por anio y mes, e incluye una exportacion completa en formato JSON con la base de datos de notas.
- Purga segura del sistema: accion exclusiva de superadministrador para reiniciar o vaciar la base de datos de notas y el almacenamiento de PDFs bajo confirmacion de seguridad.

### 4. Monitoreo Automatizado con Bot de Telegram
- Sondeo continuo de disponibilidad del servidor.
- Notificacion instantanea ante caidas del servicio o errores criticos.
- Reporte diario automatico del estado del sistema.
- Alerta inmediata de auditoria cuando se ejecuta una purga de la base de datos.
- Configuracion persistente en base de datos para activar o desactivar las alertas y probar la conexion en cualquier momento.

### 5. Cotizaciones y Notificaciones por Correo
- Recepcion de solicitudes de cotizacion desde el portal web publico.
- Envio de correos de confirmacion y recuperacion de contrasena mediante transporte seguro de mensajeria.

## Tecnologias Utilizadas
- Node.js: Entorno de ejecucion en el servidor.
- Express.js: Framework web para definicion de rutas y endpoints REST.
- MongoDB y Mongoose: Base de datos NoSQL y definicion de esquemas de datos.
- JSON Web Token: Mecanismo de autenticacion sin estado.
- Bcrypt: Cifrado unidireccional de contrasenas.
- PDFKit: Motor para construccion de documentos PDF oficiales.
- Archiver: Compilacion y compresion de archivos en formato ZIP.
- Multer: Procesamiento de carga de archivos de imagen y logotipos.
- Nodemailer: Modulo para envio de correos electronicos.

## Requisitos del Entorno
- Node.js version 18 o superior
- Instancia activa de MongoDB local o remota en la nube
- Gestor de paquetes npm o pnpm

## Instrucciones de Puesta en Marcha

1. Ingresar a la carpeta del proyecto:
```bash
cd backend
```

2. Instalar dependencias:
```bash
npm install
```

3. Archivo de configuracion de entorno:
Crear el archivo de configuracion a partir de la plantilla de ejemplo que se encuentra en la raiz del backend con el nombre de archivo correspondiente a la configuracion local. En dicho archivo se establecen el puerto de escucha, la conexion a la base de datos, el secreto para sesiones, la cuenta de correo para notificaciones y los datos del bot de Telegram.

4. Inicializar base de datos de ejemplo si se requiere:
```bash
node seed.js
```

5. Iniciar en modo desarrollo:
```bash
npm run dev
```

6. Iniciar en modo produccion:
```bash
npm start
```

El servidor quedara disponible en la direccion configurada para la API. Al compilar el frontend mediante Vite, el backend tambien se encargara de servir la aplicacion web de forma directa.
