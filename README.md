# CoreTrackAPI

Cron serverless en Vercel que monitorea eventos de **CoreTrack** (app de Glide)
y notifica por correo (Gmail API), ya que Glide no ofrece webhooks salientes.

Detecta tres tipos de evento:

- **Nueva OC registrada**
- **Item (hardware o software) agregado a una OC existente**
- **OPI completo** (todos los items de un OPI en estado "recibido")

Para no re-notificar lo mismo cada día, cada evento notificado se registra en
una tabla de "log" dentro de la misma app de Glide.

## Estructura

```
api/check-coretrack.js     Endpoint que dispara el cron (GET)
lib/glideClient.js          Cliente HTTP mínimo de la API de Tablas de Glide
lib/detectEvents.js         Lógica pura de diff/detección de eventos (testeable)
lib/notificationLog.js      Lectura/escritura de la tabla de log en Glide
lib/mailer.js                Envío de correo vía Gmail API
lib/emailTemplates.js       Asunto/HTML de cada tipo de evento
lib/runCheck.js              Orquesta: fetch -> detect -> notify -> log
config/glideSchema.js       Nombres de tablas y columnas de Glide
config/recipients.js        Mapeo evento -> destinatarios adicionales
scripts/run-local.js        Corre runCheck() localmente con .env
vercel.json                  Configuración del cron
```

La lógica de detección (`detectEvents.js`) está separada del envío de correo
(`mailer.js`) y de la persistencia (`notificationLog.js`) a propósito, para
poder probar cada parte por separado. Hay un test simple sin dependencias en
`lib/detectEvents.test.js` — correrlo con `node lib/detectEvents.test.js`.

## ⚠️ Confirmaciones pendientes (antes de dar la lógica por definitiva)

El esquema en `config/glideSchema.js` se armó inspeccionando la app de Glide
vía un MCP local que ya tenías conectado. Faltan confirmar estos puntos:

1. **Tabla de OC**: usé `Comtrol de Ordenes de Compra Track`, con columnas
   `N°OC`, `OPI`, `Estado`, y `Correo 0/1/2` como destinatarios. ¿Es correcta
   esta tabla y son esas las columnas relevantes?
2. **Items de hardware/software**: usé `*HARDWARE` y `*SOFTWARE`. Ahí el
   vínculo a la OC/OPI es por **texto** (`N OC`/`Nro OC`, `Opi`/`NRO OPI`),
   no por relación nativa de Glide — el matching se hace comparando esos
   valores de texto. ¿Es así como se vinculan en la práctica, o hay una
   relación nativa que debería usar en su lugar?
3. **Estado "recibido"**: no encontré una columna de estado por-item que
   diga literalmente "recibido". Usé `Status Documentos` (hardware) /
   `Status Chequeo` (software) comparando contra los valores
   `recibido/recibida/entregado/entregada` (ver `RECEIVED_STATUSES` en
   `lib/detectEvents.js`). ¿Es esa la columna correcta y cuáles son los
   valores reales que puede tomar?
4. **Tabla de OPI**: no encontré una tabla propia de "Órdenes de Pedido
   Interno" — el número de OPI aparece como campo de texto repetido en OC,
   *HARDWARE y *SOFTWARE. La detección de "OPI completo" agrupa items por
   ese número de texto. Si en realidad existe una tabla de OPI separada
   (o el número de OPI vive en otro lado), avisame para ajustar el join.
5. **Tabla de log de notificaciones**: no existe todavía. Hay que crearla a
   mano en el editor de Glide (la API de Glide no crea tablas nuevas, solo
   agrega filas a tablas existentes). Crear una tabla llamada
   `Notificaciones CoreTrack Log` con estas columnas de tipo texto/fecha:
   - `ItemRowID` (texto)
   - `EventType` (texto)
   - `Fecha` (fecha y hora)
   - `Detalle` (texto)
6. **Destinatarios**: por ahora tomo los correos de las columnas `Correo
   0/1/2` de la fila de OC (se propagan también a los eventos de item y de
   OPI vía esa misma OC). Además, `config/recipients.js` permite sumar
   destinatarios fijos por tipo de evento vía variables de entorno
   (`NOTIFY_EXTRA_*`). ¿Necesitas otra fuente de correos (ej. una tabla de
   "Personal" por rol)?

Estos cambios son pequeños y acotados a `config/glideSchema.js` y
`lib/detectEvents.js` — el resto del proyecto no depende de los nombres
exactos.

## Setup

### 1. Habilitar la API de Glide en las tablas

En el editor de Glide, para cada tabla que se vaya a consultar (OC,
*HARDWARE, *SOFTWARE, y la nueva tabla de log): abrir la tabla → menú "..."
→ **Enable Public API**. Anotar el nombre exacto que Glide use ahí (puede
diferir del nombre visible en la pestaña) y usarlo en las variables
`GLIDE_TABLE_*`.

Obtener el **token de API** y el **App ID** en Settings → Developer → API.

### 2. Variables de entorno

Copiar `.env.example` a `.env` (local) y cargar las mismas en Vercel
(Project Settings → Environment Variables):

- `GLIDE_API_TOKEN`, `GLIDE_APP_ID`
- `GLIDE_TABLE_OC`, `GLIDE_TABLE_HARDWARE`, `GLIDE_TABLE_SOFTWARE`, `GLIDE_TABLE_LOG`
- `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN`, `GMAIL_SENDER`
- `NOTIFY_EXTRA_*` (opcional)
- `CRON_SECRET` (recomendado, ver abajo)

### 3. Credenciales de Gmail API

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

### 4. Probar localmente

```bash
npm install
npm run check:local
```

Esto corre `runCheck()` una vez con las variables de `.env`, sin necesidad de
desplegar. Revisar los logs en consola: qué se detectó, qué se notificó y qué
se saltó por ya estar en el log.

### 5. Deploy en Vercel

1. Conectar el repo de GitHub `Jaywrkr/CORETRACKAPI` en Vercel (Import
   Project) — esto habilita deploy automático en cada push a la rama
   configurada como producción.
2. Cargar las variables de entorno del paso 2 en el proyecto de Vercel.
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

### 6. Verificar

Después del deploy, se puede disparar manualmente con:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://<tu-proyecto>.vercel.app/api/check-coretrack
```

Y revisar los logs de la función en el dashboard de Vercel (Deployments →
Functions → check-coretrack) para ver el resumen de cada corrida.
