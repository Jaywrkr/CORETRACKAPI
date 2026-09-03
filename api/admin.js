import { requireAdminAuth } from "../lib/adminAuth.js";

const PAGE = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>CoreTrack — Plantillas de correo</title>
<style>
  :root { color-scheme: light dark; }
  body {
    margin: 0;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    background: #0f1115;
    color: #e6e6e6;
  }
  header {
    padding: 24px 32px;
    border-bottom: 1px solid #23262f;
  }
  header h1 { margin: 0; font-size: 20px; }
  header p { margin: 4px 0 0; color: #9aa0ac; font-size: 13px; }
  main {
    max-width: 1100px;
    margin: 0 auto;
    padding: 24px 32px 80px;
    display: grid;
    gap: 20px;
  }
  .tabs { display: flex; gap: 8px; margin-bottom: 8px; flex-wrap: wrap; }
  .tab {
    padding: 8px 14px;
    border-radius: 8px;
    border: 1px solid #2b2f3a;
    background: #161922;
    color: #cfd3dc;
    cursor: pointer;
    font-size: 13px;
  }
  .tab.active { background: #2563eb; border-color: #2563eb; color: white; }
  .card {
    background: #161922;
    border: 1px solid #23262f;
    border-radius: 12px;
    padding: 20px;
    display: grid;
    gap: 14px;
  }
  .row { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
  @media (max-width: 800px) { .row { grid-template-columns: 1fr; } }
  label { font-size: 12px; text-transform: uppercase; letter-spacing: 0.04em; color: #9aa0ac; display: block; margin-bottom: 6px; }
  input[type=text], textarea {
    width: 100%;
    box-sizing: border-box;
    background: #0f1115;
    border: 1px solid #2b2f3a;
    border-radius: 8px;
    color: #e6e6e6;
    padding: 10px 12px;
    font-size: 14px;
    font-family: inherit;
  }
  textarea { min-height: 180px; resize: vertical; line-height: 1.4; }
  .placeholders { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
  .chip {
    font-size: 12px;
    background: #1e2230;
    border: 1px solid #2b2f3a;
    color: #93c5fd;
    padding: 3px 8px;
    border-radius: 999px;
    cursor: pointer;
  }
  .chip:hover { background: #263049; }
  .preview {
    background: #0b0d11;
    border: 1px dashed #2b2f3a;
    border-radius: 8px;
    padding: 14px;
    font-size: 13px;
  }
  .preview .subject { font-weight: 600; margin-bottom: 8px; color: #e6e6e6; }
  .preview .body { white-space: pre-wrap; color: #cfd3dc; }
  .actions { display: flex; align-items: center; gap: 12px; }
  button.save {
    background: #2563eb; color: white; border: none; border-radius: 8px;
    padding: 10px 18px; font-size: 14px; cursor: pointer;
  }
  button.save:disabled { opacity: 0.6; cursor: default; }
  .status { font-size: 13px; color: #9aa0ac; }
  .status.ok { color: #4ade80; }
  .status.err { color: #f87171; }
  .hint { font-size: 12px; color: #9aa0ac; margin: -4px 0 0; }
</style>
</head>
<body>
<header>
  <h1>Plantillas de correo — CoreTrack</h1>
  <p>Hay 4 correos posibles por día por destinatario, uno por tipo (OC nueva, Hardware, Software, Avances de OC), cada uno agrupando todos los eventos de ese tipo — no un correo por evento suelto. El tab "digest" es el sobre común a los 4 (asunto/intro); los demás tabs son cómo se ve cada línea dentro de ese correo. Los cambios aplican en la próxima corrida del cron, sin redeploy.</p>
</header>
<main>
  <div class="tabs" id="tabs"></div>
  <div class="card">
    <div>
      <label for="asunto" id="asunto-label">Asunto</label>
      <input type="text" id="asunto" />
      <div class="placeholders" id="placeholders-asunto"></div>
    </div>
    <div id="cuerpo-section">
      <label for="cuerpo">Cuerpo (intro del correo)</label>
      <textarea id="cuerpo"></textarea>
      <div class="placeholders" id="placeholders-cuerpo"></div>
    </div>
    <p class="hint" id="cuerpo-hint" hidden>Este tipo de evento no tiene "Cuerpo" propio — solo se usa como una línea dentro del correo de resumen (ver "digest"), con el texto de "Asunto".</p>
    <div class="row">
      <div>
        <label>Vista previa — Asunto</label>
        <div class="preview"><div class="subject" id="preview-subject"></div></div>
      </div>
      <div>
        <label>Vista previa — Cuerpo</label>
        <div class="preview"><div class="body" id="preview-body"></div></div>
      </div>
    </div>
    <div class="actions">
      <button class="save" id="save">Guardar</button>
      <span class="status" id="status"></span>
    </div>
  </div>
</main>
<script>
  const SAMPLE_PAYLOADS = {
    nueva_oc: [
      { numeroOC: "011-2026", proveedor: "NEXSYS", cliente: "MUTUALISTA AZUAY", opi: "PAC 1215" },
      { numeroOC: "022-2026", proveedor: "INACORP", cliente: "COOP JARDÍN AZUAYO", opi: "OPI 1176" },
    ],
    hw_agregado: [
      { numeroOC: "011-2026", producto: "Switch Aruba 24p", descripcion: "Switch de red", serial: "SN-12345" },
      { numeroOC: "022-2026", producto: "Servidor Lenovo SR250", descripcion: "Servidor", serial: "SN-67890" },
    ],
    sw_agregado: [
      { numeroOC: "011-2026", producto: "VMware vSphere", descripcion: "Licencia", serial: "LIC-111" },
      { numeroOC: "022-2026", producto: "Veeam Backup", descripcion: "Licencia", serial: "LIC-222" },
    ],
    opi_progreso: [
      { opi: "OPI 1100", recibidas: 2, total: 3, estado: "en progreso" },
      { opi: "OPI 1215", recibidas: 3, total: 3, estado: "completo" },
    ],
  };

  const EVENT_TYPE_LABELS = {
    nueva_oc: "Nuevas Órdenes de Compra",
    hw_agregado: "Hardware agregado",
    sw_agregado: "Software agregado",
    opi_progreso: "Avances de Órdenes de Compra",
  };

  let items = [];
  let current = null;

  function renderTemplate(str, payload) {
    return String(str || "").replace(/\\{\\{\\s*(\\w+)\\s*\\}\\}/g, (_, key) => {
      const value = payload[key];
      return value === undefined || value === null ? "" : String(value);
    });
  }

  function attachChipHandlers(containerId, fieldId) {
    document.querySelectorAll("#" + containerId + " .chip").forEach((chip) => {
      chip.addEventListener("click", () => {
        const field = document.getElementById(fieldId);
        const insert = "{{" + chip.dataset.p + "}}";
        const pos = field.selectionStart || field.value.length;
        field.value = field.value.slice(0, pos) + insert + field.value.slice(pos);
        field.focus();
        updatePreview();
      });
    });
  }

  function selectTab(eventType) {
    current = items.find((i) => i.eventType === eventType);
    document.querySelectorAll(".tab").forEach((el) => {
      el.classList.toggle("active", el.dataset.event === eventType);
    });
    const isDigest = eventType === "digest";
    document.getElementById("asunto-label").textContent = isDigest ? "Asunto" : "Línea del correo (una por evento)";
    document.getElementById("cuerpo-section").hidden = !isDigest;
    document.getElementById("cuerpo-hint").hidden = isDigest;

    document.getElementById("asunto").value = current.asunto;
    document.getElementById("cuerpo").value = current.cuerpo;

    const chips = current.placeholders
      .map((p) => \`<span class="chip" data-p="\${p}">{{\${p}}}</span>\`)
      .join("");
    document.getElementById("placeholders-asunto").innerHTML = chips;
    document.getElementById("placeholders-cuerpo").innerHTML = chips;
    attachChipHandlers("placeholders-asunto", "asunto");
    attachChipHandlers("placeholders-cuerpo", "cuerpo");

    updatePreview();
    document.getElementById("status").textContent = "";
  }

  function updatePreview() {
    const asunto = document.getElementById("asunto").value;
    const cuerpo = document.getElementById("cuerpo").value;
    const digestTemplate = items.find((i) => i.eventType === "digest") || { asunto: "", cuerpo: "" };

    if (current.eventType === "digest") {
      // El tab "digest" se previsualiza solo (es el sobre compartido por los 4 tipos).
      const sample = { tipo: "Nuevas Órdenes de Compra", total: 2, fecha: "2 de septiembre de 2026" };
      document.getElementById("preview-subject").textContent = renderTemplate(asunto, sample);
      document.getElementById("preview-body").textContent = renderTemplate(cuerpo, sample);
      return;
    }

    // Para un tab de evento, la vista previa arma el correo COMPLETO tal
    // como saldría: sobre "digest" (con {{tipo}}/{{total}} de este tipo) +
    // 2 líneas de ejemplo usando el Asunto de este tab.
    const samples = SAMPLE_PAYLOADS[current.eventType] || [{}];
    const tipo = EVENT_TYPE_LABELS[current.eventType] || current.eventType;
    const digestVars = { tipo, total: samples.length, fecha: "2 de septiembre de 2026" };
    const subject = renderTemplate(digestTemplate.asunto, digestVars);
    const intro = renderTemplate(digestTemplate.cuerpo, digestVars);
    const lines = samples.map((s) => "• " + renderTemplate(asunto, s)).join("\\n");

    document.getElementById("preview-subject").textContent = subject;
    document.getElementById("preview-body").textContent = intro + "\\n\\n" + lines;
  }

  async function load() {
    const res = await fetch("/api/admin-templates");
    const data = await res.json();
    items = data.items;
    document.getElementById("tabs").innerHTML = items
      .map((i) => \`<div class="tab" data-event="\${i.eventType}">\${i.eventType}</div>\`)
      .join("");
    document.querySelectorAll(".tab").forEach((el) => {
      el.addEventListener("click", () => selectTab(el.dataset.event));
    });
    selectTab(items[0].eventType);
  }

  document.getElementById("asunto").addEventListener("input", updatePreview);
  document.getElementById("cuerpo").addEventListener("input", updatePreview);

  document.getElementById("save").addEventListener("click", async () => {
    const button = document.getElementById("save");
    const status = document.getElementById("status");
    button.disabled = true;
    status.textContent = "Guardando...";
    status.className = "status";
    try {
      const res = await fetch("/api/admin-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventType: current.eventType,
          asunto: document.getElementById("asunto").value,
          cuerpo: document.getElementById("cuerpo").value,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Error al guardar");
      current.asunto = document.getElementById("asunto").value;
      current.cuerpo = document.getElementById("cuerpo").value;
      status.textContent = "Guardado ✓";
      status.className = "status ok";
    } catch (err) {
      status.textContent = "Error: " + err.message;
      status.className = "status err";
    } finally {
      button.disabled = false;
    }
  });

  load();
</script>
</body>
</html>`;

export default function handler(req, res) {
  if (!requireAdminAuth(req, res)) return;
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.status(200).send(PAGE);
}
