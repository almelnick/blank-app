import { notFound } from "next/navigation"
import { getClient } from "@/app/actions/clients"
import { ClientDashboardView } from "@/components/client-dashboard-view"

export default async function ClientDashboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ range?: string; channels?: string }>
}) {
  const { id } = await params
  const sp = await searchParams
  const client = await getClient(id)
  if (!client) notFound()

  return <ClientDashboardView client={client} searchParams={sp} />
}
