import { Router, type IRouter } from "express";
import { db, usersTable, auditLogsTable, workspacesTable } from "@workspace/db";
import { eq, desc, sql } from "drizzle-orm";
import { getClientCount } from "../lib/ws-gateway";

const router: IRouter = Router();

function sanitizeUser(u: any) {
  const { passwordHash, sessionToken, ...safe } = u;
  return {
    ...safe,
    createdAt: u.createdAt instanceof Date ? u.createdAt.toISOString() : u.createdAt,
    updatedAt: u.updatedAt instanceof Date ? u.updatedAt.toISOString() : u.updatedAt,
    lastLoginAt: u.lastLoginAt ? (u.lastLoginAt instanceof Date ? u.lastLoginAt.toISOString() : u.lastLoginAt) : null,
    sessionExpiresAt: u.sessionExpiresAt ? (u.sessionExpiresAt instanceof Date ? u.sessionExpiresAt.toISOString() : u.sessionExpiresAt) : null,
  };
}

// Users admin
router.get("/admin/users", async (req, res) => {
  const users = await db.select().from(usersTable).orderBy(desc(usersTable.createdAt));
  res.json(users.map(sanitizeUser));
});

router.post("/admin/users", async (req, res) => {
  const [user] = await db.insert(usersTable).values({
    ...req.body,
    passwordHash: "$2b$10$xV9TaK7J9bMLBmGH3kYi5uQb6LS2V.Z.kXX2T6h/cEd7Xgdf6pLe2",
    allowedDomains: req.body.allowedDomains ?? [],
  }).returning();
  res.status(201).json(sanitizeUser(user));
});

router.patch("/admin/users/:id", async (req, res) => {
  const { passwordHash, ...updates } = req.body;
  const [user] = await db.update(usersTable).set({ ...updates, updatedAt: new Date() }).where(eq(usersTable.id, Number(req.params.id))).returning();
  if (!user) return res.status(404).json({ error: "not_found" });
  res.json(sanitizeUser(user));
});

router.delete("/admin/users/:id", async (req, res) => {
  await db.delete(usersTable).where(eq(usersTable.id, Number(req.params.id)));
  res.status(204).send();
});

// System status
router.get("/admin/system", async (req, res) => {
  const wsClients = getClientCount();
  res.json({
    status: "operational",
    version: "2.0.0",
    build: "SENTINEL-X",
    classification: "SECRET//NOFORN",
    wsConnections: wsClients,
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    timestamp: new Date().toISOString(),
    modules: [
      { name: "Threat Engine", status: "active", version: "2.0" },
      { name: "Fusion Core", status: "active", version: "1.8" },
      { name: "Alert Manager", status: "active", version: "2.0" },
      { name: "AIS Stream", status: process.env.AISSTREAM_KEY ? "active" : "standby", version: "1.0" },
      { name: "WebSocket Gateway", status: "active", version: "2.0" },
      { name: "Data Simulator", status: "active", version: "1.5" },
    ],
    dataSources: [
      { name: "SIGINT Feed", type: "sigint", status: "active", freshness: 95, confidence: 88 },
      { name: "AIS Maritime Stream", type: "maritime", status: process.env.AISSTREAM_KEY ? "active" : "simulation", freshness: 99, confidence: 92 },
      { name: "Geospatial Intelligence", type: "geoint", status: "active", freshness: 87, confidence: 85 },
      { name: "OSINT Aggregator", type: "osint", status: "active", freshness: 72, confidence: 65 },
      { name: "Partner Intel Feed", type: "humint", status: "active", freshness: 60, confidence: 78 },
      { name: "Seismic Network", type: "seismic", status: "active", freshness: 99, confidence: 97 },
      { name: "Weather Feed", type: "weather", status: "active", freshness: 99, confidence: 99 },
    ],
  });
});

// Audit logs
router.get("/admin/audit", async (req, res) => {
  const logs = await db.select().from(auditLogsTable).orderBy(desc(auditLogsTable.createdAt)).limit(200);
  res.json(logs.map(l => ({ ...l, createdAt: l.createdAt instanceof Date ? l.createdAt.toISOString() : l.createdAt })));
});

export default router;
