import { pgTable, text, timestamp, integer, uuid, boolean } from "drizzle-orm/pg-core";

// API consumers (linked to Clerk users)
export const consumers = pgTable("consumers", {
  id: uuid("id").defaultRandom().primaryKey(),
  clerkUserId: text("clerk_user_id").notNull().unique(),
  email: text("email").notNull(),
  appName: text("app_name").notNull(),
  clientId: text("client_id").notNull().unique(), // alk_cid_xxx
  clientSecretHash: text("client_secret_hash").notNull(), // bcrypt hash
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Usage audit log
export const usageLogs = pgTable("usage_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  consumerId: uuid("consumer_id").references(() => consumers.id).notNull(),
  endpoint: text("endpoint").notNull(),
  method: text("method").notNull(),
  statusCode: integer("status_code").notNull(),
  requestId: text("request_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
