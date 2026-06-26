import { Router } from "express";
import { config } from "../config.js";
import { generateReply } from "../services/openai.js";
import { sendTextMessage, markAsRead } from "../services/whatsapp.js";
import { getHistory, remember, forget } from "../services/memory.js";

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
        const text = readText(msg);
        if (text) {
          results.push({ from: msg.from, text, id: msg.id, name: contactName });
        }
      }
    }
  }

  return results;
}

/**
 * Normalize the different message shapes we care about into plain text:
 * free text plus taps on interactive buttons / list items.
 */
function readText(msg) {
  if (msg.type === "text") return msg.text?.body || "";
  if (msg.type === "interactive") {
    const i = msg.interactive || {};
    return i.button_reply?.title || i.list_reply?.title || "";
  }
  return "";
}

/**
 * Full pipeline for a single incoming message:
 * read receipt -> recall history -> AI (RAG + tools) -> send -> remember.
 *
 * Saving to the CRM is no longer done blindly here — the AI decides when via
 * the tools in src/services/tools.js (save_contact, log_note, ...).
 */
async function handleMessage({ from, text, id, name }) {
  console.log(`Message from ${from}${name ? ` (${name})` : ""}: ${text}`);

  await markAsRead(id);

  // Simple built-in command to clear a conversation.
  if (text.trim().toLowerCase() === "/reset") {
    forget(from);
    await sendTextMessage(from, "🧹 Conversation reset. How can I help you?");
    return;
  }

  const history = getHistory(from);
  const { reply } = await generateReply({
    userMessage: text,
    history,
    context: { phone: from, contactName: name },
  });

  await sendTextMessage(from, reply);

  // Persist this turn so the next message has context.
  remember(from, "user", text);
  remember(from, "assistant", reply);
}
