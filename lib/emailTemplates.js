import { EVENT_TYPES } from "../config/glideSchema.js";

function buildTemplate(eventType, payload) {
  switch (eventType) {
    case EVENT_TYPES.NUEVA_OC:
      return {
        subject: `Nueva OC registrada: ${payload.numeroOC}`,
        html: `
          <p>Se registró una nueva Orden de Compra en CoreTrack.</p>
          <ul>
            <li><b>N° OC:</b> ${payload.numeroOC || "-"}</li>
            <li><b>Proveedor:</b> ${payload.proveedor || "-"}</li>
            <li><b>Cliente:</b> ${payload.cliente || "-"}</li>
            <li><b>OPI:</b> ${payload.opi || "-"}</li>
          </ul>
        `,
      };

    case EVENT_TYPES.ITEM_AGREGADO:
      return {
        subject: `Item agregado a OC ${payload.numeroOC}`,
        html: `
          <p>Se agregó un item (${payload.sourceType}) a una Orden de Compra existente.</p>
          <ul>
            <li><b>N° OC:</b> ${payload.numeroOC || "-"}</li>
            <li><b>Producto:</b> ${payload.producto || "-"}</li>
            <li><b>Descripción:</b> ${payload.descripcion || "-"}</li>
            <li><b>Serial:</b> ${payload.serial || "-"}</li>
          </ul>
        `,
      };

    case EVENT_TYPES.OPI_COMPLETO:
      return {
        subject: `OPI ${payload.opi} completo: todos los items recibidos`,
        html: `
          <p>Todos los items del OPI <b>${payload.opi}</b> ya están en estado "recibido".</p>
          <ul>
            ${payload.items
              .map(
                (i) =>
                  `<li>${i.producto || "-"} (${i.sourceType}) — serial ${
                    i.serial || "-"
                  }</li>`
              )
              .join("")}
          </ul>
          <p>Total de items: ${payload.totalItems}</p>
        `,
      };

    default:
      throw new Error(`Tipo de evento desconocido: ${eventType}`);
  }
}

export { buildTemplate };
