import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { ArrowDown, ArrowUp, Minus } from "lucide-react"
import { formatPercent } from "@/lib/format"

export type Kpi = {
  label: string
  value: string
  change: number | null
  // Whether an increase is good (e.g. revenue) or bad (e.g. CPA).
  goodWhenUp?: boolean
  hint?: string
}

export function KpiCards({ kpis }: { kpis: Kpi[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
      {kpis.map((kpi) => (
        <Card key={kpi.label} className="gap-0 py-4">
          <CardContent className="px-4">
            <p className="text-xs font-medium text-muted-foreground truncate">
              {kpi.label}
            </p>
            <p className="mt-1 text-xl font-semibold tracking-tight tabular-nums text-foreground">
              {kpi.value}
            </p>
            <ChangeBadge change={kpi.change} goodWhenUp={kpi.goodWhenUp ?? true} />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function ChangeBadge({
  change,
  goodWhenUp,
}: {
  change: number | null
  goodWhenUp: boolean
}) {
  if (change === null) {
    return (
      <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
        <Minus className="h-3 w-3" />
        <span>sin comparación</span>
      </div>
    )
  }
  const up = change > 0
  const flat = change === 0
  const good = flat ? true : up === goodWhenUp
  return (
    <div
      className={cn(
        "mt-1 flex items-center gap-1 text-xs font-medium",
        flat
          ? "text-muted-foreground"
          : good
            ? "text-chart-4"
            : "text-destructive",
      )}
    >
      {flat ? (
        <Minus className="h-3 w-3" />
      ) : up ? (
        <ArrowUp className="h-3 w-3" />
      ) : (
        <ArrowDown className="h-3 w-3" />
      )}
      <span>{formatPercent(Math.abs(change))}</span>
    </div>
  )
}
