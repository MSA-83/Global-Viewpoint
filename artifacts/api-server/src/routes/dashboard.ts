import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  threatsTable,
  incidentsTable,
  gpsAnomaliesTable,
  assetsTable,
  signalsTable,
  activityEventsTable,
} from "@workspace/db";
import { eq, desc, count, and, gte, sql } from "drizzle-orm";
import { GetActivityFeedQueryParams } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/dashboard/summary", async (_req, res) => {
  const now = new Date();
  const ago24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const ago48h = new Date(now.getTime() - 48 * 60 * 60 * 1000);

  const [
    [{ total: totalThreats }],
    [{ total: criticalThreats }],
    [{ total: activeIncidents }],
    [{ total: gpsAnomalies }],
    [{ total: trackedAssets }],
    [{ total: activeSignals }],
    [{ total: threats24h }],
    [{ total: threats48h }],
  ] = await Promise.all([
    db.select({ total: count() }).from(threatsTable).where(eq(threatsTable.status, "active")),
    db.select({ total: count() }).from(threatsTable).where(and(eq(threatsTable.severity, "critical"), eq(threatsTable.status, "active"))),
    db.select({ total: count() }).from(incidentsTable).where(eq(incidentsTable.status, "active")),
    db.select({ total: count() }).from(gpsAnomaliesTable).where(eq(gpsAnomaliesTable.active, true)),
    db.select({ total: count() }).from(assetsTable).where(eq(assetsTable.status, "active")),
    db.select({ total: count() }).from(signalsTable),
    db.select({ total: count() }).from(threatsTable).where(gte(threatsTable.detectedAt, ago24h)),
    db.select({ total: count() }).from(threatsTable).where(and(gte(threatsTable.detectedAt, ago48h), sql`${threatsTable.detectedAt} < ${ago24h}`)),
  ]);

  res.json({
    totalThreats,
    criticalThreats,
    activeIncidents,
    gpsAnomalies,
    trackedAssets,
    activeSignals,
    threatDelta24h: (threats24h as number) - (threats48h as number),
    systemStatus: criticalThreats > 5 ? "critical" : (totalThreats > 20 ? "degraded" : "nominal"),
    lastUpdated: new Date().toISOString(),
  });
});

router.get("/dashboard/threat-trend", async (_req, res) => {
  const now = new Date();
  const points = [];

  for (let h = 23; h >= 0; h--) {
    const hourStart = new Date(now.getTime() - (h + 1) * 60 * 60 * 1000);
    const hourEnd = new Date(now.getTime() - h * 60 * 60 * 1000);
    const label = `${hourEnd.getHours().toString().padStart(2, "0")}:00`;

    const hourThreats = await db
      .select({ severity: threatsTable.severity, c: count() })
      .from(threatsTable)
      .where(and(gte(threatsTable.detectedAt, hourStart), sql`${threatsTable.detectedAt} < ${hourEnd}`))
      .groupBy(threatsTable.severity);

    const bySev: Record<string, number> = { critical: 0, high: 0, medium: 0, low: 0 };
    for (const row of hourThreats) {
      bySev[row.severity] = Number(row.c);
    }

    points.push({
      hour: label,
      critical: bySev.critical,
      high: bySev.high,
      medium: bySev.medium,
      low: bySev.low,
      total: bySev.critical + bySev.high + bySev.medium + bySev.low,
    });
  }

  res.json(points);
});

router.get("/dashboard/regional-breakdown", async (_req, res) => {
  const [threatsByRegion, incidentsByRegion, gpsByRegion] = await Promise.all([
    db.select({ region: threatsTable.region, c: count() }).from(threatsTable).groupBy(threatsTable.region),
    db.select({ region: incidentsTable.region, c: count() }).from(incidentsTable).groupBy(incidentsTable.region),
    db.select({ region: gpsAnomaliesTable.region, c: count() }).from(gpsAnomaliesTable).groupBy(gpsAnomaliesTable.region),
  ]);

  const regions = new Set([
    ...threatsByRegion.map(r => r.region),
    ...incidentsByRegion.map(r => r.region),
    ...gpsByRegion.map(r => r.region),
  ]);

  const breakdown = Array.from(regions).map(region => {
    const threatCount = Number(threatsByRegion.find(r => r.region === region)?.c ?? 0);
    const incidentCount = Number(incidentsByRegion.find(r => r.region === region)?.c ?? 0);
    const gpsAnomalyCount = Number(gpsByRegion.find(r => r.region === region)?.c ?? 0);
    const total = threatCount + incidentCount * 2 + gpsAnomalyCount;
    const riskLevel = total >= 10 ? "critical" : total >= 6 ? "high" : total >= 3 ? "medium" : total >= 1 ? "low" : "minimal";
    return { region, threatCount, incidentCount, gpsAnomalyCount, riskLevel };
  });

  breakdown.sort((a, b) => (b.threatCount + b.incidentCount) - (a.threatCount + a.incidentCount));
  res.json(breakdown.slice(0, 10));
});

router.get("/dashboard/activity-feed", async (req, res) => {
  const query = GetActivityFeedQueryParams.parse(req.query);
  const events = await db
    .select()
    .from(activityEventsTable)
    .orderBy(desc(activityEventsTable.timestamp))
    .limit(query.limit ?? 20);

  res.json(events.map(e => ({
    ...e,
    timestamp: e.timestamp.toISOString(),
  })));
});

router.get("/dashboard/gps-stats", async (_req, res) => {
  const [jammingSites, spoofingSites, byRegion] = await Promise.all([
    db.select({ c: count() }).from(gpsAnomaliesTable).where(and(eq(gpsAnomaliesTable.type, "jamming"), eq(gpsAnomaliesTable.active, true))),
    db.select({ c: count() }).from(gpsAnomaliesTable).where(and(eq(gpsAnomaliesTable.type, "spoofing"), eq(gpsAnomaliesTable.active, true))),
    db.select({ region: gpsAnomaliesTable.region, severity: gpsAnomaliesTable.severity, c: count() })
      .from(gpsAnomaliesTable)
      .where(eq(gpsAnomaliesTable.active, true))
      .groupBy(gpsAnomaliesTable.region, gpsAnomaliesTable.severity),
  ]);

  const hotspotMap = new Map<string, { count: number; severity: string }>();
  for (const row of byRegion) {
    const existing = hotspotMap.get(row.region);
    const sevOrder = ["critical", "high", "medium", "low"];
    if (!existing || sevOrder.indexOf(row.severity) < sevOrder.indexOf(existing.severity)) {
      hotspotMap.set(row.region, { count: Number(row.c), severity: row.severity });
    } else if (existing) {
      hotspotMap.set(row.region, { ...existing, count: existing.count + Number(row.c) });
    }
  }

  const hotspots = Array.from(hotspotMap.entries())
    .map(([region, { count, severity }]) => ({ region, count, severity }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const activeJammingSites = Number(jammingSites[0]?.c ?? 0);
  const activeSpoofingSites = Number(spoofingSites[0]?.c ?? 0);
  const totalActive = activeJammingSites + activeSpoofingSites;

  res.json({
    activeJammingSites,
    activeSpoofingSites,
    affectedAircraftCount: Math.floor(totalActive * 3.7),
    affectedVesselCount: Math.floor(totalActive * 2.1),
    totalAffectedArea: totalActive * 12500,
    hotspots,
    trend24h: totalActive > 8 ? "increasing" : totalActive > 3 ? "stable" : "decreasing",
  });
});

export default router;
