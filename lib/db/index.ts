import { drizzle } from "drizzle-orm/node-postgres"
import { Pool } from "pg"
import * as schema from "./schema"

// Strip the `sslmode` query param from the connection string and configure SSL
// explicitly. This keeps the existing (verify-full-equivalent) behavior while
// avoiding the pg-connection-string deprecation warning about sslmode aliases.
function buildConnectionString() {
  const raw = process.env.DATABASE_URL ?? ""
  try {
    const url = new URL(raw)
    url.searchParams.delete("sslmode")
    return url.toString()
  } catch {
    return raw
  }
}

const connStr = buildConnectionString()
const isLocal = connStr.includes("localhost") || connStr.includes("127.0.0.1")

export const pool = new Pool({
  connectionString: connStr,
  ssl: isLocal ? false : { rejectUnauthorized: true },
})
export const db = drizzle(pool, { schema })
