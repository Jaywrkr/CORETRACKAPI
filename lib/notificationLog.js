import { fetchTableRows, addRowToTable } from "./glideClient.js";
import { TABLES, LOG_COLUMNS } from "../config/glideSchema.js";

/**
 * Carga el log de notificaciones y devuelve un Set con claves
 * `${itemRowId}:${eventType}` ya notificadas.
 */
export async function loadNotifiedKeys() {
  const rows = await fetchTableRows(TABLES.log);
  return new Set(
    rows.map(
      (row) => `${row[LOG_COLUMNS.itemRowId]}:${row[LOG_COLUMNS.eventType]}`
    )
  );
}

/**
 * Registra en Glide que un evento ya fue notificado.
 */
export async function recordNotification({ itemRowId, eventType, detalle }) {
  await addRowToTable(TABLES.log, {
    [LOG_COLUMNS.itemRowId]: itemRowId,
    [LOG_COLUMNS.eventType]: eventType,
    [LOG_COLUMNS.fecha]: new Date().toISOString(),
    [LOG_COLUMNS.detalle]: detalle || "",
  });
}
