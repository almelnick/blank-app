import {
  getRows,
  sumTotals,
  groupByDate,
  groupByChannel,
  groupByDimension,
} from "@/lib/metrics"
import { resolvePeriods, parseRange } from "@/lib/dates"
import { buildKpis } from "@/lib/build-kpis"
import { KpiCards } from "@/components/kpi-cards"
import { TrendChart, type TrendPoint } from "@/components/trend-chart"
import { ChannelChart, type ChannelDatum } from "@/components/channel-chart"
import { DimensionTable, type DimensionRow } from "@/components/dimension-table"
import { DashboardFilters } from "@/components/dashboard-filters"
import { Card, CardContent } from "@/components/ui/card"
import { getClientConnections } from "@/app/actions/clients"
import type { ChannelKey, ClientType } from "@/lib/channels"
import { Database } from "lucide-react"

type Client = {
  id: string
  name: string
  type: string
  dimensionLabel: string
}

export async function ClientDashboardView({
  client,
  searchParams,
}: {
  client: Client
  searchParams: { range?: string; channels?: string }
}) {
  const isEcommerce = client.type === "ecommerce"
  const rangeDays = parseRange(searchParams.range)
  const { current, previous } = resolvePeriods(rangeDays)

  const connections = await getClientConnections(client.id)
  const enabledChannels = connections
    .filter((c) => c.enabled)
    .map((c) => c.channel) as ChannelKey[]

  const selected = (searchParams.channels?.split(",").filter(Boolean) ??
    []) as ChannelKey[]
  const activeChannels = selected.length ? selected : enabledChannels

  const [currentRows, previousRows] = await Promise.all([
    getRows({
      clientId: client.id,
      from: current.from,
      to: current.to,
      channels: activeChannels,
    }),
    getRows({
      clientId: client.id,
      from: previous.from,
      to: previous.to,
      channels: activeChannels,
    }),
  ])

  const currentTotals = sumTotals(currentRows)
  const previousTotals = sumTotals(previousRows)
  const kpis = buildKpis(client.type as ClientType, currentTotals, previousTotals)

  const trend: TrendPoint[] = groupByDate(currentRows).map((d) => ({
    date: d.date,
    spend: d.values.spend,
    clicks: d.values.clicks,
    conversions: d.values.conversions,
    revenue: d.values.revenue,
  }))

  const channelData: ChannelDatum[] = groupByChannel(currentRows).map((c) => ({
    channel: c.channel,
    spend: c.values.spend,
    conversions: c.values.conversions,
    revenue: c.values.revenue,
  }))

  const dimensionRows: DimensionRow[] = groupByDimension(currentRows).map((d) => ({
    dimensionValue: d.dimensionValue,
    channel: d.channel,
    spend: d.values.spend,
    impressions: d.values.impressions,
    clicks: d.values.clicks,
    conversions: d.values.conversions,
    revenue: d.values.revenue,
  }))

  const empty = currentRows.length === 0

  return (
    <div className="flex flex-col gap-5">
      <DashboardFilters availableChannels={enabledChannels} />

      {empty ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-2 py-16 text-center">
            <div className="rounded-full bg-muted p-3">
              <Database className="size-6 text-muted-foreground" />
            </div>
            <p className="font-medium text-foreground">Sin datos todavía</p>
            <p className="max-w-md text-sm text-muted-foreground">
              No hay métricas sincronizadas para este período. Ejecutá una
              sincronización con Windsor desde la configuración del cliente.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <KpiCards kpis={kpis} />
          <div className="grid gap-4 lg:grid-cols-2">
            <TrendChart data={trend} isEcommerce={isEcommerce} />
            <ChannelChart data={channelData} isEcommerce={isEcommerce} />
          </div>
          <DimensionTable
            label={client.dimensionLabel}
            rows={dimensionRows}
            isEcommerce={isEcommerce}
          />
        </>
      )}
    </div>
  )
}
