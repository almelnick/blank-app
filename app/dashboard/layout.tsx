import { requireAdmin } from "@/lib/session"
import { listClients } from "@/app/actions/clients"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { AdminSidebar } from "@/components/admin-sidebar"
import { UserMenu } from "@/components/user-menu"
import { Toaster } from "@/components/ui/sonner"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await requireAdmin()
  const clients = await listClients()

  return (
    <SidebarProvider>
      <AdminSidebar
        clients={clients.map((c) => ({
          id: c.id,
          name: c.name,
          slug: c.slug,
          type: c.type,
        }))}
      />
      <SidebarInset>
        <header className="flex h-14 items-center gap-3 border-b px-4 lg:px-6 sticky top-0 z-10 bg-background/95 backdrop-blur">
          <SidebarTrigger />
          <div className="flex-1" />
          <UserMenu user={user} />
        </header>
        <div className="flex-1 p-4 lg:p-6">{children}</div>
      </SidebarInset>
      <Toaster />
    </SidebarProvider>
  )
}
