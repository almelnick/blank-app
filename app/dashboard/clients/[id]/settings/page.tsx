import { requireAdmin } from "@/lib/session"
import {
  getClientConnections,
  listMetricMappings,
  listDimensionMaps,
  listClientMembers,
} from "@/app/actions/clients"
import { ClientSettings } from "@/components/client-settings"

export default async function ClientSettingsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requireAdmin()
  const { id } = await params

  const [connections, mappings, dimMaps, members] = await Promise.all([
    getClientConnections(id),
    listMetricMappings(id),
    listDimensionMaps(id),
    listClientMembers(id),
  ])

  return (
    <ClientSettings
      clientId={id}
      connections={connections.map((c) => ({
        id: c.id,
        channel: c.channel,
        windsorAccountId: c.windsorAccountId,
        enabled: c.enabled,
      }))}
      mappings={mappings.map((m) => ({
        id: m.id,
        channel: m.channel,
        sourceMetric: m.sourceMetric,
        canonicalMetric: m.canonicalMetric,
        displayName: m.displayName,
        format: m.format,
      }))}
      dimMaps={dimMaps.map((d) => ({
        id: d.id,
        channel: d.channel,
        rawValue: d.rawValue,
        normalizedValue: d.normalizedValue,
      }))}
      members={members}
    />
  )
}
