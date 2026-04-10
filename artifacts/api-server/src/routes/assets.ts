import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { assetsTable } from "@workspace/db";
import { eq, desc, and } from "drizzle-orm";
import {
  CreateAssetBody,
  UpdateAssetBody,
  GetAssetParams,
  UpdateAssetParams,
  ListAssetsQueryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/assets", async (req, res) => {
  const query = ListAssetsQueryParams.parse(req.query);
  const conditions = [];
  if (query.type) conditions.push(eq(assetsTable.type, query.type));
  if (query.status) conditions.push(eq(assetsTable.status, query.status));

  const assets = await db
    .select()
    .from(assetsTable)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(assetsTable.updatedAt))
    .limit(query.limit ?? 100);

  res.json(assets.map(a => ({
    ...a,
    lastPositionAt: a.lastPositionAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
  })));
});

router.post("/assets", async (req, res) => {
  const body = CreateAssetBody.parse(req.body);
  const [asset] = await db.insert(assetsTable).values({ ...body, status: "active" }).returning();
  res.status(201).json({
    ...asset,
    lastPositionAt: asset.lastPositionAt.toISOString(),
    updatedAt: asset.updatedAt.toISOString(),
  });
});

router.get("/assets/:id", async (req, res) => {
  const { id } = GetAssetParams.parse({ id: Number(req.params.id) });
  const [asset] = await db.select().from(assetsTable).where(eq(assetsTable.id, id));
  if (!asset) return res.status(404).json({ error: "not_found", message: "Asset not found" });
  res.json({
    ...asset,
    lastPositionAt: asset.lastPositionAt.toISOString(),
    updatedAt: asset.updatedAt.toISOString(),
  });
});

router.patch("/assets/:id", async (req, res) => {
  const { id } = UpdateAssetParams.parse({ id: Number(req.params.id) });
  const body = UpdateAssetBody.parse(req.body);
  const [asset] = await db
    .update(assetsTable)
    .set({ ...body, updatedAt: new Date(), lastPositionAt: new Date() })
    .where(eq(assetsTable.id, id))
    .returning();
  if (!asset) return res.status(404).json({ error: "not_found", message: "Asset not found" });
  res.json({
    ...asset,
    lastPositionAt: asset.lastPositionAt.toISOString(),
    updatedAt: asset.updatedAt.toISOString(),
  });
});

export default router;
