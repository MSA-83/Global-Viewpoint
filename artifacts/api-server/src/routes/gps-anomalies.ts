import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { gpsAnomaliesTable } from "@workspace/db";
import { eq, desc, and } from "drizzle-orm";
import { ListGpsAnomaliesQueryParams } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/gps-anomalies", async (req, res) => {
  const query = ListGpsAnomaliesQueryParams.parse(req.query);
  const conditions = [];
  if (query.type) conditions.push(eq(gpsAnomaliesTable.type, query.type));
  if (query.severity) conditions.push(eq(gpsAnomaliesTable.severity, query.severity));
  if (query.region) conditions.push(eq(gpsAnomaliesTable.region, query.region));
  if (query.active !== undefined) conditions.push(eq(gpsAnomaliesTable.active, query.active));

  const anomalies = await db
    .select()
    .from(gpsAnomaliesTable)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(gpsAnomaliesTable.detectedAt))
    .limit(query.limit ?? 100);

  res.json(anomalies.map(a => ({
    ...a,
    affectedSystems: a.affectedSystems ?? [],
    detectedAt: a.detectedAt.toISOString(),
    lastSeenAt: a.lastSeenAt.toISOString(),
  })));
});

export default router;
