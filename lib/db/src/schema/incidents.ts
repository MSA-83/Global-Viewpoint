import { pgTable, text, serial, integer, real, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const incidentsTable = pgTable("incidents", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  type: text("type").notNull().$type<"armed_conflict" | "cyber_attack" | "natural_disaster" | "civil_unrest" | "terrorism" | "gps_disruption" | "maritime" | "aviation">(),
  status: text("status").notNull().default("active").$type<"active" | "monitoring" | "resolved" | "escalated">(),
  severity: text("severity").notNull().$type<"critical" | "high" | "medium" | "low">(),
  region: text("region").notNull(),
  country: text("country"),
  latitude: real("latitude").notNull(),
  longitude: real("longitude").notNull(),
  threatIds: integer("threat_ids").array().default([]),
  casualties: integer("casualties"),
  affectedArea: real("affected_area"),
  reportedBy: text("reported_by"),
  startedAt: timestamp("started_at").notNull().defaultNow(),
  resolvedAt: timestamp("resolved_at"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertIncidentSchema = createInsertSchema(incidentsTable).omit({ id: true, startedAt: true, updatedAt: true });
export type InsertIncident = z.infer<typeof insertIncidentSchema>;
export type Incident = typeof incidentsTable.$inferSelect;
