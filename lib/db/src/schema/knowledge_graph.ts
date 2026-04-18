import { pgTable, text, serial, integer, real, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const knowledgeNodesTable = pgTable("knowledge_nodes", {
  id: serial("id").primaryKey(),
  nodeType: text("node_type").notNull().$type<"person" | "organization" | "vessel" | "aircraft" | "facility" | "event" | "location" | "network" | "country" | "threat_actor">(),
  label: text("label").notNull(),
  description: text("description"),
  identifier: text("identifier"),
  country: text("country"),
  latitude: real("latitude"),
  longitude: real("longitude"),
  threatLevel: text("threat_level").$type<"critical" | "high" | "medium" | "low" | "none">(),
  sanctioned: text("sanctioned"),
  metadata: jsonb("metadata"),
  tags: text("tags").array().default([]),
  sourceRef: text("source_ref"),
  confidence: text("confidence").notNull().default("probable").$type<"confirmed" | "probable" | "possible" | "unconfirmed">(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const knowledgeEdgesTable = pgTable("knowledge_edges", {
  id: serial("id").primaryKey(),
  sourceNodeId: integer("source_node_id").notNull(),
  targetNodeId: integer("target_node_id").notNull(),
  edgeType: text("edge_type").notNull().$type<"owns" | "visited" | "linked_to" | "transmitted_to" | "observed_near" | "sanctioned_by" | "affiliated_with" | "operated_by" | "located_at" | "member_of">(),
  label: text("label"),
  strength: real("strength").notNull().default(1.0),
  bidirectional: text("bidirectional").default("false"),
  metadata: jsonb("metadata"),
  firstSeenAt: timestamp("first_seen_at").notNull().defaultNow(),
  lastSeenAt: timestamp("last_seen_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertKnowledgeNodeSchema = createInsertSchema(knowledgeNodesTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertKnowledgeEdgeSchema = createInsertSchema(knowledgeEdgesTable).omit({ id: true, createdAt: true });
export type InsertKnowledgeNode = z.infer<typeof insertKnowledgeNodeSchema>;
export type InsertKnowledgeEdge = z.infer<typeof insertKnowledgeEdgeSchema>;
export type KnowledgeNode = typeof knowledgeNodesTable.$inferSelect;
export type KnowledgeEdge = typeof knowledgeEdgesTable.$inferSelect;
