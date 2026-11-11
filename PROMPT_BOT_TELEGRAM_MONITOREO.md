# Guía y Prompt Maestro: Bot de Monitoreo para Telegram

Este documento contiene las instrucciones de configuración y el **Prompt Maestro** para que puedas implementarlo o pedirle a una IA que lo integre en cualquiera de tus sistemas de forma estandarizada.

---

## 1. Credenciales del Bot de Telegram (Ya Creado y Activo)

El bot de Telegram ya está creado y configurado para enviar alertas al chat personal. Utiliza directamente estas credenciales en el archivo `.env`:

```env
TELEGRAM_BOT_TOKEN="9294600811:AAH6FNZhgLLEXzt3v6RXEw6P2uTt475oXIo"
TELEGRAM_CHAT_ID="1600161481"
```

## 2. Prompt Maestro (Copia y pega este bloque en cualquier proyecto o IA)

```text
Actúa como un Ingeniero de Software Senior especializado en DevOps y Monitoreo de Sistemas.

El bot de Telegram ya se encuentra creado y listo para operar. Necesito que implementes un servicio ligero de monitoreo en segundo plano (Worker/Daemon) que vigile la disponibilidad de mis sistemas y envíe alertas directas con esas credenciales.

### 1. Variables de entorno configuradas
- TELEGRAM_BOT_TOKEN: 9294600811:AAH6FNZhgLLEXzt3v6RXEw6P2uTt475oXIo
- TELEGRAM_CHAT_ID: 1600161481
- CHECK_INTERVAL_SECONDS: Intervalo de sondeo continuo (por defecto 30 segundos).
- DAILY_REPORT_HOUR: Hora del reporte diario programado en formato 24h (por defecto 12).

### 2. Formato estricto de los mensajes
El bot solo debe enviar exactamente 3 tipos de mensajes, sin textos adicionales:

Tipo 1 - Sistema en línea y saludable:
✅ {Nombre del sistema}

Tipo 2 - Sistema caído (inaccesible, error de conexión o timeout):
❌ {Nombre del sistema}

Tipo 3 - Sistema con fallas o advertencias (código HTTP 5xx, latencia excesiva o error reportado):
⚠️ {Nombre del sistema}
Detalle de los errores: {descripción concisa del error o código de estado}

### 3. Reglas de temporización y disparo

1. Detección instantánea de fallas (Tiempo Real):
   - El monitor debe verificar periódicamente (cada 30 a 60 segundos) el endpoint de salud (ejemplo: /health o /api/health) de cada sistema registrado.
   - Si un sistema cambia de estado (de saludable a caído o a advertencia), debe enviar el mensaje correspondiente (❌ o ⚠️) DE FORMA INMEDIATA.
   - Debe implementar una máquina de estados para evitar spam: cuando un sistema falla, se notifica una sola vez al momento de la caída, no en cada sondeo.
   - Si un sistema caído vuelve a estar en línea, se debe enviar la notificación de recuperación:
     ✅ {Nombre del sistema} (Recuperado)

2. Reporte Diario a las 12:00:
   - Todos los días en punto de las 12:00 (hora local del servidor), el bot debe ejecutar una verificación general de todos los sistemas configurados.
   - Debe enviar un mensaje por cada sistema que se encuentre operativo y en línea con el formato Tipo 1:
     ✅ {Nombre del sistema}

### 4. Estructura de sistemas monitoreados
El monitor debe leer un arreglo o archivo de configuración con los sistemas a vigilar:
[
  {
    nombre: "Taller Mecánico Renault - API",
    url: "https://midominio.com/health",
    timeoutMs: 5000,
    metodo: "GET"
  },
  {
    nombre: "Sistema de Facturación",
    url: "https://facturacion.midominio.com/api/ping",
    timeoutMs: 5000,
    metodo: "GET"
  }
]

### 5. Panel de Configuración en el Frontend (UI/UX)
El sistema debe incluir una tarjeta/sección de configuración visual en el panel de administración con tema oscuro moderno, que permita al usuario gestionar la conexión sin tocar código:

1. **Cabecera Principal**:
   - Ícono de Telegram en contenedor redondeado con brillo azul/cian.
   - Título: "Notificaciones de Telegram".
   - Badge dinámico de estado: "• NOTIFICACIONES ACTIVAS" (verde esmeralda) o "• DESACTIVADO" (gris neutro).
   - Botón superior derecho: "Probar Envío a Telegram" con ícono de avión de papel (ejecuta un test real contra la API de Telegram y muestra alerta de éxito o error).

2. **Fila del Interruptor de Activación**:
   - Contenedor destacado con ícono de campana.
   - Título: "Envío de notificaciones automáticas".
   - Subtítulo: "El bot enviará alertas instantáneas de caídas y el reporte de sistemas activos todos los días a las 12:00."
   - Switch toggle a la derecha con estados "ACTIVADO" / "DESACTIVADO".

3. **Campos de Configuración**:
   - "TOKEN DEL BOT (API TELEGRAM)" con subtítulo "Desde @BotFather", ícono de llave, campo tipo contraseña con botón de ojo para mostrar/ocultar el token.
   - "CHAT ID / CANAL" con subtítulo "Grupo o chat personal", ícono de chat.

4. **Tarjetas Informativas de Mensajes**:
   - Tarjeta 1 (Alertas Instantáneas): Explica los mensajes inmediatos ante fallos (`❌` y `⚠️`).
   - Tarjeta 2 (Reporte Diario): Explica el mensaje programado diario a las 12:00 (`✅`).

5. **Pie de Configuración**:
   - Leyenda de seguridad: "Las credenciales de Telegram se almacenan cifradas en la base interna."
   - Botón de acción: "Guardar Configuración de Telegram".

### 6. Endpoints de Backend Requeridos
- `GET /api/telegram/config`: Obtiene la configuración actual (`activo`, `chatId`, `tokenEnmascarado`).
- `PUT /api/telegram/config`: Guarda y persiste los cambios de configuración y el interruptor de encendido/apagado.
- `POST /api/telegram/test`: Envía un mensaje de prueba inmediato a Telegram para validar las credenciales.

### 7. Entregables requeridos
1. El script completo de monitoreo en Node.js (cero dependencias o con node-cron y fetch nativo).
2. Controlador y rutas de backend en Express para guardar, probar y alternar el bot.
3. Componente de Frontend (Vue 3 / React con Tailwind CSS) que reproduzca exactamente la tarjeta visual de configuración.
4. Manejo robusto de errores de red (ENOTFOUND, ECONNREFUSED, ETIMEDOUT).
5. Instrucciones para correrlo como servicio persistente (PM2, Docker o Systemd).
```

---

## 3. Implementación lista para usar en Node.js (Código de Referencia)

Puedes guardar este código como `telegram-monitor.js` en cualquiera de tus proyectos:

```javascript
import cron from "node-cron";
import dotenv from "dotenv";

dotenv.config();

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "9294600811:AAH6FNZhgLLEXzt3v6RXEw6P2uTt475oXIo";
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || "1600161481";
const INTERVALO_SEGUNDOS = parseInt(process.env.CHECK_INTERVAL_SECONDS || "30", 10);

// Lista de sistemas a monitorear
const SISTEMAS = [
  {
    nombre: "Portal Renault - Taller Notas",
    url: process.env.SYSTEM_1_URL || "http://localhost:3001/health",
    timeoutMs: 5000,
  },
  // Agrega aquí más sistemas según los necesites:
  // {
  //   nombre: "Sistema de Refacciones",
  //   url: "https://refacciones.miempresa.com/health",
  //   timeoutMs: 5000,
  // }
];

// Almacén de estado en memoria para evitar spam
const estados = new Map();

for (const s of SISTEMAS) {
  estados.set(s.nombre, { ultimoEstado: "DESCONOCIDO", falloReportado: false });
}

// Función para enviar mensaje a Telegram
async function enviarTelegram(mensaje) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.warn("[TELEGRAM] Variables TELEGRAM_BOT_TOKEN o TELEGRAM_CHAT_ID no configuradas.");
    return;
  }

  try {
    const endpoint = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: mensaje,
      }),
    });
  } catch (error) {
    console.error("[TELEGRAM] Error al enviar mensaje:", error.message);
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
      return { estado: "ERROR", detalle: `Servidor respondió con código HTTP ${res.status}` };
    } else {
      return { estado: "ADVERTENCIA", detalle: `Respuesta inusual con código HTTP ${res.status}` };
    }
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === "AbortError") {
      return { estado: "CAIDO", detalle: `Tiempo de espera agotado (${sistema.timeoutMs}ms)` };
    }
    return { estado: "CAIDO", detalle: err.message };
  }
}

// Sondeo continuo (alertas instantáneas)
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
      // Si venía de estar caído, notificar recuperación
      if (registro.falloReportado) {
        await enviarTelegram(`✅ ${sistema.nombre} (Servicio Restablecido)`);
        registro.falloReportado = false;
      }
      registro.ultimoEstado = "OK";
    }
  }
}

// Reporte diario a las 12:00 PM
cron.schedule("0 12 * * *", async () => {
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
});

// Iniciar monitoreo continuo
console.log(`[MONITOR] Iniciado. Sondeo cada ${INTERVALO_SEGUNDOS}s. Reporte diario a las 12:00.`);
setInterval(cicloMonitoreo, INTERVALO_SEGUNDOS * 1000);
cicloMonitoreo();
```

---

## 4. Componente de Frontend: Tarjeta de Configuración (Vue 3 + Tailwind CSS)

Puedes incorporar este componente en tu panel de administración (por ejemplo `TelegramConfigCard.vue`) para reproducir fielmente la interfaz visual de configuración:

```html
<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'
import Swal from 'sweetalert2'
import {
  PaperAirplaneIcon,
  BellIcon,
  KeyIcon,
  EyeIcon,
  EyeSlashIcon,
  ChatBubbleLeftRightIcon,
  ShieldCheckIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/vue/24/outline'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

// Estado reactivo del formulario
const form = ref({
  activo: true,
  token: '9294600811:AAH6FNZhgLLEXzt3v6RXEw6P2uTt475oXIo',
  chatId: '1600161481'
})

const mostrarToken = ref(false)
const guardando = ref(false)
const probando = ref(false)

// Cargar configuración guardada
const cargarConfiguracion = async () => {
  try {
    const res = await axios.get(`${API}/telegram/config`)
    if (res.data?.ok && res.data.config) {
      form.value.activo = res.data.config.activo ?? true
      if (res.data.config.chatId) form.value.chatId = res.data.config.chatId
      if (res.data.config.token) form.value.token = res.data.config.token
    }
  } catch (error) {
    console.warn('No se pudo cargar la configuración de Telegram:', error.message)
  }
}

// Probar envío inmediato
const probarEnvio = async () => {
  if (!form.value.token || !form.value.chatId) {
    Swal.fire({
      title: 'Datos Incompletos',
      text: 'Ingresa el Token y el Chat ID antes de realizar la prueba.',
      icon: 'warning',
      background: '#0B132B',
      color: '#fff',
      confirmButtonColor: '#0ea5e9'
    })
    return
  }

  probando.value = true
  try {
    const res = await axios.post(`${API}/telegram/test`, {
      token: form.value.token,
      chatId: form.value.chatId
    })

    if (res.data?.ok) {
      Swal.fire({
        title: '¡Mensaje Enviado!',
        text: 'Revisa tu chat de Telegram. Se ha entregado el mensaje de prueba exitosamente.',
        icon: 'success',
        background: '#0B132B',
        color: '#fff',
        confirmButtonColor: '#0ea5e9'
      })
    } else {
      throw new Error(res.data?.msg || 'Error al enviar mensaje')
    }
  } catch (err) {
    Swal.fire({
      title: 'Error de Conexión',
      text: err.response?.data?.msg || err.message || 'No se pudo contactar con la API de Telegram.',
      icon: 'error',
      background: '#0B132B',
      color: '#fff',
      confirmButtonColor: '#0ea5e9'
    })
  } finally {
    probando.value = false
  }
}

// Guardar configuración
const guardarConfiguracion = async () => {
  guardando.value = true
  try {
    const res = await axios.put(`${API}/telegram/config`, form.value)
    if (res.data?.ok) {
      Swal.fire({
        title: 'Configuración Guardada',
        text: 'Las preferencias del Bot de Telegram han sido actualizadas.',
        icon: 'success',
        background: '#0B132B',
        color: '#fff',
        confirmButtonColor: '#0ea5e9'
      })
    }
  } catch (err) {
    Swal.fire({
      title: 'Error al Guardar',
      text: err.response?.data?.msg || err.message,
      icon: 'error',
      background: '#0B132B',
      color: '#fff',
      confirmButtonColor: '#0ea5e9'
    })
  } finally {
    guardando.value = false
  }
}

onMounted(() => {
  cargarConfiguracion()
})
</script>

<template>
  <div class="w-full rounded-3xl bg-[#091122] border border-cyan-500/25 p-6 sm:p-8 shadow-2xl shadow-cyan-950/40 text-slate-100 font-sans">
    
    <!-- ENCABEZADO PRINCIPAL -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-cyan-500/15">
      <div class="flex items-center gap-4">
        <!-- Ícono circular Telegram -->
        <div class="size-12 rounded-2xl bg-cyan-500/15 border border-cyan-400/30 flex items-center justify-center text-cyan-400 shadow-lg shadow-cyan-500/10 shrink-0">
          <svg class="size-6 fill-current" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .37z"/>
          </svg>
        </div>

        <div>
          <div class="flex items-center gap-3 flex-wrap">
            <h2 class="text-xl font-bold tracking-tight text-white">Notificaciones de Telegram</h2>
            <span
              :class="form.activo
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                : 'bg-zinc-800 text-zinc-400 border border-zinc-700'"
              class="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full"
            >
              {{ form.activo ? '• NOTIFICACIONES ACTIVAS' : '• DESACTIVADO' }}
            </span>
          </div>
          <p class="text-xs text-slate-400 mt-1 max-w-2xl">
            Bot oficial de monitoreo. Envía alertas en tiempo real ante caídas y reportes automáticos del estado del sistema.
          </p>
        </div>
      </div>

      <!-- Botón Probar Envío -->
      <button
        type="button"
        @click="probarEnvio"
        :disabled="probando"
        class="self-start sm:self-center px-4 py-2.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 hover:text-white text-xs font-bold inline-flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50 shrink-0"
      >
        <PaperAirplaneIcon class="size-4" :class="{ 'animate-pulse': probando }" />
        <span>{{ probando ? 'Enviando prueba...' : 'Probar Envío a Telegram' }}</span>
      </button>
    </div>

    <!-- FILA INTERRUPTOR PRINCIPAL (ACTIVAR / DESACTIVAR) -->
    <div class="mt-6 p-4 rounded-2xl bg-[#060c18] border border-cyan-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div class="flex items-center gap-3.5">
        <div class="size-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center shrink-0">
          <BellIcon class="size-5" />
        </div>
        <div>
          <h4 class="text-sm font-bold text-white">Envío de notificaciones automáticas</h4>
          <p class="text-xs text-slate-400 mt-0.5">
            El monitor enviará alertas instantáneas ante cualquier falla y el resumen a las 12:00.
          </p>
        </div>
      </div>

      <!-- Switch Toggle -->
      <label class="relative inline-flex items-center gap-3 cursor-pointer select-none self-end sm:self-center">
        <span class="text-xs font-bold uppercase tracking-wider" :class="form.activo ? 'text-cyan-400' : 'text-slate-500'">
          {{ form.activo ? 'ACTIVADO' : 'DESACTIVADO' }}
        </span>
        <input type="checkbox" v-model="form.activo" class="sr-only peer" />
        <div class="w-12 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-6 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500"></div>
      </label>
    </div>

    <!-- FORMULARIO DE CREDENCIALES -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-5 mt-6">
      <!-- Token del Bot -->
      <div>
        <div class="flex items-center justify-between mb-2">
          <label class="text-xs font-bold uppercase tracking-wider text-slate-300">Token del Bot (API Telegram)</label>
          <span class="text-[11px] text-slate-400 font-mono">Desde @BotFather</span>
        </div>
        <div class="relative flex items-center">
          <KeyIcon class="size-4 text-slate-400 absolute left-3.5 pointer-events-none" />
          <input
            :type="mostrarToken ? 'text' : 'password'"
            v-model="form.token"
            placeholder="Ejemplo: 9294600811:AAH6..."
            class="w-full bg-[#060c18] border border-slate-700/80 focus:border-cyan-400 rounded-xl py-2.5 pl-10 pr-10 text-xs text-white placeholder-slate-600 font-mono focus:outline-none transition-colors"
          />
          <button
            type="button"
            @click="mostrarToken = !mostrarToken"
            class="absolute right-3 text-slate-400 hover:text-white transition-colors cursor-pointer"
            title="Mostrar / Ocultar Token"
          >
            <EyeSlashIcon v-if="mostrarToken" class="size-4" />
            <EyeIcon v-else class="size-4" />
          </button>
        </div>
      </div>

      <!-- Chat ID / Canal -->
      <div>
        <div class="flex items-center justify-between mb-2">
          <label class="text-xs font-bold uppercase tracking-wider text-slate-300">Chat ID / Canal</label>
          <span class="text-[11px] text-slate-400 font-mono">Grupo o chat personal</span>
        </div>
        <div class="relative flex items-center">
          <ChatBubbleLeftRightIcon class="size-4 text-slate-400 absolute left-3.5 pointer-events-none" />
          <input
            type="text"
            v-model="form.chatId"
            placeholder="Ejemplo: 9294600811 o -100..."
            class="w-full bg-[#060c18] border border-slate-700/80 focus:border-cyan-400 rounded-xl py-2.5 pl-10 pr-4 text-xs text-white placeholder-slate-600 font-mono focus:outline-none transition-colors"
          />
        </div>
      </div>
    </div>

    <!-- TARJETAS INFORMATIVAS DE MENSAJES -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
      <div class="p-3.5 rounded-xl bg-[#060c18]/80 border border-slate-800 text-xs">
        <div class="font-bold text-slate-200 flex items-center gap-2 mb-1">
          <XCircleIcon class="size-4 text-red-400" />
          <span>Mensaje 1: Detección Instantánea de Fallas</span>
        </div>
        <p class="text-slate-400 text-[11px] leading-relaxed">
          Si el sistema deja de responder, el bot enviará al instante <code class="text-red-400">❌ (Sistema)</code> o <code class="text-amber-400">⚠️ (Sistema)</code> con los detalles del error.
        </p>
      </div>

      <div class="p-3.5 rounded-xl bg-[#060c18]/80 border border-slate-800 text-xs">
        <div class="font-bold text-slate-200 flex items-center gap-2 mb-1">
          <CheckCircleIcon class="size-4 text-emerald-400" />
          <span>Mensaje 2: Reporte Diario Programado</span>
        </div>
        <p class="text-slate-400 text-[11px] leading-relaxed">
          Todos los días a las 12:00 se envía el estado de salud general con <code class="text-emerald-400">✅ (Sistema)</code> para confirmar que opera con normalidad.
        </p>
      </div>
    </div>

    <!-- PIE DE ACCIONES Y SEGURIDAD -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-8 pt-5 border-t border-cyan-500/15">
      <div class="flex items-center gap-2 text-slate-400 text-xs">
        <ShieldCheckIcon class="size-4 text-cyan-400 shrink-0" />
        <span>Las credenciales de Telegram se almacenan cifradas en la base interna.</span>
      </div>

      <button
        type="button"
        @click="guardarConfiguracion"
        :disabled="guardando"
        class="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-cyan-600/25 transition-all cursor-pointer disabled:opacity-50 shrink-0"
      >
        {{ guardando ? 'Guardando...' : 'Guardar Configuración de Telegram' }}
      </button>
    </div>

  </div>
</template>
```

---

## 5. Endpoints de Backend en Express (Listos para Conectar)

Puedes agregar estas rutas en tu backend para alimentar la tarjeta de configuración:

```javascript
import express from "express";

const router = express.Router();

// En memoria o en base de datos
let configTelegram = {
  activo: true,
  token: process.env.TELEGRAM_BOT_TOKEN || "9294600811:AAH6FNZhgLLEXzt3v6RXEw6P2uTt475oXIo",
  chatId: process.env.TELEGRAM_CHAT_ID || "1600161481",
};

// 1. Obtener configuración
router.get("/config", (req, res) => {
  res.json({
    ok: true,
    config: {
      activo: configTelegram.activo,
      chatId: configTelegram.chatId,
      token: configTelegram.token,
    },
  });
});

// 2. Guardar configuración
router.put("/config", (req, res) => {
  const { activo, token, chatId } = req.body;
  if (activo !== undefined) configTelegram.activo = Boolean(activo);
  if (token) configTelegram.token = token;
  if (chatId) configTelegram.chatId = chatId;

  res.json({ ok: true, msg: "Configuración actualizada con éxito", config: configTelegram });
});

// 3. Probar envío inmediato
router.post("/test", async (req, res) => {
  const { token, chatId } = req.body;
  const useToken = token || configTelegram.token;
  const useChat = chatId || configTelegram.chatId;

  try {
    const telegramUrl = `https://api.telegram.org/bot${useToken}/sendMessage`;
    const resp = await fetch(telegramUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: useChat,
        text: "✅ [Prueba de Conexión]: El Bot de Notificaciones está enlazado correctamente con tu sistema.",
      }),
    });

    const data = await resp.json();
    if (!data.ok) {
      return res.status(400).json({ ok: false, msg: data.description || "Error de Telegram" });
    }

    res.json({ ok: true, msg: "Mensaje de prueba entregado con éxito" });
  } catch (error) {
    res.status(500).json({ ok: false, msg: error.message });
  }
});

export default router;
```

---

## 6. Cómo ponerlo en producción en segundo plano

Para mantenerlo corriendo 24/7 de forma automática:
```bash
npm install pm2 -g
pm2 start telegram-monitor.js --name "bot-monitoreo"
pm2 save
pm2 startup
```

