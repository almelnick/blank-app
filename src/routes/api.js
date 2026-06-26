import { Router } from "express";
import fs from "node:fs/promises";
import path from "node:path";
import { config } from "../config.js";
import { getSettings, updateSettings } from "../services/settings.js";
import { getAgentConfig, updateAgentConfig } from "../services/agentConfig.js";
import { resetIndex } from "../services/knowledge.js";
import { scrapeUrl, slugFromUrl } from "../services/scraper.js";
import { listConversations, getHistory, getProfile, forget } from "../services/memory.js";
import { generateReply } from "../services/openai.js";

export const apiRouter = Router();

/**
 * Auth gate. When ADMIN_TOKEN is set, every /api call must carry it in the
 * `x-admin-token` header. When it's empty the panel is open (local dev only).
 */
apiRouter.use((req, res, next) => {
  if (!config.adminToken) return next();
  if (req.get("x-admin-token") === config.adminToken) return next();
  return res.status(401).json({ error: "unauthorized" });
});

// ------------------------------------------------------------------
// Status — which integrations are configured (booleans, never secrets).
// ------------------------------------------------------------------
apiRouter.get("/status", (_req, res) => {
  res.json({
    openai: Boolean(config.openai.apiKey),
    whatsapp: Boolean(config.whatsapp.token && config.whatsapp.phoneNumberId),
    twenty: config.twenty.enabled,
    flows: config.flows.enabled,
    signatureCheck: Boolean(config.whatsapp.appSecret),
    adminProtected: Boolean(config.adminToken),
    conversations: listConversations().length,
    settings: getSettings(),
  });
});

// ------------------------------------------------------------------
// Settings
// ------------------------------------------------------------------
apiRouter.get("/settings", (_req, res) => res.json(getSettings()));

apiRouter.post("/settings", (req, res) => {
  res.json(updateSettings(req.body || {}));
});

// ------------------------------------------------------------------
// Agent design (identity, goal, tone, guardrails, playbook, fallback)
// ------------------------------------------------------------------
apiRouter.get("/agent", (_req, res) => res.json(getAgentConfig()));

apiRouter.post("/agent", (req, res) => {
  res.json(updateAgentConfig(req.body || {}));
});

// ------------------------------------------------------------------
// Knowledge base (RAG files)
// ------------------------------------------------------------------
const KNOWLEDGE_DIR = path.resolve(config.knowledge.dir);

// Reject anything that isn't a simple .md/.txt filename (no path traversal).
function safeName(name) {
  if (!/^[\w.-]+\.(md|txt)$/i.test(name) || name.includes("..")) return null;
  return name;
}

// Scrape a URL and add its text to the knowledge base.
apiRouter.post("/knowledge/import-url", async (req, res) => {
  const { url } = req.body || {};
  if (!url || !/^https?:\/\//i.test(url)) {
    return res.status(400).json({ error: "URL inválida (debe empezar con http:// o https://)" });
  }
  try {
    const { title, text } = await scrapeUrl(url);
    if (!text || text.length < 30) {
      return res.status(422).json({ error: "No se pudo extraer texto útil de esa página." });
    }
    const name = slugFromUrl(url);
    const content = `# ${title}\n\nFuente: ${url}\n\n${text}`;
    await fs.mkdir(KNOWLEDGE_DIR, { recursive: true });
    await fs.writeFile(path.join(KNOWLEDGE_DIR, name), content, "utf8");
    resetIndex();
    res.json({ ok: true, name, chars: content.length });
  } catch (err) {
    res.status(500).json({ error: `No se pudo leer la URL: ${err.message}` });
  }
});

apiRouter.get("/knowledge", async (_req, res) => {
  try {
    const files = (await fs.readdir(KNOWLEDGE_DIR)).filter((f) => /\.(md|txt)$/i.test(f));
    const items = await Promise.all(
      files.map(async (name) => {
        const stat = await fs.stat(path.join(KNOWLEDGE_DIR, name));
        return { name, size: stat.size };
      })
    );
    res.json(items);
  } catch {
    res.json([]); // folder may not exist yet
  }
});

apiRouter.get("/knowledge/:name", async (req, res) => {
  const name = safeName(req.params.name);
  if (!name) return res.status(400).json({ error: "invalid filename" });
  try {
    const content = await fs.readFile(path.join(KNOWLEDGE_DIR, name), "utf8");
    res.json({ name, content });
  } catch {
    res.status(404).json({ error: "not found" });
  }
});

apiRouter.put("/knowledge/:name", async (req, res) => {
  const name = safeName(req.params.name);
  if (!name) return res.status(400).json({ error: "invalid filename" });
  await fs.mkdir(KNOWLEDGE_DIR, { recursive: true });
  await fs.writeFile(path.join(KNOWLEDGE_DIR, name), req.body?.content ?? "", "utf8");
  resetIndex(); // rebuild RAG index on next query
  res.json({ ok: true });
});

apiRouter.delete("/knowledge/:name", async (req, res) => {
  const name = safeName(req.params.name);
  if (!name) return res.status(400).json({ error: "invalid filename" });
  try {
    await fs.unlink(path.join(KNOWLEDGE_DIR, name));
    resetIndex();
    res.json({ ok: true });
  } catch {
    res.status(404).json({ error: "not found" });
  }
});

// ------------------------------------------------------------------
// Conversations (in-memory)
// ------------------------------------------------------------------
apiRouter.get("/conversations", (_req, res) => res.json(listConversations()));

apiRouter.get("/conversations/:phone", (req, res) => {
  res.json({ profile: getProfile(req.params.phone), history: getHistory(req.params.phone) });
});

apiRouter.delete("/conversations/:phone", (req, res) => {
  forget(req.params.phone);
  res.json({ ok: true });
});

// ------------------------------------------------------------------
// Playground — test the brain (RAG + tools) without WhatsApp.
// ------------------------------------------------------------------
apiRouter.post("/chat", async (req, res) => {
  const { message, history = [] } = req.body || {};
  if (!message) return res.status(400).json({ error: "message is required" });
  try {
    const reply = await generateReply({
      userMessage: message,
      history,
      context: { phone: "playground", contactName: "Playground" },
    });
    res.json({ reply });
  } catch (err) {
    console.error("Playground chat failed:", err.message);
    res.status(500).json({ error: err.message });
  }
});
