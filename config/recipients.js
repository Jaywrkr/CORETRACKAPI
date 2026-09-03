import { EVENT_TYPES } from "./glideSchema.js";

// Destinatarios fijos adicionales por tipo de evento, vía env vars
// (lista separada por comas). Se combinan con los correos que traiga
// la propia fila de Glide (ej. Correo 0/1/2 de la OC).
const EXTRA_RECIPIENTS_ENV = {
  [EVENT_TYPES.NUEVA_OC]: "NOTIFY_EXTRA_NUEVA_OC",
  [EVENT_TYPES.HW_AGREGADO]: "NOTIFY_EXTRA_HW_AGREGADO",
  [EVENT_TYPES.SW_AGREGADO]: "NOTIFY_EXTRA_SW_AGREGADO",
  [EVENT_TYPES.OPI_PROGRESO]: "NOTIFY_EXTRA_OPI_PROGRESO",
};

function parseEmailList(value) {
  if (!value) return [];
  return value
    .split(",")
    .map((email) => email.trim())
    .filter(Boolean);
}

/**
 * Resuelve la lista final de destinatarios para un evento.
 * @param {string} eventType - uno de EVENT_TYPES
 * @param {string[]} rowEmails - correos sacados de la fila de Glide (Correo 0/1/2, etc)
 */
export function resolveRecipients(eventType, rowEmails = []) {
  const envVar = EXTRA_RECIPIENTS_ENV[eventType];
  const extra = envVar ? parseEmailList(process.env[envVar]) : [];
  const all = [...rowEmails, ...extra].filter(Boolean);
  return [...new Set(all.map((e) => e.toLowerCase()))];
}
