import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { threatsTable } from "@workspace/db";
import { eq, desc, and } from "drizzle-orm";
import {
  CreateThreatBody,
  UpdateThreatBody,
  GetThreatParams,
  UpdateThreatParams,
  DeleteThreatParams,
  ListThreatsQueryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/threats", async (req, res) => {
  const query = ListThreatsQueryParams.parse(req.query);
  const conditions = [];
  if (query.severity) conditions.push(eq(threatsTable.severity, query.severity));
  if (query.category) conditions.push(eq(threatsTable.category, query.category as any));
  if (query.region) conditions.push(eq(threatsTable.region, query.region));

  const threats = await db
    .select()
    .from(threatsTable)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(threatsTable.detectedAt))
    .limit(query.limit ?? 50);

  res.json(threats.map(t => ({
    ...t,
    tags: t.tags ?? [],
    detectedAt: t.detectedAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  })));
});

router.post("/threats", async (req, res) => {
  const body = CreateThreatBody.parse(req.body);
  const [threat] = await db
    .insert(threatsTable)
    .values({
      ...body,
      status: "active",
      tags: body.tags ?? [],
    })
    .returning();
  res.status(201).json({
    ...threat,
    tags: threat.tags ?? [],
    detectedAt: threat.detectedAt.toISOString(),
    updatedAt: threat.updatedAt.toISOString(),
  });
});

router.get("/threats/:id", async (req, res) => {
  const { id } = GetThreatParams.parse({ id: Number(req.params.id) });
  const [threat] = await db.select().from(threatsTable).where(eq(threatsTable.id, id));
  if (!threat) return res.status(404).json({ error: "not_found", message: "Threat not found" });
  res.json({
    ...threat,
    tags: threat.tags ?? [],
    detectedAt: threat.detectedAt.toISOString(),
    updatedAt: threat.updatedAt.toISOString(),
  });
});

router.patch("/threats/:id", async (req, res) => {
  const { id } = UpdateThreatParams.parse({ id: Number(req.params.id) });
  const body = UpdateThreatBody.parse(req.body);
  const [threat] = await db
    .update(threatsTable)
    .set({ ...body, updatedAt: new Date() })
    .where(eq(threatsTable.id, id))
    .returning();
  if (!threat) return res.status(404).json({ error: "not_found", message: "Threat not found" });
  res.json({
    ...threat,
    tags: threat.tags ?? [],
    detectedAt: threat.detectedAt.toISOString(),
    updatedAt: threat.updatedAt.toISOString(),
  });
});

router.delete("/threats/:id", async (req, res) => {
  const { id } = DeleteThreatParams.parse({ id: Number(req.params.id) });
  await db.delete(threatsTable).where(eq(threatsTable.id, id));
  res.status(204).send();
});

export default router;
