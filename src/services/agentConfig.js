import fs from "node:fs";
import path from "node:path";

/**
 * Structured "agent design": instead of one free-text prompt, the agent's
 * behaviour is described as parts (identity, goal, tone, guardrails, a stage
 * playbook, and a fallback rule). buildSystemPrompt() assembles them into a
 * strong, consistent system prompt. All of it is editable from the admin panel
 * and persisted to agent.json.
 */

const FILE = path.resolve("agent.json");

export const DEFAULT_AGENT = {
  businessName: "Mi Empresa",
  agentName: "Asistente",
  role: "asistente de ventas y soporte por WhatsApp",
  goal: "Entender la necesidad del cliente, calificarlo y agendar una demo o resolver su consulta.",
  tone: "Amable, cercano y profesional. Mensajes breves y claros, estilo WhatsApp.",
  language: "el mismo idioma que use el cliente",
  guardrails: [
    "Usá solo la información del contexto o de la base de conocimiento. Si un dato (precio, plazo, política) no está, NO lo inventes: decí que lo vas a verificar.",
    "No prometas descuentos, plazos ni funciones que no estén documentados.",
    "No pidas datos sensibles como tarjetas o contraseñas.",
  ],
  playbook: [
    { stage: "Saludo", goal: "Saludar con calidez y preguntar en qué podés ayudar." },
    { stage: "Calificación", goal: "Entender la necesidad. Conseguir el nombre y el tipo de interés." },
    { stage: "Propuesta", goal: "Recomendar la mejor opción según el conocimiento disponible." },
    { stage: "Captura", goal: "Pedir el email y guardar el contacto con save_contact." },
    { stage: "Cierre", goal: "Agendar una demo con schedule_appointment o derivar a un humano." },
  ],
  fallback:
    "Si no podés ayudar, si la consulta es delicada, o si el cliente pide hablar con una persona, usá request_human_handoff y avisale que un humano lo contactará.",
};

let cache = null;

function load() {
  if (cache) return cache;
  let stored = {};
  try {
    stored = JSON.parse(fs.readFileSync(FILE, "utf8"));
  } catch {
    // No file yet — use defaults.
  }
  cache = { ...DEFAULT_AGENT, ...stored };
  return cache;
}

export function getAgentConfig() {
  return load();
}

export function updateAgentConfig(patch = {}) {
  const next = { ...load(), ...patch };
  cache = next;
  fs.writeFileSync(FILE, JSON.stringify(next, null, 2));
  return next;
}

/**
 * Assemble the full system prompt, optionally grounded with the current
 * contact's profile (name + stage) so the agent stays in context.
 *
 * @param {{ profile?: object }} [opts]
 * @returns {string}
 */
export function buildSystemPrompt({ profile } = {}) {
  const c = load();

  const guardrails = (c.guardrails || []).map((g) => `- ${g}`).join("\n");
  const playbook = (c.playbook || [])
    .map((s, i) => `${i + 1}. ${s.stage}: ${s.goal}`)
    .join("\n");

  let profileBlock = "";
  if (profile && (profile.name || profile.stage || profile.notes)) {
    profileBlock =
      `\n\nDATOS DEL CONTACTO ACTUAL:\n` +
      `- Nombre: ${profile.name || "desconocido"}\n` +
      `- Etapa actual: ${profile.stage || "Saludo"}` +
      (profile.notes ? `\n- Notas: ${profile.notes}` : "");
  }

  return `Sos ${c.agentName}, ${c.role} de ${c.businessName}.

OBJETIVO: ${c.goal}

TONO: ${c.tone}
IDIOMA: respondé en ${c.language}.

REGLAS (importantes, respetalas siempre):
${guardrails}

GUIÓN DE CONVERSACIÓN (avanzá de forma natural, sin sonar robótico y sin saltar pasos sin sentido):
${playbook}

Cada vez que avances de etapa, registralo con la herramienta set_stage.

DERIVACIÓN A HUMANO: ${c.fallback}${profileBlock}`;
}
