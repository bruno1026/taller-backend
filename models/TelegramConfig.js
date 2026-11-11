import mongoose from "mongoose";

const TelegramConfigSchema = new mongoose.Schema(
  {
    activo: {
      type: Boolean,
      default: true,
    },
    token: {
      type: String,
      default: process.env.TELEGRAM_BOT_TOKEN || "9294600811:AAH6FNZhgLLEXzt3v6RXEw6P2uTt475oXIo",
      trim: true,
    },
    chatId: {
      type: String,
      default: process.env.TELEGRAM_CHAT_ID || "1600161481",
      trim: true,
    },
    ultimoReporte: {
      type: Date,
      default: null,
    },
    ultimoFalloReportado: {
      type: Boolean,
      default: false,
    },
    ultimoEstado: {
      type: String,
      default: "OK",
    },
  },
  { timestamps: true }
);

export default mongoose.model("TelegramConfig", TelegramConfigSchema);

