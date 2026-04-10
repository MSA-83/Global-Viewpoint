import { pgTable, text, serial, real, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const assetsTable = pgTable("assets", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  designation: text("designation"),
  type: text("type").notNull().$type<"vessel" | "aircraft" | "vehicle" | "personnel" | "facility" | "satellite">(),
  status: text("status").notNull().default("active").$type<"active" | "inactive" | "unknown" | "compromised">(),
  affiliation: text("affiliation").notNull().default("unknown").$type<"friendly" | "neutral" | "hostile" | "unknown">(),
  country: text("country"),
  latitude: real("latitude").notNull(),
  longitude: real("longitude").notNull(),
  altitude: real("altitude"),
  speed: real("speed"),
  heading: real("heading"),
  trackId: text("track_id"),
  lastPositionAt: timestamp("last_position_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertAssetSchema = createInsertSchema(assetsTable).omit({ id: true, lastPositionAt: true, updatedAt: true });
export type InsertAsset = z.infer<typeof insertAssetSchema>;
export type Asset = typeof assetsTable.$inferSelect;
