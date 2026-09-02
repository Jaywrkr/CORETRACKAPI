// Demo NO productivo: corre la lógica real con datos simulados para
// mostrar qué detecta y qué correo arma cada tipo de evento.
// Uso: node scripts/demo.js
import { detectEvents } from "../lib/detectEvents.js";
import { buildTemplate } from "../lib/emailTemplates.js";
import { resolveRecipients } from "../config/recipients.js";
import { buildUserEmailMap, resolvePersonalEmails } from "../lib/resolvePersonal.js";
import { OC_COLUMNS, HARDWARE_COLUMNS, USERS_COLUMNS } from "../config/glideSchema.js";

function ocRow({ rowId, numeroOC, opi, estado, personal, correo0 }) {
  return {
    [OC_COLUMNS.rowId]: rowId,
    [OC_COLUMNS.numeroOC]: numeroOC,
    [OC_COLUMNS.opi]: opi,
    [OC_COLUMNS.estado]: estado,
    [OC_COLUMNS.proveedor]: "NEXSYS",
    [OC_COLUMNS.cliente]: "MUTUALISTA AZUAY",
    [OC_COLUMNS.personal]: personal,
    [OC_COLUMNS.correo0]: correo0,
  };
}

function hwRow({ rowId, numeroOC, opi, producto }) {
  return {
    [HARDWARE_COLUMNS.rowId]: rowId,
    [HARDWARE_COLUMNS.numeroOC]: numeroOC,
    [HARDWARE_COLUMNS.opi]: opi,
    [HARDWARE_COLUMNS.producto]: producto,
    [HARDWARE_COLUMNS.descripcion]: "Servidor",
    [HARDWARE_COLUMNS.serial]: "SN-12345",
  };
}

const usersRows = [
  { [USERS_COLUMNS.nombre]: "Paola Reino", [USERS_COLUMNS.email]: "preino@coresolutions.com.ec" },
];
const userEmailMap = buildUserEmailMap(usersRows);

function runCase(titulo, { ocRows, hardwareRows = [], softwareRows = [], notifiedCounts }) {
  console.log(`\n${"=".repeat(70)}\nCASO: ${titulo}\n${"=".repeat(70)}`);
  const events = detectEvents({ ocRows, hardwareRows, softwareRows, notifiedCounts });
  if (events.length === 0) {
    console.log("-> No se detectó ningún evento (correctamente saltado).");
    return;
  }
  for (const event of events) {
    const personalEmails = resolvePersonalEmails(event.payload.personalNames, userEmailMap);
    const recipients = resolveRecipients(event.eventType, [
      ...event.payload.correos,
      ...personalEmails,
    ]);
    const { subject, html } = buildTemplate(event.eventType, event.payload);
    console.log(`Evento: ${event.eventType} (itemRowId=${event.itemRowId}, cantidad=${event.cantidad})`);
    console.log(`Destinatarios: ${recipients.join(", ") || "(ninguno)"}`);
    console.log(`Asunto: ${subject}`);
    console.log(`Cuerpo:${html}`);
  }
}

// --- CASO 1: Nueva OC registrada ---
runCase("Nueva OC registrada", {
  ocRows: [
    ocRow({ rowId: "oc1", numeroOC: "011-2026", opi: "PAC 1215", estado: "PENDIENTE", personal: "Paola Reino" }),
  ],
  notifiedCounts: new Map(), // log vacío -> todo es "nuevo"
});

// --- CASO 2: Item agregado a una OC existente ---
runCase("Item (hardware) agregado a OC existente", {
  ocRows: [
    ocRow({ rowId: "oc1", numeroOC: "011-2026", opi: "PAC 1215", estado: "PENDIENTE", personal: "Paola Reino" }),
  ],
  hardwareRows: [
    hwRow({ rowId: "hw1", numeroOC: "011-2026", opi: "PAC 1215", producto: "Switch Aruba 24p" }),
  ],
  notifiedCounts: new Map([["oc1:nueva_oc", 1]]), // la OC ya fue notificada antes
});

// --- CASO 3: Progreso por OPI, primer avance (1 de 3) ---
runCase("Progreso OPI: llega la primera de 3 OC (1 de 3)", {
  ocRows: [
    ocRow({ rowId: "oc1", numeroOC: "OC-A", opi: "OPI 1100", estado: "RECIBIDO", personal: "Paola Reino" }),
    ocRow({ rowId: "oc2", numeroOC: "OC-B", opi: "OPI 1100", estado: "PENDIENTE" }),
    ocRow({ rowId: "oc3", numeroOC: "OC-C", opi: "OPI 1100", estado: "PENDIENTE" }),
  ],
  notifiedCounts: new Map([
    ["oc1:nueva_oc", 1], ["oc2:nueva_oc", 1], ["oc3:nueva_oc", 1],
  ]),
});

// --- CASO 4: Progreso por OPI, mismo estado que ya se notificó -> se salta ---
runCase("Progreso OPI: sigue en 1 de 3, ya notificado -> se salta", {
  ocRows: [
    ocRow({ rowId: "oc1", numeroOC: "OC-A", opi: "OPI 1100", estado: "RECIBIDO" }),
    ocRow({ rowId: "oc2", numeroOC: "OC-B", opi: "OPI 1100", estado: "PENDIENTE" }),
    ocRow({ rowId: "oc3", numeroOC: "OC-C", opi: "OPI 1100", estado: "PENDIENTE" }),
  ],
  notifiedCounts: new Map([
    ["oc1:nueva_oc", 1], ["oc2:nueva_oc", 1], ["oc3:nueva_oc", 1],
    ["opi:OPI 1100:opi_progreso", 1], // ya se avisó "1 de 3"
  ]),
});

// --- CASO 5: Progreso por OPI, llega la última (3 de 3, completo) ---
runCase("Progreso OPI: llega la última -> 3 de 3 (completo)", {
  ocRows: [
    ocRow({ rowId: "oc1", numeroOC: "OC-A", opi: "OPI 1100", estado: "RECIBIDO" }),
    ocRow({ rowId: "oc2", numeroOC: "OC-B", opi: "OPI 1100", estado: "RECIBIDO" }),
    ocRow({ rowId: "oc3", numeroOC: "OC-C", opi: "OPI 1100", estado: "RECIBIDO" }),
  ],
  notifiedCounts: new Map([
    ["oc1:nueva_oc", 1], ["oc2:nueva_oc", 1], ["oc3:nueva_oc", 1],
    ["opi:OPI 1100:opi_progreso", 2], // iba en "2 de 3"
  ]),
});
