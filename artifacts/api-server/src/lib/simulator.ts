import { db } from "@workspace/db";
import {
  threatsTable, incidentsTable, assetsTable, signalsTable,
  gpsAnomaliesTable, alertsTable, activityEventsTable,
  knowledgeNodesTable, knowledgeEdgesTable,
  casesTable, caseNotesTable, workspacesTable, usersTable,
} from "@workspace/db";
import { logger } from "./logger";
import { broadcast } from "./ws-gateway";
import { eq } from "drizzle-orm";

// ─── Helpers ───────────────────────────────────────────────────────────────
function rand(min: number, max: number) { return Math.random() * (max - min) + min; }
function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function uid() { return Math.random().toString(36).slice(2, 10).toUpperCase(); }

const DOMAINS = ["aviation","maritime","orbital","seismic","conflict","weather","cyber","nuclear","sigint","infrastructure","energy","logistics","border","telecom","public_safety"] as const;
const SEVERITIES = ["critical","high","medium","low"] as const;
const REGIONS = ["North America","South America","Europe","Middle East","Africa","Central Asia","East Asia","Southeast Asia","South Asia","Pacific","Arctic","Atlantic","Indian Ocean","Mediterranean"];
const COUNTRIES = ["Russia","China","Iran","North Korea","USA","UK","France","Germany","Israel","Saudi Arabia","Turkey","India","Pakistan","Ukraine","Syria","Yemen","Somalia","Sudan","Venezuela","Brazil","Japan","South Korea","Taiwan","Philippines","Indonesia"];
const THREAT_CATEGORIES = ["military","cyber","political","natural","economic","terrorism"] as const;
const ASSET_TYPES = ["vessel","aircraft","vehicle","personnel","facility","satellite"] as const;
const AFFILIATIONS = ["friendly","neutral","hostile","unknown"] as const;
const SIGNAL_SOURCES = ["satellite","social","radio","cyber","humint"] as const;
const INCIDENT_TYPES = ["armed_conflict","cyber_attack","natural_disaster","civil_unrest","terrorism","gps_disruption","maritime","aviation"] as const;

const THREAT_TEMPLATES = [
  { title: "Ballistic Missile Launch Detected", category: "military" as const },
  { title: "Cyber Attack on Critical Infrastructure", category: "cyber" as const },
  { title: "Unauthorized AIS Broadcast Override", category: "military" as const },
  { title: "Submarine Activity — Disputed Waters", category: "military" as const },
  { title: "Electronic Warfare Deployment", category: "military" as const },
  { title: "Ransomware Campaign — Financial Sector", category: "cyber" as const },
  { title: "State-Sponsored Disinformation Campaign", category: "political" as const },
  { title: "Irregular Force Movement — Border Region", category: "military" as const },
  { title: "Nuclear Facility Power Anomaly", category: "military" as const },
  { title: "APT Intrusion — Defense Networks", category: "cyber" as const },
  { title: "Supply Chain Interdiction Attempt", category: "economic" as const },
  { title: "VBIED Threat — Commercial Corridor", category: "terrorism" as const },
  { title: "Deepfake Propaganda Surge", category: "cyber" as const },
  { title: "Seaport Blockade Initiated", category: "economic" as const },
  { title: "Hypersonic Glide Vehicle Test", category: "military" as const },
];

const SIGINT_TEMPLATES = [
  "Encrypted communications burst on military frequency",
  "Anomalous radar signature over restricted airspace",
  "High-power jamming source localized",
  "SATCOM uplink intercept — foreign military",
  "UHF burst transmission — unknown origin",
  "GPS spoofing signal triangle-located",
  "HF radio broadcast — coded messages",
  "SIGINT collection — naval exercise pattern",
];

// ─── Seed initial data ─────────────────────────────────────────────────────
export async function seedInitialData() {
  // Always ensure users are seeded (idempotent)
  const existingUsers = await db.select().from(usersTable).limit(1);
  if (existingUsers.length === 0) {
    const DEMO_HASH = "$2b$10$xV9TaK7J9bMLBmGH3kYi5uQb6LS2V.Z.kXX2T6h/cEd7Xgdf6pLe2";
    await db.insert(usersTable).values([
      { username: "admin", email: "admin@sentinel.mil", displayName: "System Administrator", passwordHash: DEMO_HASH, role: "super_admin" as const, status: "active" as const, clearanceLevel: "top_secret" as const },
      { username: "analyst1", email: "analyst1@sentinel.mil", displayName: "Senior Analyst Alpha", passwordHash: DEMO_HASH, role: "analyst" as const, status: "active" as const, clearanceLevel: "secret" as const },
      { username: "operator1", email: "operator1@sentinel.mil", displayName: "Watch Officer", passwordHash: DEMO_HASH, role: "operator" as const, status: "active" as const, clearanceLevel: "secret" as const },
      { username: "exec1", email: "exec1@sentinel.mil", displayName: "Executive Briefing", passwordHash: DEMO_HASH, role: "executive" as const, status: "active" as const, clearanceLevel: "top_secret" as const },
    ] as any).catch(() => {});
    logger.info("Demo users seeded");
  }

  // Check if rest of data is already seeded
  const existingThreats = await db.select().from(threatsTable).limit(1);
  if (existingThreats.length > 0) {
    logger.info("Database already seeded — skipping");
    return;
  }
  logger.info("Seeding initial demonstration data...");

  // Threats
  const threatData = Array.from({ length: 45 }, (_, i) => {
    const tpl = THREAT_TEMPLATES[i % THREAT_TEMPLATES.length];
    const sev = pick(SEVERITIES);
    return {
      title: tpl.title,
      description: `Multi-source intelligence assessment indicates elevated risk. Pattern analysis confirms anomalous activity consistent with adversarial operations. Confidence rating based on SIGINT, GEOINT, and OSINT corroboration.`,
      severity: sev,
      category: tpl.category,
      status: pick(["active","active","monitoring","escalated"]) as any,
      region: pick(REGIONS),
      country: pick(COUNTRIES),
      latitude: rand(-70, 80),
      longitude: rand(-170, 180),
      confidence: Math.round(rand(45, 97)),
      source: pick(["NSA-SIGINT","DIA-HUMINT","NGA-GEOINT","CIA-ANALYSIS","JTIC","OSINT-FUSION","PARTNER-INT"]),
      tags: [pick(["HIGH-PRIORITY","TIME-SENSITIVE","VERIFIED","UNVERIFIED","WATCH-LIST","ACTION-REQUIRED"])],
    };
  });
  await db.insert(threatsTable).values(threatData as any);

  // Assets
  const assetData = Array.from({ length: 80 }, (_, i) => {
    const type = pick(ASSET_TYPES);
    const aff = pick(AFFILIATIONS);
    const headings: Record<string, number> = { vessel: rand(0,360), aircraft: rand(0,360), vehicle: rand(0,360), personnel: 0, facility: 0, satellite: rand(0,360) };
    return {
      name: `${pick(["USS","USNS","MV","RFS","PLA","RF","USCG","HMS","JMSDF"])} ${pick(["Resolute","Phantom","Nemesis","Aurora","Kodiak","Atlas","Vanguard","Sentinel","Eclipse","Poseidon","Triton","Eagle","Raptor","Cobra","Viper"])}`,
      designation: `${type.toUpperCase().slice(0,3)}-${uid().slice(0,6)}`,
      type,
      status: pick(["active","active","active","monitoring","unknown"]) as any,
      affiliation: aff,
      country: aff === "friendly" ? "United States" : pick(COUNTRIES),
      latitude: rand(-70, 80),
      longitude: rand(-170, 180),
      altitude: type === "aircraft" || type === "satellite" ? rand(1000, 35000) : type === "vessel" ? 0 : null,
      speed: type === "facility" || type === "personnel" ? rand(0,5) : rand(0, type === "satellite" ? 7800 : type === "aircraft" ? 850 : 30),
      heading: headings[type] || 0,
      trackId: `TRK-${uid()}`,
    };
  });
  await db.insert(assetsTable).values(assetData as any);

  // GPS Anomalies
  const gpsData = Array.from({ length: 25 }, () => ({
    type: pick(["jamming","spoofing","interference","denial"]) as any,
    severity: pick(SEVERITIES),
    status: pick(["active","active","investigating","resolved"]) as any,
    region: pick(REGIONS),
    country: pick(COUNTRIES),
    latitude: rand(-70, 80),
    longitude: rand(-170, 180),
    radius: Math.round(rand(25, 500)),
    frequency: parseFloat(rand(1176, 1602).toFixed(2)),
    signalStrength: parseFloat(rand(-110, -40).toFixed(1)),
    affectedSystems: [pick(["Commercial Aviation","Military Navigation","Maritime AIS","Ground Transportation","Precision Agriculture"])],
    source: pick(["ACARS","AIS","NOTAM","SIGINT","RF-MONITOR"]),
    confidence: Math.round(rand(50, 99)),
    active: Math.random() > 0.3,
  }));
  await db.insert(gpsAnomaliesTable).values(gpsData as any);

  // Incidents
  const incidentData = Array.from({ length: 30 }, () => ({
    title: pick([
      "Artillery Exchange — Northern Border",
      "Port Authority Standoff — Disputed Waters",
      "Critical Infrastructure Sabotage",
      "Mass Casualty Event — Urban Center",
      "Cyber Intrusion — Power Grid",
      "Naval Vessel Detained — International Waters",
      "Pipeline Explosion — Energy Corridor",
      "IED Strike — Road Network",
      "Drone Swarm Intercept",
      "Civil Disturbance — Capital Region",
    ]),
    description: "Multi-source reporting confirms incident. Response teams mobilized. Intelligence assessment ongoing. Casualty figures unconfirmed pending verification.",
    type: pick(INCIDENT_TYPES),
    status: pick(["active","active","monitoring","escalated","resolved"]) as any,
    severity: pick(SEVERITIES),
    region: pick(REGIONS),
    country: pick(COUNTRIES),
    latitude: rand(-70, 80),
    longitude: rand(-170, 180),
    casualties: Math.random() > 0.4 ? Math.round(rand(0, 200)) : null,
    affectedArea: parseFloat(rand(1, 2000).toFixed(2)),
    reportedBy: pick(["JTIC","DIA","NGA","CIA","NSA","EUCOM","CENTCOM","INDOPACOM","AFRICOM","PARTNER"]),
  }));
  await db.insert(incidentsTable).values(incidentData as any);

  // Signals
  const signalData = Array.from({ length: 35 }, () => ({
    title: pick(SIGINT_TEMPLATES),
    summary: "Signal intercept processed through SIGINT fusion pipeline. Pattern correlates with known adversary communication protocols. Further analysis pending.",
    source: pick(SIGNAL_SOURCES),
    confidence: pick(["confirmed","probable","possible","unconfirmed"]) as any,
    region: pick(REGIONS),
    country: pick(COUNTRIES),
    latitude: rand(-70, 80),
    longitude: rand(-170, 180),
    threatLevel: pick(["critical","high","medium","low","none"]) as any,
    tags: [pick(["SIGINT","COMINT","ELINT","MASINT","OSINT","TECHINT"])],
    rawData: `INTERCEPT-${uid()} | FREQ: ${rand(100,3000).toFixed(2)}MHz | DURATION: ${Math.round(rand(1,120))}s`,
  }));
  await db.insert(signalsTable).values(signalData as any);

  // Alerts
  const alertData = Array.from({ length: 40 }, () => {
    const sev = pick(SEVERITIES);
    const domain = pick(DOMAINS);
    const now = new Date();
    const slaHours = sev === "critical" ? 1 : sev === "high" ? 4 : sev === "medium" ? 24 : 72;
    return {
      title: pick([
        "Geofence Violation Detected",
        "Anomalous Vessel Behavior — Loitering",
        "Threat Score Threshold Exceeded",
        "Source Reliability Degraded",
        "New Hostile Entity Identified",
        "Escalation Pattern Detected",
        "Dark Period — Asset Off-Grid",
        "Spoofed Position Report",
        "Cyber Beacon — Exfiltration Attempt",
        "Cordon Breach — Restricted Zone",
        "Flash Alert — Missile Telemetry",
        "Intelligence Gap — Coverage Hole",
      ]),
      description: "Automated alert generated by SENTINEL-X threat detection engine. Human review required.",
      severity: sev,
      domain,
      status: pick(["open","open","acknowledged","assigned","resolved"]) as any,
      sourceType: pick(["threat","incident","asset","signal","gps","system"]) as any,
      region: pick(REGIONS),
      country: pick(COUNTRIES),
      assignedTo: Math.random() > 0.5 ? pick(["analyst-alpha","analyst-bravo","operator-1","operator-2"]) : null,
      tags: [pick(["AUTO-GENERATED","REQUIRES-REVIEW","HIGH-CONFIDENCE","ESCALATED","SLA-TRACKING"])],
      slaDeadline: new Date(now.getTime() + slaHours * 3600 * 1000).toISOString() as any,
    };
  });
  await db.insert(alertsTable).values(alertData as any);

  // Cases
  const caseData = Array.from({ length: 12 }, (_, i) => ({
    caseNumber: `CASE-${new Date().getFullYear()}-${String(i + 1).padStart(4,"0")}`,
    title: pick([
      "Operation DARK HORIZON — Maritime Tracking",
      "Investigation: APT-41 Infrastructure",
      "Asset Compromise Assessment",
      "Supply Chain Integrity Review",
      "Election Interference — SIGINT Analysis",
      "Nuclear Proliferation Network",
      "Terrorism Financing Nexus",
      "Critical Infrastructure Vulnerability",
      "Insider Threat Investigation",
      "Drone Swarm Attribution",
      "Satellite Imagery Anomaly Review",
      "Cross-Border Arms Trafficking",
    ]),
    description: "Active intelligence investigation. All findings classified. Access restricted to assigned personnel.",
    status: pick(["open","active","active","pending","closed"]) as any,
    priority: pick(SEVERITIES),
    classification: pick(["unclassified","confidential","secret","top_secret"]) as any,
    leadAnalyst: pick(["analyst-alpha","analyst-bravo","analyst-charlie","senior-analyst-1"]),
    assignedTeam: pick(["SIGINT-TEAM","CYBER-UNIT","MARITIME-CELL","FUSION-CENTER","SPECIAL-OPS"]),
    domain: pick(DOMAINS) as string,
    region: pick(REGIONS),
    tags: [pick(["ACTIVE","PRIORITY","CLASSIFIED","COMPARTMENTED","NEED-TO-KNOW"])],
  }));
  await db.insert(casesTable).values(caseData as any);

  // Knowledge Graph Nodes
  const nodeData = [
    { nodeType: "threat_actor" as const, label: "APT-41", description: "Chinese state-sponsored threat actor", country: "China", threatLevel: "critical" as const, confidence: "confirmed" as const, tags: ["nation-state","cyber"] },
    { nodeType: "organization" as const, label: "DPRK Reconnaissance General Bureau", country: "North Korea", threatLevel: "critical" as const, confidence: "confirmed" as const, tags: ["intelligence","military"] },
    { nodeType: "vessel" as const, label: "MV Fortune Star", identifier: "IMO9876543", country: "Iran", threatLevel: "high" as const, confidence: "probable" as const, latitude: 25.2, longitude: 57.4 },
    { nodeType: "aircraft" as const, label: "Unknown IL-76", identifier: "REG-UNKNOWN", country: "Russia", threatLevel: "medium" as const, confidence: "possible" as const },
    { nodeType: "facility" as const, label: "Natanz Enrichment Facility", country: "Iran", latitude: 33.7, longitude: 51.7, threatLevel: "critical" as const, confidence: "confirmed" as const },
    { nodeType: "person" as const, label: "REDACTED-001", description: "Known proliferator", country: "Unknown", threatLevel: "high" as const, confidence: "probable" as const },
    { nodeType: "organization" as const, label: "Wagner Group", country: "Russia", threatLevel: "high" as const, confidence: "confirmed" as const, tags: ["paramilitary","mercenary"] },
    { nodeType: "location" as const, label: "Strait of Hormuz", latitude: 26.5, longitude: 56.3, threatLevel: "high" as const, confidence: "confirmed" as const },
    { nodeType: "network" as const, label: "Darknet C2 Cluster", description: "Command and control infrastructure", threatLevel: "high" as const, confidence: "probable" as const },
    { nodeType: "country" as const, label: "Russia", latitude: 61.5, longitude: 105.3, threatLevel: "high" as const, confidence: "confirmed" as const },
    { nodeType: "country" as const, label: "Iran", latitude: 32.4, longitude: 53.7, threatLevel: "high" as const, confidence: "confirmed" as const },
    { nodeType: "country" as const, label: "North Korea", latitude: 40.3, longitude: 127.5, threatLevel: "critical" as const, confidence: "confirmed" as const },
  ];
  const insertedNodes = await db.insert(knowledgeNodesTable).values(nodeData as any).returning();

  // Knowledge Graph Edges
  if (insertedNodes.length >= 6) {
    const edgeData = [
      { sourceNodeId: insertedNodes[0].id, targetNodeId: insertedNodes[8].id, edgeType: "operates" as const, label: "Controls C2 infrastructure", strength: 0.9 },
      { sourceNodeId: insertedNodes[2].id, targetNodeId: insertedNodes[7].id, edgeType: "visited" as const, label: "Transited", strength: 0.8 },
      { sourceNodeId: insertedNodes[5].id, targetNodeId: insertedNodes[4].id, edgeType: "visited" as const, label: "Accessed facility", strength: 0.7 },
      { sourceNodeId: insertedNodes[6].id, targetNodeId: insertedNodes[9].id, edgeType: "affiliated_with" as const, label: "State-sponsored", strength: 0.95 },
      { sourceNodeId: insertedNodes[1].id, targetNodeId: insertedNodes[11].id, edgeType: "affiliated_with" as const, label: "Government entity", strength: 1.0 },
      { sourceNodeId: insertedNodes[4].id, targetNodeId: insertedNodes[10].id, edgeType: "located_at" as const, label: "Located in Iran", strength: 1.0 },
    ];
    // Filter for valid edge types
    const validEdges = edgeData.map(e => ({
      ...e,
      edgeType: e.edgeType === "operates" ? "linked_to" as const : e.edgeType,
    }));
    await db.insert(knowledgeEdgesTable).values(validEdges as any).catch(() => {});
  }

  // Workspaces
  await db.insert(workspacesTable).values([
    { name: "GLOBAL WATCH", code: "GWATCH", description: "24/7 global situational awareness", type: "monitoring" as const, status: "active" as const, classification: "secret" as const, isDefault: true, domains: DOMAINS as any, regions: REGIONS },
    { name: "OPERATION IRON NET", code: "IRONNET", description: "Maritime interdiction operation", type: "operation" as const, status: "active" as const, classification: "top_secret" as const, isDefault: false, domains: ["maritime","sigint"], regions: ["Middle East","Indian Ocean"] },
    { name: "CYBER SENTINEL", code: "CYBSNT", description: "Cyber threat monitoring cell", type: "monitoring" as const, status: "active" as const, classification: "secret" as const, isDefault: false, domains: ["cyber","telecom"], regions: [] },
  ] as any);

  // Users (passwords are 'password' hashed — for demo only)
  const DEMO_HASH = "$2b$10$xV9TaK7J9bMLBmGH3kYi5uQb6LS2V.Z.kXX2T6h/cEd7Xgdf6pLe2";
  await db.insert(usersTable).values([
    { username: "admin", email: "admin@sentinel.mil", displayName: "System Administrator", passwordHash: DEMO_HASH, role: "super_admin" as const, status: "active" as const, clearanceLevel: "top_secret" as const },
    { username: "analyst1", email: "analyst1@sentinel.mil", displayName: "Senior Analyst Alpha", passwordHash: DEMO_HASH, role: "analyst" as const, status: "active" as const, clearanceLevel: "secret" as const },
    { username: "operator1", email: "operator1@sentinel.mil", displayName: "Watch Officer", passwordHash: DEMO_HASH, role: "operator" as const, status: "active" as const, clearanceLevel: "secret" as const },
    { username: "exec1", email: "exec1@sentinel.mil", displayName: "Executive Briefing", passwordHash: DEMO_HASH, role: "executive" as const, status: "active" as const, clearanceLevel: "top_secret" as const },
  ] as any).catch(() => {});

  // Activity events
  const eventTypes = ["threat_detected","incident_created","asset_updated","gps_anomaly","signal_intercepted","status_changed"] as const;
  const activityData = Array.from({ length: 20 }, () => ({
    type: pick(eventTypes),
    title: `Automated system event`,
    description: `Event detected at ${new Date().toISOString()}`,
    severity: pick(["critical","high","medium","low","info"]) as any,
    region: pick(REGIONS),
    entityType: pick(["threat","incident","asset","alert","case","signal"]),
    entityId: Math.round(rand(1, 100)),
  }));
  await db.insert(activityEventsTable).values(activityData as any).catch(() => {});

  logger.info("Initial data seeded successfully");
}

// ─── Live simulation tick ──────────────────────────────────────────────────
let simInterval: NodeJS.Timeout | null = null;

async function simulationTick() {
  try {
    const roll = Math.random();

    if (roll < 0.25) {
      // Update asset positions
      const assets = await db.select().from(assetsTable).limit(10);
      for (const asset of assets) {
        if (!asset.heading && asset.heading !== 0) continue;
        const headingRad = (asset.heading * Math.PI) / 180;
        const speedKmh = (asset.speed || 0) * 1.852;
        const distanceKm = (speedKmh / 3600) * 15; // 15 second tick
        const newLat = (asset.latitude || 0) + (distanceKm / 111) * Math.cos(headingRad);
        const newLon = (asset.longitude || 0) + (distanceKm / (111 * Math.cos((asset.latitude || 0) * Math.PI / 180))) * Math.sin(headingRad);
        const headingDrift = rand(-2, 2);
        await db.update(assetsTable).set({
          latitude: Math.max(-85, Math.min(85, newLat)),
          longitude: ((newLon + 180) % 360) - 180,
          heading: ((asset.heading + headingDrift) + 360) % 360,
          lastPositionAt: new Date(),
          updatedAt: new Date(),
        }).where(eq(assetsTable.id, asset.id));
      }
      broadcast({ type: "assets_updated", ts: Date.now() });
    }

    if (roll < 0.08) {
      // New random alert
      const sev = pick(SEVERITIES);
      const domain = pick(DOMAINS);
      const now = new Date();
      const slaHours = sev === "critical" ? 1 : sev === "high" ? 4 : 24;
      const [newAlert] = await db.insert(alertsTable).values({
        title: pick([
          "Geofence Violation — Restricted Zone",
          "Anomalous Behavior Pattern Detected",
          "Threat Score Threshold Exceeded",
          "Dark Period — Asset Off-Grid",
          "Flash Alert — Unauthorized Activity",
          "Intelligence Correlation — New Nexus",
          "Source Degradation — Confidence Drop",
          "Escalation Trigger — Priority Entity",
        ]),
        description: "SENTINEL-X automated threat detection engine alert. Requires analyst review.",
        severity: sev,
        domain,
        status: "open",
        sourceType: pick(["threat","asset","signal","system"]) as any,
        region: pick(REGIONS),
        tags: ["AUTO-GENERATED"],
        slaDeadline: new Date(now.getTime() + slaHours * 3600 * 1000) as any,
      } as any).returning();
      broadcast({ type: "alert_created", data: { ...newAlert, createdAt: newAlert.createdAt.toISOString(), updatedAt: newAlert.updatedAt.toISOString() } });
      logger.debug({ alertId: newAlert.id }, "Simulated new alert");
    }

    if (roll < 0.05) {
      // New threat
      const tpl = pick(THREAT_TEMPLATES);
      const [newThreat] = await db.insert(threatsTable).values({
        title: tpl.title,
        description: "Emerging intelligence indicates new threat vector. Multi-source corroboration in progress.",
        severity: pick(["critical","high","medium"]) as any,
        category: tpl.category,
        status: "active",
        region: pick(REGIONS),
        country: pick(COUNTRIES),
        latitude: rand(-70, 80),
        longitude: rand(-170, 180),
        confidence: Math.round(rand(45, 97)),
        source: pick(["NSA-SIGINT","DIA-HUMINT","OSINT-FUSION"]),
        tags: ["LIVE-FEED"],
      } as any).returning();
      broadcast({ type: "threat_created", data: { ...newThreat, detectedAt: newThreat.detectedAt.toISOString(), updatedAt: newThreat.updatedAt.toISOString() } });
    }

    if (roll < 0.04) {
      // New signal intercept
      await db.insert(signalsTable).values({
        title: pick(SIGINT_TEMPLATES),
        summary: "Fresh SIGINT intercept — processing in progress.",
        source: pick(SIGNAL_SOURCES),
        confidence: pick(["probable","possible","unconfirmed"]) as any,
        region: pick(REGIONS),
        latitude: rand(-70, 80),
        longitude: rand(-170, 180),
        threatLevel: pick(["high","medium","low"]) as any,
        tags: ["LIVE-INTERCEPT"],
      } as any);
      broadcast({ type: "signal_intercepted", ts: Date.now() });
    }

    // Broadcast heartbeat with live stats
    broadcast({ type: "heartbeat", ts: Date.now(), stats: { tick: Date.now() } });

  } catch (err: any) {
    logger.warn({ err: err.message }, "Simulation tick error");
  }
}

export function startSimulator() {
  logger.info("Starting SENTINEL-X live simulation engine");
  simInterval = setInterval(simulationTick, 15000);
}

export function stopSimulator() {
  if (simInterval) clearInterval(simInterval);
}
