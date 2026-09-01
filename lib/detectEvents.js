import {
  OC_COLUMNS,
  HARDWARE_COLUMNS,
  SOFTWARE_COLUMNS,
  EVENT_TYPES,
  OC_ESTADOS_COMPLETA,
} from "../config/glideSchema.js";

const RECEIVED_STATUSES = ["recibido", "recibida", "entregado", "entregada"];

function isReceived(statusValue) {
  if (!statusValue) return false;
  return RECEIVED_STATUSES.includes(String(statusValue).trim().toLowerCase());
}

function isOcCompleta(estadoValue) {
  if (!estadoValue) return false;
  return OC_ESTADOS_COMPLETA.includes(String(estadoValue).trim().toUpperCase());
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
    received: isReceived(row[columns.statusDocumentos]),
    sourceType, // "hardware" | "software"
    raw: row,
  }));
}

/**
 * Detecta los cuatro tipos de eventos (nueva OC, item agregado, OC
 * completada, OPI completo) comparando el estado actual de Glide contra lo
 * que ya está en el log de notificaciones.
 *
 * @param {object} input
 * @param {object[]} input.ocRows - filas crudas de la tabla de OC
 * @param {object[]} input.hardwareRows - filas crudas de *HARDWARE
 * @param {object[]} input.softwareRows - filas crudas de *SOFTWARE
 * @param {Set<string>} input.notifiedKeys - set de `${itemRowId}:${eventType}` ya notificados
 * @returns {Array<{eventType: string, itemRowId: string, payload: object}>}
 */
export function detectEvents({
  ocRows,
  hardwareRows,
  softwareRows,
  notifiedKeys,
}) {
  const events = [];
  const alreadyNotified = (rowId, eventType) =>
    notifiedKeys.has(`${rowId}:${eventType}`);

  // a) Nueva OC registrada: toda fila de OC que no tenga aún un evento
  // NUEVA_OC en el log se considera "nueva" (el log es la fuente de verdad,
  // no una fecha de creación, porque Glide no siempre expone esa columna).
  for (const row of ocRows) {
    const rowId = row[OC_COLUMNS.rowId];
    if (!rowId || alreadyNotified(rowId, EVENT_TYPES.NUEVA_OC)) continue;
    events.push({
      eventType: EVENT_TYPES.NUEVA_OC,
      itemRowId: rowId,
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
    if (!item.rowId || alreadyNotified(item.rowId, EVENT_TYPES.ITEM_AGREGADO))
      continue;
    const ocRow = ocByNumero.get(String(item.numeroOC || "").trim());
    events.push({
      eventType: EVENT_TYPES.ITEM_AGREGADO,
      itemRowId: item.rowId,
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

  // c) OC completada: el campo Estado de la OC llega a un valor terminal
  // (ej. RECIBIDO). Es un evento por OC, independiente del rollup de items
  // por OPI (evento d).
  for (const row of ocRows) {
    const rowId = row[OC_COLUMNS.rowId];
    if (!rowId || !isOcCompleta(row[OC_COLUMNS.estado])) continue;
    if (alreadyNotified(rowId, EVENT_TYPES.OC_COMPLETADA)) continue;
    events.push({
      eventType: EVENT_TYPES.OC_COMPLETADA,
      itemRowId: rowId,
      payload: {
        numeroOC: row[OC_COLUMNS.numeroOC],
        proveedor: row[OC_COLUMNS.proveedor],
        cliente: row[OC_COLUMNS.cliente],
        opi: row[OC_COLUMNS.opi],
        estado: row[OC_COLUMNS.estado],
        correos: ocCorreos(row),
      },
    });
  }

  // d) OPI completo: todos los items de un mismo OPI (pudiendo abarcar
  // varias OC) están en estado "recibido". Se agrupa por número de OPI
  // (ignorando items sin OPI). Evento independiente de OC_COMPLETADA.
  const itemsByOpi = new Map();
  for (const item of allItems) {
    const opiKey = String(item.opi || "").trim();
    if (!opiKey) continue;
    if (!itemsByOpi.has(opiKey)) itemsByOpi.set(opiKey, []);
    itemsByOpi.get(opiKey).push(item);
  }

  for (const [opiKey, items] of itemsByOpi.entries()) {
    const allReceived = items.every((item) => item.received);
    if (!allReceived) continue;

    // Usamos el propio número de OPI como identificador único del evento
    // (no hay una tabla de OPI separada con su propio rowID).
    const syntheticId = `opi:${opiKey}`;
    if (alreadyNotified(syntheticId, EVENT_TYPES.OPI_COMPLETO)) continue;

    const ocRow = ocRows.find(
      (row) => String(row[OC_COLUMNS.opi] || "").trim() === opiKey
    );

    events.push({
      eventType: EVENT_TYPES.OPI_COMPLETO,
      itemRowId: syntheticId,
      payload: {
        opi: opiKey,
        totalItems: items.length,
        items: items.map((i) => ({
          producto: i.producto,
          serial: i.serial,
          sourceType: i.sourceType,
        })),
        correos: ocCorreos(ocRow),
      },
    });
  }

  return events;
}
