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
</style>
</head>
<body>
<header>
  <h1>Plantillas de correo — CoreTrack</h1>
  <p>Editá el asunto y el cuerpo de cada notificación. Los cambios se guardan en Glide y aplican en la próxima corrida del cron, sin redeploy.</p>
</header>
<main>
  <div class="tabs" id="tabs"></div>
  <div class="card">
    <div>
      <label for="asunto">Asunto</label>
      <input type="text" id="asunto" />
    </div>
    <div>
      <label for="cuerpo">Cuerpo</label>
      <textarea id="cuerpo"></textarea>
      <div class="placeholders" id="placeholders"></div>
    </div>
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
    nueva_oc: { numeroOC: "011-2026", proveedor: "NEXSYS", cliente: "MUTUALISTA AZUAY", opi: "PAC 1215" },
    item_agregado: { numeroOC: "011-2026", producto: "Switch Aruba 24p", descripcion: "Switch de red", serial: "SN-12345", sourceType: "hardware" },
    opi_progreso: { opi: "OPI 1100", recibidas: 2, total: 3, estado: "en progreso" },
  };

  let items = [];
  let current = null;

  function renderTemplate(str, payload) {
    return String(str || "").replace(/\\{\\{\\s*(\\w+)\\s*\\}\\}/g, (_, key) => {
      const value = payload[key];
      return value === undefined || value === null ? "" : String(value);
    });
  }

  function selectTab(eventType) {
    current = items.find((i) => i.eventType === eventType);
    document.querySelectorAll(".tab").forEach((el) => {
      el.classList.toggle("active", el.dataset.event === eventType);
    });
    document.getElementById("asunto").value = current.asunto;
    document.getElementById("cuerpo").value = current.cuerpo;
    document.getElementById("placeholders").innerHTML = current.placeholders
      .map((p) => \`<span class="chip" data-p="\${p}">{{\${p}}}</span>\`)
      .join("");
    document.querySelectorAll(".chip").forEach((chip) => {
      chip.addEventListener("click", () => {
        const textarea = document.getElementById("cuerpo");
        const insert = "{{" + chip.dataset.p + "}}";
        const pos = textarea.selectionStart || textarea.value.length;
        textarea.value = textarea.value.slice(0, pos) + insert + textarea.value.slice(pos);
        textarea.focus();
        updatePreview();
      });
    });
    updatePreview();
    document.getElementById("status").textContent = "";
  }

  function updatePreview() {
    const asunto = document.getElementById("asunto").value;
    const cuerpo = document.getElementById("cuerpo").value;
    const sample = SAMPLE_PAYLOADS[current.eventType] || {};
    document.getElementById("preview-subject").textContent = renderTemplate(asunto, sample);
    document.getElementById("preview-body").textContent = renderTemplate(cuerpo, sample);
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
