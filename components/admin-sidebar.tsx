"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import {
  BarChart3,
  LayoutDashboard,
  Users,
  Sparkles,
  Building2,
} from "lucide-react"
import { cn } from "@/lib/utils"

type ClientNav = { id: string; name: string; slug: string; type: string }

export function AdminSidebar({ clients }: { clients: ClientNav[] }) {
  const pathname = usePathname()

  const mainNav = [
    { href: "/dashboard", label: "Resumen", icon: LayoutDashboard, exact: true },
    { href: "/dashboard/clients", label: "Clientes", icon: Users },
    { href: "/dashboard/reports", label: "Reportes IA", icon: Sparkles },
  ]

  return (
    <Sidebar>
      <SidebarHeader>
        <Link href="/dashboard" className="flex items-center gap-2 px-2 py-1.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
            <BarChart3 className="h-4 w-4" />
          </div>
          <span className="text-lg font-semibold tracking-tight">Pulse</span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNav.map((item) => {
                const active = item.exact
                  ? pathname === item.href
                  : pathname.startsWith(item.href)
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      isActive={active}
                      render={<Link href={item.href} />}
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Clientes</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {clients.length === 0 && (
                <p className="px-2 py-1.5 text-xs text-sidebar-foreground/60">
                  Todavía no hay clientes.
                </p>
              )}
              {clients.map((c) => {
                const href = `/dashboard/clients/${c.id}`
                const active = pathname === href
                return (
                  <SidebarMenuItem key={c.id}>
                    <SidebarMenuButton
                      isActive={active}
                      render={<Link href={href} />}
                    >
                      <Building2
                        className={cn(
                          "h-4 w-4",
                          c.type === "ecommerce"
                            ? "text-chart-4"
                            : "text-chart-2",
                        )}
                      />
                      <span className="truncate">{c.name}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}
