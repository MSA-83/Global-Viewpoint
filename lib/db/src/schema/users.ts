import { pgTable, text, serial, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  displayName: text("display_name").notNull(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().default("viewer").$type<"super_admin" | "admin" | "analyst" | "operator" | "viewer" | "executive">(),
  status: text("status").notNull().default("active").$type<"active" | "suspended" | "pending">(),
  clearanceLevel: text("clearance_level").notNull().default("unclassified").$type<"unclassified" | "confidential" | "secret" | "top_secret">(),
  allowedDomains: text("allowed_domains").array().default([]),
  lastLoginAt: timestamp("last_login_at"),
  sessionToken: text("session_token"),
  sessionExpiresAt: timestamp("session_expires_at"),
  preferences: jsonb("preferences"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const auditLogsTable = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  userId: text("user_id"),
  username: text("username"),
  action: text("action").notNull(),
  resource: text("resource").notNull(),
  resourceId: text("resource_id"),
  details: jsonb("details"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  success: boolean("success").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
export type AuditLog = typeof auditLogsTable.$inferSelect;
