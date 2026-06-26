import { upsertContact, logNote } from "./twenty.js";

/**
 * Business logic for the WhatsApp Flow — i.e. what to show next and what to do
 * with submitted data. This is YOUR app: edit the screens/cases to match the
 * Flow JSON you design in the Meta Flow Builder.
 *
 * The decrypted request has the shape:
 *   { version, action, screen, data, flow_token }
 *   action ∈ "INIT" | "data_exchange" | "BACK"
 *
 * The example below implements a single-screen "lead capture" flow that saves
 * the contact into Twenty CRM and then completes.
 *
 * Docs: https://developers.facebook.com/docs/whatsapp/flows
 */

export async function handleFlow(body) {
  const { action, screen, data = {}, flow_token } = body;

  // First interaction when the user opens the flow → show the first screen.
  if (action === "INIT") {
    return { screen: "LEAD_FORM", data: {} };
  }

  // The user submitted a screen and we exchange data.
  if (action === "data_exchange") {
    switch (screen) {
      case "LEAD_FORM": {
        // Persist the captured lead in the CRM (best-effort).
        const person = await upsertContact({
          phone: data.phone,
          name: data.name,
          email: data.email,
        });
        if (person && data.message) {
          await logNote(person, "Lead from WhatsApp Flow", data.message);
        }

        // Terminal screen: this ends the flow and notifies the chat.
        return completeFlow(flow_token);
      }

      default:
        return completeFlow(flow_token);
    }
  }

  // Fallback (e.g. unexpected BACK on the first screen).
  return completeFlow(flow_token);
}

/**
 * Build the terminal response that closes the flow successfully.
 */
function completeFlow(flow_token) {
  return {
    screen: "SUCCESS",
    data: {
      extension_message_response: {
        params: { flow_token, status: "completed" },
      },
    },
  };
}
