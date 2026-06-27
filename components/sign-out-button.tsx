"use client"

import { useRouter } from "next/navigation"
import { authClient } from "@/lib/auth-client"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { LogOut } from "lucide-react"

export function SignOutItem() {
  const router = useRouter()
  return (
    <DropdownMenuItem
      onClick={async () => {
        await authClient.signOut()
        router.push("/sign-in")
        router.refresh()
      }}
    >
      <LogOut className="mr-2 h-4 w-4" />
      Cerrar sesión
    </DropdownMenuItem>
  )
}
