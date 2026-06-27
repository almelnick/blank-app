"use server"

import { generateText } from "ai"
import { db } from "@/lib/db"
import { agentReport, reportSchedule, client as clientTable } from "@/lib/db/schema"
import { and, desc, eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { requireUser, requireAdmin, assertClientAccess } from "@/lib/session"
import { newId } from "@/lib/ids"
import { AGENTS, type AgentKey } from "@/lib/channels"
import {
  buildAgentContext,
  buildSystemPrompt,
  buildUserPrompt,
  AGENT_MODEL,
} from "@/lib/agents"
import { resolvePeriods } from "@/lib/dates"

export async function listReports(clientId: string) {
  const user = await requireUser()
  await assertClientAccess(user, clientId)
  return db
    .select()
    .from(agentReport)
    .where(eq(agentReport.clientId, clientId))
    .orderBy(desc(agentReport.createdAt))
}

export async function deleteReport(id: string, clientId: string) {
  await requireAdmin()
  await db.delete(agentReport).where(eq(agentReport.id, id))
  revalidatePath(`/dashboard/clients/${clientId}/agents`)
}

// Generates a report synchronously (used for scheduled/manual non-streaming
// generation) and persists it.
export async function generateReport(input: {
  clientId: string
  agent: AgentKey
  range?: number
  scheduled?: boolean
}) {
  const user = await requireUser()
  await assertClientAccess(user, input.clientId)

  const rows = await db
    .select()
    .from(clientTable)
    .where(eq(clientTable.id, input.clientId))
    .limit(1)
  const c = rows[0]
  if (!c) throw new Error("Cliente no encontrado")

  const rangeDays = input.range ?? 30
  const context = await buildAgentContext(
    { id: c.id, name: c.name, type: c.type, dimensionLabel: c.dimensionLabel },
    input.agent,
    rangeDays,
  )

  const { text } = await generateText({
    model: AGENT_MODEL,
    system: buildSystemPrompt(input.agent),
    prompt: buildUserPrompt(AGENTS[input.agent].label, context, c.name),
  })

  const { current } = resolvePeriods(rangeDays)
  const id = newId("rep")
  await db.insert(agentReport).values({
    id,
    clientId: input.clientId,
    agent: input.agent,
    title: `${AGENTS[input.agent].label} · ${current.from} a ${current.to}`,
    content: text,
    periodStart: current.from,
    periodEnd: current.to,
    scheduled: input.scheduled ?? false,
    createdBy: user.id,
  })
  revalidatePath(`/dashboard/clients/${input.clientId}/agents`)
  return { id }
}

// ---- Schedules ----
export async function listSchedules(clientId: string) {
  const user = await requireUser()
  await assertClientAccess(user, clientId)
  return db
    .select()
    .from(reportSchedule)
    .where(eq(reportSchedule.clientId, clientId))
}

export async function upsertSchedule(input: {
  clientId: string
  agent: AgentKey
  frequency: string
  enabled: boolean
}) {
  await requireAdmin()
  const existing = await db
    .select()
    .from(reportSchedule)
    .where(
      and(
        eq(reportSchedule.clientId, input.clientId),
        eq(reportSchedule.agent, input.agent),
      ),
    )
  if (existing.length) {
    await db
      .update(reportSchedule)
      .set({ frequency: input.frequency, enabled: input.enabled })
      .where(eq(reportSchedule.id, existing[0].id))
  } else {
    await db.insert(reportSchedule).values({
      id: newId("sch"),
      clientId: input.clientId,
      agent: input.agent,
      frequency: input.frequency,
      enabled: input.enabled,
    })
  }
  revalidatePath(`/dashboard/clients/${input.clientId}/agents`)
}
