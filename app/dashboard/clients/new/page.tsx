import { requireAdmin } from "@/lib/session"
import { ClientWizard } from "@/components/client-wizard"

export default async function NewClientPage() {
  await requireAdmin()
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Cargar cliente</h1>
        <p className="text-sm text-muted-foreground">
          Configurá el cliente, sus canales y cómo se normalizan sus datos.
        </p>
      </div>
      <ClientWizard />
    </div>
  )
}
