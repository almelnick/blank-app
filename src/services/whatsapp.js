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
