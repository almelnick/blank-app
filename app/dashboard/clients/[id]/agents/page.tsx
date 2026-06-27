import { requireUser } from "@/lib/session"
import { listReports, listSchedules } from "@/app/actions/reports"
import { AgentsPanel } from "@/components/agents-panel"

export default async function ClientAgentsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const user = await requireUser()
  const isAdmin = user.role === "agency_admin"

  const [reports, schedules] = await Promise.all([
    listReports(id),
    isAdmin ? listSchedules(id) : Promise.resolve([]),
  ])

  return (
    <AgentsPanel
      clientId={id}
      isAdmin={isAdmin}
      initialReports={reports.map((r) => ({
        id: r.id,
        agent: r.agent,
        title: r.title,
        content: r.content,
        scheduled: r.scheduled,
        createdAt: r.createdAt,
      }))}
      initialSchedules={schedules.map((s) => ({
        agent: s.agent,
        frequency: s.frequency,
        enabled: s.enabled,
      }))}
    />
  )
}
