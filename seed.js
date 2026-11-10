// seed.js
import mongoose from "mongoose";
import dotenv from "dotenv"; 
dotenv.config();
import Workshop from "./models/Workshop.js";
import User from "./models/User.js";
import bcrypt from "bcrypt";

const main = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Mongo conectado");

  await Workshop.deleteMany({});
  await User.deleteMany({});

  const w1 = new Workshop({
    nombre: "Talisman",
    direccion: "Avenida Talismán 3603, Gustavo A. Madero, CDMX",
    telefono: "5522433546",
    logo: "storage/logos/talisman.png"
  });
  const w2 = new Workshop({
    nombre: "Lutecia",
    direccion: "Av. Carlos Hank Gonzales Mz176 Lt.15 Fracc. Rio de luz C.P 55100",
    telefono: "5563490611",
    logo: "storage/logos/lutecia.png"
  });
  await w1.save();
  await w2.save();

  // Nota: El modelo User tiene un hook pre('save') que encripta la contraseña automáticamente.
  const admin = new User({
    nombre: "Admin",
    correo: "admin@taller.com",
    contraseña: "admin123",
    rol: "admin",
    taller: "Talisman"
  });
  await admin.save();

  console.log("Seed creado. Usuario admin@taller.com / admin123");
  process.exit(0);
};

main().catch(err => { console.error(err); process.exit(1); });
