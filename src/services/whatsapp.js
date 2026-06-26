import axios from "axios";
import { config } from "../config.js";

const baseUrl = `https://graph.facebook.com/${config.whatsapp.apiVersion}/${config.whatsapp.phoneNumberId}`;

/**
 * Send a plain text WhatsApp message via the Meta Cloud API.
 *
 * @param {string} to - Recipient phone number in international format (e.g. "5491122334455").
 * @param {string} text - Message body.
 * @returns {Promise<object>} The Graph API response data.
 */
export async function sendTextMessage(to, text) {
  const { data } = await axios.post(
    `${baseUrl}/messages`,
    {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "text",
      text: { preview_url: false, body: text },
    },
    {
      headers: {
        Authorization: `Bearer ${config.whatsapp.token}`,
        "Content-Type": "application/json",
      },
    }
  );

  return data;
}

/**
 * Send an interactive message with up to 3 reply buttons.
 * Useful for structured, deterministic flows (e.g. a menu) without letting
 * the AI improvise. This is the lightweight cousin of WhatsApp Flows.
 *
 * @param {string} to - Recipient phone number.
 * @param {string} bodyText - Message shown above the buttons.
 * @param {Array<{id: string, title: string}>} buttons - Max 3, title <= 20 chars.
 */
export async function sendButtons(to, bodyText, buttons) {
  const { data } = await axios.post(
    `${baseUrl}/messages`,
    {
      messaging_product: "whatsapp",
      to,
      type: "interactive",
      interactive: {
        type: "button",
        body: { text: bodyText },
        action: {
          buttons: buttons.slice(0, 3).map((b) => ({
            type: "reply",
            reply: { id: b.id, title: b.title.slice(0, 20) },
          })),
        },
      },
    },
    {
      headers: {
        Authorization: `Bearer ${config.whatsapp.token}`,
        "Content-Type": "application/json",
      },
    }
  );

  return data;
}

/**
 * Mark an incoming message as read (the blue ticks) so the contact sees
 * that the bot received their message while the AI reply is generated.
 *
 * @param {string} messageId - The `id` of the incoming message.
 */
export async function markAsRead(messageId) {
  try {
    await axios.post(
      `${baseUrl}/messages`,
      {
        messaging_product: "whatsapp",
        status: "read",
        message_id: messageId,
      },
      {
        headers: {
          Authorization: `Bearer ${config.whatsapp.token}`,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (err) {
    // Non-critical: log and continue.
    console.warn("Could not mark message as read:", err.response?.data || err.message);
  }
}
