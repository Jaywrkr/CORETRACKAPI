import { fetchTableRows } from "./glideClient.js";
import { TABLES } from "../config/glideSchema.js";
import { detectEvents } from "./detectEvents.js";
import { loadNotifiedCounts, recordNotification } from "./notificationLog.js";
import { resolveRecipients } from "../config/recipients.js";
import { sendEmail } from "./mailer.js";
import { buildUserEmailMap, resolvePersonalEmails } from "./resolvePersonal.js";
import { loadTemplates } from "./templates.js";
import { groupEventsByRecipient, buildDigestEmail } from "./digest.js";

/**
 * Corre un ciclo completo: trae datos de Glide, detecta eventos nuevos,
 * arma UN resumen por destinatario (no un correo por evento) y lo envía,
 * y registra cada evento en el log para no re-notificarlo. Devuelve un
 * resumen para loguear.
 */
export async function runCheck() {
  const summary = {
    detected: 0,
    digestsSent: 0,
    eventsRecorded: 0,
    errors: [],
  };

  console.log("[check-coretrack] Consultando tablas de Glide...");
  const [ocRows, hardwareRows, softwareRows, usersRows, notifiedCounts, templates] =
    await Promise.all([
      fetchTableRows(TABLES.oc),
      fetchTableRows(TABLES.hardware),
      fetchTableRows(TABLES.software),
      fetchTableRows(TABLES.users),
      loadNotifiedCounts(),
      loadTemplates(),
    ]);
  const userEmailMap = buildUserEmailMap(usersRows);
  console.log(
    `[check-coretrack] OC=${ocRows.length} Hardware=${hardwareRows.length} ` +
      `Software=${softwareRows.length} Users=${usersRows.length} entradasEnLog=${notifiedCounts.size}`
  );

  const events = detectEvents({ ocRows, hardwareRows, softwareRows, notifiedCounts });
  summary.detected = events.length;
  console.log(`[check-coretrack] Eventos detectados: ${events.length}`);

  // Resolver destinatarios de cada evento (Personal -> Users, + Correo 0/1/2
  // como respaldo, + destinatarios fijos por tipo de evento).
  const eventsWithRecipients = events.map((event) => {
    const personalEmails = resolvePersonalEmails(event.payload.personalNames, userEmailMap);
    const recipients = resolveRecipients(event.eventType, [
      ...event.payload.correos,
      ...personalEmails,
    ]);
    return { ...event, recipients };
  });

  // Un solo correo por destinatario, agrupando todos sus eventos del día
  // (evita mandarle 12 correos sueltos a un vendedor en un día ocupado).
  const byRecipient = groupEventsByRecipient(eventsWithRecipients);
  console.log(`[check-coretrack] Resúmenes a enviar: ${byRecipient.size}`);

  for (const [recipient, items] of byRecipient.entries()) {
    try {
      const { subject, html } = buildDigestEmail(items, templates);
      console.log(
        `[check-coretrack] -> resumen para ${recipient}: ${items.length} evento(s)`
      );
      await sendEmail({ to: [recipient], subject, html });
      summary.digestsSent += 1;
    } catch (err) {
      console.error(`[check-coretrack] Error enviando resumen a ${recipient}:`, err);
      summary.errors.push({ recipient, message: err.message });
    }
  }

  // Registrar cada evento en el log, tenga o no destinatarios, para no
  // re-detectarlo en la próxima corrida.
  for (const event of events) {
    const { eventType, itemRowId, cantidad, payload } = event;
    try {
      await recordNotification({
        itemRowId,
        eventType,
        cantidad,
        detalle: payload.numeroOC || payload.opi || "",
      });
      summary.eventsRecorded += 1;
    } catch (err) {
      console.error(
        `[check-coretrack] Error registrando evento ${eventType} (${itemRowId}):`,
        err
      );
      summary.errors.push({ eventType, itemRowId, message: err.message });
    }
  }

  console.log(
    `[check-coretrack] Resumen: detectados=${summary.detected} resúmenesEnviados=${summary.digestsSent} ` +
      `eventosRegistrados=${summary.eventsRecorded} errores=${summary.errors.length}`
  );

  return summary;
}
