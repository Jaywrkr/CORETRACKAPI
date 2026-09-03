import { EVENT_TYPES } from "../config/glideSchema.js";
import { renderTemplate, DEFAULT_TEMPLATES, DIGEST_KEY } from "./templates.js";
import { enrichPayload, escapeHtml } from "./emailTemplates.js";

// Nombre de cada tipo de evento tal como aparece en el asunto/intro del
// correo (placeholder {{tipo}} de la plantilla "digest"). No editable desde
// /admin (es el nombre del tipo, no un texto de negocio).
const EVENT_TYPE_LABELS = {
  [EVENT_TYPES.NUEVA_OC]: "Nuevas Órdenes de Compra",
  [EVENT_TYPES.HW_AGREGADO]: "Hardware agregado",
  [EVENT_TYPES.SW_AGREGADO]: "Software agregado",
  [EVENT_TYPES.OPI_PROGRESO]: "Avances de Órdenes de Compra",
};

/**
 * Agrupa una lista de eventos (ya con destinatarios resueltos) por
 * destinatario Y tipo de evento — cada combinación es un correo aparte.
 * @param {Array<{eventType: string, payload: object, recipients: string[]}>} events
 * @returns {Map<string, {recipient: string, eventType: string, items: object[]}>}
 *   la clave es `${recipient}::${eventType}`, solo para des-duplicar.
 */
export function groupEventsByRecipientAndType(events) {
  const groups = new Map();
  for (const event of events) {
    for (const email of event.recipients) {
      const key = `${email}::${event.eventType}`;
      if (!groups.has(key)) {
        groups.set(key, { recipient: email, eventType: event.eventType, items: [] });
      }
      groups.get(key).items.push(event.payload);
    }
  }
  return groups;
}

/**
 * Arma el correo del día para un (destinatario, tipo de evento): un sobre
 * común (plantilla "digest") con la lista de eventos de ese tipo, cada uno
 * renderizado con la plantilla propia de ese tipo de evento.
 * @param {string} eventType
 * @param {object[]} items - payloads de los eventos de ese tipo
 * @param {Record<string, {asunto: string, cuerpo: string}>} templates
 */
export function buildTypeDigestEmail(eventType, items, templates = DEFAULT_TEMPLATES) {
  const fecha = new Date().toLocaleDateString("es-EC", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  const tipo = EVENT_TYPE_LABELS[eventType] || eventType;
  const digestVars = { fecha, total: items.length, tipo };

  const digestTemplate = templates[DIGEST_KEY] || DEFAULT_TEMPLATES[DIGEST_KEY];
  const subject = renderTemplate(digestTemplate.asunto, digestVars);
  const intro = renderTemplate(digestTemplate.cuerpo, digestVars);

  const lineTemplate = templates[eventType] || DEFAULT_TEMPLATES[eventType];
  const lines = items.map((payload) => {
    const enriched = enrichPayload(eventType, payload);
    return `• ${renderTemplate(lineTemplate.asunto, enriched)}`;
  });

  const bodyText = [intro, "", lines.join("\n")].join("\n\n");
  const html = `<div style="white-space:pre-wrap;font-family:sans-serif;">${escapeHtml(bodyText)}</div>`;

  return { subject, html };
}
