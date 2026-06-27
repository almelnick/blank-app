import type { ChannelKey } from "@/lib/channels"
import { CHANNELS } from "@/lib/channels"

// A single normalized row returned from a Windsor fetch.
export type WindsorRow = {
  date: string // YYYY-MM-DD
  dimensionValue: string | null
  spend: number
  impressions: number
  clicks: number
  conversions: number
  revenue: number
}

export type WindsorFetchParams = {
  connector: string
  accountId?: string | null
  channel: ChannelKey
  from: string
  to: string
  // The Windsor field that maps to our "dimension" (campaign/category/brand).
  dimensionField?: string
}

export const WINDSOR_CONFIGURED = Boolean(process.env.WINDSOR_API_KEY)

const WINDSOR_BASE = "https://connectors.windsor.ai/api/v1"

// Default Windsor field names per connector that we treat as the primary
// breakdown dimension. These can be overridden per connection later.
const DEFAULT_DIMENSION_FIELD: Record<string, string> = {
  facebook: "campaign",
  google_ads: "campaign",
  google_analytics_4: "campaign",
  google_search_console: "query",
}

// Maps a Windsor connector + channel to the metric fields we request.
const METRIC_FIELDS: Record<string, string[]> = {
  facebook: ["spend", "impressions", "clicks", "actions", "action_values"],
  google_ads: ["spend", "impressions", "clicks", "conversions", "conversions_value"],
  google_analytics_4: ["sessions", "totalUsers", "conversions", "totalRevenue"],
  google_search_console: ["impressions", "clicks", "position", "ctr"],
}

function num(v: unknown): number {
  const n = typeof v === "string" ? parseFloat(v) : (v as number)
  return Number.isFinite(n) ? n : 0
}

// Normalizes one raw Windsor record into our canonical shape. Windsor field
// names vary by connector, so we coalesce the most common aliases.
function normalizeRecord(
  raw: Record<string, unknown>,
  dimensionField: string,
): WindsorRow {
  const date =
    (raw.date as string) ??
    (raw.day as string) ??
    (raw.date_start as string) ??
    ""
  return {
    date: typeof date === "string" ? date.slice(0, 10) : "",
    dimensionValue: (raw[dimensionField] as string) ?? null,
    spend: num(raw.spend ?? raw.cost ?? raw.ad_spend),
    impressions: num(raw.impressions),
    clicks: num(raw.clicks ?? raw.sessions),
    conversions: num(raw.conversions ?? raw.actions ?? raw.goal_completions),
    revenue: num(raw.revenue ?? raw.totalRevenue ?? raw.conversions_value ?? raw.action_values),
  }
}

export async function fetchWindsorData(
  params: WindsorFetchParams,
): Promise<WindsorRow[]> {
  const dimensionField =
    params.dimensionField ?? DEFAULT_DIMENSION_FIELD[params.connector] ?? "campaign"

  if (!WINDSOR_CONFIGURED) {
    return generateMockRows(params, dimensionField)
  }

  const fields = [
    "date",
    dimensionField,
    ...(METRIC_FIELDS[params.connector] ?? ["spend", "clicks", "impressions"]),
  ]

  const url = new URL(`${WINDSOR_BASE}/${params.connector}`)
  url.searchParams.set("api_key", process.env.WINDSOR_API_KEY as string)
  url.searchParams.set("date_from", params.from)
  url.searchParams.set("date_to", params.to)
  url.searchParams.set("fields", fields.join(","))
  if (params.accountId) url.searchParams.set("account_id", params.accountId)
  
  console.log(`[v0] Windsor URL: ${url.toString().replace(process.env.WINDSOR_API_KEY || '', '***')}`)

  try {
    const res = await fetch(url.toString(), {
      headers: { Accept: "application/json" },
      // Windsor data isn't realtime; cache briefly to avoid hammering the API.
      next: { revalidate: 1800 },
    })
    if (!res.ok) {
      const errorText = await res.text()
      console.error("[v0] Windsor fetch failed:", res.status, errorText)
      throw new Error(`Windsor error ${res.status}: ${errorText.slice(0, 200)}`)
    }
    const json = (await res.json()) as { data?: Record<string, unknown>[] }
    const rows = json.data ?? []
    return rows.map((r) => normalizeRecord(r, dimensionField))
  } catch (err) {
    console.log("[v0] Windsor fetch error:", (err as Error).message)
    return []
  }
}

// ---------------------------------------------------------------------------
// Deterministic mock data so the dashboard is fully explorable without a key.
// ---------------------------------------------------------------------------

function seeded(seed: number): () => number {
  let s = seed % 2147483647
  if (s <= 0) s += 2147483646
  return () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}

function hash(str: string): number {
  let h = 0
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}

const MOCK_DIMENSIONS: Record<string, string[]> = {
  facebook: ["Prospecting LAL", "Retargeting 30d", "Branding Awareness", "Promo Verano"],
  google_ads: ["Search Brand", "Search Genérico", "Performance Max", "Shopping"],
  google_analytics_4: ["Orgánico", "Paid Social", "Paid Search", "Directo", "Email"],
  google_search_console: ["seguro auto", "mejor crédito", "comprar online", "envío gratis"],
}

function generateMockRows(
  params: WindsorFetchParams,
  dimensionField: string,
): WindsorRow[] {
  void dimensionField
  const rows: WindsorRow[] = []
  const dims = MOCK_DIMENSIONS[params.connector] ?? ["General"]
  const start = new Date(params.from)
  const end = new Date(params.to)
  const channelMeta = CHANNELS[params.channel]
  const baseSeed = hash((params.accountId ?? "") + params.connector + channelMeta.label)

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().slice(0, 10)
    dims.forEach((dim, di) => {
      const rng = seeded(baseSeed + hash(dateStr + dim) + di)
      const dow = d.getDay()
      const weekendFactor = dow === 0 || dow === 6 ? 0.7 : 1
      const impressions = Math.round((2000 + rng() * 12000) * weekendFactor)
      const clicks = Math.round(impressions * (0.01 + rng() * 0.05))
      const isAds = params.channel === "meta" || params.channel === "google_ads"
      const spend = isAds ? Math.round(clicks * (0.4 + rng() * 2.2) * 100) / 100 : 0
      const conversions = Math.round(clicks * (0.02 + rng() * 0.08))
      const revenue = Math.round(conversions * (20 + rng() * 180) * 100) / 100
      rows.push({
        date: dateStr,
        dimensionValue: dim,
        spend,
        impressions,
        clicks,
        conversions,
        revenue,
      })
    })
  }
  return rows
}
