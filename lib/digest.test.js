// Test simple sin dependencias externas: correr con `node lib/digest.test.js`.
import assert from "node:assert/strict";
import { groupEventsByRecipientAndType, buildTypeDigestEmail } from "./digest.js";
import { EVENT_TYPES } from "../config/glideSchema.js";

// Caso 1: agrupa por (destinatario, tipo) — un mismo destinatario con dos
// tipos distintos genera dos grupos separados.
{
  const events = [
    { eventType: EVENT_TYPES.NUEVA_OC, payload: { numeroOC: "011" }, recipients: ["a@x.com"] },
    { eventType: EVENT_TYPES.HW_AGREGADO, payload: { numeroOC: "011" }, recipients: ["a@x.com", "b@x.com"] },
    { eventType: EVENT_TYPES.HW_AGREGADO, payload: { numeroOC: "012" }, recipients: ["a@x.com"] },
  ];
  const groups = groupEventsByRecipientAndType(events);
  assert.equal(groups.size, 3); // a+nueva_oc, a+hw_agregado, b+hw_agregado
  assert.equal(groups.get("a@x.com::hw_agregado").items.length, 2);
  assert.equal(groups.get("b@x.com::hw_agregado").items.length, 1);
  assert.equal(groups.get("a@x.com::nueva_oc").items.length, 1);
}

// Caso 2: el correo de un tipo lista cada item con la plantilla de ESE tipo.
{
  const items = [{ numeroOC: "011-2026" }, { numeroOC: "022-2026" }];
  const { subject, html } = buildTypeDigestEmail(EVENT_TYPES.NUEVA_OC, items);
  assert.match(subject, /Nuevas Órdenes de Compra/);
  assert.match(subject, /\(2\)/);
  assert.match(html, /Nueva OC registrada: 011-2026/);
  assert.match(html, /Nueva OC registrada: 022-2026/);
}

// Caso 3: hw_agregado y sw_agregado usan asuntos de línea distintos.
{
  const hw = buildTypeDigestEmail(EVENT_TYPES.HW_AGREGADO, [{ numeroOC: "011" }]);
  const sw = buildTypeDigestEmail(EVENT_TYPES.SW_AGREGADO, [{ numeroOC: "011" }]);
  assert.match(hw.subject, /Hardware agregado/);
  assert.match(hw.html, /Hardware agregado a OC 011/);
  assert.match(sw.subject, /Software agregado/);
  assert.match(sw.html, /Software agregado a OC 011/);
}

// Caso 4: sin items -> igual arma un asunto/cuerpo válido (0 eventos).
{
  const { subject } = buildTypeDigestEmail(EVENT_TYPES.OPI_PROGRESO, []);
  assert.match(subject, /\(0\)/);
}

console.log("digest: todos los casos OK");
