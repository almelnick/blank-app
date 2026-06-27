import { redirect } from "next/navigation"
import Link from "next/link"
import { getSessionUser } from "@/lib/session"
import { UserMenu } from "@/components/user-menu"
import { Toaster } from "@/components/ui/sonner"
import { BarChart3 } from "lucide-react"

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getSessionUser()
  if (!user) redirect("/sign-in")
  // Admins use the full dashboard, not the portal.
  if (user.role === "agency_admin") redirect("/dashboard")

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-4 px-4">
          <Link href="/portal" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <BarChart3 className="h-4 w-4" />
            </div>
            <span className="text-lg font-semibold tracking-tight">Pulse</span>
          </Link>
          <UserMenu user={user} />
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>
      <Toaster />
    </div>
  )
}
