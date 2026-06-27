export function formatNumber(value: number): string {
  return new Intl.NumberFormat("es-AR", {
    maximumFractionDigits: value < 100 && value % 1 !== 0 ? 2 : 0,
  }).format(value)
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value)
}

export function formatPercent(value: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "percent",
    maximumFractionDigits: 1,
  }).format(value)
}

export function formatMetric(
  value: number,
  format: "number" | "currency" | "percent",
): string {
  if (format === "currency") return formatCurrency(value)
  if (format === "percent") return formatPercent(value)
  return formatNumber(value)
}

export function formatCompact(value: number): string {
  return new Intl.NumberFormat("es-AR", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value)
}

export function formatDate(value: Date | string): string {
  const d = typeof value === "string" ? new Date(value) : value
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d)
}

// Derived metric helpers used across dashboard + agents.
export function ctr(clicks: number, impressions: number): number {
  return impressions > 0 ? clicks / impressions : 0
}

export function cpc(spend: number, clicks: number): number {
  return clicks > 0 ? spend / clicks : 0
}

export function cpa(spend: number, conversions: number): number {
  return conversions > 0 ? spend / conversions : 0
}

export function roas(revenue: number, spend: number): number {
  return spend > 0 ? revenue / spend : 0
}

export function convRate(conversions: number, clicks: number): number {
  return clicks > 0 ? conversions / clicks : 0
}

export function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null
  return (current - previous) / previous
}
