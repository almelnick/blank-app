import type { Totals } from "@/lib/metrics"
import type { Kpi } from "@/components/kpi-cards"
import {
  formatCurrency,
  formatNumber,
  formatPercent,
  ctr,
  cpa,
  roas,
  pctChange,
} from "@/lib/format"
import type { ClientType } from "@/lib/channels"

// Builds the KPI set for a client. Ecommerce leans on revenue/ROAS, lead gen
// leans on conversions/CPA — both share spend/clicks/CTR.
export function buildKpis(
  type: ClientType,
  current: Totals,
  previous: Totals,
): Kpi[] {
  const base: Kpi[] = [
    {
      label: "Inversión",
      value: formatCurrency(current.spend),
      change: pctChange(current.spend, previous.spend),
      goodWhenUp: true,
    },
    {
      label: "Clicks",
      value: formatNumber(current.clicks),
      change: pctChange(current.clicks, previous.clicks),
      goodWhenUp: true,
    },
    {
      label: "CTR",
      value: formatPercent(ctr(current.clicks, current.impressions)),
      change: pctChange(
        ctr(current.clicks, current.impressions),
        ctr(previous.clicks, previous.impressions),
      ),
      goodWhenUp: true,
    },
  ]

  if (type === "ecommerce") {
    return [
      ...base,
      {
        label: "Ingresos",
        value: formatCurrency(current.revenue),
        change: pctChange(current.revenue, previous.revenue),
        goodWhenUp: true,
      },
      {
        label: "ROAS",
        value: `${roas(current.revenue, current.spend).toFixed(2)}x`,
        change: pctChange(
          roas(current.revenue, current.spend),
          roas(previous.revenue, previous.spend),
        ),
        goodWhenUp: true,
      },
      {
        label: "Conversiones",
        value: formatNumber(current.conversions),
        change: pctChange(current.conversions, previous.conversions),
        goodWhenUp: true,
      },
    ]
  }

  // lead_gen
  return [
    ...base,
    {
      label: "Leads",
      value: formatNumber(current.conversions),
      change: pctChange(current.conversions, previous.conversions),
      goodWhenUp: true,
    },
    {
      label: "Costo / Lead",
      value: formatCurrency(cpa(current.spend, current.conversions)),
      change: pctChange(
        cpa(current.spend, current.conversions),
        cpa(previous.spend, previous.conversions),
      ),
      goodWhenUp: false,
    },
    {
      label: "Impresiones",
      value: formatNumber(current.impressions),
      change: pctChange(current.impressions, previous.impressions),
      goodWhenUp: true,
    },
  ]
}
