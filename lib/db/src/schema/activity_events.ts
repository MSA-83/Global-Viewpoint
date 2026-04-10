import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const activityEventsTable = pgTable("activity_events", {
  id: serial("id").primaryKey(),
  type: text("type").notNull().$type<"threat_detected" | "incident_created" | "asset_updated" | "gps_anomaly" | "signal_intercepted" | "status_changed">(),
  severity: text("severity").notNull().$type<"critical" | "high" | "medium" | "low" | "info">(),
  title: text("title").notNull(),
  description: text("description"),
  region: text("region").notNull(),
  entityId: integer("entity_id"),
  entityType: text("entity_type"),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
});

export const insertActivityEventSchema = createInsertSchema(activityEventsTable).omit({ id: true, timestamp: true });
export type InsertActivityEvent = z.infer<typeof insertActivityEventSchema>;
export type ActivityEvent = typeof activityEventsTable.$inferSelect;
