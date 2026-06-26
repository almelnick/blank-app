import "dotenv/config";

/**
 * Centralized, validated configuration loaded from environment variables.
 * Throws early at startup if a required value is missing so we fail fast
 * instead of getting opaque errors deep inside a request handler.
 */

function required(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optional(name, fallback) {
  return process.env[name] || fallback;
}

export const config = {
  port: Number(optional("PORT", "3000")),

  openai: {
    apiKey: required("OPENAI_API_KEY"),
    model: optional("OPENAI_MODEL", "gpt-4o-mini"),
    systemPrompt: optional(
      "AI_SYSTEM_PROMPT",
      "You are a helpful assistant. Answer in the customer's language, be concise and friendly."
    ),
  },

  whatsapp: {
    token: required("WHATSAPP_TOKEN"),
    phoneNumberId: required("WHATSAPP_PHONE_NUMBER_ID"),
    verifyToken: required("WHATSAPP_VERIFY_TOKEN"),
    apiVersion: optional("WHATSAPP_API_VERSION", "v20.0"),
  },

  twenty: {
    // Twenty integration is optional — the bot still works without it.
    apiUrl: optional("TWENTY_API_URL", "").replace(/\/$/, ""),
    apiKey: optional("TWENTY_API_KEY", ""),
    get enabled() {
      return Boolean(this.apiUrl && this.apiKey);
    },
  },
};
