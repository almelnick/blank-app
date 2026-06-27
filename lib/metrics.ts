import "server-only"
import { db } from "@/lib/db"
import { metricData } from "@/lib/db/schema"
import { and, eq, gte, inArray, lte } from "drizzle-orm"
import type { ChannelKey } from "@/lib/channels"

export type Totals = {
  spend: number
  impressions: number
  clicks: number
  conversions: number
  revenue: number
}

const ZERO: Totals = {
  spend: 0,
  impressions: 0,
  clicks: 0,
  conversions: 0,
  revenue: 0,
}

export type MetricRow = {
  date: string
  channel: string
  dimensionValue: string | null
  spend: number
  impressions: number
  clicks: number
  conversions: number
  revenue: number
}

function n(v: unknown): number {
  const x = typeof v === "string" ? parseFloat(v) : (v as number)
  return Number.isFinite(x) ? x : 0
}

export type MetricQuery = {
  clientId: string
  from: string
  to: string
  channels?: ChannelKey[]
}

export async function getRows(q: MetricQuery): Promise<MetricRow[]> {
  const conds = [
    eq(metricData.clientId, q.clientId),
    gte(metricData.date, q.from),
    lte(metricData.date, q.to),
  ]
  if (q.channels && q.channels.length) {
    conds.push(inArray(metricData.channel, q.channels))
  }
  const rows = await db
    .select()
    .from(metricData)
    .where(and(...conds))
  return rows.map((r) => ({
    date: r.date as string,
    channel: r.channel,
    dimensionValue: r.dimensionValue,
    spend: n(r.spend),
    impressions: n(r.impressions),
    clicks: n(r.clicks),
    conversions: n(r.conversions),
    revenue: n(r.revenue),
  }))
}

export function sumTotals(rows: MetricRow[]): Totals {
  return rows.reduce<Totals>(
    (acc, r) => ({
      spend: acc.spend + r.spend,
      impressions: acc.impressions + r.impressions,
      clicks: acc.clicks + r.clicks,
      conversions: acc.conversions + r.conversions,
      revenue: acc.revenue + r.revenue,
    }),
    { ...ZERO },
  )
}

export function groupByDate(rows: MetricRow[]): { date: string; values: Totals }[] {
  const map = new Map<string, Totals>()
  for (const r of rows) {
    const cur = map.get(r.date) ?? { ...ZERO }
    map.set(r.date, {
      spend: cur.spend + r.spend,
      impressions: cur.impressions + r.impressions,
      clicks: cur.clicks + r.clicks,
      conversions: cur.conversions + r.conversions,
      revenue: cur.revenue + r.revenue,
    })
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, values]) => ({ date, values }))
}

export function groupByChannel(rows: MetricRow[]): { channel: string; values: Totals }[] {
  const map = new Map<string, Totals>()
  for (const r of rows) {
    const cur = map.get(r.channel) ?? { ...ZERO }
    map.set(r.channel, {
      spend: cur.spend + r.spend,
      impressions: cur.impressions + r.impressions,
      clicks: cur.clicks + r.clicks,
      conversions: cur.conversions + r.conversions,
      revenue: cur.revenue + r.revenue,
    })
  }
  return [...map.entries()].map(([channel, values]) => ({ channel, values }))
}

export function groupByDimension(
  rows: MetricRow[],
): { dimensionValue: string; channel: string; values: Totals }[] {
  const map = new Map<string, { channel: string; values: Totals }>()
  for (const r of rows) {
    const key = r.dimensionValue ?? "Sin asignar"
    const cur = map.get(key) ?? { channel: r.channel, values: { ...ZERO } }
    cur.values = {
      spend: cur.values.spend + r.spend,
      impressions: cur.values.impressions + r.impressions,
      clicks: cur.values.clicks + r.clicks,
      conversions: cur.values.conversions + r.conversions,
      revenue: cur.values.revenue + r.revenue,
    }
    map.set(key, cur)
  }
  return [...map.entries()].map(([dimensionValue, v]) => ({
    dimensionValue,
    channel: v.channel,
    values: v.values,
  }))
}

export function hasData(rows: MetricRow[]): boolean {
  return rows.length > 0
}
