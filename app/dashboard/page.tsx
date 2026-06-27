import Link from "next/link"
import { SyncWindsorButton } from "@/components/sync-windsor-button"
import { listClients } from "@/app/actions/clients"
import { getRows, sumTotals } from "@/lib/metrics"
import { resolvePeriods } from "@/lib/dates"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { CLIENT_TYPES, type ClientType } from "@/lib/channels"
import { formatCurrency, formatNumber, roas } from "@/lib/format"
import { ArrowUpRight, Plus, Users } from "lucide-react"

export default async function DashboardHome() {
  const clients = await listClients()
  const { current } = resolvePeriods(30)

  const summaries = await Promise.all(
    clients.map(async (c) => {
      const rows = await getRows({
        clientId: c.id,
        from: current.from,
        to: current.to,
      })
      return { client: c, totals: sumTotals(rows) }
    }),
  )

  const portfolio = summaries.reduce(
    (acc, s) => ({
      spend: acc.spend + s.totals.spend,
      conversions: acc.conversions + s.totals.conversions,
      revenue: acc.revenue + s.totals.revenue,
    }),
    { spend: 0, conversions: 0, revenue: 0 },
  )

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-balance">
            Resumen del portfolio
          </h1>
          <p className="text-sm text-muted-foreground">
            Últimos 30 días · {clients.length}{" "}
            {clients.length === 1 ? "cliente" : "clientes"}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <SyncWindsorButton />
          <Link href="/dashboard/clients/new" className={buttonVariants()}>
            <Plus className="size-4" />
            Nuevo cliente
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <SummaryCard label="Inversión total" value={formatCurrency(portfolio.spend)} />
        <SummaryCard
          label="Conversiones / Leads"
          value={formatNumber(portfolio.conversions)}
        />
        <SummaryCard
          label="ROAS promedio"
          value={`${roas(portfolio.revenue, portfolio.spend).toFixed(2)}x`}
        />
      </div>

      {clients.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <div className="rounded-full bg-muted p-3">
              <Users className="size-6 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium text-foreground">Todavía no hay clientes</p>
              <p className="text-sm text-muted-foreground">
                Cargá tu primer cliente para empezar a ver métricas.
              </p>
            </div>
            <Link href="/dashboard/clients/new" className={buttonVariants()}>
              <Plus className="size-4" />
              Cargar cliente
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {summaries.map(({ client: c, totals }) => {
            const isEcom = c.type === "ecommerce"
            return (
              <Link key={c.id} href={`/dashboard/clients/${c.id}`} className="group">
                <Card className="h-full transition-colors group-hover:border-primary/40">
                  <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
                    <div className="min-w-0">
                      <CardTitle className="truncate text-base">{c.name}</CardTitle>
                      <Badge variant="secondary" className="mt-1 font-normal">
                        {CLIENT_TYPES[c.type as ClientType]?.label ?? c.type}
                      </Badge>
                    </div>
                    <ArrowUpRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-3">
                    <Stat label="Inversión" value={formatCurrency(totals.spend)} />
                    {isEcom ? (
                      <Stat
                        label="ROAS"
                        value={`${roas(totals.revenue, totals.spend).toFixed(2)}x`}
                      />
                    ) : (
                      <Stat label="Leads" value={formatNumber(totals.conversions)} />
                    )}
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <Card className="gap-0 py-4">
      <CardContent className="px-4">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">
          {value}
        </p>
      </CardContent>
    </Card>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 font-semibold tabular-nums">{value}</p>
    </div>
  )
}
