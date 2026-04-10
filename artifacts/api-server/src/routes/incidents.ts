import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { incidentsTable } from "@workspace/db";
import { eq, desc, and } from "drizzle-orm";
import {
  CreateIncidentBody,
  UpdateIncidentBody,
  GetIncidentParams,
  UpdateIncidentParams,
  ListIncidentsQueryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/incidents", async (req, res) => {
  const query = ListIncidentsQueryParams.parse(req.query);
  const conditions = [];
  if (query.status) conditions.push(eq(incidentsTable.status, query.status));
  if (query.type) conditions.push(eq(incidentsTable.type, query.type as any));

  const incidents = await db
    .select()
    .from(incidentsTable)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(incidentsTable.startedAt))
    .limit(query.limit ?? 50);

  res.json(incidents.map(i => ({
    ...i,
    threatIds: i.threatIds ?? [],
    startedAt: i.startedAt.toISOString(),
    updatedAt: i.updatedAt.toISOString(),
    resolvedAt: i.resolvedAt?.toISOString() ?? null,
  })));
});

router.post("/incidents", async (req, res) => {
  const body = CreateIncidentBody.parse(req.body);
  const [incident] = await db
    .insert(incidentsTable)
    .values({ ...body, status: "active" })
    .returning();
  res.status(201).json({
    ...incident,
    threatIds: incident.threatIds ?? [],
    startedAt: incident.startedAt.toISOString(),
    updatedAt: incident.updatedAt.toISOString(),
    resolvedAt: incident.resolvedAt?.toISOString() ?? null,
  });
});

router.get("/incidents/:id", async (req, res) => {
  const { id } = GetIncidentParams.parse({ id: Number(req.params.id) });
  const [incident] = await db.select().from(incidentsTable).where(eq(incidentsTable.id, id));
  if (!incident) return res.status(404).json({ error: "not_found", message: "Incident not found" });
  res.json({
    ...incident,
    threatIds: incident.threatIds ?? [],
    startedAt: incident.startedAt.toISOString(),
    updatedAt: incident.updatedAt.toISOString(),
    resolvedAt: incident.resolvedAt?.toISOString() ?? null,
  });
});

router.patch("/incidents/:id", async (req, res) => {
  const { id } = UpdateIncidentParams.parse({ id: Number(req.params.id) });
  const body = UpdateIncidentBody.parse(req.body);
  const updateData: any = { ...body, updatedAt: new Date() };
  if (body.resolvedAt) updateData.resolvedAt = new Date(body.resolvedAt);
  const [incident] = await db
    .update(incidentsTable)
    .set(updateData)
    .where(eq(incidentsTable.id, id))
    .returning();
  if (!incident) return res.status(404).json({ error: "not_found", message: "Incident not found" });
  res.json({
    ...incident,
    threatIds: incident.threatIds ?? [],
    startedAt: incident.startedAt.toISOString(),
    updatedAt: incident.updatedAt.toISOString(),
    resolvedAt: incident.resolvedAt?.toISOString() ?? null,
  });
});

export default router;
