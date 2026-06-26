import OpenAI from "openai";
import { config } from "../config.js";

const client = new OpenAI({ apiKey: config.openai.apiKey });

/**
 * Generate an AI reply for an incoming WhatsApp message.
 *
 * @param {string} userMessage - The text the contact sent us.
 * @param {Array<{role: "user"|"assistant", content: string}>} [history]
 *        Optional prior turns of the conversation for context.
 * @returns {Promise<string>} The assistant's reply text.
 */
export async function generateReply(userMessage, history = []) {
  const messages = [
    { role: "system", content: config.openai.systemPrompt },
    ...history,
    { role: "user", content: userMessage },
  ];

  const completion = await client.chat.completions.create({
    model: config.openai.model,
    messages,
    temperature: 0.7,
  });

  const reply = completion.choices?.[0]?.message?.content?.trim();
  return reply || "Sorry, I couldn't generate a response right now.";
}
