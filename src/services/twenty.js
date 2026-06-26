import axios from "axios";
import { config } from "../config.js";

/**
 * Thin client for the Twenty CRM REST API.
 *
 * The exact field schema can differ between Twenty versions and custom
 * workspaces, so every call here is best-effort: failures are logged and
 * swallowed so a CRM hiccup never blocks a WhatsApp reply. Adjust the field
 * names below if your Twenty instance uses a customized data model.
 *
 * Docs: https://twenty.com  ->  Settings > APIs & Webhooks > REST
 */

const api = config.twenty.enabled
  ? axios.create({
      baseURL: `${config.twenty.apiUrl}/rest`,
      headers: {
        Authorization: `Bearer ${config.twenty.apiKey}`,
        "Content-Type": "application/json",
      },
      timeout: 10_000,
    })
  : null;

/**
 * Look up a person by phone number.
 * @returns {Promise<object|null>} The person record or null if not found.
 */
async function findPersonByPhone(phone) {
  const { data } = await api.get("/people", {
    params: { filter: `phones.primaryPhoneNumber[eq]:${phone}`, limit: 1 },
  });
  return data?.data?.people?.[0] || null;
}

/**
 * Create a new person record.
 * @returns {Promise<object>} The created person.
 */
async function createPerson({ phone, name }) {
  const { data } = await api.post("/people", {
    name: { firstName: name || "WhatsApp", lastName: "Contact" },
    phones: { primaryPhoneNumber: phone },
  });
  return data?.data?.createPerson || data?.data;
}

/**
 * Find an existing contact by phone or create one if it doesn't exist.
 *
 * @param {{ phone: string, name?: string }} contact
 * @returns {Promise<object|null>} The person record, or null if Twenty is
 *          disabled or the call failed.
 */
export async function upsertContact({ phone, name }) {
  if (!api) return null;

  try {
    const existing = await findPersonByPhone(phone);
    if (existing) return existing;
    return await createPerson({ phone, name });
  } catch (err) {
    console.warn("Twenty upsertContact failed:", err.response?.data || err.message);
    return null;
  }
}

/**
 * Attach a note to a person summarizing a conversation turn.
 *
 * @param {object} person - Person record returned by upsertContact.
 * @param {string} title - Short note title.
 * @param {string} body - Note body (e.g. the message + AI reply).
 */
export async function logNote(person, title, body) {
  if (!api || !person?.id) return;

  try {
    // Create the note...
    const { data } = await api.post("/notes", { title, body });
    const noteId = data?.data?.createNote?.id || data?.data?.id;

    // ...then link it to the person via a note target.
    if (noteId) {
      await api.post("/noteTargets", { noteId, personId: person.id });
    }
  } catch (err) {
    console.warn("Twenty logNote failed:", err.response?.data || err.message);
  }
}
