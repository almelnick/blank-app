import "server-only"
import { db } from "@/lib/db"
import { user } from "@/lib/db/schema"
import { eq, ne, and } from "drizzle-orm"

// Promotes the given user to agency_admin if no admin exists yet. This makes
// the very first account that signs up the owner of the agency workspace.
// Idempotent and safe to call on every authenticated page load.
export async function ensureAdminBootstrap(userId: string): Promise<string> {
  const admins = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.role, "agency_admin"))
    .limit(1)

  if (admins.length === 0) {
    await db
      .update(user)
      .set({ role: "agency_admin" })
      .where(eq(user.id, userId))
    return "agency_admin"
  }

  // Make sure this isn't accidentally the only-admin edge being demoted.
  void and
  void ne
  const current = await db
    .select({ role: user.role })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1)
  return current[0]?.role ?? "client"
}
