import mongoose from "mongoose";
import bcrypt from "bcrypt";

const userSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  correo: { type: String, required: true, unique: true },
  contraseña: { type: String, required: true },
  rol: {
    type: String,
    enum: ['superadmin', 'admin', 'tecnico', 'empleado'],
    default: 'tecnico'
  },
  taller: { type: String, enum: ["Talisman", "Lutecia"], required: true },
  about: { type: String, default: "" }, // 👈 Nuevo campo
  imageUrl: { type: String, default: "" } // 👈 Nuevo campo
}, { timestamps: true });

// Encriptar la contraseña antes de guardar
userSchema.pre("save", async function (next) {
  if (!this.isModified("contraseña")) return next();
  this.contraseña = await bcrypt.hash(this.contraseña, 10);
  next();
});

// Método para comparar contraseñas
userSchema.methods.compararContraseña = function (contraseña) {
  return bcrypt.compare(contraseña, this.contraseña);
};

export default mongoose.model("User", userSchema);