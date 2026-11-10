import mongoose from "mongoose";

const contactSchema = new mongoose.Schema(
  {
    nombreCompleto: { type: String, required: true },
    telefono: { type: String, required: true },
    correo: { type: String, required: true },
    servicio: { type: String, required: true },
    modeloAuto: { type: String, default: "" },
    mensaje: { type: String, default: "" },
    estado: {
      type: String,
      enum: ["pendiente", "contactado", "agendado", "archivado"],
      default: "pendiente",
    },
  },
  { timestamps: true }
);

export default mongoose.model("Contact", contactSchema);

