import { Router, type IRouter } from "express";
import { db, threatsTable, incidentsTable, assetsTable, signalsTable, gpsAnomaliesTable, alertsTable, casesTable, knowledgeNodesTable } from "@workspace/db";
import { ilike, or, desc, eq } from "drizzle-orm";
import { z } from "zod";

const router: IRouter = Router();

const SearchQuery = z.object({
  q: z.string().min(1),
  domains: z.string().optional(),
  limit: z.coerce.number().default(10),
});

function toIso(v: any) { return v instanceof Date ? v.toISOString() : v; }

router.get("/search", async (req, res) => {
  const { q, domains, limit } = SearchQuery.parse(req.query);
  const like = `%${q}%`;
  const perType = Math.max(3, Math.floor(limit / 6));

  const [threats, incidents, assets, signals, alerts, cases, nodes] = await Promise.all([
    db.select().from(threatsTable).where(or(ilike(threatsTable.title, like), ilike(threatsTable.region, like), ilike(threatsTable.category, like))).limit(perType),
    db.select().from(incidentsTable).where(or(ilike(incidentsTable.title, like), ilike(incidentsTable.region, like))).limit(perType),
    db.select().from(assetsTable).where(or(ilike(assetsTable.name, like), ilike(assetsTable.country, like), ilike(assetsTable.trackId, like))).limit(perType),
    db.select().from(signalsTable).where(or(ilike(signalsTable.title, like), ilike(signalsTable.region, like))).limit(perType),
    db.select().from(alertsTable).where(or(ilike(alertsTable.title, like), ilike(alertsTable.region, like))).limit(perType),
    db.select().from(casesTable).where(or(ilike(casesTable.title, like), ilike(casesTable.caseNumber, like))).limit(perType),
    db.select().from(knowledgeNodesTable).where(or(ilike(knowledgeNodesTable.label, like), ilike(knowledgeNodesTable.country, like))).limit(perType),
  ]);

  res.json({
    query: q,
    total: threats.length + incidents.length + assets.length + signals.length + alerts.length + cases.length + nodes.length,
    results: {
      threats: threats.map(t => ({ ...t, _type: "threat", detectedAt: toIso(t.detectedAt), updatedAt: toIso(t.updatedAt) })),
      incidents: incidents.map(i => ({ ...i, _type: "incident", startedAt: toIso(i.startedAt), updatedAt: toIso(i.updatedAt) })),
      assets: assets.map(a => ({ ...a, _type: "asset", lastPositionAt: toIso(a.lastPositionAt), updatedAt: toIso(a.updatedAt) })),
      signals: signals.map(s => ({ ...s, _type: "signal", collectedAt: toIso(s.collectedAt) })),
      alerts: alerts.map(a => ({ ...a, _type: "alert", createdAt: toIso(a.createdAt), updatedAt: toIso(a.updatedAt) })),
      cases: cases.map(c => ({ ...c, _type: "case", createdAt: toIso(c.createdAt), updatedAt: toIso(c.updatedAt) })),
      knowledge: nodes.map(n => ({ ...n, _type: "knowledge", createdAt: toIso(n.createdAt), updatedAt: toIso(n.updatedAt) })),
    },
  });
});

export default router;
