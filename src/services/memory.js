import fs from "node:fs";
import path from "node:path";
import { getSettings } from "./settings.js";

/**
 * Persistent conversation store + per-contact profiles.
 *
 * Everything is kept in a single JSON file under data/ so it SURVIVES restarts
 * (the old version lived only in RAM). It's zero-dependency and perfect for the
 * volume of a WhatsApp bot. For high scale, swap the file for SQLite/Postgres —
 * only the load()/persist() helpers would change.
 *
 *   conversations[phone] = [{ role, content }, ...]   // chat history
 *   profiles[phone]      = { name, email, stage, handoff, notes, lastSeen, ... }
 */

const DIR = path.resolve("data");
const FILE = path.join(DIR, "store.json");

let db = { conversations: {}, profiles: {} };
let loaded = false;

const nowISO = () => new Date().toISOString();

function load() {
  if (loaded) return;
  try {
    const raw = JSON.parse(fs.readFileSync(FILE, "utf8"));
    db = { conversations: raw.conversations || {}, profiles: raw.profiles || {} };
  } catch {
    // No file yet — start fresh.
  }
  loaded = true;
}

function persist() {
  try {
    fs.mkdirSync(DIR, { recursive: true });
    fs.writeFileSync(FILE, JSON.stringify(db, null, 2));
  } catch (err) {
    console.warn("Memory persist failed:", err.message);
  }
}

// ---- conversation history ----------------------------------------
export function getHistory(phone) {
  load();
  return db.conversations[phone] || [];
}

export function remember(phone, role, content) {
  load();
  const history = db.conversations[phone] || [];
  history.push({ role, content });

  const maxMessages = getSettings().memoryMaxTurns * 2;
  if (history.length > maxMessages) history.splice(0, history.length - maxMessages);

  db.conversations[phone] = history;
  touchProfile(phone);
  persist();
}

export function forget(phone) {
  load();
  delete db.conversations[phone];
  persist();
}

// ---- contact profiles --------------------------------------------
export function getProfile(phone) {
  load();
  return db.profiles[phone] || { phone };
}

export function updateProfile(phone, patch = {}) {
  load();
  const prev = db.profiles[phone] || { phone, createdAt: nowISO() };
  db.profiles[phone] = { ...prev, ...patch, phone, updatedAt: nowISO() };
  persist();
  return db.profiles[phone];
}

function touchProfile(phone) {
  const prev = db.profiles[phone] || { phone, createdAt: nowISO(), stage: "Saludo" };
  db.profiles[phone] = { ...prev, phone, lastSeen: nowISO() };
}

// ---- dashboard ----------------------------------------------------
export function listConversations() {
  load();
  return Object.entries(db.conversations).map(([phone, history]) => {
    const p = db.profiles[phone] || {};
    return {
      phone,
      name: p.name || null,
      stage: p.stage || null,
      handoff: Boolean(p.handoff),
      messages: history.length,
      lastMessage: history[history.length - 1]?.content || "",
    };
  });
}
