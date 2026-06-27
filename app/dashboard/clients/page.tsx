import Link from "next/link"
import { listClients, getClientConnections } from "@/app/actions/clients"
import { Card, CardContent } from "@/components/ui/card"
import { buttonVariants } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CHANNELS, CLIENT_TYPES, type ChannelKey, type ClientType } from "@/lib/channels"
import { Plus, ChevronRight } from "lucide-react"

export default async function ClientsPage() {
  const clients = await listClients()
  const withConns = await Promise.all(
    clients.map(async (c) => ({
      client: c,
      connections: await getClientConnections(c.id),
    })),
  )

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Clientes</h1>
          <p className="text-sm text-muted-foreground">
            Gestioná tus clientes, sus canales y su configuración.
          </p>
        </div>
        <Link href="/dashboard/clients/new" className={buttonVariants()}>
          <Plus className="size-4" />
          Nuevo cliente
        </Link>
      </div>

      <div className="flex flex-col gap-3">
        {withConns.map(({ client: c, connections }) => (
          <Link key={c.id} href={`/dashboard/clients/${c.id}`} className="group">
            <Card className="transition-colors group-hover:border-primary/40">
              <CardContent className="flex items-center justify-between gap-4 py-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-medium">{c.name}</p>
                    <Badge variant="secondary" className="font-normal">
                      {CLIENT_TYPES[c.type as ClientType]?.label ?? c.type}
                    </Badge>
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {connections
                      .filter((conn) => conn.enabled)
                      .map((conn) => (
                        <Badge
                          key={conn.id}
                          variant="outline"
                          className="font-normal text-muted-foreground"
                        >
                          {CHANNELS[conn.channel as ChannelKey]?.label ?? conn.channel}
                        </Badge>
                      ))}
                    <span className="text-xs text-muted-foreground">
                      · Dimensión: {c.dimensionLabel}
                    </span>
                  </div>
                </div>
                <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
              </CardContent>
            </Card>
          </Link>
        ))}
        {clients.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              No hay clientes cargados.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
