import { pgTable, text, serial, timestamp, jsonb, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const workspacesTable = pgTable("workspaces", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  code: text("code").notNull().unique(),
  description: text("description"),
  type: text("type").notNull().default("general").$type<"general" | "operation" | "exercise" | "investigation" | "monitoring">(),
  status: text("status").notNull().default("active").$type<"active" | "standby" | "closed" | "archived">(),
  classification: text("classification").notNull().default("unclassified").$type<"unclassified" | "confidential" | "secret" | "top_secret">(),
  leadOperator: text("lead_operator"),
  members: text("members").array().default([]),
  linkedCaseIds: text("linked_case_ids").array().default([]),
  domains: text("domains").array().default([]),
  regions: text("regions").array().default([]),
  isDefault: boolean("is_default").notNull().default(false),
  config: jsonb("config"),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertWorkspaceSchema = createInsertSchema(workspacesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertWorkspace = z.infer<typeof insertWorkspaceSchema>;
export type Workspace = typeof workspacesTable.$inferSelect;
