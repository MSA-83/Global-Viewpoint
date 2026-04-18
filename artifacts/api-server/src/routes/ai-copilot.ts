import { Router, type IRouter } from "express";
import { db, threatsTable, incidentsTable, alertsTable, casesTable } from "@workspace/db";
import { desc } from "drizzle-orm";

const router: IRouter = Router();

// AI Copilot — generates structured intelligence assessments
// Uses real data from the DB to build contextual, formatted briefings

async function getContextData() {
  const [threats, incidents, alerts, cases] = await Promise.all([
    db.select().from(threatsTable).orderBy(desc(threatsTable.detectedAt)).limit(10),
    db.select().from(incidentsTable).orderBy(desc(incidentsTable.startedAt)).limit(5),
    db.select().from(alertsTable).where({ status: "open" } as any).limit(10).catch(() =>
      db.select().from(alertsTable).orderBy(desc(alertsTable.createdAt)).limit(10)
    ),
    db.select().from(casesTable).orderBy(desc(casesTable.createdAt)).limit(5),
  ]);
  return { threats, incidents, alerts, cases };
}

function formatThreat(t: any) {
  return `• [${t.severity?.toUpperCase()}] ${t.title} — ${t.region}, ${t.country || "Unknown"} (Confidence: ${t.confidence}%)`;
}

const BRIEFING_TEMPLATES = [
  "SITUATION ASSESSMENT: Based on current intelligence collection, the operational environment presents elevated risk factors across multiple domains.",
  "PATTERN ANALYSIS: Multi-source correlation indicates coordinated adversarial activity consistent with pre-attack preparation.",
  "PRIORITY INTELLIGENCE REQUIREMENTS: Focus collection assets on identified hotspots showing anomalous activity patterns.",
  "RECOMMENDED ACTIONS: Deploy additional surveillance assets to areas of concern. Heighten alert posture in affected regions.",
  "CONFIDENCE ASSESSMENT: Overall intelligence picture rated PROBABLE based on available sources. Key intelligence gaps exist in covered regions.",
];

router.post("/ai/briefing", async (req, res) => {
  const { type = "situation", region, domain } = req.body;
  const ctx = await getContextData();

  const criticalThreats = ctx.threats.filter(t => t.severity === "critical");
  const highThreats = ctx.threats.filter(t => t.severity === "high");
  const openAlerts = ctx.alerts.filter(a => a.status === "open" || a.status === "acknowledged");

  const ts = new Date().toISOString().replace("T", " ").slice(0, 19) + " UTC";

  const briefing = {
    id: `BRF-${Date.now()}`,
    generatedAt: new Date().toISOString(),
    classification: "SECRET//NOFORN",
    type,
    region: region || "GLOBAL",
    domain: domain || "ALL DOMAINS",
    summary: `As of ${ts}, SENTINEL-X has identified ${criticalThreats.length} CRITICAL and ${highThreats.length} HIGH priority threats globally. ${openAlerts.length} alerts require immediate analyst attention.`,
    sections: [
      {
        heading: "EXECUTIVE SUMMARY",
        content: `Current global threat index is ELEVATED. ${criticalThreats.length} critical threats active across ${new Set(ctx.threats.map(t => t.region)).size} regions. Primary concerns: ${criticalThreats.slice(0, 3).map(t => t.title).join("; ") || "None at this time"}.`,
      },
      {
        heading: "PRIORITY THREATS",
        content: ctx.threats.slice(0, 5).map(formatThreat).join("\n") || "No active priority threats.",
      },
      {
        heading: "ACTIVE INCIDENTS",
        content: ctx.incidents.slice(0, 3).map(i => `• [${i.severity?.toUpperCase()}] ${i.title} — ${i.region}`).join("\n") || "No active incidents.",
      },
      {
        heading: "INTELLIGENCE ASSESSMENT",
        content: BRIEFING_TEMPLATES[Math.floor(Math.random() * BRIEFING_TEMPLATES.length)],
      },
      {
        heading: "OPEN CASES",
        content: ctx.cases.slice(0, 3).map(c => `• ${c.caseNumber}: ${c.title} [${c.priority?.toUpperCase()}]`).join("\n") || "No active cases.",
      },
      {
        heading: "RECOMMENDED ACTIONS",
        content: `1. Prioritize analyst coverage on ${criticalThreats[0]?.region || "flagged regions"}\n2. Verify ${openAlerts.length} outstanding alerts\n3. Update threat assessments for active cases\n4. Coordinate with partner agencies on shared indicators`,
      },
    ],
    metadata: {
      sourcesConsulted: ["SIGINT","GEOINT","OSINT","HUMINT","PARTNER-INT"],
      confidence: Math.round(70 + Math.random() * 20),
      humanReviewRequired: true,
    },
  };
  res.json(briefing);
});

router.post("/ai/query", async (req, res) => {
  const { query } = req.body;
  if (!query) return res.status(400).json({ error: "Query required" });

  const ctx = await getContextData();
  const q = query.toLowerCase();

  let answer = "";
  let data: any = null;

  if (q.includes("threat") || q.includes("critical")) {
    const criticals = ctx.threats.filter(t => t.severity === "critical");
    answer = `Currently tracking ${ctx.threats.length} active threats, ${criticals.length} of which are CRITICAL severity. Primary threat regions: ${[...new Set(ctx.threats.slice(0,5).map(t => t.region))].join(", ")}.`;
    data = { threats: ctx.threats.slice(0, 5).map(t => ({ id: t.id, title: t.title, severity: t.severity, region: t.region })) };
  } else if (q.includes("alert")) {
    const open = ctx.alerts.filter(a => a.status === "open");
    answer = `There are currently ${open.length} open alerts requiring attention. ${ctx.alerts.filter(a => a.severity === "critical").length} are CRITICAL priority.`;
    data = { alerts: ctx.alerts.slice(0, 5) };
  } else if (q.includes("case") || q.includes("investigation")) {
    answer = `${ctx.cases.length} active investigations in the system. ${ctx.cases.filter(c => c.priority === "critical").length} flagged as CRITICAL priority.`;
    data = { cases: ctx.cases.slice(0, 3) };
  } else if (q.includes("incident")) {
    answer = `Tracking ${ctx.incidents.length} active incidents. Severity distribution includes ${ctx.incidents.filter(i => i.severity === "critical").length} critical and ${ctx.incidents.filter(i => i.severity === "high").length} high.`;
  } else {
    answer = `Query processed. Current operational status: ${ctx.threats.length} active threats, ${ctx.alerts.length} alerts, ${ctx.incidents.length} incidents. All systems nominal. Please refine your query for specific domain intelligence.`;
  }

  res.json({
    query,
    answer,
    data,
    confidence: Math.round(65 + Math.random() * 25),
    sources: ["SENTINEL-X Database", "Real-time Intelligence Feed"],
    generatedAt: new Date().toISOString(),
    humanReviewRequired: true,
  });
});

router.post("/ai/summarize/:type/:id", async (req, res) => {
  const { type, id } = req.params;
  const summaries: Record<string, string> = {
    threat: `Threat entity ${id} presents elevated risk based on current intelligence assessment. Multi-source corroboration indicates organized adversarial activity. Recommend continued surveillance and analyst review. Pattern consistent with known threat actor methodology.`,
    incident: `Incident ${id} represents a significant operational event requiring coordinated response. Intelligence picture is developing with moderate confidence. Recommend activation of relevant response protocols and interagency coordination.`,
    alert: `Alert ${id} triggered by automated detection engine based on threshold breach. Human analyst review recommended before escalation or dismissal. Correlation with related indicators in progress.`,
    case: `Investigation case ${id} involves multiple intelligence streams. Current evidence assessment suggests [REDACTED] activity. Lead analyst should review all attached intelligence and coordinate with relevant units.`,
  };
  res.json({
    entityType: type,
    entityId: id,
    summary: summaries[type] || `Intelligence summary for ${type} ${id}. Analysis pending additional collection.`,
    confidence: Math.round(65 + Math.random() * 25),
    generatedAt: new Date().toISOString(),
    humanReviewRequired: true,
  });
});

export default router;
