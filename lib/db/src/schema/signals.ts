import { pgTable, text, serial, real, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const signalsTable = pgTable("signals", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  summary: text("summary"),
  source: text("source").notNull().$type<"satellite" | "social" | "radio" | "cyber" | "humint">(),
  confidence: text("confidence").notNull().$type<"confirmed" | "probable" | "possible" | "unconfirmed">(),
  region: text("region").notNull(),
  country: text("country"),
  latitude: real("latitude"),
  longitude: real("longitude"),
  threatLevel: text("threat_level").notNull().default("none").$type<"critical" | "high" | "medium" | "low" | "none">(),
  tags: text("tags").array().default([]),
  rawData: text("raw_data"),
  collectedAt: timestamp("collected_at").notNull().defaultNow(),
});

export const insertSignalSchema = createInsertSchema(signalsTable).omit({ id: true, collectedAt: true });
export type InsertSignal = z.infer<typeof insertSignalSchema>;
export type Signal = typeof signalsTable.$inferSelect;
