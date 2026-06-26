# 🤖 WhatsApp AI + Twenty CRM

Un bot de WhatsApp impulsado por IA (OpenAI) que responde mensajes
automáticamente y registra cada contacto y conversación en
[Twenty CRM](https://twenty.com).

Construido con **Node.js + Express + OpenAI + Axios + dotenv**.

## ✨ Cómo funciona

1. Meta (WhatsApp Cloud API) envía los mensajes entrantes a tu webhook.
2. El servidor genera una respuesta con OpenAI.
3. La respuesta se envía de vuelta al contacto por WhatsApp.
4. El contacto y la conversación se guardan en Twenty CRM (opcional).

```
WhatsApp  ──▶  /webhook (Express)  ──▶  OpenAI  ──▶  respuesta a WhatsApp
                      │
                      └──▶  Twenty CRM (contacto + nota)
```

## 🧠 El cerebro

El agente combina tres capacidades (todas en `src/services/`):

1. **Memoria** (`memory.js`) — recuerda los últimos turnos de cada contacto, así
   la conversación tiene continuidad. Es en memoria del proceso (se reinicia al
   reiniciar el server); para producción, cambiá el `Map` por Redis o una base.
   Escribí `/reset` en el chat para borrar el historial de un contacto.
2. **Conocimiento / RAG** (`knowledge.js`) — todo archivo `.md`/`.txt` en la
   carpeta `knowledge/` se trocea, se convierte en *embeddings* y se usa para
   responder con TU información. Sin base de datos externa: funciona out-of-the-box.
3. **Acciones / tools** (`tools.js`) — el modelo decide **cuándo** guardar datos.
   Tools incluidas: `save_contact`, `log_note`, `schedule_appointment`. El LLM
   las llama solo (function calling) y tu código ejecuta la acción real en Twenty.

### Nutrir el conocimiento

Poné tus archivos en `knowledge/` (mirá `knowledge/ejemplo-empresa.md`):

```
knowledge/
  productos.md
  preguntas-frecuentes.md
  politicas.txt
```

Se indexan automáticamente al primer mensaje. Para mucha información o fuentes
que cambian seguido, cambiá el índice en memoria por un vector DB (Supabase
pgvector, Qdrant, Pinecone): solo se tocan `buildIndex`/`retrieveContext`.

### Agregar nuevas acciones

En `src/services/tools.js`: añadí una definición a `toolDefinitions` y su
*handler* en `executeTool`. Acá es donde se enchufan integraciones como
[Composio](https://composio.dev) (Gmail, Calendar, CRMs, etc.) exponiendo sus
acciones como tools adicionales.

## 📁 Estructura

```
src/
  index.js            # Servidor Express y arranque
  config.js           # Carga y valida variables de entorno
  routes/
    webhook.js        # Verificación y recepción de eventos de WhatsApp
  services/
    openai.js         # Cerebro: RAG + memoria + agente con tools
    knowledge.js      # Base de conocimiento (RAG con embeddings)
    memory.js         # Memoria de conversación por contacto
    tools.js          # Acciones que el LLM puede ejecutar (function calling)
    whatsapp.js       # Envío de mensajes (texto + botones interactivos)
    twenty.js         # Sincronización de contactos/notas en Twenty CRM
knowledge/
  ejemplo-empresa.md  # Reemplazá con tu propia información
```

## 💬 Mensajes interactivos y WhatsApp Flows

Para flujos **estructurados** (sin que la IA improvise) `whatsapp.js` incluye
`sendButtons(to, texto, botones)` para enviar menús con botones. Cuando el
contacto toca un botón, su título llega como texto normal al agente.

Para formularios nativos más complejos (varias pantallas, validación) está
**WhatsApp Flows**, ya implementado abajo.

### WhatsApp Flows (endpoint cifrado)

El endpoint `POST /flows` recibe los datos de un Flow nativo de Meta. Todo el
tráfico va cifrado (RSA + AES-GCM) y el servidor ya hace todo: verifica la
firma, descifra, responde el *health check*, procesa las pantallas y cifra la
respuesta. Archivos:

```
src/routes/flows.js          # Endpoint (firma → descifra → maneja → cifra)
src/services/flowsCrypto.js  # RSA-OAEP + AES-GCM (IV invertido en la respuesta)
src/services/flowHandler.js  # TU lógica de pantallas (ejemplo: captura de lead)
scripts/generate-flow-keys.mjs  # Genera el par de llaves RSA
```

**Puesta en marcha:**

1. Generá las llaves:
   ```bash
   node scripts/generate-flow-keys.mjs
   ```
2. Pegá la **privada** en `.env` como `WHATSAPP_FLOW_PRIVATE_KEY` (una línea
   con `\n`). El script ya te imprime la línea lista.
3. Subí la **pública** a tu número (el script imprime el comando `curl` exacto
   con el endpoint `/whatsapp_business_encryption`).
4. En el Flow Builder de Meta, configurá el endpoint:
   `https://TU-DOMINIO/flows`.
5. Diseñá las pantallas en el Flow Builder y ajustá `flowHandler.js` para que
   los nombres de pantalla (`screen`) y los datos (`data`) coincidan. El ejemplo
   incluido captura un lead (`LEAD_FORM`) y lo guarda en Twenty CRM.

> El endpoint responde `432` si la firma no valida y `421` si no puede
> descifrar (el cliente reintenta), según lo que espera Meta.

## 🚀 Puesta en marcha

### 1. Instalar dependencias

```bash
npm install
```

### 2. Configurar variables de entorno

```bash
cp .env.example .env
```

Edita `.env` y completa tus credenciales (ver tabla abajo).

### 3. Ejecutar

```bash
npm start      # producción
npm run dev    # desarrollo (recarga automática con --watch)
```

El servidor queda escuchando en `http://localhost:3000`.

### 4. Exponer el webhook

Para que Meta pueda alcanzar tu servidor en desarrollo, expón el puerto con
una herramienta como [ngrok](https://ngrok.com):

```bash
ngrok http 3000
```

Luego, en el panel de tu app de Meta, configura el webhook con la URL
`https://TU-SUBDOMINIO.ngrok.io/webhook` y el `WHATSAPP_VERIFY_TOKEN` que
definiste en tu `.env`.

## 🔐 Variables de entorno

| Variable                   | Requerida | Descripción                                              |
| -------------------------- | :-------: | -------------------------------------------------------- |
| `PORT`                     |    No     | Puerto del servidor (por defecto `3000`).                |
| `OPENAI_API_KEY`           |    Sí     | Clave de API de OpenAI.                                   |
| `OPENAI_MODEL`             |    No     | Modelo a usar (por defecto `gpt-4o-mini`).               |
| `OPENAI_EMBEDDING_MODEL`   |    No     | Modelo de embeddings para RAG (`text-embedding-3-small`).|
| `AI_SYSTEM_PROMPT`         |    No     | Instrucción de sistema que define el comportamiento.     |
| `MEMORY_MAX_TURNS`         |    No     | Turnos de conversación recordados por contacto (`10`).   |
| `KNOWLEDGE_DIR`            |    No     | Carpeta con la base de conocimiento (`knowledge`).       |
| `KNOWLEDGE_TOP_K`          |    No     | Fragmentos de conocimiento inyectados por respuesta (`4`).|
| `WHATSAPP_TOKEN`           |    Sí     | Token de acceso de la app de Meta.                       |
| `WHATSAPP_PHONE_NUMBER_ID` |    Sí     | ID del número de WhatsApp Business.                      |
| `WHATSAPP_VERIFY_TOKEN`    |    Sí     | Token que inventas para verificar el webhook.            |
| `WHATSAPP_API_VERSION`     |    No     | Versión de la Graph API (por defecto `v20.0`).           |
| `TWENTY_API_URL`           |    No     | URL del API de tu instancia de Twenty.                   |
| `TWENTY_API_KEY`           |    No     | API key de Twenty. Si falta, la integración se desactiva.|

> La integración con Twenty es **opcional**: si no defines `TWENTY_API_URL` y
> `TWENTY_API_KEY`, el bot funciona igual pero sin guardar en el CRM.

## 📌 Notas

- El webhook responde `200` de inmediato y procesa los mensajes en segundo
  plano, como recomienda Meta (reintenta ante respuestas no-2xx).
- Por ahora solo se procesan mensajes de **texto**.
- Los esquemas de campos de Twenty pueden variar según la versión/instancia;
  ajusta `src/services/twenty.js` si tu modelo de datos es personalizado.

## 📄 Licencia

MIT
