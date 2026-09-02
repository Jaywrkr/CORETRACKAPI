// Mapeo de tablas y columnas de Glide usadas por el checker de CoreTrack.
//
// Los nombres de columna de abajo salen de inspeccionar la app real vía el
// MCP glide-core-mcp (tablas "Comtrol de Ordenes de Compra Track", "*HARDWARE",
// "*SOFTWARE"). CONFIRMAR con el usuario antes de tomarlos como definitivos:
// ver README > "Confirmaciones pendientes".

// Tablas de negocio que se leen de Glide (solo lectura). El log de
// notificaciones y las plantillas de correo NO viven en Glide: se guardan
// como JSON en Vercel Blob (ver lib/notificationLog.js y lib/templates.js),
// para no depender de crear/mantener tablas extra en la app de Glide.
export const TABLES = {
  oc: process.env.GLIDE_TABLE_OC || "Comtrol de Ordenes de Compra Track",
  hardware: process.env.GLIDE_TABLE_HARDWARE || "*HARDWARE",
  software: process.env.GLIDE_TABLE_SOFTWARE || "*SOFTWARE",
  users: process.env.GLIDE_TABLE_USERS || "Users",
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
  personal: "Personal",
  personal1: "Personal 1",
  personal2: "Personal 2",
  // Correo 0/1/2 son calculados por un workflow nativo de Glide (lookup de
  // Personal -> tabla Users) que no corre de forma confiable. Se dejan como
  // respaldo, pero la fuente principal de destinatarios es resolver
  // Personal/Personal 1/Personal 2 contra USERS_COLUMNS nosotros mismos.
  correo0: "Correo 0",
  correo1: "Correo 1",
  correo2: "Correo 2",
};

// Columnas de la tabla "Users" (directorio de personal, nombre -> email).
export const USERS_COLUMNS = {
  nombre: "Name",
  email: "Email",
};

// Valores de OC_COLUMNS.estado que cuentan como "recibida" para el progreso
// por OPI (evento OPI_PROGRESO). Confirmado con datos reales: se vio
// "RECIBIDO" y "DIFERIDO" en la tabla; por ahora solo RECIBIDO cuenta.
// Ajustar si hay otros valores terminales.
export const OC_ESTADOS_RECIBIDA = ["RECIBIDO"];

// Columnas comunes a *HARDWARE y *SOFTWARE, usadas solo para detectar el
// evento ITEM_AGREGADO. OJO: el vínculo a la OC es por texto (no relación),
// así que el match se hace por el número de OC. El progreso de "recibido"
// se mide a nivel de OC (ver OC_ESTADOS_RECIBIDA), no con estas columnas de
// status por-item.
export const HARDWARE_COLUMNS = {
  rowId: "$rowID",
  numeroOC: "Nro OC",
  opi: "NRO OPI",
  producto: "Equipo o Licencia",
  descripcion: "Descr.",
  serial: "Serie o Contrato",
  statusDocumentos: "Status Chequeo",
};

export const SOFTWARE_COLUMNS = {
  rowId: "$rowID",
  numeroOC: "N OC",
  opi: "Opi",
  producto: "PRODUCTO/NOMBRE",
  descripcion: "PRODUCTO/DESCRIPCION",
  serial: "PRODUCTO/SERIAL",
  statusDocumentos: "Status Documentos",
};

export const EVENT_TYPES = {
  NUEVA_OC: "nueva_oc",
  ITEM_AGREGADO: "item_agregado",
  // Progreso de recepción por OPI: agrupa las OC que comparten el mismo OPI
  // (replica la relación nativa "Relación por PPR" de Glide, que la API de
  // Tablas no expone) y notifica cada vez que sube la cantidad de OC con
  // Estado en OC_ESTADOS_RECIBIDA sobre el total de OC del grupo
  // (ej. "llegó 2 de 3").
  OPI_PROGRESO: "opi_progreso",
};
