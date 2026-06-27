import { notFound } from "next/navigation"
import { getClient } from "@/app/actions/clients"
import { ClientHeader } from "@/components/client-header"

export default async function ClientLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const client = await getClient(id)
  if (!client) notFound()

  return (
    <div className="flex flex-col gap-6">
      <ClientHeader clientId={client.id} name={client.name} type={client.type} />
      {children}
    </div>
  )
}
