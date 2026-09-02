# CoreTrackAPI

Cron serverless en Vercel que monitorea eventos de **CoreTrack** (app de Glide)
y notifica por correo (Gmail API), ya que Glide no ofrece webhooks salientes.

Detecta tres tipos de evento:

- **Nueva OC registrada**
- **Item (hardware o software) agregado a una OC existente**
- **Progreso de recepción por OPI**: un mismo OPI puede abarcar varias OC
  (relación nativa "Relación por PPR" en Glide, entre filas de la propia
  tabla de OC que comparten el mismo `OPI`). Notifica **cada vez que sube**
  la cantidad de OC con `Estado = RECIBIDO` sobre el total de OC del grupo
  — "llegó 1 de 3", luego "llegó 2 de 3", hasta "llegó 3 de 3" — replicando
  el rollup `Total Recibidos PPR` / `Total Filas PPR` que Glide calcula
  puertas adentro pero no expone por API (ver más abajo).

Estos mapean a los 4 workflows nativos de Glide que ya existían
(`CORREO OC CREADA`, `CORREO NUEVA ORDEN HW/SW`, `COMPLETA ORDEN DE COMPRE`),
que no estaban enviando el correo de forma confiable — de ahí este proyecto.
`COMPLETA ORDEN DE COMPRE` solo avisaba en el último item (3 de 3); acá se
decidió avisar en cada incremento.

### ⚠️ Limitación importante de la API de Glide

La API pública de Tablas de Glide solo expone las columnas de **datos**
reales de una tabla — **no expone relaciones, rollups, lookups ni columnas
calculadas** (if-then/template) armadas en el editor de la app. Por eso
columnas como `Relación por PPR`, `Total Recibidos PPR`, `Total Filas PPR` o
`Es Recibido` (que en Glide es un if-then: `Estado = "RECIBIDO"` → `1`, si no
`0`) no se pueden leer directamente. Este proyecto **recalcula esa misma
lógica** a partir de las columnas de datos reales (agrupando filas de OC por
`OPI` y contando cuántas tienen `Estado = RECIBIDO`), en vez de depender de
esas columnas calculadas.

Para no re-notificar lo mismo cada día, cada evento notificado se registra en
un archivo JSON en **Vercel Blob** (almacenamiento propio del proyecto, no
una tabla de Glide — ver más abajo).

## ✏️ Editar los textos de los correos sin tocar código

Entrando a `https://<tu-proyecto>.vercel.app/admin` (pide usuario/contraseña,
ver `ADMIN_USER`/`ADMIN_PASSWORD`) hay un panel donde se edita el **Asunto**
y el **Cuerpo** de cada tipo de evento, con vista previa en vivo y botones
para insertar los placeholders disponibles (`{{numeroOC}}`, `{{proveedor}}`,
etc). Los cambios se guardan como JSON en Vercel Blob y los toma la próxima
corrida del cron — sin redeploy, sin git, sin pedirle nada a nadie.

## 💾 Dónde vive cada dato

- **Glide** (solo lectura): OC, `*HARDWARE`, `*SOFTWARE`, `Users` — los datos
  de negocio reales de CoreTrack.
- **Vercel Blob** (propio de este proyecto, como un par de archivos JSON):
  el log de notificaciones (`coretrack/notification-log.json`) y las
  plantillas de correo (`coretrack/templates.json`). No requiere crear
  tablas nuevas en Glide ni configurar una base de datos — es solo
  almacenamiento de archivos que Vercel gestiona.

## Estructura

```
api/check-coretrack.js     Endpoint que dispara el cron (GET)
api/admin.js                 Página HTML del panel de plantillas (protegida)
api/admin-templates.js      GET/POST de las plantillas (protegida)
lib/glideClient.js          Cliente HTTP mínimo de la API de Tablas de Glide
lib/blobStore.js              Lectura/escritura de JSON en Vercel Blob
lib/detectEvents.js         Lógica pura de diff/detección de eventos (testeable)
lib/notificationLog.js      Log de notificaciones (JSON en Vercel Blob)
lib/templates.js             Carga/guarda plantillas (JSON en Vercel Blob) + motor {{placeholder}}
lib/mailer.js                Envío de correo vía Gmail API
lib/emailTemplates.js       Arma asunto/HTML final combinando plantilla + payload
lib/resolvePersonal.js      Resuelve nombres de Personal -> email vía tabla Users
lib/adminAuth.js             HTTP Basic Auth para /admin y /api/admin-templates
lib/runCheck.js              Orquesta: fetch -> detect -> notify -> log
config/glideSchema.js       Nombres de tablas y columnas de Glide
config/recipients.js        Mapeo evento -> destinatarios adicionales
scripts/run-local.js        Corre runCheck() localmente con .env
scripts/demo.js              Corre la lógica con datos simulados (ver consola)
vercel.json                  Configuración del cron
```

La lógica de detección (`detectEvents.js`) está separada del envío de correo
(`mailer.js`) y de la persistencia (`notificationLog.js`) a propósito, para
poder probar cada parte por separado. Hay tests simples sin dependencias:

```bash
node lib/detectEvents.test.js
node lib/resolvePersonal.test.js
node lib/templates.test.js
```

## ✅ Confirmado / ⚠️ Pendiente

El esquema en `config/glideSchema.js` se armó y validó inspeccionando datos
reales de la app de Glide y sus 4 workflows nativos vía un MCP local ya
conectado (`glide-core-mcp`). Confirmado hasta ahora:

- **Tabla de OC** = `Comtrol de Ordenes de Compra Track`, columnas `N°OC`,
  `OPI`, `Estado` (valores vistos: `RECIBIDO`, `DIFERIDO`), `Correo 0/1/2`.
- **Items** = `*HARDWARE` (columnas `Nro OC`, `NRO OPI`) y `*SOFTWARE`
  (columnas `N OC`, `Opi`) — el vínculo a la OC es por texto, solo se usa
  para el evento "item agregado".
- **Progreso por OPI** = agrupar filas de OC por `OPI` y contar cuántas
  tienen `Estado = RECIBIDO` sobre el total del grupo — replica exactamente
  la relación nativa `Relación por PPR` (self-relation de OC por `OPI`,
  "Match multiple") y la columna if-then `Es Recibido` (`Estado is RECIBIDO`
  → `1`, si no `0`) que ya existen en Glide. Notifica en cada incremento,
  no solo al llegar al total.
- Los eventos mapean a los 4 workflows nativos de Glide que ya existían
  (`CORREO OC CREADA`, `CORREO NUEVA ORDEN HW`, `CORREO NUEVA ORDEN SW`,
  `COMPLETA ORDEN DE COMPRE`), que no estaban enviando el correo de forma
  confiable — de ahí este proyecto.

### 📧 Destinatarios: por qué se resuelven vía la tabla `Users`

Los workflows nativos calculan `Correo 0/1/2` en la OC a partir de un lookup
sobre el nombre en `Personal`/`Personal 1`/`Personal 2` — pero esa cadena de
lookups depende de que el mismo workflow (roto) corra primero, así que esas
columnas pueden estar vacías. Además, se detectó que la tabla que se
intentaba usar para resolver nombre→email (`PERSONAL GENERAL`) tiene la
columna de correo completamente vacía.

En cambio, la tabla **`Users`** (misma app que OC/`*HARDWARE`/`*SOFTWARE`)
sí tiene el mapeo `Name` → `Email` completo y real. Este proyecto resuelve
los destinatarios así: toma `Personal`/`Personal 1`/`Personal 2` de la(s)
OC involucradas, los cruza contra `Users` (`lib/resolvePersonal.js`), y usa
esos emails — con `Correo 0/1/2` como respaldo adicional si están
poblados. Esto es más confiable que depender de la cadena de lookups nativa.

Pendiente de confirmar:

1. **Nombres de columna reales de `Users`**: asumí `Name` y `Email` (así se
   ven en el Data Editor) — confirmar que esos son los nombres exactos que
   expone la API una vez habilitada ahí "Enable Public API".
2. **Destinatarios fijos**: los 4 workflows nativos siempre agregaban
   `jcjaramillov@coresolutions.com.ec` y `asistenteadm@coresolutions.com.ec`
   (To/Cc fijos) además del destinatario resuelto. Si querés replicar eso,
   cargalos en `NOTIFY_EXTRA_NUEVA_OC`, `NOTIFY_EXTRA_ITEM_AGREGADO` y
   `NOTIFY_EXTRA_OPI_PROGRESO` en `.env`.
3. Revisar el workflow `CORREO OC CREADA` a fondo para terminar de validar
   `nueva_oc` contra su lógica real (en curso).

Estos cambios son pequeños y acotados a `config/glideSchema.js` y
`lib/detectEvents.js` — el resto del proyecto no depende de los nombres
exactos.

## Setup

### 1. Habilitar la API de Glide en las tablas

En el editor de Glide, para cada tabla que se vaya a consultar (OC,
*HARDWARE, *SOFTWARE, Users): abrir la tabla → menú "..." →
**Enable Public API**. Anotar el nombre exacto que Glide use ahí (puede
diferir del nombre visible en la pestaña) y usarlo en las variables
`GLIDE_TABLE_*`.

Obtener el **token de API** y el **App ID** en Settings → Developer → API.

### 2. Crear el Blob Store en Vercel

En el dashboard de Vercel: proyecto → pestaña **Storage** → **Create
Database** → **Blob**. Al conectarlo al proyecto, Vercel agrega solo la
variable `BLOB_READ_WRITE_TOKEN` — no hace falta crear nada más ni definir
un esquema. Ahí es donde se guardan el log de notificaciones y las
plantillas de correo.

Para probar localmente, copiar ese mismo token a `.env`
(`vercel env pull .env` si tenés la CLI de Vercel instalada, o copiarlo a
mano desde Storage → tu Blob Store → `.env.local` tab).

### 3. Variables de entorno

Copiar `.env.example` a `.env` (local) y cargar las mismas en Vercel
(Project Settings → Environment Variables):

- `GLIDE_API_TOKEN`, `GLIDE_APP_ID`
- `GLIDE_TABLE_OC`, `GLIDE_TABLE_HARDWARE`, `GLIDE_TABLE_SOFTWARE`, `GLIDE_TABLE_USERS`
- `BLOB_READ_WRITE_TOKEN` (la agrega Vercel solo al conectar el Blob Store del paso 2)
- `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN`, `GMAIL_SENDER`
- `NOTIFY_EXTRA_*` (opcional)
- `CRON_SECRET` (recomendado, ver abajo)
- `ADMIN_USER`, `ADMIN_PASSWORD` (para entrar a `/admin` a editar los textos de los correos)

### 4. Credenciales de Gmail API

1. En [Google Cloud Console](https://console.cloud.google.com/), crear (o
   reusar) un proyecto y habilitar **Gmail API**.
2. Crear credenciales OAuth2 de tipo "Desktop app" → obtener
   `client_id` y `client_secret`.
3. Generar un `refresh_token` una sola vez, con scope
   `https://www.googleapis.com/auth/gmail.send`, autenticando con la cuenta
   de Gmail que va a enviar los correos (por ejemplo usando
   [Google OAuth Playground](https://developers.google.com/oauthplayground):
   configurar los "custom" client_id/secret en el ícono de settings, elegir
   el scope de Gmail send, autorizar, e intercambiar el código por tokens).
4. Guardar `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN` y
   la dirección remitente en `GMAIL_SENDER`.

### 5. Probar localmente

```bash
npm install
npm run check:local
```

Esto corre `runCheck()` una vez con las variables de `.env`, sin necesidad de
desplegar. Revisar los logs en consola: qué se detectó, qué se notificó y qué
se saltó por ya estar en el log.

### 6. Deploy en Vercel

1. Conectar el repo de GitHub `Jaywrkr/CORETRACKAPI` en Vercel (Import
   Project) — esto habilita deploy automático en cada push a la rama
   configurada como producción.
2. Cargar las variables de entorno del paso 3 en el proyecto de Vercel.
3. Definir `CRON_SECRET` (cualquier string random) como variable de entorno
   **en Vercel**: Vercel firma automáticamente las invocaciones de sus
   cron jobs con `Authorization: Bearer <CRON_SECRET>`, y el endpoint lo
   valida para que nadie más pueda dispararlo llamando a la URL pública.
4. El cron ya está definido en `vercel.json`:

   ```json
   { "crons": [{ "path": "/api/check-coretrack", "schedule": "0 23 * * *" }] }
   ```

   Esa expresión corre todos los días a las **23:00 UTC**, es decir
   **18:00 en Ecuador (UTC-5)**. Para cambiar la hora, editar el `schedule`
   (formato cron estándar, en UTC) y volver a desplegar — Vercel no permite
   leer el horario del cron desde una variable de entorno, así que un
   cambio de hora requiere tocar este archivo.

### 7. Verificar

Después del deploy, se puede disparar manualmente con:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://<tu-proyecto>.vercel.app/api/check-coretrack
```

Y revisar los logs de la función en el dashboard de Vercel (Deployments →
Functions → check-coretrack) para ver el resumen de cada corrida.
