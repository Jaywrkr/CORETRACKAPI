import { readJson, writeJson } from "./blobStore.js";
import { EVENT_TYPES } from "../config/glideSchema.js";

const BLOB_PATH = "coretrack/templates.json";

// Clave de la plantilla del resumen diario (no es un EVENT_TYPES real: es
// el correo que agrupa todos los eventos del día para un mismo
// destinatario). Ver lib/digest.js.
export const DIGEST_KEY = "digest";

// Todas las claves editables desde /admin: un tab por tipo de evento más
// el resumen diario.
export const TEMPLATE_KEYS = [...Object.values(EVENT_TYPES), DIGEST_KEY];

// Plantillas por defecto, usadas si todavía no se guardó nada desde /admin.
// DIGEST_KEY es el sobre común a los 4 correos (uno por tipo de evento por
// día): {{tipo}} dice cuál de los 4 es ("Nuevas Órdenes de Compra",
// "Hardware agregado", etc.), {{total}} cuántos eventos de ese tipo hay hoy.
export const DEFAULT_TEMPLATES = {
  [DIGEST_KEY]: {
    asunto: "CoreTrack — {{tipo}} ({{total}}) — {{fecha}}",
    cuerpo: "Resumen de {{tipo}} de hoy en CoreTrack.",
  },
  [EVENT_TYPES.NUEVA_OC]: {
    asunto: "Nueva OC registrada: {{numeroOC}}",
    cuerpo:
      "Se registró una nueva Orden de Compra en CoreTrack.\n\n" +
      "N° OC: {{numeroOC}}\nProveedor: {{proveedor}}\nCliente: {{cliente}}\nOPI: {{opi}}",
  },
  [EVENT_TYPES.HW_AGREGADO]: {
    asunto: "Hardware agregado a OC {{numeroOC}}",
    cuerpo:
      "Se agregó un hardware a una Orden de Compra existente.\n\n" +
      "N° OC: {{numeroOC}}\nProducto: {{producto}}\nDescripción: {{descripcion}}\nSerial: {{serial}}",
  },
  [EVENT_TYPES.SW_AGREGADO]: {
    asunto: "Software agregado a OC {{numeroOC}}",
    cuerpo:
      "Se agregó un software a una Orden de Compra existente.\n\n" +
      "N° OC: {{numeroOC}}\nProducto: {{producto}}\nDescripción: {{descripcion}}\nSerial: {{serial}}",
  },
  [EVENT_TYPES.OPI_PROGRESO]: {
    asunto: "OPI {{opi}}: llegaron {{recibidas}} de {{total}}",
    cuerpo:
      "Avance en la recepción del OPI {{opi}} ({{estado}}).\n\n" +
      "Órdenes de Compra recibidas: {{recibidas}} de {{total}}",
  },
};

// Placeholders válidos por tipo de evento, para mostrarlos en /admin.
export const TEMPLATE_PLACEHOLDERS = {
  [DIGEST_KEY]: ["tipo", "total", "fecha"],
  [EVENT_TYPES.NUEVA_OC]: ["numeroOC", "proveedor", "cliente", "opi"],
  [EVENT_TYPES.HW_AGREGADO]: ["numeroOC", "producto", "descripcion", "serial"],
  [EVENT_TYPES.SW_AGREGADO]: ["numeroOC", "producto", "descripcion", "serial"],
  [EVENT_TYPES.OPI_PROGRESO]: ["opi", "recibidas", "total", "estado"],
};

/**
 * Reemplaza placeholders {{campo}} en un string con los valores del payload.
 * Un placeholder sin valor se reemplaza por string vacío (no revienta).
 */
export function renderTemplate(str, payload) {
  return String(str || "").replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) => {
    const value = payload[key];
    return value === undefined || value === null ? "" : String(value);
  });
}

/**
 * Carga las plantillas guardadas en Vercel Blob, mezclando con los
 * defaults para cualquier evento que todavía no se haya editado.
 * @returns {Record<string, {asunto: string, cuerpo: string}>}
 */
export async function loadTemplates() {
  const stored = await readJson(BLOB_PATH, {});
  return { ...DEFAULT_TEMPLATES, ...stored };
}

/**
 * Guarda (crea o actualiza) la plantilla de un evento en Vercel Blob.
 */
export async function saveTemplate(eventType, { asunto, cuerpo }) {
  const stored = await readJson(BLOB_PATH, {});
  stored[eventType] = { asunto, cuerpo };
  await writeJson(BLOB_PATH, stored);
}
