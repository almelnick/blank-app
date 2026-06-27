import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { clientMember } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { headers } from "next/headers"
import { redirect } from "next/navigation"

export type SessionUser = {
  id: string
  name: string
  email: string
  role: string
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return null
  return {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    // role is an additional field on the Better Auth user
    role: (session.user as { role?: string }).role ?? "client",
  }
}

// Requires any authenticated user; redirects to sign-in otherwise.
export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser()
  if (!user) redirect("/sign-in")
  return user
}

// Requires an agency admin; client-role users are sent to their portal.
export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser()
  if (user.role !== "agency_admin") redirect("/portal")
  return user
}

export function isAdmin(user: SessionUser | null): boolean {
  return user?.role === "agency_admin"
}

// Returns the list of client IDs a given user is allowed to view.
export async function getAccessibleClientIds(user: SessionUser): Promise<string[]> {
  const rows = await db
    .select({ clientId: clientMember.clientId })
    .from(clientMember)
    .where(eq(clientMember.userId, user.id))
  return rows.map((r) => r.clientId)
}

// Throws unless the user (admin or member) can access the given client.
export async function assertClientAccess(user: SessionUser, clientId: string): Promise<void> {
  if (user.role === "agency_admin") return
  const ids = await getAccessibleClientIds(user)
  if (!ids.includes(clientId)) redirect("/portal")
}
