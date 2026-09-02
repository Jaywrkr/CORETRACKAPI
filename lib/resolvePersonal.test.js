// Test simple sin dependencias externas: correr con `node lib/resolvePersonal.test.js`.
import assert from "node:assert/strict";
import { buildUserEmailMap, resolvePersonalEmails } from "./resolvePersonal.js";
import { USERS_COLUMNS } from "../config/glideSchema.js";

function userRow(nombre, email) {
  return { [USERS_COLUMNS.nombre]: nombre, [USERS_COLUMNS.email]: email };
}

const usersRows = [
  userRow("Paola Reino", "preino@coresolutions.com.ec"),
  userRow("Andres Cárdenas", "acardenas@coresolutions.com.ec"),
];

// Caso 1: nombre exacto (case-insensitive) -> resuelve el email.
{
  const map = buildUserEmailMap(usersRows);
  const emails = resolvePersonalEmails(["paola reino"], map);
  assert.deepEqual(emails, ["preino@coresolutions.com.ec"]);
}

// Caso 2: nombre sin match -> se descarta sin error.
{
  const map = buildUserEmailMap(usersRows);
  const emails = resolvePersonalEmails(["Alguien Desconocido"], map);
  assert.deepEqual(emails, []);
}

// Caso 3: mezcla de nombres con y sin match.
{
  const map = buildUserEmailMap(usersRows);
  const emails = resolvePersonalEmails(
    ["Andres Cárdenas", "Nadie", "Paola Reino"],
    map
  );
  assert.deepEqual(emails, [
    "acardenas@coresolutions.com.ec",
    "preino@coresolutions.com.ec",
  ]);
}

console.log("resolvePersonal: todos los casos OK");
