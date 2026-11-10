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
}, { timestamps: true });

export default mongoose.model("Note", noteSchema);
