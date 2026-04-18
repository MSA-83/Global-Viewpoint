import { Router, type IRouter } from "express";
import { db, alertsTable } from "@workspace/db";
import { eq, desc, and, gte, lte, ilike } from "drizzle-orm";
import { z } from "zod";
import { broadcast } from "../lib/ws-gateway";

const router: IRouter = Router();

const ListAlertsQuery = z.object({
  severity: z.string().optional(),
  status: z.string().optional(),
  domain: z.string().optional(),
  region: z.string().optional(),
  limit: z.coerce.number().default(100),
});

function mapAlert(a: any) {
  return {
    ...a,
    createdAt: a.createdAt instanceof Date ? a.createdAt.toISOString() : a.createdAt,
    updatedAt: a.updatedAt instanceof Date ? a.updatedAt.toISOString() : a.updatedAt,
    acknowledgedAt: a.acknowledgedAt ? (a.acknowledgedAt instanceof Date ? a.acknowledgedAt.toISOString() : a.acknowledgedAt) : null,
    resolvedAt: a.resolvedAt ? (a.resolvedAt instanceof Date ? a.resolvedAt.toISOString() : a.resolvedAt) : null,
    escalatedAt: a.escalatedAt ? (a.escalatedAt instanceof Date ? a.escalatedAt.toISOString() : a.escalatedAt) : null,
    suppressedUntil: a.suppressedUntil ? (a.suppressedUntil instanceof Date ? a.suppressedUntil.toISOString() : a.suppressedUntil) : null,
    slaDeadline: a.slaDeadline ? (a.slaDeadline instanceof Date ? a.slaDeadline.toISOString() : a.slaDeadline) : null,
    tags: a.tags ?? [],
  };
}

router.get("/alerts", async (req, res) => {
  const query = ListAlertsQuery.parse(req.query);
  const conditions: any[] = [];
  if (query.severity) conditions.push(eq(alertsTable.severity, query.severity as any));
  if (query.status) conditions.push(eq(alertsTable.status, query.status as any));
  if (query.domain) conditions.push(eq(alertsTable.domain, query.domain as any));
  if (query.region) conditions.push(eq(alertsTable.region, query.region));
  const alerts = await db.select().from(alertsTable)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(alertsTable.createdAt)).limit(query.limit);
  res.json(alerts.map(mapAlert));
});

router.post("/alerts", async (req, res) => {
  const [alert] = await db.insert(alertsTable).values({ ...req.body, tags: req.body.tags ?? [] }).returning();
  broadcast({ type: "alert_created", data: mapAlert(alert) });
  res.status(201).json(mapAlert(alert));
});

router.get("/alerts/:id", async (req, res) => {
  const [alert] = await db.select().from(alertsTable).where(eq(alertsTable.id, Number(req.params.id)));
  if (!alert) return res.status(404).json({ error: "not_found" });
  res.json(mapAlert(alert));
});

router.patch("/alerts/:id", async (req, res) => {
  const id = Number(req.params.id);
  const updates: any = { ...req.body, updatedAt: new Date() };
  if (req.body.status === "acknowledged" && !req.body.acknowledgedAt) updates.acknowledgedAt = new Date();
  if (req.body.status === "resolved" && !req.body.resolvedAt) updates.resolvedAt = new Date();
  if (req.body.status === "escalated" && !req.body.escalatedAt) updates.escalatedAt = new Date();
  const [alert] = await db.update(alertsTable).set(updates).where(eq(alertsTable.id, id)).returning();
  if (!alert) return res.status(404).json({ error: "not_found" });
  broadcast({ type: "alert_updated", data: mapAlert(alert) });
  res.json(mapAlert(alert));
});

router.delete("/alerts/:id", async (req, res) => {
  await db.delete(alertsTable).where(eq(alertsTable.id, Number(req.params.id)));
  res.status(204).send();
});

router.get("/alerts/stats/summary", async (req, res) => {
  const all = await db.select().from(alertsTable).orderBy(desc(alertsTable.createdAt)).limit(500);
  const counts = { critical: 0, high: 0, medium: 0, low: 0 };
  const statusCounts = { open: 0, acknowledged: 0, assigned: 0, suppressed: 0, resolved: 0, escalated: 0 };
  const domainCounts: Record<string, number> = {};
  for (const a of all) {
    if (counts[a.severity as keyof typeof counts] !== undefined) counts[a.severity as keyof typeof counts]++;
    if (statusCounts[a.status as keyof typeof statusCounts] !== undefined) statusCounts[a.status as keyof typeof statusCounts]++;
    domainCounts[a.domain] = (domainCounts[a.domain] || 0) + 1;
  }
  res.json({ total: all.length, bySeverity: counts, byStatus: statusCounts, byDomain: domainCounts });
});

export default router;
