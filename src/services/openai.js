import OpenAI from "openai";
import { config } from "../config.js";
import { getSettings } from "./settings.js";
import { buildSystemPrompt } from "./agentConfig.js";
import { getProfile } from "./memory.js";
import { retrieveContext } from "./knowledge.js";
import { toolDefinitions, executeTool } from "./tools.js";

const client = new OpenAI({ apiKey: config.openai.apiKey });

// Safety cap on how many tool round-trips a single message can trigger.
const MAX_TOOL_ROUNDS = 5;

/**
 * The "brain": generate an AI reply with three capabilities wired in.
 *   1. Knowledge  — relevant chunks retrieved via RAG and injected as context.
 *   2. Memory     — prior turns of THIS conversation (passed in by the caller).
 *   3. Actions    — tools the model can call to save data / book appointments.
 *
 * @param {object}   opts
 * @param {string}   opts.userMessage - Latest message from the contact.
 * @param {Array<{role:"user"|"assistant",content:string}>} [opts.history]
 * @param {{ phone: string, contactName?: string }} [opts.context]
 * @returns {Promise<{ reply: string, sources: string[] }>} Reply + knowledge sources used.
 */
export async function generateReply({ userMessage, history = [], context = {} }) {
  const settings = getSettings();

  // Per-contact profile (name + current stage) keeps the agent in context.
  const profile = context.phone ? getProfile(context.phone) : null;

  // 1. RAG: ground the answer in our own knowledge base.
  const { context: knowledge, sources } = await retrieveContext(userMessage);
  let systemContent = buildSystemPrompt({ profile });
  if (knowledge) {
    systemContent +=
      `\n\nCONOCIMIENTO RELEVANTE (respondé usando esto; si la respuesta no está acá, no la inventes):\n${knowledge}`;
  }

  // 2. Memory: system + past turns + the new message.
  const messages = [
    { role: "system", content: systemContent },
    ...history,
    { role: "user", content: userMessage },
  ];

  // 3. Agent loop: let the model think, optionally call tools, then answer.
  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const completion = await client.chat.completions.create({
      model: settings.model,
      messages,
      tools: toolDefinitions,
      temperature: settings.temperature,
    });

    const message = completion.choices?.[0]?.message;
    messages.push(message);

    // No tool calls → this is the final answer.
    if (!message?.tool_calls?.length) {
      const reply = message?.content?.trim() || "Sorry, I couldn't generate a response right now.";
      return { reply, sources };
    }

    // Execute every requested tool and feed the results back to the model.
    for (const call of message.tool_calls) {
      let args = {};
      try {
        args = JSON.parse(call.function.arguments || "{}");
      } catch {
        // Malformed arguments — report the error back to the model.
      }
      const result = await executeTool(call.function.name, args, context);
      messages.push({
        role: "tool",
        tool_call_id: call.id,
        content: JSON.stringify(result),
      });
    }
  }

  return {
    reply: "Sorry, this is taking longer than expected. Could you rephrase your request?",
    sources,
  };
}
