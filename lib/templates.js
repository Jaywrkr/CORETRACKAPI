import { readJson, writeJson } from "./blobStore.js";
import { EVENT_TYPES } from "../config/glideSchema.js";

const BLOB_PATH = "coretrack/templates.json";

// Plantillas por defecto, usadas si todavía no se guardó nada desde /admin.
export const DEFAULT_TEMPLATES = {
  [EVENT_TYPES.NUEVA_OC]: {
    asunto: "Nueva OC registrada: {{numeroOC}}",
    cuerpo:
      "Se registró una nueva Orden de Compra en CoreTrack.\n\n" +
      "N° OC: {{numeroOC}}\nProveedor: {{proveedor}}\nCliente: {{cliente}}\nOPI: {{opi}}",
  },
  [EVENT_TYPES.ITEM_AGREGADO]: {
    asunto: "Item agregado a OC {{numeroOC}}",
    cuerpo:
      "Se agregó un item ({{sourceType}}) a una Orden de Compra existente.\n\n" +
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
  [EVENT_TYPES.NUEVA_OC]: ["numeroOC", "proveedor", "cliente", "opi"],
  [EVENT_TYPES.ITEM_AGREGADO]: [
    "numeroOC",
    "producto",
    "descripcion",
    "serial",
    "sourceType",
  ],
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
