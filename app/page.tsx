import { redirect } from "next/navigation"
import { getSessionUser } from "@/lib/session"
import { ensureAdminBootstrap } from "@/lib/bootstrap"

export default async function Home() {
  const sessionUser = await getSessionUser()
  if (!sessionUser) redirect("/sign-in")

  // First account to ever sign up becomes the agency admin.
  const role = await ensureAdminBootstrap(sessionUser.id)

  if (role === "agency_admin") redirect("/dashboard")
  redirect("/portal")
}
