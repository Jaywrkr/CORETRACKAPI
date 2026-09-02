import { fetchTableRows, addRowToTable, setColumnsInRow } from "./glideClient.js";
import { TABLES, TEMPLATE_COLUMNS, EVENT_TYPES } from "../config/glideSchema.js";

// Plantillas por defecto, usadas si la tabla de Glide todavía no tiene una
// fila para ese evento (o si la tabla está vacía/no existe todavía).
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
 * Carga las plantillas desde la tabla de Glide, mezclando con los defaults
 * para cualquier evento que todavía no tenga fila propia.
 * @returns {Record<string, {rowId?: string, asunto: string, cuerpo: string}>}
 */
export async function loadTemplates() {
  const templates = { ...DEFAULT_TEMPLATES };
  const rows = await fetchTableRows(TABLES.templates);
  for (const row of rows) {
    const eventType = row[TEMPLATE_COLUMNS.eventType];
    if (!eventType) continue;
    templates[eventType] = {
      rowId: row[TEMPLATE_COLUMNS.rowId],
      asunto: row[TEMPLATE_COLUMNS.asunto] || DEFAULT_TEMPLATES[eventType]?.asunto || "",
      cuerpo: row[TEMPLATE_COLUMNS.cuerpo] || DEFAULT_TEMPLATES[eventType]?.cuerpo || "",
    };
  }
  return templates;
}

/**
 * Crea o actualiza la plantilla de un evento en la tabla de Glide.
 */
export async function saveTemplate(eventType, { asunto, cuerpo }) {
  const rows = await fetchTableRows(TABLES.templates);
  const existing = rows.find((row) => row[TEMPLATE_COLUMNS.eventType] === eventType);
  const columnValues = {
    [TEMPLATE_COLUMNS.eventType]: eventType,
    [TEMPLATE_COLUMNS.asunto]: asunto,
    [TEMPLATE_COLUMNS.cuerpo]: cuerpo,
  };

  if (existing) {
    await setColumnsInRow(TABLES.templates, existing[TEMPLATE_COLUMNS.rowId], columnValues);
  } else {
    await addRowToTable(TABLES.templates, columnValues);
  }
}
