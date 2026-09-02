import { readJson, writeJson } from "./blobStore.js";

const BLOB_PATH = "coretrack/notification-log.json";

// Forma guardada: { "<itemRowId>:<eventType>": { cantidad, detalle, fecha } }

/**
 * Carga el log de notificaciones y devuelve un Map con la MÁXIMA cantidad
 * ya notificada por `${itemRowId}:${eventType}`. Para eventos booleanos
 * (NUEVA_OC, ITEM_AGREGADO) la cantidad siempre es 1. Para OPI_PROGRESO es
 * el conteo de OC recibidas de la última notificación enviada para ese OPI.
 */
export async function loadNotifiedCounts() {
  const stored = await readJson(BLOB_PATH, {});
  return new Map(
    Object.entries(stored).map(([key, entry]) => [key, Number(entry?.cantidad) || 1])
  );
}

/**
 * Registra que un evento ya fue notificado.
 */
export async function recordNotification({ itemRowId, eventType, cantidad, detalle }) {
  const stored = await readJson(BLOB_PATH, {});
  const key = `${itemRowId}:${eventType}`;
  stored[key] = {
    cantidad: cantidad || 1,
    detalle: detalle || "",
    fecha: new Date().toISOString(),
  };
  await writeJson(BLOB_PATH, stored);
}
