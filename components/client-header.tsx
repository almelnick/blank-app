"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { CLIENT_TYPES, type ClientType } from "@/lib/channels"
import { SyncButton } from "@/components/sync-button"

export function ClientHeader({
  clientId,
  name,
  type,
}: {
  clientId: string
  name: string
  type: string
}) {
  const pathname = usePathname()
  const base = `/dashboard/clients/${clientId}`
  const tabs = [
    { href: base, label: "Dashboard", exact: true },
    { href: `${base}/agents`, label: "Agentes IA" },
    { href: `${base}/settings`, label: "Configuración" },
  ]

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">{name}</h1>
          <Badge variant="secondary" className="font-normal">
            {CLIENT_TYPES[type as ClientType]?.label ?? type}
          </Badge>
        </div>
        <SyncButton clientId={clientId} />
      </div>
      <nav className="flex gap-1 border-b">
        {tabs.map((t) => {
          const active = t.exact ? pathname === t.href : pathname.startsWith(t.href)
          return (
            <Link
              key={t.href}
              href={t.href}
              className={cn(
                "-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {t.label}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
