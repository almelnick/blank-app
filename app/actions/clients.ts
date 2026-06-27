"use server"

import { db } from "@/lib/db"
import {
  client,
  clientConnection,
  clientMember,
  metricMapping,
  dimensionValueMap,
  user,
} from "@/lib/db/schema"
import { and, asc, desc, eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { requireAdmin, requireUser, assertClientAccess } from "@/lib/session"
import { newId, slugify } from "@/lib/ids"
import { CLIENT_TYPES, type ChannelKey, type ClientType } from "@/lib/channels"
import { auth } from "@/lib/auth"

export type ClientInput = {
  name: string
  type: ClientType
  dimensionLabel: string
  channels: ChannelKey[]
}

export async function listClients() {
  const user = await requireUser()
  if (user.role === "agency_admin") {
    return db.select().from(client).orderBy(asc(client.name))
  }
  // Client-role: only the clients they're a member of.
  const rows = await db
    .select({ c: client })
    .from(clientMember)
    .innerJoin(client, eq(client.id, clientMember.clientId))
    .where(eq(clientMember.userId, user.id))
    .orderBy(asc(client.name))
  return rows.map((r) => r.c)
}

export async function getClient(clientId: string) {
  const user = await requireUser()
  await assertClientAccess(user, clientId)
  const rows = await db.select().from(client).where(eq(client.id, clientId)).limit(1)
  return rows[0] ?? null
}

export async function getClientBySlug(slug: string) {
  const user = await requireUser()
  const rows = await db.select().from(client).where(eq(client.slug, slug)).limit(1)
  const c = rows[0]
  if (!c) return null
  await assertClientAccess(user, c.id)
  return c
}

export async function getClientConnections(clientId: string) {
  const user = await requireUser()
  await assertClientAccess(user, clientId)
  return db
    .select()
    .from(clientConnection)
    .where(eq(clientConnection.clientId, clientId))
}

export async function createClient(input: ClientInput) {
  const admin = await requireAdmin()
  const id = newId("cl")
  let slug = slugify(input.name)
  // Ensure unique slug.
  const existing = await db.select({ id: client.id }).from(client).where(eq(client.slug, slug))
  if (existing.length) slug = `${slug}-${id.slice(-4)}`

  await db.insert(client).values({
    id,
    name: input.name,
    slug,
    type: input.type,
    dimensionLabel: input.dimensionLabel || CLIENT_TYPES[input.type].defaultDimension,
    ownerId: admin.id,
  })

  // Create the requested channel connections.
  const { CHANNELS } = await import("@/lib/channels")
  for (const ch of input.channels) {
    await db.insert(clientConnection).values({
      id: newId("conn"),
      clientId: id,
      channel: ch,
      windsorConnector: CHANNELS[ch].connector,
      enabled: true,
    })
  }

  revalidatePath("/dashboard")
  return { id, slug }
}

export async function updateClient(
  clientId: string,
  input: Partial<Pick<ClientInput, "name" | "type" | "dimensionLabel">>,
) {
  await requireAdmin()
  await db
    .update(client)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(client.id, clientId))
  revalidatePath("/dashboard")
  revalidatePath(`/dashboard/clients/${clientId}`)
}

export async function deleteClient(clientId: string) {
  await requireAdmin()
  await db.delete(clientConnection).where(eq(clientConnection.clientId, clientId))
  await db.delete(clientMember).where(eq(clientMember.clientId, clientId))
  await db.delete(metricMapping).where(eq(metricMapping.clientId, clientId))
  await db.delete(dimensionValueMap).where(eq(dimensionValueMap.clientId, clientId))
  await db.delete(client).where(eq(client.id, clientId))
  revalidatePath("/dashboard")
}

export async function setConnection(
  clientId: string,
  channel: ChannelKey,
  enabled: boolean,
  windsorAccountId?: string,
) {
  await requireAdmin()
  const { CHANNELS } = await import("@/lib/channels")
  const existing = await db
    .select()
    .from(clientConnection)
    .where(
      and(eq(clientConnection.clientId, clientId), eq(clientConnection.channel, channel)),
    )
  if (existing.length) {
    await db
      .update(clientConnection)
      .set({ enabled, windsorAccountId: windsorAccountId ?? existing[0].windsorAccountId })
      .where(eq(clientConnection.id, existing[0].id))
  } else {
    await db.insert(clientConnection).values({
      id: newId("conn"),
      clientId,
      channel,
      windsorConnector: CHANNELS[channel].connector,
      windsorAccountId: windsorAccountId ?? null,
      enabled,
    })
  }
  revalidatePath(`/dashboard/clients/${clientId}`)
}

// ---- Normalization: metric mappings ----
export async function listMetricMappings(clientId: string) {
  const user = await requireUser()
  await assertClientAccess(user, clientId)
  return db
    .select()
    .from(metricMapping)
    .where(eq(metricMapping.clientId, clientId))
    .orderBy(asc(metricMapping.canonicalMetric))
}

export async function addMetricMapping(input: {
  clientId: string
  channel: string | null
  sourceMetric: string
  canonicalMetric: string
  displayName: string
  format: string
}) {
  await requireAdmin()
  await db.insert(metricMapping).values({ id: newId("mm"), ...input })
  revalidatePath(`/dashboard/clients/${input.clientId}`)
}

export async function deleteMetricMapping(id: string, clientId: string) {
  await requireAdmin()
  await db.delete(metricMapping).where(eq(metricMapping.id, id))
  revalidatePath(`/dashboard/clients/${clientId}`)
}

// ---- Normalization: dimension value maps ----
export async function listDimensionMaps(clientId: string) {
  const user = await requireUser()
  await assertClientAccess(user, clientId)
  return db
    .select()
    .from(dimensionValueMap)
    .where(eq(dimensionValueMap.clientId, clientId))
    .orderBy(asc(dimensionValueMap.rawValue))
}

export async function addDimensionMap(input: {
  clientId: string
  channel: string | null
  rawValue: string
  normalizedValue: string
}) {
  await requireAdmin()
  await db.insert(dimensionValueMap).values({ id: newId("dm"), ...input })
  revalidatePath(`/dashboard/clients/${input.clientId}`)
}

export async function deleteDimensionMap(id: string, clientId: string) {
  await requireAdmin()
  await db.delete(dimensionValueMap).where(eq(dimensionValueMap.id, id))
  revalidatePath(`/dashboard/clients/${clientId}`)
}

// ---- Client portal access (create login for a client) ----
export async function listClientMembers(clientId: string) {
  await requireAdmin()
  const rows = await db
    .select({
      id: clientMember.id,
      userId: clientMember.userId,
      name: user.name,
      email: user.email,
    })
    .from(clientMember)
    .innerJoin(user, eq(user.id, clientMember.userId))
    .where(eq(clientMember.clientId, clientId))
  return rows
}

export async function createClientAccess(input: {
  clientId: string
  name: string
  email: string
  password: string
}) {
  await requireAdmin()
  // Create the auth user via Better Auth so the password is hashed correctly.
  const created = await auth.api.signUpEmail({
    body: { name: input.name, email: input.email, password: input.password },
  })
  const newUserId = created.user?.id
  if (!newUserId) throw new Error("No se pudo crear el usuario")

  // New portal users are always client-role.
  await db.update(user).set({ role: "client" }).where(eq(user.id, newUserId))
  await db.insert(clientMember).values({
    id: newId("cm"),
    clientId: input.clientId,
    userId: newUserId,
  })
  revalidatePath(`/dashboard/clients/${input.clientId}`)
  return { userId: newUserId }
}

export async function revokeClientAccess(memberId: string, clientId: string) {
  await requireAdmin()
  await db
    .delete(clientMember)
    .where(and(eq(clientMember.id, memberId), eq(clientMember.clientId, clientId)))
  revalidatePath(`/dashboard/clients/${clientId}`)
}

void desc
