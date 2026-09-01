import { google } from "googleapis";

function getGmailClient() {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
    process.env.GMAIL_REDIRECT_URI
  );
  oauth2Client.setCredentials({
    refresh_token: process.env.GMAIL_REFRESH_TOKEN,
  });
  return google.gmail({ version: "v1", auth: oauth2Client });
}

function encodeMessage({ to, from, subject, html }) {
  const message = [
    `From: ${from}`,
    `To: ${to.join(", ")}`,
    "Content-Type: text/html; charset=utf-8",
    "MIME-Version: 1.0",
    `Subject: ${subject}`,
    "",
    html,
  ].join("\n");

  return Buffer.from(message)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/**
 * Envía un correo vía Gmail API. No lanza si `to` viene vacío: en ese
 * caso solo loguea una advertencia (para no romper la corrida del cron
 * por un evento sin destinatarios configurados).
 */
export async function sendEmail({ to, subject, html }) {
  if (!to || to.length === 0) {
    console.warn(`[mailer] Sin destinatarios para "${subject}", se omite el envío.`);
    return { skipped: true };
  }

  const gmail = getGmailClient();
  const from = process.env.GMAIL_SENDER;
  const raw = encodeMessage({ to, from, subject, html });

  const res = await gmail.users.messages.send({
    userId: "me",
    requestBody: { raw },
  });

  return { skipped: false, messageId: res.data.id };
}
