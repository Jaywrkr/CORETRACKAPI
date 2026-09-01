// Cliente mínimo para la API de Tablas de Glide (plan Business/Enterprise).
// Docs: https://www.glideapps.com/docs/reference/rest-api

const QUERY_URL = "https://api.glideapp.io/api/function/queryTables";
const MUTATE_URL = "https://api.glideapp.io/api/function/mutateTables";

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Falta la variable de entorno ${name}`);
  return value;
}

async function glideRequest(url, body) {
  const token = requireEnv("GLIDE_API_TOKEN");
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Glide API ${url} respondió ${res.status}: ${text}`);
  }

  return res.json();
}

/**
 * Trae TODAS las filas de una tabla de Glide (maneja paginación por
 * continuation token).
 * @param {string} tableName - nombre de la tabla habilitado para la API
 */
export async function fetchTableRows(tableName) {
  const appID = requireEnv("GLIDE_APP_ID");
  const rows = [];
  let continuation;

  do {
    const body = {
      appID,
      queries: [
        { tableName, ...(continuation ? { startAt: continuation } : {}) },
      ],
    };
    const [result] = await glideRequest(QUERY_URL, body);
    const pageRows = result?.rows || [];
    rows.push(...pageRows);
    continuation = result?.next;
  } while (continuation);

  return rows;
}

/**
 * Agrega una fila a una tabla de Glide.
 * @param {string} tableName
 * @param {Record<string, unknown>} columnValues
 */
export async function addRowToTable(tableName, columnValues) {
  const appID = requireEnv("GLIDE_APP_ID");
  const body = {
    appID,
    mutations: [
      {
        kind: "add-row-to-table",
        tableName,
        columnValues,
      },
    ],
  };
  return glideRequest(MUTATE_URL, body);
}
