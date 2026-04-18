import { Router, type IRouter } from "express";
import { db, workspacesTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router: IRouter = Router();

function mapWs(w: any) {
  return {
    ...w,
    createdAt: w.createdAt instanceof Date ? w.createdAt.toISOString() : w.createdAt,
    updatedAt: w.updatedAt instanceof Date ? w.updatedAt.toISOString() : w.updatedAt,
    expiresAt: w.expiresAt ? (w.expiresAt instanceof Date ? w.expiresAt.toISOString() : w.expiresAt) : null,
    members: w.members ?? [],
    domains: w.domains ?? [],
    regions: w.regions ?? [],
    linkedCaseIds: w.linkedCaseIds ?? [],
  };
}

router.get("/workspaces", async (req, res) => {
  const workspaces = await db.select().from(workspacesTable).orderBy(desc(workspacesTable.createdAt));
  res.json(workspaces.map(mapWs));
});

router.post("/workspaces", async (req, res) => {
  const [ws] = await db.insert(workspacesTable).values({ ...req.body, members: req.body.members ?? [], domains: req.body.domains ?? [] }).returning();
  res.status(201).json(mapWs(ws));
});

router.get("/workspaces/:id", async (req, res) => {
  const [ws] = await db.select().from(workspacesTable).where(eq(workspacesTable.id, Number(req.params.id)));
  if (!ws) return res.status(404).json({ error: "not_found" });
  res.json(mapWs(ws));
});

router.patch("/workspaces/:id", async (req, res) => {
  const [ws] = await db.update(workspacesTable).set({ ...req.body, updatedAt: new Date() }).where(eq(workspacesTable.id, Number(req.params.id))).returning();
  if (!ws) return res.status(404).json({ error: "not_found" });
  res.json(mapWs(ws));
});

router.delete("/workspaces/:id", async (req, res) => {
  await db.delete(workspacesTable).where(eq(workspacesTable.id, Number(req.params.id)));
  res.status(204).send();
});

export default router;
