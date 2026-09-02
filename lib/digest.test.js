// Test simple sin dependencias externas: correr con `node lib/digest.test.js`.
import assert from "node:assert/strict";
import { groupEventsByRecipient, buildDigestEmail } from "./digest.js";
import { EVENT_TYPES } from "../config/glideSchema.js";

// Caso 1: agrupa eventos por destinatario (uno puede aparecer en varios eventos).
{
  const events = [
    { eventType: EVENT_TYPES.NUEVA_OC, payload: { numeroOC: "011" }, recipients: ["a@x.com"] },
    { eventType: EVENT_TYPES.ITEM_AGREGADO, payload: { numeroOC: "011" }, recipients: ["a@x.com", "b@x.com"] },
    { eventType: EVENT_TYPES.OPI_PROGRESO, payload: { opi: "P1", recibidas: 1, total: 2 }, recipients: ["b@x.com"] },
  ];
  const byRecipient = groupEventsByRecipient(events);
  assert.equal(byRecipient.size, 2);
  assert.equal(byRecipient.get("a@x.com").length, 2);
  assert.equal(byRecipient.get("b@x.com").length, 2);
}

// Caso 2: el resumen agrupa por tipo de evento y usa el asunto de cada uno como línea.
{
  const items = [
    { eventType: EVENT_TYPES.NUEVA_OC, payload: { numeroOC: "011-2026" } },
    { eventType: EVENT_TYPES.NUEVA_OC, payload: { numeroOC: "022-2026" } },
    { eventType: EVENT_TYPES.ITEM_AGREGADO, payload: { numeroOC: "011-2026" } },
  ];
  const { subject, html } = buildDigestEmail(items);
  assert.match(subject, /Resumen CoreTrack/);
  assert.match(subject, /3 eventos/);
  assert.match(html, /Nuevas Órdenes de Compra \(2\)/);
  assert.match(html, /Nueva OC registrada: 011-2026/);
  assert.match(html, /Nueva OC registrada: 022-2026/);
  assert.match(html, /Items agregados \(1\)/);
}

// Caso 3: sin eventos -> igual arma un asunto/cuerpo válido (0 eventos).
{
  const { subject } = buildDigestEmail([]);
  assert.match(subject, /0 eventos/);
}

console.log("digest: todos los casos OK");
