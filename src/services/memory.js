import { config } from "../config.js";

/**
 * Conversation memory, keyed by contact phone number.
 *
 * This implementation is IN-PROCESS: history lives in a Map and is lost when
 * the server restarts. It's perfect for getting started, but for production
 * swap the Map for Redis or a database (the function signatures below are the
 * only surface you'd need to keep).
 *
 * Only clean user/assistant text turns are stored here — never the raw
 * tool-call messages from the agent loop, which reference transient IDs.
 */

const store = new Map();

/**
 * Get the stored conversation history for a contact.
 * @param {string} phone
 * @returns {Array<{role: "user"|"assistant", content: string}>}
 */
export function getHistory(phone) {
  return store.get(phone) || [];
}

/**
 * Append a turn to a contact's history, trimming to the configured window.
 * @param {string} phone
 * @param {"user"|"assistant"} role
 * @param {string} content
 */
export function remember(phone, role, content) {
  const history = store.get(phone) || [];
  history.push({ role, content });

  // Keep the last N turns (each turn ≈ 2 messages).
  const maxMessages = config.memory.maxTurns * 2;
  if (history.length > maxMessages) {
    history.splice(0, history.length - maxMessages);
  }

  store.set(phone, history);
}

/**
 * Forget a contact's history (e.g. on an explicit "reset" command).
 * @param {string} phone
 */
export function forget(phone) {
  store.delete(phone);
}
