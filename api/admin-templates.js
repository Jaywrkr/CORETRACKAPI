import { requireAdminAuth } from "../lib/adminAuth.js";
import { loadTemplates, saveTemplate, TEMPLATE_PLACEHOLDERS, TEMPLATE_KEYS } from "../lib/templates.js";

export default async function handler(req, res) {
  if (!requireAdminAuth(req, res)) return;

  if (req.method === "GET") {
    try {
      const templates = await loadTemplates();
      const items = TEMPLATE_KEYS.map((eventType) => ({
        eventType,
        asunto: templates[eventType]?.asunto || "",
        cuerpo: templates[eventType]?.cuerpo || "",
        placeholders: TEMPLATE_PLACEHOLDERS[eventType] || [],
      }));
      res.status(200).json({ items });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
    return;
  }

  if (req.method === "POST") {
    try {
      const { eventType, asunto, cuerpo } = req.body || {};
      if (!TEMPLATE_KEYS.includes(eventType)) {
        res.status(400).json({ error: `eventType inválido: ${eventType}` });
        return;
      }
      await saveTemplate(eventType, { asunto: asunto || "", cuerpo: cuerpo || "" });
      res.status(200).json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
    return;
  }

  res.status(405).json({ error: "Método no permitido" });
}
