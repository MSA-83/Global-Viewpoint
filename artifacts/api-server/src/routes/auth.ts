import { Router, type IRouter } from "express";
import { db, usersTable, auditLogsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { z } from "zod";
import crypto from "crypto";

const router: IRouter = Router();

// Simple demo auth — session tokens, no bcrypt in demo for speed
// In production: use bcrypt + JWT + MFA
function generateToken() { return crypto.randomBytes(32).toString("hex"); }

function sanitizeUser(u: any) {
  const { passwordHash, sessionToken, ...safe } = u;
  return {
    ...safe,
    createdAt: u.createdAt instanceof Date ? u.createdAt.toISOString() : u.createdAt,
    updatedAt: u.updatedAt instanceof Date ? u.updatedAt.toISOString() : u.updatedAt,
    lastLoginAt: u.lastLoginAt ? (u.lastLoginAt instanceof Date ? u.lastLoginAt.toISOString() : u.lastLoginAt) : null,
  };
}

const LoginBody = z.object({
  username: z.string(),
  password: z.string(),
});

router.post("/auth/login", async (req, res) => {
  const { username, password } = LoginBody.parse(req.body);
  const [user] = await db.select().from(usersTable).where(eq(usersTable.username, username));
  if (!user || user.status !== "active") {
    return res.status(401).json({ error: "invalid_credentials", message: "Invalid username or password" });
  }
  // Demo: accept "password" as the universal password for all seeded users
  const validPasswords = ["password", "sentinel", "admin123", "operator1", "analyst1"];
  if (!validPasswords.includes(password)) {
    return res.status(401).json({ error: "invalid_credentials", message: "Invalid username or password" });
  }
  const token = generateToken();
  const expiresAt = new Date(Date.now() + 8 * 3600 * 1000); // 8 hour session
  await db.update(usersTable).set({
    sessionToken: token,
    sessionExpiresAt: expiresAt,
    lastLoginAt: new Date(),
    updatedAt: new Date(),
  }).where(eq(usersTable.id, user.id));
  await db.insert(auditLogsTable).values({
    userId: String(user.id),
    username: user.username,
    action: "login",
    resource: "auth",
    success: true,
  } as any).catch(() => {});
  res.json({ token, expiresAt: expiresAt.toISOString(), user: sanitizeUser(user) });
});

router.post("/auth/logout", async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (token) {
    await db.update(usersTable).set({ sessionToken: null, sessionExpiresAt: null }).where(eq(usersTable.sessionToken, token));
  }
  res.json({ message: "Logged out" });
});

router.get("/auth/me", async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "unauthorized" });
  const [user] = await db.select().from(usersTable).where(eq(usersTable.sessionToken, token));
  if (!user || !user.sessionExpiresAt || user.sessionExpiresAt < new Date()) {
    return res.status(401).json({ error: "session_expired" });
  }
  res.json(sanitizeUser(user));
});

export default router;
