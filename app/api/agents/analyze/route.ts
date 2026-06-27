import { streamText } from "ai"
import { db } from "@/lib/db"
import { client as clientTable, agentReport } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { requireUser, assertClientAccess } from "@/lib/session"
import { newId } from "@/lib/ids"
import { AGENTS, type AgentKey, AGENT_KEYS } from "@/lib/channels"
import {
  buildAgentContext,
  buildSystemPrompt,
  buildUserPrompt,
  AGENT_MODEL,
} from "@/lib/agents"
import { resolvePeriods } from "@/lib/dates"

export const maxDuration = 60

export async function POST(req: Request) {
  const user = await requireUser()
  const { clientId, agent, range } = (await req.json()) as {
    clientId: string
    agent: AgentKey
    range?: number
  }

  if (!AGENT_KEYS.includes(agent)) {
    return new Response("Agente inválido", { status: 400 })
  }
  await assertClientAccess(user, clientId)

  const rows = await db
    .select()
    .from(clientTable)
    .where(eq(clientTable.id, clientId))
    .limit(1)
  const c = rows[0]
  if (!c) return new Response("Cliente no encontrado", { status: 404 })

  const rangeDays = range ?? 30
  const context = await buildAgentContext(
    { id: c.id, name: c.name, type: c.type, dimensionLabel: c.dimensionLabel },
    agent,
    rangeDays,
  )

  const result = streamText({
    model: AGENT_MODEL,
    system: buildSystemPrompt(agent),
    prompt: buildUserPrompt(AGENTS[agent].label, context, c.name),
    onFinish: async ({ text }) => {
      if (!text.trim()) return
      const { current } = resolvePeriods(rangeDays)
      await db.insert(agentReport).values({
        id: newId("rep"),
        clientId,
        agent,
        title: `${AGENTS[agent].label} · ${current.from} a ${current.to}`,
        content: text,
        periodStart: current.from,
        periodEnd: current.to,
        scheduled: false,
        createdBy: user.id,
      })
    },
  })

  return result.toUIMessageStreamResponse()
}
