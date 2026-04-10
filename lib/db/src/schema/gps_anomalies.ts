import { pgTable, text, serial, real, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const gpsAnomaliesTable = pgTable("gps_anomalies", {
  id: serial("id").primaryKey(),
  type: text("type").notNull().$type<"jamming" | "spoofing" | "interference" | "outage">(),
  severity: text("severity").notNull().$type<"critical" | "high" | "medium" | "low">(),
  region: text("region").notNull(),
  country: text("country"),
  latitude: real("latitude").notNull(),
  longitude: real("longitude").notNull(),
  radius: real("radius").notNull(),
  affectedSystems: text("affected_systems").array().default([]),
  signalStrength: real("signal_strength"),
  frequency: real("frequency"),
  source: text("source"),
  active: boolean("active").notNull().default(true),
  detectedAt: timestamp("detected_at").notNull().defaultNow(),
  lastSeenAt: timestamp("last_seen_at").notNull().defaultNow(),
});

export const insertGpsAnomalySchema = createInsertSchema(gpsAnomaliesTable).omit({ id: true, detectedAt: true, lastSeenAt: true });
export type InsertGpsAnomaly = z.infer<typeof insertGpsAnomalySchema>;
export type GpsAnomaly = typeof gpsAnomaliesTable.$inferSelect;
