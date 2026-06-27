import { notFound } from "next/navigation"
import { getClientBySlug } from "@/app/actions/clients"
import { listReports } from "@/app/actions/reports"
import { AgentsPanel } from "@/components/agents-panel"

export default async function PortalReportsPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const client = await getClientBySlug(slug)
  if (!client) notFound()

  const reports = await listReports(client.id)

  return (
    <AgentsPanel
      clientId={client.id}
      isAdmin={false}
      initialReports={reports.map((r) => ({
        id: r.id,
        agent: r.agent,
        title: r.title,
        content: r.content,
        scheduled: r.scheduled,
        createdAt: r.createdAt,
      }))}
      initialSchedules={[]}
    />
  )
}
