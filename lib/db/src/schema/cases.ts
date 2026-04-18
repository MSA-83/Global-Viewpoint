import { pgTable, text, serial, integer, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const casesTable = pgTable("cases", {
  id: serial("id").primaryKey(),
  caseNumber: text("case_number").notNull().unique(),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status").notNull().default("open").$type<"open" | "active" | "pending" | "closed" | "archived">(),
  priority: text("priority").notNull().default("medium").$type<"critical" | "high" | "medium" | "low">(),
  classification: text("classification").notNull().default("unclassified").$type<"unclassified" | "confidential" | "secret" | "top_secret">(),
  leadAnalyst: text("lead_analyst"),
  assignedTeam: text("assigned_team"),
  domain: text("domain"),
  region: text("region"),
  linkedThreatIds: integer("linked_threat_ids").array().default([]),
  linkedIncidentIds: integer("linked_incident_ids").array().default([]),
  linkedAlertIds: integer("linked_alert_ids").array().default([]),
  linkedAssetIds: integer("linked_asset_ids").array().default([]),
  tags: text("tags").array().default([]),
  metadata: jsonb("metadata"),
  closedAt: timestamp("closed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const caseNotesTable = pgTable("case_notes", {
  id: serial("id").primaryKey(),
  caseId: integer("case_id").notNull().references(() => casesTable.id),
  author: text("author").notNull(),
  content: text("content").notNull(),
  noteType: text("note_type").notNull().default("note").$type<"note" | "analysis" | "evidence" | "action" | "decision">(),
  attachmentUrl: text("attachment_url"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertCaseSchema = createInsertSchema(casesTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertCaseNoteSchema = createInsertSchema(caseNotesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCase = z.infer<typeof insertCaseSchema>;
export type InsertCaseNote = z.infer<typeof insertCaseNoteSchema>;
export type Case = typeof casesTable.$inferSelect;
export type CaseNote = typeof caseNotesTable.$inferSelect;
