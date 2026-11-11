import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  // Actualizar Bruno a superadmin
  const u1 = await mongoose.connection.collection('users').updateOne(
    { correo: 'brunocorona.dev@gmail.com' },
    { $set: { rol: 'superadmin' } }
  );
  const u2 = await mongoose.connection.collection('users').updateOne(
    { correo: 'bruno@bruno.com' },
    { $set: { rol: 'superadmin' } }
  );
  console.log('Promocionados a superadmin:', u1.modifiedCount, u2.modifiedCount);

  // Asegurar que las notas existentes tengan creadoPor con el usuario Bruno o admin
  const bruno = await mongoose.connection.collection('users').findOne({ correo: 'brunocorona.dev@gmail.com' });
  if (bruno) {
    const notasSinCreador = await mongoose.connection.collection('notes').updateMany(
      { creadoPor: { $exists: false } },
      {
        $set: {
          creadoPor: {
            usuarioId: bruno._id,
            nombre: bruno.nombre,
            correo: bruno.correo,
            rol: 'superadmin'
          },
          fueEditada: false,
          historialEdiciones: []
        }
      }
    );
    console.log('Notas existentes asociadas a Bruno:', notasSinCreador.modifiedCount);
  }

  const users = await mongoose.connection.collection('users').find({}, { projection: { nombre: 1, correo: 1, rol: 1 } }).toArray();
  console.log('USUARIOS ACTUALES:', JSON.stringify(users, null, 2));

  await mongoose.disconnect();
}

run().catch(console.error);

