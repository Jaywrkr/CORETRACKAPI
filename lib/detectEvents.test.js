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

function hwRow({ rowId, numeroOC, opi }) {
  return {
    [HARDWARE_COLUMNS.rowId]: rowId,
    [HARDWARE_COLUMNS.numeroOC]: numeroOC,
    [HARDWARE_COLUMNS.opi]: opi,
    [HARDWARE_COLUMNS.producto]: "Switch",
  };
}

function swRow({ rowId, numeroOC, opi }) {
  return {
    [SOFTWARE_COLUMNS.rowId]: rowId,
    [SOFTWARE_COLUMNS.numeroOC]: numeroOC,
    [SOFTWARE_COLUMNS.opi]: opi,
    [SOFTWARE_COLUMNS.producto]: "VMware vSphere",
  };
}

// Caso 1: OC nueva sin eventos previos -> se detecta.
{
  const events = detectEvents({
    ocRows: [ocRow({ rowId: "oc1", numeroOC: "OC-1", opi: "OPI-1" })],
    hardwareRows: [],
    softwareRows: [],
    notifiedCounts: new Map(),
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
    notifiedCounts: new Map([["oc1:nueva_oc", 1]]),
  });
  assert.equal(events.length, 0);
}

// Caso 3: hardware nuevo en OC existente -> se detecta hw_agregado.
{
  const events = detectEvents({
    ocRows: [ocRow({ rowId: "oc1", numeroOC: "OC-1", opi: "OPI-1" })],
    hardwareRows: [hwRow({ rowId: "hw1", numeroOC: "OC-1", opi: "OPI-1" })],
    softwareRows: [],
    notifiedCounts: new Map([["oc1:nueva_oc", 1]]),
  });
  assert.equal(events.length, 1);
  assert.equal(events[0].eventType, "hw_agregado");
}

// Caso 3b: software nuevo en OC existente -> se detecta sw_agregado (evento
// distinto de hw_agregado, aunque sea la misma OC).
{
  const events = detectEvents({
    ocRows: [ocRow({ rowId: "oc1", numeroOC: "OC-1", opi: "OPI-1" })],
    hardwareRows: [],
    softwareRows: [swRow({ rowId: "sw1", numeroOC: "OC-1", opi: "OPI-1" })],
    notifiedCounts: new Map([["oc1:nueva_oc", 1]]),
  });
  assert.equal(events.length, 1);
  assert.equal(events[0].eventType, "sw_agregado");
}

// Caso 4: OPI con 1 de 3 OC recibidas, sin notificación previa -> avisa 1 de 3.
{
  const events = detectEvents({
    ocRows: [
      ocRow({ rowId: "oc1", numeroOC: "OC-1", opi: "OPI-1", estado: "RECIBIDO" }),
      ocRow({ rowId: "oc2", numeroOC: "OC-2", opi: "OPI-1", estado: "PENDIENTE" }),
      ocRow({ rowId: "oc3", numeroOC: "OC-3", opi: "OPI-1", estado: "PENDIENTE" }),
    ],
    hardwareRows: [],
    softwareRows: [],
    notifiedCounts: new Map([
      ["oc1:nueva_oc", 1],
      ["oc2:nueva_oc", 1],
      ["oc3:nueva_oc", 1],
    ]),
  });
  const opiEvents = events.filter((e) => e.eventType === "opi_progreso");
  assert.equal(opiEvents.length, 1);
  assert.equal(opiEvents[0].payload.recibidas, 1);
  assert.equal(opiEvents[0].payload.total, 3);
}

// Caso 5: ya se notificó "1 de 3" y sigue en 1 de 3 -> no se repite.
{
  const events = detectEvents({
    ocRows: [
      ocRow({ rowId: "oc1", numeroOC: "OC-1", opi: "OPI-1", estado: "RECIBIDO" }),
      ocRow({ rowId: "oc2", numeroOC: "OC-2", opi: "OPI-1", estado: "PENDIENTE" }),
      ocRow({ rowId: "oc3", numeroOC: "OC-3", opi: "OPI-1", estado: "PENDIENTE" }),
    ],
    hardwareRows: [],
    softwareRows: [],
    notifiedCounts: new Map([
      ["oc1:nueva_oc", 1],
      ["oc2:nueva_oc", 1],
      ["oc3:nueva_oc", 1],
      ["opi:OPI-1:opi_progreso", 1],
    ]),
  });
  assert.equal(events.filter((e) => e.eventType === "opi_progreso").length, 0);
}

// Caso 6: sube de 1 a 2 de 3 -> se dispara de nuevo con el nuevo conteo.
{
  const events = detectEvents({
    ocRows: [
      ocRow({ rowId: "oc1", numeroOC: "OC-1", opi: "OPI-1", estado: "RECIBIDO" }),
      ocRow({ rowId: "oc2", numeroOC: "OC-2", opi: "OPI-1", estado: "RECIBIDO" }),
      ocRow({ rowId: "oc3", numeroOC: "OC-3", opi: "OPI-1", estado: "PENDIENTE" }),
    ],
    hardwareRows: [],
    softwareRows: [],
    notifiedCounts: new Map([
      ["oc1:nueva_oc", 1],
      ["oc2:nueva_oc", 1],
      ["oc3:nueva_oc", 1],
      ["opi:OPI-1:opi_progreso", 1],
    ]),
  });
  const opiEvents = events.filter((e) => e.eventType === "opi_progreso");
  assert.equal(opiEvents.length, 1);
  assert.equal(opiEvents[0].payload.recibidas, 2);
  assert.equal(opiEvents[0].payload.total, 3);
}

// Caso 7: llega el último -> avisa 3 de 3 (completo).
{
  const events = detectEvents({
    ocRows: [
      ocRow({ rowId: "oc1", numeroOC: "OC-1", opi: "OPI-1", estado: "RECIBIDO" }),
      ocRow({ rowId: "oc2", numeroOC: "OC-2", opi: "OPI-1", estado: "RECIBIDO" }),
      ocRow({ rowId: "oc3", numeroOC: "OC-3", opi: "OPI-1", estado: "RECIBIDO" }),
    ],
    hardwareRows: [],
    softwareRows: [],
    notifiedCounts: new Map([
      ["oc1:nueva_oc", 1],
      ["oc2:nueva_oc", 1],
      ["oc3:nueva_oc", 1],
      ["opi:OPI-1:opi_progreso", 2],
    ]),
  });
  const opiEvents = events.filter((e) => e.eventType === "opi_progreso");
  assert.equal(opiEvents.length, 1);
  assert.equal(opiEvents[0].payload.recibidas, 3);
  assert.equal(opiEvents[0].payload.total, 3);
}

console.log("detectEvents: todos los casos OK");
