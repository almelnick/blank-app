"use client"

import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { useCallback } from "react"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { channelLabel, type ChannelKey } from "@/lib/channels"
import { Badge } from "@/components/ui/badge"

const RANGES = [
  { value: "7", label: "Últimos 7 días" },
  { value: "14", label: "Últimos 14 días" },
  { value: "30", label: "Últimos 30 días" },
  { value: "90", label: "Últimos 90 días" },
]

export function DashboardFilters({
  availableChannels,
}: {
  availableChannels: ChannelKey[]
}) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()

  const range = params.get("range") ?? "30"
  const activeChannels = (params.get("channels")?.split(",").filter(Boolean) ??
    []) as ChannelKey[]

  const update = useCallback(
    (next: Record<string, string | null>) => {
      const sp = new URLSearchParams(params.toString())
      for (const [k, v] of Object.entries(next)) {
        if (v === null || v === "") sp.delete(k)
        else sp.set(k, v)
      }
      router.replace(`${pathname}?${sp.toString()}`, { scroll: false })
    },
    [params, pathname, router],
  )

  function toggleChannel(ch: ChannelKey) {
    const set = new Set(activeChannels)
    if (set.has(ch)) set.delete(ch)
    else set.add(ch)
    update({ channels: [...set].join(",") })
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Select value={range} onValueChange={(v) => update({ range: v })}>
        <SelectTrigger className="w-44">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {RANGES.map((r) => (
            <SelectItem key={r.value} value={r.value}>
              {r.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="flex flex-wrap items-center gap-1.5">
        {availableChannels.map((ch) => {
          const active = activeChannels.length === 0 || activeChannels.includes(ch)
          return (
            <button key={ch} type="button" onClick={() => toggleChannel(ch)}>
              <Badge
                variant={active ? "default" : "outline"}
                className="cursor-pointer font-normal"
              >
                {channelLabel(ch)}
              </Badge>
            </button>
          )
        })}
        {activeChannels.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs"
            onClick={() => update({ channels: null })}
          >
            Todos
          </Button>
        )}
      </div>
    </div>
  )
}
