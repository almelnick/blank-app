import { notFound } from "next/navigation"
import { getClientBySlug } from "@/app/actions/clients"
import { ClientDashboardView } from "@/components/client-dashboard-view"

export default async function PortalDashboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ range?: string; channels?: string }>
}) {
  const { slug } = await params
  const sp = await searchParams
  const client = await getClientBySlug(slug)
  if (!client) notFound()

  return <ClientDashboardView client={client} searchParams={sp} />
}
