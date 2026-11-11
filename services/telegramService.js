import TelegramConfig from "../models/TelegramConfig.js";

// Cache en memoria
let cachedConfig = {
  activo: true,
  token: process.env.TELEGRAM_BOT_TOKEN || "9294600811:AAH6FNZhgLLEXzt3v6RXEw6P2uTt475oXIo",
  chatId: process.env.TELEGRAM_CHAT_ID || "1600161481",
  ultimoEstado: "OK",
  falloReportado: false,
};

// Cargar o inicializar configuración desde MongoDB
export const getTelegramConfig = async () => {
  try {
    let doc = await TelegramConfig.findOne();
    if (!doc) {
      doc = await TelegramConfig.create({
        activo: true,
        token: process.env.TELEGRAM_BOT_TOKEN || "9294600811:AAH6FNZhgLLEXzt3v6RXEw6P2uTt475oXIo",
        chatId: process.env.TELEGRAM_CHAT_ID || "1600161481",
      });
    }

    cachedConfig.activo = doc.activo;
    cachedConfig.token = doc.token || cachedConfig.token;
    cachedConfig.chatId = doc.chatId || cachedConfig.chatId;

    return doc;
  } catch (error) {
    console.warn("[TELEGRAM] Error al leer configuración de BD:", error.message);
    return cachedConfig;
  }
};

// Actualizar configuración
export const saveTelegramConfig = async ({ activo, token, chatId }) => {
  try {
    let doc = await TelegramConfig.findOne();
    if (!doc) {
      doc = new TelegramConfig();
    }

    if (activo !== undefined) doc.activo = Boolean(activo);
    if (token) doc.token = token.trim();
    if (chatId) doc.chatId = chatId.trim();

    await doc.save();

    cachedConfig.activo = doc.activo;
    cachedConfig.token = doc.token;
    cachedConfig.chatId = doc.chatId;

    return doc;
  } catch (error) {
    console.error("[TELEGRAM] Error al guardar configuración:", error.message);
    throw error;
  }
};

// Envío a Telegram con fetch nativo
export const sendTelegramMessage = async (mensaje, customToken = null, customChatId = null) => {
  const token = customToken || cachedConfig.token;
  const chatId = customChatId || cachedConfig.chatId;

  if (!token || !chatId) {
    console.warn("[TELEGRAM] Token o Chat ID faltante.");
    return { ok: false, msg: "Token o Chat ID no configurado" };
  }

  try {
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: mensaje,
      }),
    });

    const data = await res.json();
    if (!data.ok) {
      return { ok: false, msg: data.description || "Error de la API de Telegram" };
    }

    return { ok: true, data };
  } catch (error) {
    return { ok: false, msg: error.message };
  }
};

// Verificación de salud del servidor actual
async function verificarSaludServidor() {
  const port = process.env.PORT || 3001;
  const url = `http://localhost:${port}/health`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 4000);

  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (res.status >= 200 && res.status < 300) {
      return { estado: "OK", detalle: "" };
    } else if (res.status >= 500) {
      return { estado: "ERROR", detalle: `HTTP ${res.status}` };
    }
    return { estado: "ADVERTENCIA", detalle: `HTTP ${res.status}` };
  } catch (err) {
    clearTimeout(timeoutId);
    return { estado: "CAIDO", detalle: err.message };
  }
}

// Iniciar monitoreo en segundo plano
export const iniciarMonitoreoInterno = async () => {
  await getTelegramConfig();

  const NOMBRE_SISTEMA = "Servicio Renault - Taller Notas";

  // 1. Sondeo periódico cada 30 segundos para detección instantánea
  setInterval(async () => {
    if (!cachedConfig.activo) return;

    const res = await verificarSaludServidor();

    if (res.estado === "CAIDO") {
      if (cachedConfig.ultimoEstado !== "CAIDO") {
        await sendTelegramMessage(`❌ ${NOMBRE_SISTEMA}`);
        cachedConfig.ultimoEstado = "CAIDO";
        cachedConfig.falloReportado = true;
      }
    } else if (res.estado === "ERROR" || res.estado === "ADVERTENCIA") {
      if (cachedConfig.ultimoEstado !== res.estado) {
        await sendTelegramMessage(`⚠️ ${NOMBRE_SISTEMA}\nDetalle de los errores: ${res.detalle}`);
        cachedConfig.ultimoEstado = res.estado;
        cachedConfig.falloReportado = true;
      }
    } else if (res.estado === "OK") {
      if (cachedConfig.falloReportado) {
        await sendTelegramMessage(`✅ ${NOMBRE_SISTEMA} (Servicio Restablecido)`);
        cachedConfig.falloReportado = false;
      }
      cachedConfig.ultimoEstado = "OK";
    }
  }, 30 * 1000);

  // 2. Programador para el reporte diario a las 12:00 PM
  const programarReporte12 = () => {
    const ahora = new Date();
    const siguiente = new Date(ahora);
    siguiente.setHours(12, 0, 0, 0);
    if (ahora >= siguiente) {
      siguiente.setDate(siguiente.getDate() + 1);
    }
    const ms = siguiente.getTime() - ahora.getTime();

    setTimeout(async () => {
      if (cachedConfig.activo) {
        const res = await verificarSaludServidor();
        if (res.estado === "OK") {
          await sendTelegramMessage(`✅ ${NOMBRE_SISTEMA}`);
        } else if (res.estado === "CAIDO") {
          await sendTelegramMessage(`❌ ${NOMBRE_SISTEMA}`);
        } else {
          await sendTelegramMessage(`⚠️ ${NOMBRE_SISTEMA}\nDetalle de los errores: ${res.detalle}`);
        }
      }
      programarReporte12();
    }, ms);
  };

  programarReporte12();
  console.log("[TELEGRAM SERVICE] Monitoreo automático inicializado.");
};

