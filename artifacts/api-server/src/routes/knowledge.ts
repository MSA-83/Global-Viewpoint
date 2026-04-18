import { Router, type IRouter } from "express";
import { db, knowledgeNodesTable, knowledgeEdgesTable } from "@workspace/db";
import { eq, or, ilike, desc } from "drizzle-orm";

const router: IRouter = Router();

function toIso(v: any) { return v instanceof Date ? v.toISOString() : v; }

function mapNode(n: any) {
  return { ...n, createdAt: toIso(n.createdAt), updatedAt: toIso(n.updatedAt) };
}

function mapEdge(e: any) {
  return { ...e, createdAt: toIso(e.createdAt), firstSeenAt: toIso(e.firstSeenAt), lastSeenAt: toIso(e.lastSeenAt) };
}

router.get("/knowledge/nodes", async (req, res) => {
  const nodes = await db.select().from(knowledgeNodesTable).orderBy(desc(knowledgeNodesTable.createdAt)).limit(200);
  res.json(nodes.map(mapNode));
});

router.post("/knowledge/nodes", async (req, res) => {
  const [node] = await db.insert(knowledgeNodesTable).values({ ...req.body, tags: req.body.tags ?? [] }).returning();
  res.status(201).json(mapNode(node));
});

router.get("/knowledge/nodes/:id", async (req, res) => {
  const [node] = await db.select().from(knowledgeNodesTable).where(eq(knowledgeNodesTable.id, Number(req.params.id)));
  if (!node) return res.status(404).json({ error: "not_found" });
  // Get connected edges
  const edges = await db.select().from(knowledgeEdgesTable).where(
    or(eq(knowledgeEdgesTable.sourceNodeId, node.id), eq(knowledgeEdgesTable.targetNodeId, node.id))
  );
  res.json({ ...mapNode(node), edges: edges.map(mapEdge) });
});

router.patch("/knowledge/nodes/:id", async (req, res) => {
  const [node] = await db.update(knowledgeNodesTable).set({ ...req.body, updatedAt: new Date() }).where(eq(knowledgeNodesTable.id, Number(req.params.id))).returning();
  if (!node) return res.status(404).json({ error: "not_found" });
  res.json(mapNode(node));
});

router.delete("/knowledge/nodes/:id", async (req, res) => {
  await db.delete(knowledgeNodesTable).where(eq(knowledgeNodesTable.id, Number(req.params.id)));
  res.status(204).send();
});

router.get("/knowledge/edges", async (req, res) => {
  const edges = await db.select().from(knowledgeEdgesTable).limit(500);
  res.json(edges.map(mapEdge));
});

router.post("/knowledge/edges", async (req, res) => {
  const [edge] = await db.insert(knowledgeEdgesTable).values(req.body).returning();
  res.status(201).json(mapEdge(edge));
});

router.delete("/knowledge/edges/:id", async (req, res) => {
  await db.delete(knowledgeEdgesTable).where(eq(knowledgeEdgesTable.id, Number(req.params.id)));
  res.status(204).send();
});

router.get("/knowledge/graph", async (req, res) => {
  const [nodes, edges] = await Promise.all([
    db.select().from(knowledgeNodesTable).limit(200),
    db.select().from(knowledgeEdgesTable).limit(500),
  ]);
  res.json({ nodes: nodes.map(mapNode), edges: edges.map(mapEdge) });
});

export default router;
