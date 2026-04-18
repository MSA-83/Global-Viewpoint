import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const alertsTable = pgTable("alerts", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  severity: text("severity").notNull().$type<"critical" | "high" | "medium" | "low">(),
  domain: text("domain").notNull().$type<"aviation" | "maritime" | "orbital" | "seismic" | "conflict" | "weather" | "cyber" | "nuclear" | "sigint" | "infrastructure" | "energy" | "logistics" | "border" | "telecom" | "public_safety">(),
  status: text("status").notNull().default("open").$type<"open" | "acknowledged" | "assigned" | "suppressed" | "resolved" | "escalated">(),
  sourceType: text("source_type").$type<"threat" | "incident" | "asset" | "signal" | "gps" | "system" | "manual">(),
  sourceId: integer("source_id"),
  region: text("region"),
  country: text("country"),
  latitude: text("latitude"),
  longitude: text("longitude"),
  assignedTo: text("assigned_to"),
  acknowledgedAt: timestamp("acknowledged_at"),
  resolvedAt: timestamp("resolved_at"),
  suppressedUntil: timestamp("suppressed_until"),
  escalatedAt: timestamp("escalated_at"),
  slaDeadline: timestamp("sla_deadline"),
  tags: text("tags").array().default([]),
  metadata: jsonb("metadata"),
  dedupKey: text("dedup_key"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertAlertSchema = createInsertSchema(alertsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertAlert = z.infer<typeof insertAlertSchema>;
export type Alert = typeof alertsTable.$inferSelect;
