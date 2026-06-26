import fs from "node:fs";
import path from "node:path";
import { config } from "../config.js";

/**
 * Runtime-editable settings, persisted to settings.json.
 *
 * Secrets (API keys, tokens) stay in .env and are NEVER editable from the UI —
 * here we only keep behavioural knobs the admin panel can tweak live: the model,
 * the system prompt, temperature, and the RAG/memory sizes. Defaults come from
 * the environment so the file is optional.
 */

const FILE = path.resolve("settings.json");

const EDITABLE = [
  "model",
  "systemPrompt",
  "temperature",
  "knowledgeTopK",
  "knowledgeMinScore",
  "memoryMaxTurns",
];

function defaults() {
  return {
    model: config.openai.model,
    systemPrompt: config.openai.systemPrompt,
    temperature: 0.7,
    knowledgeTopK: config.knowledge.topK,
    knowledgeMinScore: 0.2,
    memoryMaxTurns: config.memory.maxTurns,
  };
}

let cache = null;

function load() {
  if (cache) return cache;
  let stored = {};
  try {
    stored = JSON.parse(fs.readFileSync(FILE, "utf8"));
  } catch {
    // No file yet — use defaults.
  }
  cache = { ...defaults(), ...stored };
  return cache;
}

/** @returns {{model:string,systemPrompt:string,temperature:number,knowledgeTopK:number,memoryMaxTurns:number}} */
export function getSettings() {
  return load();
}

/**
 * Apply and persist a partial settings update (only known keys are accepted).
 * @param {object} patch
 * @returns {object} the new settings
 */
export function updateSettings(patch = {}) {
  const next = { ...load() };
  for (const key of EDITABLE) {
    if (key in patch && patch[key] !== undefined && patch[key] !== "") {
      next[key] = patch[key];
    }
  }
  // Coerce numeric fields.
  next.temperature = Number(next.temperature);
  next.knowledgeTopK = Number(next.knowledgeTopK);
  next.knowledgeMinScore = Number(next.knowledgeMinScore);
  next.memoryMaxTurns = Number(next.memoryMaxTurns);

  cache = next;
  fs.writeFileSync(FILE, JSON.stringify(next, null, 2));
  return next;
}
