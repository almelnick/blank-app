import { notFound } from "next/navigation"
import { getClientBySlug } from "@/app/actions/clients"
import { PortalTabs } from "@/components/portal-tabs"

export default async function PortalClientLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const client = await getClientBySlug(slug)
  if (!client) notFound()

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{client.name}</h1>
        <p className="text-sm text-muted-foreground">Performance y análisis</p>
      </div>
      <PortalTabs slug={slug} />
      {children}
    </div>
  )
}
