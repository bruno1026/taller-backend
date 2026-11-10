// models/Workshop.js
import mongoose from "mongoose";

const workshopSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  direccion: String,
  telefono: String,
  logo: String, // path relativo en /storage/logos
  prefill: Object // campo opcional con info por taller
}, { timestamps: true });

export default mongoose.model("Workshop", workshopSchema);
