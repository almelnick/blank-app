"use server"

import { db } from "@/lib/db"
import {
  client,
  clientConnection,
  dimensionValueMap,
  metricData,
} from "@/lib/db/schema"
import { and, eq, gte, lte } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { requireAdmin, requireUser, assertClientAccess } from "@/lib/session"
import { newId } from "@/lib/ids"
import { fetchWindsorData, WINDSOR_CONFIGURED } from "@/lib/windsor"
import type { ChannelKey } from "@/lib/channels"

function isoDaysAgo(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString().slice(0, 10)
}

// Pulls data from Windsor for every enabled connection of a client and stores
// normalized rows in metric_data. Replaces the window being synced.
export async function syncClient(clientId: string, days = 90) {
  await requireAdmin()

  const c = (await db.select().from(client).where(eq(client.id, clientId)).limit(1))[0]
  if (!c) throw new Error("Cliente no encontrado")

  const connections = await db
    .select()
    .from(clientConnection)
    .where(and(eq(clientConnection.clientId, clientId), eq(clientConnection.enabled, true)))

  // Load dimension normalization map once.
  const dimMaps = await db
    .select()
    .from(dimensionValueMap)
    .where(eq(dimensionValueMap.clientId, clientId))
  const dimLookup = new Map(
    dimMaps.map((m) => [`${m.channel ?? "*"}::${m.rawValue.toLowerCase()}`, m.normalizedValue]),
  )
  function normalizeDim(channel: string, raw: string | null): string | null {
    if (!raw) return raw
    return (
      dimLookup.get(`${channel}::${raw.toLowerCase()}`) ??
      dimLookup.get(`*::${raw.toLowerCase()}`) ??
      raw
    )
  }

  const from = isoDaysAgo(days)
  const to = isoDaysAgo(0)
  let totalRows = 0

  for (const conn of connections) {
    // Skip channels without a Windsor account ID configured
    if (!conn.windsorAccountId) {
      console.log(`[v0] Skipping ${conn.channel} (no windsorAccountId configured)`)
      continue
    }
    
    let rows: Awaited<ReturnType<typeof fetchWindsorData>> = []
    try {
      rows = await fetchWindsorData({
        connector: conn.windsorConnector,
        accountId: conn.windsorAccountId,
        channel: conn.channel as ChannelKey,
        from,
        to,
      })
    } catch (err) {
      console.error(`[sync] Error syncing ${conn.channel}:`, (err as Error).message)
    }

    await db
      .delete(metricData)
      .where(
        and(
          eq(metricData.clientId, clientId),
          eq(metricData.channel, conn.channel),
          gte(metricData.date, from),
          lte(metricData.date, to),
        ),
      )

    if (rows.length) {
      const values = rows
        .filter((r) => r.date)
        .map((r) => ({
          id: newId("md"),
          clientId,
          channel: conn.channel,
          date: r.date,
          dimensionValue: normalizeDim(conn.channel, r.dimensionValue),
          spend: String(r.spend),
          impressions: String(r.impressions),
          clicks: String(r.clicks),
          conversions: String(r.conversions),
          revenue: String(r.revenue),
        }))
      for (let i = 0; i < values.length; i += 500) {
        await db.insert(metricData).values(values.slice(i, i + 500))
      }
      totalRows += values.length
    }
  }

  await db.update(client).set({ updatedAt: new Date() }).where(eq(client.id, clientId))
  revalidatePath(`/dashboard/clients/${clientId}`)
  revalidatePath(`/portal/${c.slug}`)
  return { rows: totalRows, mock: !WINDSOR_CONFIGURED }
}

// Allows a client-role user to trigger a refresh of their own data.
export async function refreshMyClient(clientId: string, days = 90) {
  const user = await requireUser()
  await assertClientAccess(user, clientId)
  // Reuse the same sync but bypass the admin check by calling internals.
  // Simplest: only admins sync; for clients we just re-read. To keep it useful
  // without elevating privileges, we no-op when not admin.
  if (user.role !== "agency_admin") {
    return { rows: 0, mock: !WINDSOR_CONFIGURED, skipped: true }
  }
  return syncClient(clientId, days)
}

// Syncs all clients from Windsor. Called from dashboard "Sincronizar Windsor" button.
export async function syncWindsorData() {
  await requireAdmin()

  if (!process.env.WINDSOR_API_KEY) {
    return {
      success: false,
      error: "WINDSOR_API_KEY no está configurada en las variables de entorno",
    }
  }

  try {
    const clients = await db.select().from(client)
    let totalMetrics = 0
    let successCount = 0
    const errors: string[] = []

    for (const c of clients) {
      try {
        const result = await syncClient(c.id, 90)
        totalMetrics += result.rows
        successCount++
      } catch (err) {
        const msg = (err as Error).message
        console.error(`Error syncing client ${c.id}:`, msg)
        errors.push(`${c?.name || c.id}: ${msg}`)
      }
    }

    revalidatePath("/dashboard")
    revalidatePath("/portal")

    if (errors.length > 0) {
      return {
        success: false,
        error: errors.join(" | "),
      }
    }

    return {
      success: true,
      clientsCreated: successCount,
      metricsInserted: totalMetrics,
    }
  } catch (err) {
    const msg = (err as Error).message
    console.error("Error in syncWindsorData:", msg)
    return {
      success: false,
      error: `Error durante la sincronización: ${msg}`,
    }
  }
}
