"use client"

import { useMemo, useState } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { channelLabel } from "@/lib/channels"
import {
  formatCurrency,
  formatNumber,
  formatPercent,
  ctr,
  cpa,
  roas,
} from "@/lib/format"
import { ArrowDown, ArrowUp, Search } from "lucide-react"

export type DimensionRow = {
  dimensionValue: string
  channel: string
  spend: number
  impressions: number
  clicks: number
  conversions: number
  revenue: number
}

type SortKey =
  | "dimensionValue"
  | "spend"
  | "clicks"
  | "ctr"
  | "conversions"
  | "cpa"
  | "revenue"
  | "roas"

export function DimensionTable({
  label,
  rows,
  isEcommerce,
}: {
  label: string
  rows: DimensionRow[]
  isEcommerce: boolean
}) {
  const [query, setQuery] = useState("")
  const [sortKey, setSortKey] = useState<SortKey>("spend")
  const [dir, setDir] = useState<"asc" | "desc">("desc")

  const computed = useMemo(() => {
    const withDerived = rows.map((r) => ({
      ...r,
      ctr: ctr(r.clicks, r.impressions),
      cpa: cpa(r.spend, r.conversions),
      roas: roas(r.revenue, r.spend),
    }))
    const filtered = query
      ? withDerived.filter((r) =>
          r.dimensionValue.toLowerCase().includes(query.toLowerCase()),
        )
      : withDerived
    return filtered.sort((a, b) => {
      const av = a[sortKey]
      const bv = b[sortKey]
      if (typeof av === "string" && typeof bv === "string") {
        return dir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av)
      }
      return dir === "asc"
        ? (av as number) - (bv as number)
        : (bv as number) - (av as number)
    })
  }, [rows, query, sortKey, dir])

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setDir((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortKey(key)
      setDir("desc")
    }
  }

  function SortHead({
    label: l,
    keyName,
    numeric = true,
  }: {
    label: string
    keyName: SortKey
    numeric?: boolean
  }) {
    return (
      <TableHead className={numeric ? "text-right" : ""}>
        <button
          type="button"
          onClick={() => toggleSort(keyName)}
          className={`inline-flex items-center gap-1 hover:text-foreground ${
            numeric ? "flex-row-reverse" : ""
          } ${sortKey === keyName ? "text-foreground" : ""}`}
        >
          {l}
          {sortKey === keyName &&
            (dir === "asc" ? (
              <ArrowUp className="size-3" />
            ) : (
              <ArrowDown className="size-3" />
            ))}
        </button>
      </TableHead>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
        <CardTitle className="text-base">{label}</CardTitle>
        <div className="relative w-full max-w-56">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Buscar ${label.toLowerCase()}...`}
            className="pl-8"
          />
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <SortHead label={label} keyName="dimensionValue" numeric={false} />
                <TableHead>Canal</TableHead>
                <SortHead label="Inversión" keyName="spend" />
                <SortHead label="Clicks" keyName="clicks" />
                <SortHead label="CTR" keyName="ctr" />
                {isEcommerce ? (
                  <>
                    <SortHead label="Ingresos" keyName="revenue" />
                    <SortHead label="ROAS" keyName="roas" />
                  </>
                ) : (
                  <>
                    <SortHead label="Conv." keyName="conversions" />
                    <SortHead label="CPA" keyName="cpa" />
                  </>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {computed.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={isEcommerce ? 7 : 7}
                    className="h-24 text-center text-muted-foreground"
                  >
                    Sin datos para el período seleccionado.
                  </TableCell>
                </TableRow>
              ) : (
                computed.map((r) => (
                  <TableRow key={`${r.dimensionValue}-${r.channel}`}>
                    <TableCell className="font-medium">
                      {r.dimensionValue}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="font-normal">
                        {channelLabel(r.channel)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(r.spend)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatNumber(r.clicks)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatPercent(r.ctr)}
                    </TableCell>
                    {isEcommerce ? (
                      <>
                        <TableCell className="text-right tabular-nums">
                          {formatCurrency(r.revenue)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {r.roas.toFixed(2)}x
                        </TableCell>
                      </>
                    ) : (
                      <>
                        <TableCell className="text-right tabular-nums">
                          {formatNumber(r.conversions)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatCurrency(r.cpa)}
                        </TableCell>
                      </>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
