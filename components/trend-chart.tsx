"use client"

import { useState } from "react"
import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts"
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
import { Button } from "@/components/ui/button"
import { formatCompact } from "@/lib/format"
import { cn } from "@/lib/utils"

export type TrendPoint = {
  date: string
  spend: number
  clicks: number
  conversions: number
  revenue: number
}

type Metric = "spend" | "clicks" | "conversions" | "revenue"

const METRIC_META: Record<Metric, { label: string; color: string }> = {
  spend: { label: "Inversión", color: "var(--chart-1)" },
  clicks: { label: "Clicks", color: "var(--chart-2)" },
  conversions: { label: "Conversiones", color: "var(--chart-4)" },
  revenue: { label: "Ingresos", color: "var(--chart-3)" },
}

export function TrendChart({
  data,
  isEcommerce,
}: {
  data: TrendPoint[]
  isEcommerce: boolean
}) {
  const metrics: Metric[] = isEcommerce
    ? ["revenue", "spend", "conversions"]
    : ["conversions", "spend", "clicks"]
  const [metric, setMetric] = useState<Metric>(metrics[0])

  const config: ChartConfig = {
    [metric]: {
      label: METRIC_META[metric].label,
      color: METRIC_META[metric].color,
    },
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
        <div>
          <CardTitle className="text-base">Evolución diaria</CardTitle>
          <CardDescription>{METRIC_META[metric].label} en el período</CardDescription>
        </div>
        <div className="flex flex-wrap gap-1">
          {metrics.map((m) => (
            <Button
              key={m}
              size="sm"
              variant={m === metric ? "secondary" : "ghost"}
              className={cn("h-7 px-2 text-xs", m === metric && "font-medium")}
              onClick={() => setMetric(m)}
            >
              {METRIC_META[m].label}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer config={config} className="h-[260px] w-full">
          <AreaChart data={data} margin={{ left: 4, right: 8, top: 8 }}>
            <defs>
              <linearGradient id={`fill-${metric}`} x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor={METRIC_META[metric].color}
                  stopOpacity={0.3}
                />
                <stop
                  offset="95%"
                  stopColor={METRIC_META[metric].color}
                  stopOpacity={0.02}
                />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={(v: string) => v.slice(5)}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={44}
              tickFormatter={(v: number) => formatCompact(v)}
            />
            <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
            <Area
              dataKey={metric}
              type="monotone"
              fill={`url(#fill-${metric})`}
              stroke={METRIC_META[metric].color}
              strokeWidth={2}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
