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

  // Optional token protecting the /admin panel and /api endpoints.
  // If empty, the panel is open (fine for local dev only).
  adminToken: optional("ADMIN_TOKEN", ""),

  openai: {
    apiKey: required("OPENAI_API_KEY"),
    model: optional("OPENAI_MODEL", "gpt-4o-mini"),
    embeddingModel: optional("OPENAI_EMBEDDING_MODEL", "text-embedding-3-small"),
    systemPrompt: optional(
      "AI_SYSTEM_PROMPT",
      "You are a helpful assistant. Answer in the customer's language, be concise and friendly."
    ),
  },

  // Conversation memory (in-process). Number of *turns* kept per contact;
  // each turn is one user message + one assistant reply.
  memory: {
    maxTurns: Number(optional("MEMORY_MAX_TURNS", "10")),
  },

  // RAG knowledge base. Plain .txt/.md files dropped in this folder are
  // embedded on startup and used to ground the AI's answers.
  knowledge: {
    dir: optional("KNOWLEDGE_DIR", "knowledge"),
    topK: Number(optional("KNOWLEDGE_TOP_K", "4")),
  },

  whatsapp: {
    token: required("WHATSAPP_TOKEN"),
    phoneNumberId: required("WHATSAPP_PHONE_NUMBER_ID"),
    verifyToken: required("WHATSAPP_VERIFY_TOKEN"),
    apiVersion: optional("WHATSAPP_API_VERSION", "v20.0"),
    // App secret from the Meta dashboard, used to verify x-hub-signature-256.
    appSecret: optional("WHATSAPP_APP_SECRET", ""),
  },

  // WhatsApp Flows endpoint (encrypted data exchange).
  // The private key pairs with the public key uploaded to your phone number.
  // Use `\n` for line breaks when storing the PEM in a single env var.
  flows: {
    privateKey: optional("WHATSAPP_FLOW_PRIVATE_KEY", "").replace(/\\n/g, "\n"),
    passphrase: optional("WHATSAPP_FLOW_PRIVATE_KEY_PASSPHRASE", ""),
    get enabled() {
      return Boolean(this.privateKey);
    },
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
