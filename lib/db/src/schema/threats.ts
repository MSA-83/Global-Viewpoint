import { pgTable, text, serial, integer, real, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const threatsTable = pgTable("threats", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  severity: text("severity").notNull().$type<"critical" | "high" | "medium" | "low">(),
  category: text("category").notNull().$type<"military" | "cyber" | "political" | "natural" | "economic" | "terrorism">(),
  status: text("status").notNull().default("active").$type<"active" | "monitoring" | "resolved" | "escalated">(),
  region: text("region").notNull(),
  country: text("country"),
  latitude: real("latitude").notNull(),
  longitude: real("longitude").notNull(),
  confidence: integer("confidence").notNull().default(70),
  source: text("source"),
  tags: text("tags").array().default([]),
  detectedAt: timestamp("detected_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertThreatSchema = createInsertSchema(threatsTable).omit({ id: true, detectedAt: true, updatedAt: true });
export type InsertThreat = z.infer<typeof insertThreatSchema>;
export type Threat = typeof threatsTable.$inferSelect;
