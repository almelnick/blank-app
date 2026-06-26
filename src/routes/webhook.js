import { Router } from "express";
import { config } from "../config.js";
import { generateReply } from "../services/openai.js";
import { sendTextMessage, markAsRead } from "../services/whatsapp.js";
import { upsertContact, logNote } from "../services/twenty.js";

export const webhookRouter = Router();

/**
 * Webhook verification (GET).
 * Meta calls this once when you configure the webhook in the app dashboard.
 * We echo back `hub.challenge` only if the verify token matches.
 */
webhookRouter.get("/", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === config.whatsapp.verifyToken) {
    console.log("Webhook verified by Meta.");
    return res.status(200).send(challenge);
  }

  return res.sendStatus(403);
});

/**
 * Incoming events (POST).
 * We acknowledge immediately with 200 (Meta retries on non-2xx), then
 * process each message asynchronously.
 */
webhookRouter.post("/", (req, res) => {
  res.sendStatus(200);

  const messages = extractMessages(req.body);
  for (const message of messages) {
    handleMessage(message).catch((err) =>
      console.error("Failed to handle message:", err.response?.data || err.message)
    );
  }
});

/**
 * Pull text messages out of the (deeply nested) WhatsApp webhook payload.
 * Returns a flat array of { from, text, id, name }.
 */
function extractMessages(body) {
  const results = [];
  const entries = body?.entry || [];

  for (const entry of entries) {
    for (const change of entry.changes || []) {
      const value = change.value || {};
      const contacts = value.contacts || [];
      const contactName = contacts[0]?.profile?.name;

      for (const msg of value.messages || []) {
        if (msg.type === "text" && msg.text?.body) {
          results.push({
            from: msg.from,
            text: msg.text.body,
            id: msg.id,
            name: contactName,
          });
        }
      }
    }
  }

  return results;
}

/**
 * Full pipeline for a single incoming message:
 * read receipt -> AI reply -> send -> log to Twenty CRM.
 */
async function handleMessage({ from, text, id, name }) {
  console.log(`Message from ${from}${name ? ` (${name})` : ""}: ${text}`);

  await markAsRead(id);

  const reply = await generateReply(text);
  await sendTextMessage(from, reply);

  // Best-effort CRM sync. Never blocks or breaks the reply.
  const contact = await upsertContact({ phone: from, name });
  if (contact) {
    await logNote(
      contact,
      "WhatsApp conversation",
      `Contact: ${text}\n\nAssistant: ${reply}`
    );
  }
}
