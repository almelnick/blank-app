import { subDays, format } from "date-fns"

export type Period = { from: string; to: string }

function iso(d: Date): string {
  return format(d, "yyyy-MM-dd")
}

// Returns the current period and the immediately preceding period of the same
// length, used for period-over-period comparisons in KPIs.
export function resolvePeriods(rangeDays: number): {
  current: Period
  previous: Period
} {
  const today = new Date()
  const to = today
  const from = subDays(today, rangeDays - 1)
  const prevTo = subDays(from, 1)
  const prevFrom = subDays(prevTo, rangeDays - 1)
  return {
    current: { from: iso(from), to: iso(to) },
    previous: { from: iso(prevFrom), to: iso(prevTo) },
  }
}

export function parseRange(value: string | undefined): number {
  const n = parseInt(value ?? "30", 10)
  return Number.isFinite(n) && n > 0 ? n : 30
}

export function parseChannels(value: string | undefined): string[] {
  return value?.split(",").filter(Boolean) ?? []
}
