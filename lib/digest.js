import { EVENT_TYPES } from "../config/glideSchema.js";
import { renderTemplate, DEFAULT_TEMPLATES, DIGEST_KEY } from "./templates.js";
import { enrichPayload, escapeHtml } from "./emailTemplates.js";

// Encabezados de cada sección del resumen. No son editables desde /admin
// (son literalmente el nombre del grupo, no un texto de negocio) — lo que
// sí se edita es la línea de cada evento (su plantilla de asunto).
const EVENT_SECTION_LABELS = {
  [EVENT_TYPES.NUEVA_OC]: "Nuevas Órdenes de Compra",
  [EVENT_TYPES.ITEM_AGREGADO]: "Items agregados",
  [EVENT_TYPES.OPI_PROGRESO]: "Progreso de recepción por OPI",
};

/**
 * Agrupa una lista de eventos (ya con destinatarios resueltos) por
 * destinatario individual.
 * @param {Array<{eventType: string, payload: object, recipients: string[]}>} events
 * @returns {Map<string, Array<{eventType: string, payload: object}>>}
 */
export function groupEventsByRecipient(events) {
  const byRecipient = new Map();
  for (const event of events) {
    for (const email of event.recipients) {
      if (!byRecipient.has(email)) byRecipient.set(email, []);
      byRecipient.get(email).push({ eventType: event.eventType, payload: event.payload });
    }
  }
  return byRecipient;
}

/**
 * Arma el correo de resumen diario para un destinatario, agrupando sus
 * eventos por tipo. Usa la plantilla de cada evento (editable en /admin)
 * como línea dentro de la sección correspondiente.
 * @param {Array<{eventType: string, payload: object}>} items
 * @param {Record<string, {asunto: string, cuerpo: string}>} templates
 */
export function buildDigestEmail(items, templates = DEFAULT_TEMPLATES) {
  const fecha = new Date().toLocaleDateString("es-EC", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  const digestVars = { fecha, totalEventos: items.length };

  const digestTemplate = templates[DIGEST_KEY] || DEFAULT_TEMPLATES[DIGEST_KEY];
  const subject = renderTemplate(digestTemplate.asunto, digestVars);
  const intro = renderTemplate(digestTemplate.cuerpo, digestVars);

  const byType = new Map();
  for (const item of items) {
    if (!byType.has(item.eventType)) byType.set(item.eventType, []);
    byType.get(item.eventType).push(item);
  }

  const sections = [...byType.entries()].map(([eventType, evs]) => {
    const template = templates[eventType] || DEFAULT_TEMPLATES[eventType];
    const label = EVENT_SECTION_LABELS[eventType] || eventType;
    const lines = evs.map((ev) => {
      const enriched = enrichPayload(eventType, ev.payload);
      return `• ${renderTemplate(template.asunto, enriched)}`;
    });
    return `${label} (${evs.length}):\n${lines.join("\n")}`;
  });

  const bodyText = [intro, "", ...sections].join("\n\n");
  const html = `<div style="white-space:pre-wrap;font-family:sans-serif;">${escapeHtml(bodyText)}</div>`;

  return { subject, html };
}
