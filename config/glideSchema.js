// Mapeo de tablas y columnas de Glide usadas por el checker de CoreTrack.
//
// Los nombres de columna de abajo salen de inspeccionar la app real vía el
// MCP glide-core-mcp (tablas "Comtrol de Ordenes de Compra Track", "*HARDWARE",
// "*SOFTWARE"). CONFIRMAR con el usuario antes de tomarlos como definitivos:
// ver README > "Confirmaciones pendientes".

export const TABLES = {
  oc: process.env.GLIDE_TABLE_OC || "Comtrol de Ordenes de Compra Track",
  hardware: process.env.GLIDE_TABLE_HARDWARE || "*HARDWARE",
  software: process.env.GLIDE_TABLE_SOFTWARE || "*SOFTWARE",
  log: process.env.GLIDE_TABLE_LOG || "Notificaciones CoreTrack Log",
};

// Columnas de la tabla de Órdenes de Compra (OC).
export const OC_COLUMNS = {
  rowId: "$rowID",
  proveedor: "Proveedor",
  cliente: "Cliente",
  numeroOC: "N°OC",
  opi: "OPI",
  fecha: "Fecha",
  estado: "Estado",
  correo0: "Correo 0",
  correo1: "Correo 1",
  correo2: "Correo 2",
};

// Columnas comunes a *HARDWARE y *SOFTWARE que usamos para el diff de items.
// OJO: en ambas tablas el vínculo a la OC/OPI es por texto (no relación),
// así que el match se hace por el número de OC / OPI.
export const HARDWARE_COLUMNS = {
  rowId: "$rowID",
  numeroOC: "N OC",
  opi: "Opi",
  producto: "PRODUCTO/NOMBRE",
  descripcion: "PRODUCTO/DESCRIPCION",
  serial: "PRODUCTO/SERIAL",
  statusDocumentos: "Status Documentos",
};

export const SOFTWARE_COLUMNS = {
  rowId: "$rowID",
  numeroOC: "Nro OC",
  opi: "NRO OPI",
  producto: "Equipo o Licencia",
  descripcion: "Descr.",
  serial: "Serie o Contrato",
  statusDocumentos: "Status Chequeo",
};

// Columnas de la tabla de log de notificaciones (a crear en Glide, ver README).
export const LOG_COLUMNS = {
  rowId: "$rowID",
  itemRowId: "ItemRowID", // rowID del elemento notificado (OC o item)
  eventType: "EventType", // "nueva_oc" | "item_agregado" | "opi_completo"
  fecha: "Fecha", // date-time de cuándo se notificó
  detalle: "Detalle", // texto libre para trazabilidad
};

export const EVENT_TYPES = {
  NUEVA_OC: "nueva_oc",
  ITEM_AGREGADO: "item_agregado",
  OPI_COMPLETO: "opi_completo",
};
