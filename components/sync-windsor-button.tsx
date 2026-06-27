"use client"

import { useState } from "react"
import { syncWindsorData } from "@/app/actions/sync"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { RefreshCw } from "lucide-react"

export function SyncWindsorButton() {
  const [loading, setLoading] = useState(false)

  async function handleSync() {
    setLoading(true)
    try {
      const result = await syncWindsorData()
      if (result.success) {
        toast.success(
          `Sincronizado: ${result.clientsCreated} clientes, ${result.metricsInserted} métricas`,
        )
      } else {
        toast.error(result.error || "Error en la sincronización")
      }
    } catch (err) {
      toast.error("Error al sincronizar con Windsor")
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button onClick={handleSync} disabled={loading} variant="outline" size="sm">
      <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
      {loading ? "Sincronizando..." : "Sincronizar Windsor"}
    </Button>
  )
}
