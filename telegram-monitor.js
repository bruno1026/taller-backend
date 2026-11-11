/**
 * Monitor de Sistemas en Tiempo Real para Telegram
 * Compatible con Node.js 18+ (Cero dependencias externas requeridas)
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cargar variables de entorno manualmente o desde backend/.env si existe
const envPath = path.join(__dirname, "backend", ".env");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const [k, ...v] = trimmed.split("=");
    if (k && v.length > 0 && !process.env[k.trim()]) {
      process.env[k.trim()] = v.join("=").trim().replace(/^["']|["']$/g, "");
    }
  }
}

// Credenciales oficiales configuradas
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "9294600811:AAH6FNZhgLLEXzt3v6RXEw6P2uTt475oXIo";
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || "1600161481";
const INTERVALO_SEGUNDOS = parseInt(process.env.CHECK_INTERVAL_SECONDS || "30", 10);
const HORA_REPORTE = parseInt(process.env.DAILY_REPORT_HOUR || "12", 10);

// Lista de sistemas a vigilar
const SISTEMAS = [
  {
    nombre: "Portal Renault - Taller Notas",
    url: process.env.SYSTEM_1_URL || "http://localhost:3001/health",
    timeoutMs: 5000,
  },
  // Puedes agregar todos los sistemas que manejes:
  // {
  //   nombre: "Sistema de Inventario",
  //   url: "https://inventario.miempresa.com/health",
  //   timeoutMs: 5000,
  // }
];

// Almacén en memoria para control de estado anti-spam
const estados = new Map();
for (const s of SISTEMAS) {
  estados.set(s.nombre, { ultimoEstado: "DESCONOCIDO", falloReportado: false });
}

// Envío a Telegram mediante la API oficial
async function enviarTelegram(mensaje) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.warn("[TELEGRAM] Variables no configuradas.");
    return false;
  }

  try {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: mensaje,
      }),
    });

    const data = await res.json();
    if (!data.ok) {
      console.error("[TELEGRAM ERROR]:", data.description);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[TELEGRAM ERROR]:", err.message);
    return false;
  }
}

// Verificación individual de un sistema
async function verificarSistema(sistema) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), sistema.timeoutMs);

  try {
    const res = await fetch(sistema.url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (res.status >= 200 && res.status < 300) {
      return { estado: "OK", detalle: "" };
    } else if (res.status >= 500) {
      return { estado: "ERROR", detalle: `Código HTTP ${res.status}` };
    } else {
      return { estado: "ADVERTENCIA", detalle: `Código HTTP inesperado ${res.status}` };
    }
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === "AbortError") {
      return { estado: "CAIDO", detalle: `Timeout (${sistema.timeoutMs}ms)` };
    }
    return { estado: "CAIDO", detalle: err.message };
  }
}

// Sondeo continuo en tiempo real
async function cicloMonitoreo() {
  for (const sistema of SISTEMAS) {
    const resultado = await verificarSistema(sistema);
    const registro = estados.get(sistema.nombre);

    if (resultado.estado === "CAIDO") {
      if (registro.ultimoEstado !== "CAIDO") {
        await enviarTelegram(`❌ ${sistema.nombre}`);
        registro.ultimoEstado = "CAIDO";
        registro.falloReportado = true;
      }
    } else if (resultado.estado === "ERROR" || resultado.estado === "ADVERTENCIA") {
      if (registro.ultimoEstado !== resultado.estado) {
        await enviarTelegram(`⚠️ ${sistema.nombre}\nDetalle de los errores: ${resultado.detalle}`);
        registro.ultimoEstado = resultado.estado;
        registro.falloReportado = true;
      }
    } else if (resultado.estado === "OK") {
      if (registro.falloReportado) {
        await enviarTelegram(`✅ ${sistema.nombre} (Restablecido)`);
        registro.falloReportado = false;
      }
      registro.ultimoEstado = "OK";
    }
  }
}

// Reporte diario a la hora programada (12:00 PM por defecto)
async function ejecutarReporteDiario() {
  for (const sistema of SISTEMAS) {
    const resultado = await verificarSistema(sistema);
    if (resultado.estado === "OK") {
      await enviarTelegram(`✅ ${sistema.nombre}`);
    } else if (resultado.estado === "CAIDO") {
      await enviarTelegram(`❌ ${sistema.nombre}`);
    } else {
      await enviarTelegram(`⚠️ ${sistema.nombre}\nDetalle de los errores: ${resultado.detalle}`);
    }
  }
}

// Programador nativo sin dependencias
function iniciarProgramadorDiario(hora = HORA_REPORTE) {
  const calcularMs = () => {
    const ahora = new Date();
    const siguiente = new Date(ahora);
    siguiente.setHours(hora, 0, 0, 0);
    if (ahora >= siguiente) {
      siguiente.setDate(siguiente.getDate() + 1);
    }
    return siguiente.getTime() - ahora.getTime();
  };

  const programar = () => {
    const ms = calcularMs();
    const minutos = Math.round(ms / 60000);
    console.log(`[REPORTE] Próximo reporte programado en ${minutos} minutos (a las ${hora}:00 hrs).`);
    setTimeout(async () => {
      await ejecutarReporteDiario();
      programar();
    }, ms);
  };

  programar();
}

// Inicialización del servicio
console.log(`[MONITOR TELEGRAM ACTIVO]`);
console.log(`- Chat ID: ${TELEGRAM_CHAT_ID}`);
console.log(`- Sistemas en vigilancia: ${SISTEMAS.length}`);
console.log(`- Frecuencia de chequeo: cada ${INTERVALO_SEGUNDOS} segundos.`);

// Sondeo periódico
setInterval(cicloMonitoreo, INTERVALO_SEGUNDOS * 1000);
// Primer chequeo inmediato
cicloMonitoreo();
// Programador diario a las 12:00
iniciarProgramadorDiario(HORA_REPORTE);
