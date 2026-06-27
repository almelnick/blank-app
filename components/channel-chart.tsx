"use client"

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { formatCompact } from "@/lib/format"
import { channelLabel } from "@/lib/channels"

export type ChannelDatum = {
  channel: string
  spend: number
  conversions: number
  revenue: number
}

export function ChannelChart({
  data,
  isEcommerce,
}: {
  data: ChannelDatum[]
  isEcommerce: boolean
}) {
  const metric = isEcommerce ? "revenue" : "conversions"
  const rows = data.map((d) => ({ ...d, label: channelLabel(d.channel) }))

  const config: ChartConfig = {
    spend: { label: "Inversión", color: "var(--chart-1)" },
    [metric]: {
      label: isEcommerce ? "Ingresos" : "Conversiones",
      color: "var(--chart-4)",
    },
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Por canal</CardTitle>
        <CardDescription>
          Inversión vs. {isEcommerce ? "ingresos" : "conversiones"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={config} className="h-[260px] w-full">
          <BarChart data={rows} margin={{ left: 4, right: 8, top: 8 }}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={44}
              tickFormatter={(v: number) => formatCompact(v)}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="spend" fill="var(--color-spend)" radius={[4, 4, 0, 0]} />
            <Bar
              dataKey={metric}
              fill={`var(--color-${metric})`}
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
