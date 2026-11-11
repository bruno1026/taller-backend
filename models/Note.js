import mongoose from "mongoose";

const noteSchema = new mongoose.Schema({
  taller: { type: String, required: true }, // Ej: "Talisman" o "Lutecia"
  fecha: { type: Date, default: Date.now },
  cliente: {
    nombre: String,
    vehiculo: String,
    modelo: String,
    placas: String,
    kilometraje: String,
    servicio: String,
  },
  items: [
    {
      cantidad: Number,
      descripcion: String,
      precio: Number,
    },
  ],
  observaciones: String,
  garantia: String,
  tieneGarantia: { type: Boolean, default: false },
  garantiaTiempo: { type: Number, default: 0 },
  garantiaUnidad: { type: String, default: "meses" },
  incluirFirmas: { type: Boolean, default: true },
  total: Number,
  daños: [
    {
      id: Number,
      x: Number,
      y: Number,
      tipo: String,
      descripcion: String,
      timestamp: String,
    },
  ],
  pdfPath: String, // Ruta del archivo PDF generado
  creadoPor: {
    usuarioId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    nombre: { type: String, default: "Personal del Taller" },
    correo: { type: String, default: "" },
    rol: { type: String, default: "tecnico" },
  },
  fueEditada: { type: Boolean, default: false },
  editadoPor: {
    usuarioId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    nombre: String,
    correo: String,
    rol: String,
    fecha: Date,
  },
  historialEdiciones: [
    {
      usuarioId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      nombre: String,
      correo: String,
      rol: String,
      fecha: { type: Date, default: Date.now },
    },
  ],
}, { timestamps: true });

export default mongoose.model("Note", noteSchema);
