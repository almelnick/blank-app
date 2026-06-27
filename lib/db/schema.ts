import {
  pgTable,
  text,
  timestamp,
  boolean,
  numeric,
  date,
  jsonb,
} from "drizzle-orm/pg-core"

// ---------------------------------------------------------------------------
// Better Auth tables (do not rename columns — Better Auth depends on these)
// ---------------------------------------------------------------------------
export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("emailVerified").notNull().default(false),
  image: text("image"),
  role: text("role").notNull().default("client"), // 'agency_admin' | 'client'
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
})

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expiresAt").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  ipAddress: text("ipAddress"),
  userAgent: text("userAgent"),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
})

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("accountId").notNull(),
  providerId: text("providerId").notNull(),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("accessToken"),
  refreshToken: text("refreshToken"),
  idToken: text("idToken"),
  accessTokenExpiresAt: timestamp("accessTokenExpiresAt"),
  refreshTokenExpiresAt: timestamp("refreshTokenExpiresAt"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
})

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
})

// ---------------------------------------------------------------------------
// App tables (plain userId/ownerId columns, no FKs per skill guidance)
// ---------------------------------------------------------------------------

// A client managed by the agency.
export const client = pgTable("client", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  type: text("type").notNull().default("lead_gen"), // 'lead_gen' | 'ecommerce'
  logoUrl: text("logoUrl"),
  // The label used for the primary breakdown dimension for this client.
  // e.g. "Campaña", "Categoría", "Marca de auto".
  dimensionLabel: text("dimensionLabel").notNull().default("Campaña"),
  ownerId: text("ownerId").notNull(), // agency admin that owns/created it
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
})

// Links a client-role user to the client(s) they can view.
export const clientMember = pgTable("client_member", {
  id: text("id").primaryKey(),
  clientId: text("clientId").notNull(),
  userId: text("userId").notNull(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

// A Windsor data connection (one per channel) for a client.
export const clientConnection = pgTable("client_connection", {
  id: text("id").primaryKey(),
  clientId: text("clientId").notNull(),
  channel: text("channel").notNull(), // 'meta' | 'google_ads' | 'ga4' | 'search_console'
  windsorAccountId: text("windsorAccountId"),
  windsorConnector: text("windsorConnector").notNull(), // Windsor connector slug
  enabled: boolean("enabled").notNull().default(true),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

// Normalizes raw metric field names into canonical metrics per client/channel.
export const metricMapping = pgTable("metric_mapping", {
  id: text("id").primaryKey(),
  clientId: text("clientId").notNull(),
  channel: text("channel"), // null = applies to all channels
  sourceMetric: text("sourceMetric").notNull(),
  canonicalMetric: text("canonicalMetric").notNull(), // 'spend' | 'clicks' | ...
  displayName: text("displayName").notNull(),
  format: text("format").notNull().default("number"), // 'number' | 'currency' | 'percent'
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

// Normalizes raw dimension values (campaign/category/brand names).
export const dimensionValueMap = pgTable("dimension_value_map", {
  id: text("id").primaryKey(),
  clientId: text("clientId").notNull(),
  channel: text("channel"),
  rawValue: text("rawValue").notNull(),
  normalizedValue: text("normalizedValue").notNull(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

// Synced + normalized metric rows from Windsor.
export const metricData = pgTable("metric_data", {
  id: text("id").primaryKey(),
  clientId: text("clientId").notNull(),
  channel: text("channel").notNull(),
  date: date("date").notNull(),
  dimensionValue: text("dimensionValue"),
  spend: numeric("spend").default("0"),
  impressions: numeric("impressions").default("0"),
  clicks: numeric("clicks").default("0"),
  conversions: numeric("conversions").default("0"),
  revenue: numeric("revenue").default("0"),
  extra: jsonb("extra"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

// Stored AI agent analyses.
export const agentReport = pgTable("agent_report", {
  id: text("id").primaryKey(),
  clientId: text("clientId").notNull(),
  agent: text("agent").notNull(), // 'meta' | 'google' | 'cross' | 'seo' | 'content'
  title: text("title").notNull(),
  content: text("content").notNull(),
  periodStart: date("periodStart"),
  periodEnd: date("periodEnd"),
  scheduled: boolean("scheduled").notNull().default(false),
  createdBy: text("createdBy"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

// Scheduled report configuration.
export const reportSchedule = pgTable("report_schedule", {
  id: text("id").primaryKey(),
  clientId: text("clientId").notNull(),
  agent: text("agent").notNull(),
  frequency: text("frequency").notNull().default("weekly"), // 'daily' | 'weekly' | 'monthly'
  enabled: boolean("enabled").notNull().default(true),
  lastRunAt: timestamp("lastRunAt"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})
