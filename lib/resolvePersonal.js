import { USERS_COLUMNS } from "../config/glideSchema.js";

/**
 * Arma un mapa nombre (lowercase, trim) -> email a partir de las filas
 * crudas de la tabla Users.
 */
export function buildUserEmailMap(usersRows) {
  const map = new Map();
  for (const row of usersRows) {
    const nombre = row[USERS_COLUMNS.nombre];
    const email = row[USERS_COLUMNS.email];
    if (!nombre || !email) continue;
    map.set(String(nombre).trim().toLowerCase(), email);
  }
  return map;
}

/**
 * Resuelve una lista de nombres de personal a sus emails reales usando el
 * mapa de Users. Nombres sin match se descartan silenciosamente (se loguea
 * aparte en runCheck si hace falta debug).
 */
export function resolvePersonalEmails(names, userEmailMap) {
  return names
    .filter(Boolean)
    .map((name) => userEmailMap.get(String(name).trim().toLowerCase()))
    .filter(Boolean);
}
