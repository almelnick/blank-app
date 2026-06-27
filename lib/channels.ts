// Canonical channels supported across the dashboard. The Windsor connector
// slug is what we send to the Windsor API; the channel key is our internal
// normalized identifier.

export type ChannelKey = "meta" | "google_ads" | "ga4" | "search_console"

export type CanonicalMetric =
  | "spend"
  | "impressions"
  | "clicks"
  | "conversions"
  | "revenue"

export type ClientType = "lead_gen" | "ecommerce"

export type AgentKey = "meta" | "google" | "cross" | "seo" | "content"

export const CHANNELS: Record<
  ChannelKey,
  { label: string; connector: string; color: string }
> = {
  meta: { label: "Meta Ads", connector: "facebook", color: "var(--chart-1)" },
  google_ads: {
    label: "Google Ads",
    connector: "google_ads",
    color: "var(--chart-3)",
  },
  ga4: {
    label: "Google Analytics 4",
    connector: "google_analytics_4",
    color: "var(--chart-4)",
  },
  search_console: {
    label: "Search Console",
    connector: "google_search_console",
    color: "var(--chart-2)",
  },
}

export const CHANNEL_KEYS = Object.keys(CHANNELS) as ChannelKey[]

export function channelLabel(key: string): string {
  return CHANNELS[key as ChannelKey]?.label ?? key
}

export const CLIENT_TYPES: Record<ClientType, { label: string; defaultDimension: string }> = {
  lead_gen: { label: "Lead Generation", defaultDimension: "Campaña" },
  ecommerce: { label: "Ecommerce", defaultDimension: "Categoría" },
}

// Suggested labels for the primary breakdown dimension. Free text is allowed,
// these are just quick presets in the wizard.
export const DIMENSION_LABEL_PRESETS = [
  "Campaña",
  "Categoría",
  "Marca",
  "Marca de auto",
  "Línea de producto",
  "Servicio",
  "Landing",
]

export const CANONICAL_METRICS: Record<
  CanonicalMetric,
  { label: string; format: "number" | "currency" | "percent" }
> = {
  spend: { label: "Inversión", format: "currency" },
  impressions: { label: "Impresiones", format: "number" },
  clicks: { label: "Clicks", format: "number" },
  conversions: { label: "Conversiones", format: "number" },
  revenue: { label: "Ingresos", format: "currency" },
}

export const AGENTS: Record<
  AgentKey,
  { label: string; expertise: string; channels: ChannelKey[] }
> = {
  meta: {
    label: "Experto en Meta Ads",
    expertise: "Paid media en Meta (Facebook & Instagram)",
    channels: ["meta"],
  },
  google: {
    label: "Experto en Google Ads",
    expertise: "Paid media en Google (Search, PMax, Display)",
    channels: ["google_ads"],
  },
  cross: {
    label: "Estratega Cross-Channel",
    expertise: "Visión integral de paid media en Meta y Google",
    channels: ["meta", "google_ads"],
  },
  seo: {
    label: "Experto en SEO",
    expertise: "SEO técnico y orgánico vía Search Console y GA4",
    channels: ["search_console", "ga4"],
  },
  content: {
    label: "Experto en Contenido Técnico",
    expertise: "Estrategia de contenido y performance editorial",
    channels: ["ga4", "search_console"],
  },
}

export const AGENT_KEYS = Object.keys(AGENTS) as AgentKey[]
