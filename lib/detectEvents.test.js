// Test simple sin dependencias externas: correr con `node lib/detectEvents.test.js`.
import assert from "node:assert/strict";
import { detectEvents } from "./detectEvents.js";
import { OC_COLUMNS, HARDWARE_COLUMNS, SOFTWARE_COLUMNS } from "../config/glideSchema.js";

function ocRow({ rowId, numeroOC, opi, correo0, estado }) {
  return {
    [OC_COLUMNS.rowId]: rowId,
    [OC_COLUMNS.numeroOC]: numeroOC,
    [OC_COLUMNS.opi]: opi,
    [OC_COLUMNS.correo0]: correo0,
    [OC_COLUMNS.estado]: estado,
  };
}

function hwRow({ rowId, numeroOC, opi, status }) {
  return {
    [HARDWARE_COLUMNS.rowId]: rowId,
    [HARDWARE_COLUMNS.numeroOC]: numeroOC,
    [HARDWARE_COLUMNS.opi]: opi,
    [HARDWARE_COLUMNS.producto]: "Switch",
    [HARDWARE_COLUMNS.statusDocumentos]: status,
  };
}

// Caso 1: OC nueva sin eventos previos -> se detecta.
{
  const events = detectEvents({
    ocRows: [ocRow({ rowId: "oc1", numeroOC: "OC-1", opi: "OPI-1" })],
    hardwareRows: [],
    softwareRows: [],
    notifiedKeys: new Set(),
  });
  assert.equal(events.length, 1);
  assert.equal(events[0].eventType, "nueva_oc");
}

// Caso 2: OC ya notificada -> no se repite.
{
  const events = detectEvents({
    ocRows: [ocRow({ rowId: "oc1", numeroOC: "OC-1", opi: "OPI-1" })],
    hardwareRows: [],
    softwareRows: [],
    notifiedKeys: new Set(["oc1:nueva_oc"]),
  });
  assert.equal(events.length, 0);
}

// Caso 3: item nuevo en OC existente -> se detecta item_agregado.
{
  const events = detectEvents({
    ocRows: [ocRow({ rowId: "oc1", numeroOC: "OC-1", opi: "OPI-1" })],
    hardwareRows: [hwRow({ rowId: "hw1", numeroOC: "OC-1", opi: "OPI-1", status: "pendiente" })],
    softwareRows: [],
    notifiedKeys: new Set(["oc1:nueva_oc"]),
  });
  assert.equal(events.length, 1);
  assert.equal(events[0].eventType, "item_agregado");
}

// Caso 4: todos los items de un OPI recibidos -> opi_completo.
{
  const events = detectEvents({
    ocRows: [ocRow({ rowId: "oc1", numeroOC: "OC-1", opi: "OPI-1" })],
    hardwareRows: [hwRow({ rowId: "hw1", numeroOC: "OC-1", opi: "OPI-1", status: "recibido" })],
    softwareRows: [],
    notifiedKeys: new Set(["oc1:nueva_oc", "hw1:item_agregado"]),
  });
  assert.equal(events.length, 1);
  assert.equal(events[0].eventType, "opi_completo");
}

// Caso 5: OPI con un item pendiente -> no se dispara opi_completo.
{
  const events = detectEvents({
    ocRows: [ocRow({ rowId: "oc1", numeroOC: "OC-1", opi: "OPI-1" })],
    hardwareRows: [
      hwRow({ rowId: "hw1", numeroOC: "OC-1", opi: "OPI-1", status: "recibido" }),
      hwRow({ rowId: "hw2", numeroOC: "OC-1", opi: "OPI-1", status: "pendiente" }),
    ],
    softwareRows: [],
    notifiedKeys: new Set(["oc1:nueva_oc", "hw1:item_agregado", "hw2:item_agregado"]),
  });
  assert.equal(events.filter((e) => e.eventType === "opi_completo").length, 0);
}

// Caso 6: OC con Estado=RECIBIDO -> se detecta oc_completada (evento
// independiente de opi_completo, aunque los items sigan pendientes).
{
  const events = detectEvents({
    ocRows: [ocRow({ rowId: "oc1", numeroOC: "OC-1", opi: "OPI-1", estado: "RECIBIDO" })],
    hardwareRows: [hwRow({ rowId: "hw1", numeroOC: "OC-1", opi: "OPI-1", status: "pendiente" })],
    softwareRows: [],
    notifiedKeys: new Set(["oc1:nueva_oc", "hw1:item_agregado"]),
  });
  assert.equal(events.length, 1);
  assert.equal(events[0].eventType, "oc_completada");
}

// Caso 7: OC con Estado distinto de RECIBIDO -> no se dispara oc_completada.
{
  const events = detectEvents({
    ocRows: [ocRow({ rowId: "oc1", numeroOC: "OC-1", opi: "OPI-1", estado: "DIFERIDO" })],
    hardwareRows: [],
    softwareRows: [],
    notifiedKeys: new Set(["oc1:nueva_oc"]),
  });
  assert.equal(events.filter((e) => e.eventType === "oc_completada").length, 0);
}

// Caso 8: OC completada ya notificada -> no se repite.
{
  const events = detectEvents({
    ocRows: [ocRow({ rowId: "oc1", numeroOC: "OC-1", opi: "OPI-1", estado: "RECIBIDO" })],
    hardwareRows: [],
    softwareRows: [],
    notifiedKeys: new Set(["oc1:nueva_oc", "oc1:oc_completada"]),
  });
  assert.equal(events.length, 0);
}

console.log("detectEvents: todos los casos OK");
