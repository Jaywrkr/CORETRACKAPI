// Test simple sin dependencias externas: correr con `node lib/templates.test.js`.
import assert from "node:assert/strict";
import { renderTemplate, DEFAULT_TEMPLATES } from "./templates.js";
import { buildTemplate } from "./emailTemplates.js";
import { EVENT_TYPES } from "../config/glideSchema.js";

// Caso 1: reemplaza placeholders presentes.
{
  const result = renderTemplate("OC {{numeroOC}} de {{proveedor}}", {
    numeroOC: "011-2026",
    proveedor: "NEXSYS",
  });
  assert.equal(result, "OC 011-2026 de NEXSYS");
}

// Caso 2: placeholder sin valor -> string vacío, no revienta.
{
  const result = renderTemplate("Cliente: {{cliente}}", {});
  assert.equal(result, "Cliente: ");
}

// Caso 3: buildTemplate con plantillas custom (simulando lo guardado en Glide).
{
  const customTemplates = {
    [EVENT_TYPES.NUEVA_OC]: { asunto: "¡Nueva OC {{numeroOC}}!", cuerpo: "Cliente: {{cliente}}" },
  };
  const { subject, html } = buildTemplate(
    EVENT_TYPES.NUEVA_OC,
    { numeroOC: "011-2026", cliente: "MUTUALISTA AZUAY" },
    customTemplates
  );
  assert.equal(subject, "¡Nueva OC 011-2026!");
  assert.match(html, /Cliente: MUTUALISTA AZUAY/);
}

// Caso 4: sin plantillas custom, cae a los defaults.
{
  const { subject } = buildTemplate(EVENT_TYPES.ITEM_AGREGADO, {
    numeroOC: "011-2026",
    producto: "Switch",
    descripcion: "-",
    serial: "-",
    sourceType: "hardware",
  });
  assert.equal(subject, DEFAULT_TEMPLATES[EVENT_TYPES.ITEM_AGREGADO].asunto.replace("{{numeroOC}}", "011-2026"));
}

console.log("templates: todos los casos OK");
