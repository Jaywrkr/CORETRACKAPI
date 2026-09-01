import { runCheck } from "../lib/runCheck.js";

export default async function handler(req, res) {
  // Vercel Cron envía el header "Authorization: Bearer <CRON_SECRET>"
  // automáticamente cuando CRON_SECRET está configurado en el proyecto.
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.authorization || "";
    if (auth !== `Bearer ${cronSecret}`) {
      res.status(401).json({ error: "No autorizado" });
      return;
    }
  }

  try {
    const summary = await runCheck();
    res.status(200).json({ ok: true, ...summary });
  } catch (err) {
    console.error("[check-coretrack] Error fatal:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
}
