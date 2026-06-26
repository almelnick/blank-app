import fs from "node:fs/promises";
import path from "node:path";
import OpenAI from "openai";
import { config } from "../config.js";
import { getSettings } from "./settings.js";

/**
 * Minimal Retrieval-Augmented Generation (RAG) over local files.
 *
 * On first use it reads every .txt/.md file in the knowledge folder, splits
 * them into chunks, embeds the chunks once, and keeps the vectors in memory.
 * At query time it embeds the question and returns the most similar chunks so
 * the AI can answer using YOUR information instead of guessing.
 *
 * This is intentionally dependency-free (no vector DB) so it runs out of the
 * box. For large corpora, swap `index` for Supabase pgvector / Qdrant / Pinecone
 * — only `buildIndex` and `retrieveContext` would change.
 */

const client = new OpenAI({ apiKey: config.openai.apiKey });

/** @type {{ text: string, embedding: number[], source: string }[]} */
let index = [];
let indexPromise = null;

function chunk(text, size = 1000) {
  // Split on blank lines, then greedily pack paragraphs up to ~size chars.
  const paragraphs = text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const chunks = [];
  let current = "";

  for (const p of paragraphs) {
    if ((current + "\n\n" + p).length > size && current) {
      chunks.push(current);
      current = p;
    } else {
      current = current ? `${current}\n\n${p}` : p;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

async function embed(inputs) {
  const { data } = await client.embeddings.create({
    model: config.openai.embeddingModel,
    input: inputs,
  });
  return data.map((d) => d.embedding);
}

function cosineSimilarity(a, b) {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB) || 1);
}

async function buildIndex() {
  const dir = path.resolve(config.knowledge.dir);
  let files = [];
  try {
    files = (await fs.readdir(dir)).filter((f) => /\.(txt|md)$/i.test(f));
  } catch {
    console.log(`Knowledge folder "${config.knowledge.dir}" not found — RAG disabled.`);
    return [];
  }

  if (files.length === 0) {
    console.log("Knowledge folder is empty — RAG disabled.");
    return [];
  }

  // Keep each chunk tagged with the file it came from (its "source").
  const pieces = [];
  for (const file of files) {
    const content = await fs.readFile(path.join(dir, file), "utf8");
    for (const c of chunk(content)) pieces.push({ text: c, source: file });
  }

  const embeddings = await embed(pieces.map((p) => p.text));
  const built = pieces.map((p, i) => ({ ...p, embedding: embeddings[i] }));
  console.log(`RAG ready: ${built.length} chunks from ${files.length} file(s).`);
  return built;
}

/**
 * Retrieve the most relevant knowledge for a query.
 * Applies a relevance threshold so irrelevant chunks aren't injected (which
 * would confuse the agent), and reports which sources were used.
 *
 * @param {string} query
 * @returns {Promise<{ context: string, sources: string[] }>}
 */
export async function retrieveContext(query) {
  const empty = { context: "", sources: [] };
  try {
    if (!indexPromise) indexPromise = buildIndex();
    index = await indexPromise;
    if (index.length === 0) return empty;

    const { knowledgeTopK, knowledgeMinScore } = getSettings();
    const [queryEmbedding] = await embed([query]);

    const ranked = index
      .map((item) => ({ ...item, score: cosineSimilarity(queryEmbedding, item.embedding) }))
      .filter((item) => item.score >= knowledgeMinScore)
      .sort((a, b) => b.score - a.score)
      .slice(0, knowledgeTopK);

    if (ranked.length === 0) return empty;

    return {
      context: ranked.map((r) => r.text).join("\n\n---\n\n"),
      sources: [...new Set(ranked.map((r) => r.source))],
    };
  } catch (err) {
    console.warn("RAG retrieveContext failed:", err.message);
    return empty;
  }
}

/**
 * Drop the cached index so it rebuilds on the next query. Call after the
 * knowledge files change (e.g. from the admin panel).
 */
export function resetIndex() {
  index = [];
  indexPromise = null;
}
