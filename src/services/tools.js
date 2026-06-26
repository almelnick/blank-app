import { upsertContact, logNote } from "./twenty.js";

/**
 * Tools (a.k.a. function calling) the AI can invoke on its own.
 *
 * The model reads the conversation and decides WHEN to call these — e.g. it
 * calls `save_contact` only once the customer shares their name/email, and
 * `schedule_appointment` only when they actually want to book. Your code then
 * runs the real action (Twenty CRM, etc.). This is what turns a chatbot into
 * an agent that takes actions.
 *
 * To add a capability: add a definition to `toolDefinitions` and a matching
 * handler in `handlers`. Composio (https://composio.dev) plugs in here too —
 * its pre-built actions can be exposed as additional tool definitions.
 */

export const toolDefinitions = [
  {
    type: "function",
    function: {
      name: "save_contact",
      description:
        "Save or update the customer's contact details in the CRM. Call this as soon as the customer shares their name and/or email.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Full name of the customer." },
          email: { type: "string", description: "Email address, if provided." },
        },
        required: ["name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "log_note",
      description:
        "Save an important note about this conversation in the CRM (e.g. a request, complaint, interest in a product, or any sales-relevant detail).",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Short title for the note." },
          summary: { type: "string", description: "What happened / what the customer wants." },
        },
        required: ["summary"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "schedule_appointment",
      description:
        "Record that the customer wants to book an appointment or meeting. Call this when they confirm a date/time.",
      parameters: {
        type: "object",
        properties: {
          date: { type: "string", description: "Requested date (e.g. 2026-07-01)." },
          time: { type: "string", description: "Requested time (e.g. 15:30)." },
          reason: { type: "string", description: "Purpose of the appointment." },
        },
        required: ["date"],
      },
    },
  },
];

/**
 * Execute a tool the model asked for.
 *
 * @param {string} name - Tool name from the model.
 * @param {object} args - Parsed arguments from the model.
 * @param {{ phone: string, contactName?: string }} ctx - Runtime context.
 * @returns {Promise<object>} Result object returned to the model.
 */
export async function executeTool(name, args, ctx) {
  switch (name) {
    case "save_contact": {
      const person = await upsertContact({
        phone: ctx.phone,
        name: args.name || ctx.contactName,
        email: args.email,
      });
      return person
        ? { ok: true, message: "Contact saved." }
        : { ok: false, message: "CRM is disabled or unreachable." };
    }

    case "log_note": {
      const person = await upsertContact({ phone: ctx.phone, name: ctx.contactName });
      await logNote(person, args.title || "WhatsApp note", args.summary);
      return { ok: Boolean(person), message: person ? "Note saved." : "CRM unavailable." };
    }

    case "schedule_appointment": {
      // For now we record the request as a CRM note. Wire this to Google
      // Calendar / Calendly later for a real booking.
      const person = await upsertContact({ phone: ctx.phone, name: ctx.contactName });
      const when = [args.date, args.time].filter(Boolean).join(" ");
      await logNote(
        person,
        "Appointment requested",
        `When: ${when}\nReason: ${args.reason || "(not specified)"}`
      );
      return { ok: true, message: `Appointment request recorded for ${when}.` };
    }

    default:
      return { ok: false, message: `Unknown tool: ${name}` };
  }
}
