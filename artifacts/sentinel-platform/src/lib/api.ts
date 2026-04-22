// API client helpers for all endpoints
const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "");
// API server is on a different port/path — use proxy
const API_ROOT = `${BASE}/api-server/api`.replace("//", "/").replace(/\/api-server\/api$/, "") + "/api-server/api";

// More robust approach: compute API base from environment
function getApiBase(): string {
  // In Replit, the API server runs on a different port but is proxied
  // The proxy path is /api-server
  const base = window.location.origin;
  const prefix = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";
  // Remove any app-specific suffix to get to root
  const rootPrefix = prefix.replace(/\/sentinel-platform\/?$/, "");
  return `${base}${rootPrefix}/api-server/api`;
}

export const API_BASE = getApiBase();

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
