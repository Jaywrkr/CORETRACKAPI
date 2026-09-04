const RESEND_API_URL = "https://api.resend.com/emails";

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Falta la variable de entorno ${name}`);
  return value;
}

/**
 * Envía un correo vía la API de Resend. No lanza si `to` viene vacío: en
 * ese caso solo loguea una advertencia (para no romper la corrida del cron
 * por un evento sin destinatarios configurados).
 */
export async function sendEmail({ to, subject, html }) {
  if (!to || to.length === 0) {
    console.warn(`[mailer] Sin destinatarios para "${subject}", se omite el envío.`);
    return { skipped: true };
  }

  const apiKey = requireEnv("RESEND_API_KEY");
  const from = requireEnv("RESEND_FROM");

  const res = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to, subject, html }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Resend API respondió ${res.status}: ${text}`);
  }

  const data = await res.json();
  return { skipped: false, messageId: data.id };
}
