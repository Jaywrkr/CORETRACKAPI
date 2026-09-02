// Almacenamiento simple de JSON en Vercel Blob (no una base de datos real,
// solo un archivo por "colección" persistido entre corridas del cron).
// Requiere la variable de entorno BLOB_READ_WRITE_TOKEN (la agrega sola
// Vercel al conectar un Blob Store al proyecto).
import { put, head } from "@vercel/blob";

/**
 * Lee un JSON desde Vercel Blob. Si no existe todavía, devuelve `fallback`
 * sin lanzar error (primera corrida antes de que exista el archivo).
 */
export async function readJson(pathname, fallback) {
  try {
    const meta = await head(pathname);
    const res = await fetch(meta.url, { cache: "no-store" });
    if (!res.ok) return fallback;
    return await res.json();
  } catch (err) {
    if (err?.name === "BlobNotFoundError") return fallback;
    throw err;
  }
}

/**
 * Escribe (o sobreescribe) un JSON en Vercel Blob en un pathname fijo.
 */
export async function writeJson(pathname, data) {
  await put(pathname, JSON.stringify(data, null, 2), {
    access: "public",
    contentType: "application/json",
    allowOverwrite: true,
  });
}
