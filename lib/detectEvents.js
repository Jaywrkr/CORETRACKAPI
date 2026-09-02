import {
  OC_COLUMNS,
  HARDWARE_COLUMNS,
  SOFTWARE_COLUMNS,
  EVENT_TYPES,
  OC_ESTADOS_RECIBIDA,
} from "../config/glideSchema.js";

function isRecibida(estadoValue) {
  if (!estadoValue) return false;
  return OC_ESTADOS_RECIBIDA.includes(String(estadoValue).trim().toUpperCase());
}

function ocCorreos(ocRow) {
  if (!ocRow) return [];
  return [
    ocRow[OC_COLUMNS.correo0],
    ocRow[OC_COLUMNS.correo1],
    ocRow[OC_COLUMNS.correo2],
  ].filter(Boolean);
}

function normalizeItems(rows, columns, sourceType) {
  return rows.map((row) => ({
    rowId: row[columns.rowId],
    numeroOC: row[columns.numeroOC],
    opi: row[columns.opi],
    producto: row[columns.producto],
    descripcion: row[columns.descripcion],
    serial: row[columns.serial],
    sourceType, // "hardware" | "software"
    raw: row,
  }));
}

/**
 * Detecta los eventos comparando el estado actual de Glide contra lo que ya
 * está en el log de notificaciones.
 *
 * @param {object} input
 * @param {object[]} input.ocRows - filas crudas de la tabla de OC
 * @param {object[]} input.hardwareRows - filas crudas de *HARDWARE
 * @param {object[]} input.softwareRows - filas crudas de *SOFTWARE
 * @param {Map<string, number>} input.notifiedCounts - map de
 *   `${itemRowId}:${eventType}` -> cantidad ya notificada (1 para eventos
 *   booleanos como NUEVA_OC/ITEM_AGREGADO, el conteo de OC recibidas para
 *   OPI_PROGRESO).
 * @returns {Array<{eventType: string, itemRowId: string, payload: object, cantidad: number}>}
 */
export function detectEvents({
  ocRows,
  hardwareRows,
  softwareRows,
  notifiedCounts,
}) {
  const events = [];
  const notifiedCount = (rowId, eventType) =>
    notifiedCounts.get(`${rowId}:${eventType}`) || 0;

  // a) Nueva OC registrada: toda fila de OC que no tenga aún un evento
  // NUEVA_OC en el log se considera "nueva" (el log es la fuente de verdad,
  // no una fecha de creación, porque Glide no siempre expone esa columna).
  for (const row of ocRows) {
    const rowId = row[OC_COLUMNS.rowId];
    if (!rowId || notifiedCount(rowId, EVENT_TYPES.NUEVA_OC) > 0) continue;
    events.push({
      eventType: EVENT_TYPES.NUEVA_OC,
      itemRowId: rowId,
      cantidad: 1,
      payload: {
        numeroOC: row[OC_COLUMNS.numeroOC],
        proveedor: row[OC_COLUMNS.proveedor],
        cliente: row[OC_COLUMNS.cliente],
        opi: row[OC_COLUMNS.opi],
        correos: ocCorreos(row),
      },
    });
  }

  // b) Item agregado a una OC existente: toda fila de item que no tenga
  // aún un evento ITEM_AGREGADO en el log.
  const allItems = [
    ...normalizeItems(hardwareRows, HARDWARE_COLUMNS, "hardware"),
    ...normalizeItems(softwareRows, SOFTWARE_COLUMNS, "software"),
  ];

  const ocByNumero = new Map(
    ocRows.map((row) => [String(row[OC_COLUMNS.numeroOC] || "").trim(), row])
  );

  for (const item of allItems) {
    if (!item.rowId || notifiedCount(item.rowId, EVENT_TYPES.ITEM_AGREGADO) > 0)
      continue;
    const ocRow = ocByNumero.get(String(item.numeroOC || "").trim());
    events.push({
      eventType: EVENT_TYPES.ITEM_AGREGADO,
      itemRowId: item.rowId,
      cantidad: 1,
      payload: {
        numeroOC: item.numeroOC,
        producto: item.producto,
        descripcion: item.descripcion,
        serial: item.serial,
        sourceType: item.sourceType,
        correos: ocCorreos(ocRow),
      },
    });
  }

  // c) Progreso de recepción por OPI: agrupa las OC que comparten el mismo
  // OPI (equivalente a la relación nativa "Relación por PPR" de Glide) y
  // notifica cada vez que sube la cantidad de OC con Estado=RECIBIDO sobre
  // el total de OC del grupo (ej. "llegó 2 de 3"). El identificador del
  // evento es el propio texto del OPI, ya que no hay una tabla de OPI
  // separada con su propio rowID.
  const ocsByOpi = new Map();
  for (const row of ocRows) {
    const opiKey = String(row[OC_COLUMNS.opi] || "").trim();
    if (!opiKey) continue;
    if (!ocsByOpi.has(opiKey)) ocsByOpi.set(opiKey, []);
    ocsByOpi.get(opiKey).push(row);
  }

  for (const [opiKey, rows] of ocsByOpi.entries()) {
    const total = rows.length;
    const recibidas = rows.filter((row) => isRecibida(row[OC_COLUMNS.estado])).length;

    const syntheticId = `opi:${opiKey}`;
    const previousCount = notifiedCount(syntheticId, EVENT_TYPES.OPI_PROGRESO);
    if (recibidas <= previousCount) continue;

    const correos = [...new Set(rows.flatMap((row) => ocCorreos(row)))];

    events.push({
      eventType: EVENT_TYPES.OPI_PROGRESO,
      itemRowId: syntheticId,
      cantidad: recibidas,
      payload: {
        opi: opiKey,
        recibidas,
        total,
        correos,
      },
    });
  }

  return events;
}
