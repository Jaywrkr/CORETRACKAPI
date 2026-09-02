import { EVENT_TYPES } from "../config/glideSchema.js";
import { renderTemplate, DEFAULT_TEMPLATES } from "./templates.js";

function enrichPayload(eventType, payload) {
  if (eventType === EVENT_TYPES.OPI_PROGRESO) {
    return {
      ...payload,
      estado: payload.recibidas >= payload.total ? "completo" : "en progreso",
    };
  }
  return payload;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Arma asunto/cuerpo de un evento usando las plantillas (editables desde
 * /admin y guardadas en Glide). Si no se pasan `templates`, usa las
 * plantillas por defecto hardcodeadas.
 */
function buildTemplate(eventType, payload, templates = DEFAULT_TEMPLATES) {
  const template = templates[eventType] || DEFAULT_TEMPLATES[eventType];
  if (!template) throw new Error(`Tipo de evento desconocido: ${eventType}`);

  const enriched = enrichPayload(eventType, payload);
  const subject = renderTemplate(template.asunto, enriched);
  const bodyText = renderTemplate(template.cuerpo, enriched);
  const html = `<div style="white-space:pre-wrap;font-family:sans-serif;">${escapeHtml(bodyText)}</div>`;

  return { subject, html };
}

export { buildTemplate };
