/**
 * HTTP Basic Auth mínimo para proteger /admin y /api/templates.
 * Devuelve true si la request está autorizada; si no, ya dejó la respuesta
 * lista con el 401 + WWW-Authenticate (el caller solo debe hacer `return`).
 */
export function requireAdminAuth(req, res) {
  const user = process.env.ADMIN_USER;
  const password = process.env.ADMIN_PASSWORD;

  if (!user || !password) {
    res.status(500).send("ADMIN_USER / ADMIN_PASSWORD no configurados en el servidor.");
    return false;
  }

  const auth = req.headers.authorization || "";
  const [scheme, encoded] = auth.split(" ");

  if (scheme === "Basic" && encoded) {
    const decoded = Buffer.from(encoded, "base64").toString("utf8");
    const separatorIndex = decoded.indexOf(":");
    const reqUser = decoded.slice(0, separatorIndex);
    const reqPassword = decoded.slice(separatorIndex + 1);
    if (reqUser === user && reqPassword === password) {
      return true;
    }
  }

  res.setHeader("WWW-Authenticate", 'Basic realm="CoreTrack Admin"');
  res.status(401).send("Autenticación requerida.");
  return false;
}
