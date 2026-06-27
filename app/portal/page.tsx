import { redirect } from "next/navigation"
import Link from "next/link"
import { requireUser } from "@/lib/session"
import { listClients } from "@/app/actions/clients"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CLIENT_TYPES, type ClientType } from "@/lib/channels"
import { ChevronRight } from "lucide-react"

export default async function PortalIndex() {
  await requireUser()
  const clients = await listClients()

  if (clients.length === 1) {
    redirect(`/portal/${clients[0].slug}`)
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Tus cuentas</h1>
        <p className="text-sm text-muted-foreground">
          Seleccioná una cuenta para ver su performance.
        </p>
      </div>
      {clients.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Todavía no tenés cuentas asignadas. Contactá a tu agencia.
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {clients.map((c) => (
            <Link key={c.id} href={`/portal/${c.slug}`} className="group">
              <Card className="transition-colors group-hover:border-primary/40">
                <CardContent className="flex items-center justify-between gap-4 py-4">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{c.name}</p>
                    <Badge variant="secondary" className="font-normal">
                      {CLIENT_TYPES[c.type as ClientType]?.label ?? c.type}
                    </Badge>
                  </div>
                  <ChevronRight className="size-5 text-muted-foreground" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
