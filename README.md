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

## 📁 Estructura

```
src/
  index.js            # Servidor Express y arranque
  config.js           # Carga y valida variables de entorno
  routes/
    webhook.js        # Verificación y recepción de eventos de WhatsApp
  services/
    openai.js         # Generación de respuestas con IA
    whatsapp.js       # Envío de mensajes vía WhatsApp Cloud API
    twenty.js         # Sincronización de contactos/notas en Twenty CRM
```

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
| `AI_SYSTEM_PROMPT`         |    No     | Instrucción de sistema que define el comportamiento.     |
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
