import { fetchTableRows, addRowToTable } from "./glideClient.js";
import { TABLES, LOG_COLUMNS } from "../config/glideSchema.js";

/**
 * Carga el log de notificaciones y devuelve un Map con la MÁXIMA cantidad
 * ya notificada por `${itemRowId}:${eventType}`. Para eventos booleanos
 * (NUEVA_OC, ITEM_AGREGADO) la cantidad siempre es 1. Para OPI_PROGRESO es
 * el conteo de OC recibidas de la última notificación enviada para ese OPI.
 */
export async function loadNotifiedCounts() {
  const rows = await fetchTableRows(TABLES.log);
  const counts = new Map();
  for (const row of rows) {
    const key = `${row[LOG_COLUMNS.itemRowId]}:${row[LOG_COLUMNS.eventType]}`;
    const cantidad = Number(row[LOG_COLUMNS.cantidad]) || 1;
    counts.set(key, Math.max(counts.get(key) || 0, cantidad));
  }
  return counts;
}

/**
 * Registra en Glide que un evento ya fue notificado.
 */
export async function recordNotification({ itemRowId, eventType, cantidad, detalle }) {
  await addRowToTable(TABLES.log, {
    [LOG_COLUMNS.itemRowId]: itemRowId,
    [LOG_COLUMNS.eventType]: eventType,
    [LOG_COLUMNS.fecha]: new Date().toISOString(),
    [LOG_COLUMNS.cantidad]: cantidad || 1,
    [LOG_COLUMNS.detalle]: detalle || "",
  });
}
