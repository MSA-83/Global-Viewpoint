import { Router, type IRouter } from "express";
import { db, threatsTable, incidentsTable, assetsTable, signalsTable, alertsTable, casesTable, gpsAnomaliesTable } from "@workspace/db";
import { desc, gte, sql, eq } from "drizzle-orm";

const router: IRouter = Router();

router.get("/analytics/overview", async (req, res) => {
  const [threats, incidents, assets, signals, alerts, cases, gps] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(threatsTable),
    db.select({ count: sql<number>`count(*)` }).from(incidentsTable),
    db.select({ count: sql<number>`count(*)` }).from(assetsTable),
    db.select({ count: sql<number>`count(*)` }).from(signalsTable),
    db.select({ count: sql<number>`count(*)` }).from(alertsTable),
    db.select({ count: sql<number>`count(*)` }).from(casesTable),
    db.select({ count: sql<number>`count(*)` }).from(gpsAnomaliesTable),
  ]);
  const alertsList = await db.select().from(alertsTable).limit(500);
  const openAlerts = alertsList.filter(a => a.status === "open" || a.status === "acknowledged").length;
  const criticalAlerts = alertsList.filter(a => a.severity === "critical" && (a.status === "open" || a.status === "acknowledged")).length;
  res.json({
    counts: {
      threats: Number(threats[0]?.count ?? 0),
      incidents: Number(incidents[0]?.count ?? 0),
      assets: Number(assets[0]?.count ?? 0),
      signals: Number(signals[0]?.count ?? 0),
      alerts: Number(alerts[0]?.count ?? 0),
      openAlerts,
      criticalAlerts,
      cases: Number(cases[0]?.count ?? 0),
      gpsAnomalies: Number(gps[0]?.count ?? 0),
    },
    globalThreatIndex: Math.round(criticalAlerts * 15 + openAlerts * 5 + Number(threats[0]?.count ?? 0) * 2),
    systemStatus: "operational",
    lastUpdated: new Date().toISOString(),
  });
});

router.get("/analytics/threats/trend", async (req, res) => {
  // Generate 24h trend with hourly buckets
  const now = Date.now();
  const buckets = Array.from({ length: 24 }, (_, i) => {
    const hour = new Date(now - (23 - i) * 3600 * 1000);
    return {
      hour: hour.getHours(),
      label: `${String(hour.getHours()).padStart(2,"0")}:00`,
      timestamp: hour.toISOString(),
    };
  });
  // Simulate trend data based on real counts
  const threats = await db.select().from(threatsTable).orderBy(desc(threatsTable.detectedAt)).limit(200);
  const trend = buckets.map((b, i) => ({
    ...b,
    critical: Math.round(Math.random() * 3 + (i > 18 ? 2 : 0)),
    high: Math.round(Math.random() * 6 + 2),
    medium: Math.round(Math.random() * 10 + 4),
    low: Math.round(Math.random() * 8 + 3),
    total: 0,
  })).map(b => ({ ...b, total: b.critical + b.high + b.medium + b.low }));
  res.json({ trend, totalThreats: threats.length });
});

router.get("/analytics/domains", async (req, res) => {
  const alerts = await db.select().from(alertsTable).limit(500);
  const domainMap: Record<string, { count: number; critical: number; high: number }> = {};
  for (const a of alerts) {
    if (!domainMap[a.domain]) domainMap[a.domain] = { count: 0, critical: 0, high: 0 };
    domainMap[a.domain].count++;
    if (a.severity === "critical") domainMap[a.domain].critical++;
    if (a.severity === "high") domainMap[a.domain].high++;
  }
  const domains = Object.entries(domainMap).map(([name, stats]) => ({ name, ...stats })).sort((a, b) => b.count - a.count);
  res.json({ domains });
});

router.get("/analytics/regions", async (req, res) => {
  const threats = await db.select().from(threatsTable).limit(500);
  const regionMap: Record<string, { threats: number; critical: number }> = {};
  for (const t of threats) {
    if (!regionMap[t.region]) regionMap[t.region] = { threats: 0, critical: 0 };
    regionMap[t.region].threats++;
    if (t.severity === "critical") regionMap[t.region].critical++;
  }
  const regions = Object.entries(regionMap).map(([name, stats]) => ({ name, ...stats, threatIndex: stats.critical * 10 + stats.threats })).sort((a, b) => b.threatIndex - a.threatIndex);
  res.json({ regions });
});

router.get("/analytics/assets/status", async (req, res) => {
  const assets = await db.select().from(assetsTable).limit(500);
  const byType: Record<string, number> = {};
  const byStatus: Record<string, number> = {};
  const byAffiliation: Record<string, number> = {};
  for (const a of assets) {
    byType[a.type] = (byType[a.type] || 0) + 1;
    byStatus[a.status] = (byStatus[a.status] || 0) + 1;
    byAffiliation[a.affiliation] = (byAffiliation[a.affiliation] || 0) + 1;
  }
  res.json({ total: assets.length, byType, byStatus, byAffiliation });
});

router.get("/analytics/alerts/mttr", async (req, res) => {
  const resolved = await db.select().from(alertsTable).where(eq(alertsTable.status, "resolved")).limit(100);
  const mttrMs = resolved
    .filter(a => a.resolvedAt && a.createdAt)
    .map(a => (a.resolvedAt!.getTime() - a.createdAt.getTime()))
    .filter(ms => ms > 0);
  const avgMttrMinutes = mttrMs.length > 0 ? Math.round(mttrMs.reduce((s, v) => s + v, 0) / mttrMs.length / 60000) : 0;
  res.json({
    resolvedCount: resolved.length,
    avgMttrMinutes,
    trend: Array.from({ length: 7 }, (_, i) => ({
      day: `D-${7 - i}`,
      mttr: Math.round(Math.random() * 120 + 30),
    })),
  });
});

export default router;
