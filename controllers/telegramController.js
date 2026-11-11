import {
  getTelegramConfig,
  saveTelegramConfig,
  sendTelegramMessage,
} from "../services/telegramService.js";

// Obtener configuración de Telegram
export const getTelegramSettings = async (req, res) => {
  try {
    const config = await getTelegramConfig();
    res.json({
      ok: true,
      config: {
        activo: config.activo,
        token: config.token,
        chatId: config.chatId,
        ultimoReporte: config.ultimoReporte,
      },
    });
  } catch (error) {
    console.error("Error en getTelegramSettings:", error);
    res.status(500).json({ ok: false, msg: "Error al obtener configuración de Telegram", error: error.message });
  }
};

// Actualizar configuración
export const updateTelegramSettings = async (req, res) => {
  try {
    const { activo, token, chatId } = req.body;

    const updated = await saveTelegramConfig({ activo, token, chatId });

    res.json({
      ok: true,
      msg: "Configuración de Telegram guardada correctamente",
      config: {
        activo: updated.activo,
        token: updated.token,
        chatId: updated.chatId,
      },
    });
  } catch (error) {
    console.error("Error en updateTelegramSettings:", error);
    res.status(500).json({ ok: false, msg: "Error al guardar configuración de Telegram", error: error.message });
  }
};

// Enviar mensaje de prueba inmediato
export const testTelegramConnection = async (req, res) => {
  try {
    const { token, chatId } = req.body;

    const mensajePrueba = "✅ [Prueba de Conexión]: El Bot de Notificaciones está enlazado correctamente con tu sistema de Taller Renault.";
    const result = await sendTelegramMessage(mensajePrueba, token, chatId);

    if (!result.ok) {
      return res.status(400).json({
        ok: false,
        msg: result.msg || "No se pudo entregar el mensaje de prueba a Telegram",
      });
    }

    res.json({
      ok: true,
      msg: "Mensaje de prueba entregado exitosamente a tu chat de Telegram",
    });
  } catch (error) {
    console.error("Error en testTelegramConnection:", error);
    res.status(500).json({ ok: false, msg: "Error al enviar prueba de Telegram", error: error.message });
  }
};

