"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { syncClient } from "@/app/actions/sync"
import { toast } from "sonner"
import { RefreshCw } from "lucide-react"

export function SyncButton({ clientId }: { clientId: string }) {
  const [pending, startTransition] = useTransition()
  const [, setDone] = useState(false)

  function run() {
    startTransition(async () => {
      try {
        const res = await syncClient(clientId)
        setDone(true)
        if (res.mock) {
          toast.success(
            `Sincronizado con datos de ejemplo (${res.rows} filas). Agregá WINDSOR_API_KEY para datos reales.`,
          )
        } else {
          toast.success(`Sincronizado: ${res.rows} filas desde Windsor.`)
        }
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Error al sincronizar")
      }
    })
  }

  return (
    <Button variant="outline" onClick={run} disabled={pending}>
      <RefreshCw className={pending ? "size-4 animate-spin" : "size-4"} />
      {pending ? "Sincronizando..." : "Sincronizar"}
    </Button>
  )
}
