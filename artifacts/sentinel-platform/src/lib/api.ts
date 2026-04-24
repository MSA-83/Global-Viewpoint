// API client helpers for all endpoints
// The API server is registered with paths = ["/api"] in artifact.toml,
// so the Replit edge proxy routes any request starting with /api to it.
// Use a same-origin relative URL to avoid CORS and proxy quirks.
export const API_BASE = "/api";

export async function apiFetch<T = any>(path: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem("sentinel_token");
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options?.headers,
  };
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || `HTTP ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

// Auth
export const login = (username: string, password: string) =>
  apiFetch("/auth/login", { method: "POST", body: JSON.stringify({ username, password }) });
export const logout = () => apiFetch("/auth/logout", { method: "POST" });
export const getMe = () => apiFetch("/auth/me");

// Alerts
export const listAlerts = (params?: Record<string, any>) => {
  const qs = params ? "?" + new URLSearchParams(params).toString() : "";
  return apiFetch(`/alerts${qs}`);
};
export const getAlertStats = () => apiFetch("/alerts/stats/summary");
export const createAlert = (data: any) => apiFetch("/alerts", { method: "POST", body: JSON.stringify(data) });
export const updateAlert = (id: number, data: any) => apiFetch(`/alerts/${id}`, { method: "PATCH", body: JSON.stringify(data) });
export const deleteAlert = (id: number) => apiFetch(`/alerts/${id}`, { method: "DELETE" });

// Cases
export const listCases = () => apiFetch("/cases");
export const getCase = (id: number) => apiFetch(`/cases/${id}`);
export const createCase = (data: any) => apiFetch("/cases", { method: "POST", body: JSON.stringify(data) });
export const updateCase = (id: number, data: any) => apiFetch(`/cases/${id}`, { method: "PATCH", body: JSON.stringify(data) });
export const deleteCase = (id: number) => apiFetch(`/cases/${id}`, { method: "DELETE" });
export const listCaseNotes = (id: number) => apiFetch(`/cases/${id}/notes`);
export const addCaseNote = (id: number, data: any) => apiFetch(`/cases/${id}/notes`, { method: "POST", body: JSON.stringify(data) });

// Search
export const globalSearch = (q: string, limit = 30) => apiFetch(`/search?q=${encodeURIComponent(q)}&limit=${limit}`);

// Analytics
export const getAnalyticsOverview = () => apiFetch("/analytics/overview");
export const getThreatTrend = () => apiFetch("/analytics/threats/trend");
export const getDomainStats = () => apiFetch("/analytics/domains");
export const getRegionStats = () => apiFetch("/analytics/regions");
export const getAssetStats = () => apiFetch("/analytics/assets/status");
export const getAlertMttr = () => apiFetch("/analytics/alerts/mttr");

// Knowledge Graph
export const getKnowledgeGraph = () => apiFetch("/knowledge/graph");
export const listKnowledgeNodes = () => apiFetch("/knowledge/nodes");
export const createKnowledgeNode = (data: any) => apiFetch("/knowledge/nodes", { method: "POST", body: JSON.stringify(data) });
export const deleteKnowledgeNode = (id: number) => apiFetch(`/knowledge/nodes/${id}`, { method: "DELETE" });
export const createKnowledgeEdge = (data: any) => apiFetch("/knowledge/edges", { method: "POST", body: JSON.stringify(data) });
export const deleteKnowledgeEdge = (id: number) => apiFetch(`/knowledge/edges/${id}`, { method: "DELETE" });

// Workspaces
export const listWorkspaces = () => apiFetch("/workspaces");
export const createWorkspace = (data: any) => apiFetch("/workspaces", { method: "POST", body: JSON.stringify(data) });
export const updateWorkspace = (id: number, data: any) => apiFetch(`/workspaces/${id}`, { method: "PATCH", body: JSON.stringify(data) });
export const deleteWorkspace = (id: number) => apiFetch(`/workspaces/${id}`, { method: "DELETE" });

// Admin
export const getSystemStatus = () => apiFetch("/admin/system");
export const listAdminUsers = () => apiFetch("/admin/users");
export const createAdminUser = (data: any) => apiFetch("/admin/users", { method: "POST", body: JSON.stringify(data) });
export const updateAdminUser = (id: number, data: any) => apiFetch(`/admin/users/${id}`, { method: "PATCH", body: JSON.stringify(data) });
export const deleteAdminUser = (id: number) => apiFetch(`/admin/users/${id}`, { method: "DELETE" });
export const getAuditLogs = () => apiFetch("/admin/audit");

// AI Copilot
export const generateBriefing = (data: any) => apiFetch("/ai/briefing", { method: "POST", body: JSON.stringify(data) });
export const aiQuery = (query: string) => apiFetch("/ai/query", { method: "POST", body: JSON.stringify({ query }) });
export const aiSummarize = (type: string, id: number) => apiFetch(`/ai/summarize/${type}/${id}`, { method: "POST" });

// Threats
export const listThreats = (params?: Record<string, any>) => {
  const qs = params ? "?" + new URLSearchParams(params).toString() : "";
  return apiFetch(`/threats${qs}`);
};
export const createThreat = (data: any) => apiFetch("/threats", { method: "POST", body: JSON.stringify(data) });
export const updateThreat = (id: number, data: any) => apiFetch(`/threats/${id}`, { method: "PATCH", body: JSON.stringify(data) });
export const deleteThreat = (id: number) => apiFetch(`/threats/${id}`, { method: "DELETE" });

// Incidents
export const listIncidents = () => apiFetch("/incidents");
export const updateIncident = (id: number, data: any) => apiFetch(`/incidents/${id}`, { method: "PATCH", body: JSON.stringify(data) });

// Assets
export const listAssets = () => apiFetch("/assets");
export const updateAsset = (id: number, data: any) => apiFetch(`/assets/${id}`, { method: "PATCH", body: JSON.stringify(data) });

// Signals
export const listSignals = () => apiFetch("/signals");

// GPS Anomalies
export const listGpsAnomalies = () => apiFetch("/gps-anomalies");

// OSINT (free, no API keys)
export const getOsintEarthquakes = (window: "hour" | "day" | "week" = "day") =>
  apiFetch(`/intel/osint/earthquakes?window=${window}`);
export const getOsintDisasters = (days = 10) => apiFetch(`/intel/osint/disasters?days=${days}`);
export const getOsintISS = () => apiFetch("/intel/osint/iss");
export const getOsintGdacs = () => apiFetch("/intel/osint/gdacs");
export const getOsintPulse = () => apiFetch("/intel/osint/pulse");

// Live aircraft (OpenSky)
export const getLiveAircraft = (bbox?: { lamin: number; lamax: number; lomin: number; lomax: number }) => {
  const qs = bbox ? `?lamin=${bbox.lamin}&lamax=${bbox.lamax}&lomin=${bbox.lomin}&lomax=${bbox.lomax}` : "";
  return apiFetch(`/intel/aircraft/live${qs}`);
};

// NASA active fires
export const getActiveFires = (source = "VIIRS_SNPP_NRT", days = 1, area = "world") =>
  apiFetch(`/intel/firms?source=${source}&days=${days}&area=${area}`);

// OWM tile overlay
export const getWeatherTile = (layer = "clouds_new") => apiFetch(`/intel/weather/tile?layer=${layer}`);
export const getWeatherAt = (lat: number, lon: number) => apiFetch(`/intel/weather?lat=${lat}&lon=${lon}`);

// N2YO satellites near a point
export const getSatellitesAbove = (lat: number, lon: number, alt = 0, radius = 70, category = 0) =>
  apiFetch(`/intel/satellites?lat=${lat}&lon=${lon}&alt=${alt}&radius=${radius}&category=${category}`);

// Cesium Ion
export const getCesiumToken = () => apiFetch("/intel/cesium/token");

// Planet imagery
export const planetSearch = (lat: number, lon: number, days = 7) =>
  apiFetch(`/intel/planet/search?lat=${lat}&lon=${lon}&days=${days}`);

// AISStream connection info
export const getAisStreamToken = () => apiFetch("/intel/maritime/aisstream/token");

// Aviation METAR / TAF
export const getMetar = (station: string) => apiFetch(`/intel/aviation/metar/${station}`);
export const getTaf = (station: string) => apiFetch(`/intel/aviation/taf/${station}`);

// News / Shodan / Malware
export const getSecurityNews = (q = "cyber attack OR military OR sanctions") =>
  apiFetch(`/intel/news?q=${encodeURIComponent(q)}`);
export const getShodanSummary = (q = "country:US") => apiFetch(`/intel/shodan/summary?q=${encodeURIComponent(q)}`);
export const getMalwareSamples = () => apiFetch("/intel/malware");
