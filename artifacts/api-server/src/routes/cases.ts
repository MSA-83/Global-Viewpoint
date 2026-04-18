import { Router, type IRouter } from "express";
import { db, casesTable, caseNotesTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";

const router: IRouter = Router();

function mapCase(c: any) {
  return {
    ...c,
    createdAt: c.createdAt instanceof Date ? c.createdAt.toISOString() : c.createdAt,
    updatedAt: c.updatedAt instanceof Date ? c.updatedAt.toISOString() : c.updatedAt,
    closedAt: c.closedAt ? (c.closedAt instanceof Date ? c.closedAt.toISOString() : c.closedAt) : null,
    tags: c.tags ?? [],
    linkedThreatIds: c.linkedThreatIds ?? [],
    linkedIncidentIds: c.linkedIncidentIds ?? [],
    linkedAlertIds: c.linkedAlertIds ?? [],
    linkedAssetIds: c.linkedAssetIds ?? [],
  };
}

function mapNote(n: any) {
  return {
    ...n,
    createdAt: n.createdAt instanceof Date ? n.createdAt.toISOString() : n.createdAt,
    updatedAt: n.updatedAt instanceof Date ? n.updatedAt.toISOString() : n.updatedAt,
  };
}

router.get("/cases", async (req, res) => {
  const cases = await db.select().from(casesTable).orderBy(desc(casesTable.createdAt)).limit(100);
  res.json(cases.map(mapCase));
});

router.post("/cases", async (req, res) => {
  const caseNumber = `CASE-${new Date().getFullYear()}-${String(Math.round(Math.random() * 9999)).padStart(4,"0")}`;
  const [newCase] = await db.insert(casesTable).values({ ...req.body, caseNumber, tags: req.body.tags ?? [] }).returning();
  res.status(201).json(mapCase(newCase));
});

router.get("/cases/:id", async (req, res) => {
  const [c] = await db.select().from(casesTable).where(eq(casesTable.id, Number(req.params.id)));
  if (!c) return res.status(404).json({ error: "not_found" });
  const notes = await db.select().from(caseNotesTable).where(eq(caseNotesTable.caseId, c.id)).orderBy(desc(caseNotesTable.createdAt));
  res.json({ ...mapCase(c), notes: notes.map(mapNote) });
});

router.patch("/cases/:id", async (req, res) => {
  const id = Number(req.params.id);
  const updates: any = { ...req.body, updatedAt: new Date() };
  if (req.body.status === "closed") updates.closedAt = new Date();
  const [c] = await db.update(casesTable).set(updates).where(eq(casesTable.id, id)).returning();
  if (!c) return res.status(404).json({ error: "not_found" });
  res.json(mapCase(c));
});

router.delete("/cases/:id", async (req, res) => {
  await db.delete(caseNotesTable).where(eq(caseNotesTable.caseId, Number(req.params.id)));
  await db.delete(casesTable).where(eq(casesTable.id, Number(req.params.id)));
  res.status(204).send();
});

router.get("/cases/:id/notes", async (req, res) => {
  const notes = await db.select().from(caseNotesTable)
    .where(eq(caseNotesTable.caseId, Number(req.params.id)))
    .orderBy(desc(caseNotesTable.createdAt));
  res.json(notes.map(mapNote));
});

router.post("/cases/:id/notes", async (req, res) => {
  const [note] = await db.insert(caseNotesTable).values({
    caseId: Number(req.params.id),
    author: req.body.author || "analyst",
    content: req.body.content,
    noteType: req.body.noteType || "note",
    attachmentUrl: req.body.attachmentUrl,
  }).returning();
  // Update case updatedAt
  await db.update(casesTable).set({ updatedAt: new Date() }).where(eq(casesTable.id, Number(req.params.id)));
  res.status(201).json(mapNote(note));
});

export default router;
