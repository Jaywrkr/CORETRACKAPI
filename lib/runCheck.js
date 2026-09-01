import { fetchTableRows } from "./glideClient.js";
import { TABLES } from "../config/glideSchema.js";
import { detectEvents } from "./detectEvents.js";
import { loadNotifiedKeys, recordNotification } from "./notificationLog.js";
import { resolveRecipients } from "../config/recipients.js";
import { buildTemplate } from "./emailTemplates.js";
import { sendEmail } from "./mailer.js";

/**
 * Corre un ciclo completo: trae datos de Glide, detecta eventos nuevos,
 * envía correos y actualiza el log. Devuelve un resumen para loguear.
 */
export async function runCheck() {
  const summary = { detected: 0, notified: 0, skipped: 0, errors: [] };

  console.log("[check-coretrack] Consultando tablas de Glide...");
  const [ocRows, hardwareRows, softwareRows, notifiedKeys] = await Promise.all([
    fetchTableRows(TABLES.oc),
    fetchTableRows(TABLES.hardware),
    fetchTableRows(TABLES.software),
    loadNotifiedKeys(),
  ]);
  console.log(
    `[check-coretrack] OC=${ocRows.length} Hardware=${hardwareRows.length} ` +
      `Software=${softwareRows.length} yaNotificados=${notifiedKeys.size}`
  );

  const events = detectEvents({ ocRows, hardwareRows, softwareRows, notifiedKeys });
  summary.detected = events.length;
  console.log(`[check-coretrack] Eventos detectados: ${events.length}`);

  for (const event of events) {
    const { eventType, itemRowId, payload } = event;
    try {
      const recipients = resolveRecipients(eventType, payload.correos);
      const { subject, html } = buildTemplate(eventType, payload);

      console.log(
        `[check-coretrack] -> ${eventType} (${itemRowId}) destinatarios=[${recipients.join(", ")}]`
      );

      await sendEmail({ to: recipients, subject, html });
      await recordNotification({
        itemRowId,
        eventType,
        detalle: subject,
      });

      summary.notified += 1;
    } catch (err) {
      console.error(
        `[check-coretrack] Error procesando evento ${eventType} (${itemRowId}):`,
        err
      );
      summary.errors.push({ eventType, itemRowId, message: err.message });
    }
  }

  summary.skipped = notifiedKeys.size;
  console.log(
    `[check-coretrack] Resumen: detectados=${summary.detected} notificados=${summary.notified} ` +
      `saltados(previamente en log)=${summary.skipped} errores=${summary.errors.length}`
  );

  return summary;
}
