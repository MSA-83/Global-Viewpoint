import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { signalsTable } from "@workspace/db";
import { eq, desc, and } from "drizzle-orm";
import { ListSignalsQueryParams } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/signals", async (req, res) => {
  const query = ListSignalsQueryParams.parse(req.query);
  const conditions = [];
  if (query.source) conditions.push(eq(signalsTable.source, query.source));
  if (query.confidence) conditions.push(eq(signalsTable.confidence, query.confidence));

  const signals = await db
    .select()
    .from(signalsTable)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(signalsTable.collectedAt))
    .limit(query.limit ?? 50);

  res.json(signals.map(s => ({
    ...s,
    tags: s.tags ?? [],
    collectedAt: s.collectedAt.toISOString(),
  })));
});

export default router;
