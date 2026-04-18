import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listAlerts, updateAlert, deleteAlert, createAlert, getAlertStats } from "@/lib/api";
import { useRealtime } from "@/contexts/realtime";
import { Bell, AlertCircle, CheckCircle, User, X, ChevronDown, Filter, Plus, Zap } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

const SEV_COLOR: Record<string, string> = {
  critical: "text-red-400 border-red-900/40 bg-red-950/10",
  high: "text-orange-400 border-orange-900/40 bg-orange-950/10",
  medium: "text-yellow-400 border-yellow-900/40 bg-yellow-950/10",
  low: "text-green-400 border-green-900/40 bg-green-950/10",
};
const SEV_DOT: Record<string, string> = {
  critical: "bg-red-500", high: "bg-orange-500", medium: "bg-yellow-500", low: "bg-green-500",
};
const STATUS_COLOR: Record<string, string> = {
  open: "text-red-400", acknowledged: "text-yellow-400", assigned: "text-blue-400",
  resolved: "text-green-400", suppressed: "text-slate-500", escalated: "text-purple-400",
};

function AlertRow({ alert, onAction }: { alert: any; onAction: (id: number, action: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const sla = alert.slaDeadline ? new Date(alert.slaDeadline) : null;
  const slaExpired = sla && sla < new Date();
  return (
    <div className={`border ${SEV_COLOR[alert.severity] ?? "border-slate-800"} mb-1`}>
      <div
        className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-white/[0.02]"
        onClick={() => setExpanded(e => !e)}
      >
        <div className={`w-2 h-2 rounded-full shrink-0 ${SEV_DOT[alert.severity] ?? "bg-slate-500"} ${alert.status === "open" ? "animate-pulse" : ""}`} />
        <div className="flex-1 min-w-0">
          <div className="text-[11px] text-slate-200 truncate">{alert.title}</div>
          <div className="text-[9px] text-slate-600 flex gap-3">
            <span className="capitalize">{alert.domain?.replace("_"," ")}</span>
            <span>{alert.region || "—"}</span>
            {slaExpired && <span className="text-red-500">SLA BREACHED</span>}
          </div>
        </div>
        <div className="flex items-center gap-2 text-[10px] shrink-0">
          <span className={`uppercase font-bold ${STATUS_COLOR[alert.status] ?? "text-slate-400"}`}>{alert.status}</span>
          <span className="text-slate-600">{new Date(alert.createdAt).toLocaleDateString()}</span>
          <ChevronDown className={`h-3 w-3 text-slate-600 transition-transform ${expanded ? "rotate-180" : ""}`} />
        </div>
      </div>
      {expanded && (
        <div className="px-3 pb-3 border-t border-slate-800/50 pt-2 text-[10px] space-y-2">
          <div className="text-slate-400">{alert.description}</div>
          <div className="flex gap-4 flex-wrap">
            <span className="text-slate-600">ID: <span className="text-slate-400">ALT-{String(alert.id).padStart(5,"0")}</span></span>
            <span className="text-slate-600">Domain: <span className="text-slate-400 capitalize">{alert.domain?.replace("_"," ")}</span></span>
            <span className="text-slate-600">Source: <span className="text-slate-400">{alert.sourceType || "system"}</span></span>
            {alert.assignedTo && <span className="text-slate-600">Assigned: <span className="text-cyan-400">{alert.assignedTo}</span></span>}
            {sla && <span className="text-slate-600">SLA: <span className={slaExpired ? "text-red-400" : "text-slate-400"}>{sla.toLocaleString()}</span></span>}
          </div>
          <div className="flex gap-2 flex-wrap pt-1">
            {alert.status === "open" && (
              <button onClick={() => onAction(alert.id, "acknowledge")} className="text-[9px] border border-yellow-900/40 text-yellow-400 px-2 py-1 hover:bg-yellow-950/20 flex items-center gap-1">
                <CheckCircle className="h-3 w-3" /> ACKNOWLEDGE
              </button>
            )}
            {(alert.status === "open" || alert.status === "acknowledged") && (
              <button onClick={() => onAction(alert.id, "assign")} className="text-[9px] border border-blue-900/40 text-blue-400 px-2 py-1 hover:bg-blue-950/20 flex items-center gap-1">
                <User className="h-3 w-3" /> ASSIGN
              </button>
            )}
            {alert.status !== "resolved" && (
              <button onClick={() => onAction(alert.id, "resolve")} className="text-[9px] border border-green-900/40 text-green-400 px-2 py-1 hover:bg-green-950/20 flex items-center gap-1">
                <CheckCircle className="h-3 w-3" /> RESOLVE
              </button>
            )}
            {alert.status !== "escalated" && (
              <button onClick={() => onAction(alert.id, "escalate")} className="text-[9px] border border-purple-900/40 text-purple-400 px-2 py-1 hover:bg-purple-950/20">
                ↑ ESCALATE
              </button>
            )}
            <button onClick={() => onAction(alert.id, "delete")} className="text-[9px] border border-red-900/40 text-red-400 px-2 py-1 hover:bg-red-950/20 flex items-center gap-1 ml-auto">
              <X className="h-3 w-3" /> DISMISS
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AlertsPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { recentAlerts } = useRealtime();
  const [filters, setFilters] = useState({ severity: "all", status: "all", domain: "all" });
  const [showCreate, setShowCreate] = useState(false);
  const [newAlert, setNewAlert] = useState({ title: "", description: "", severity: "medium", domain: "cyber", status: "open" });

  const { data: stats } = useQuery({ queryKey: ["alert-stats"], queryFn: getAlertStats, refetchInterval: 30000 });
  const { data: alerts, isLoading } = useQuery({
    queryKey: ["alerts", filters],
    queryFn: () => listAlerts({
      ...(filters.severity !== "all" ? { severity: filters.severity } : {}),
      ...(filters.status !== "all" ? { status: filters.status } : {}),
      ...(filters.domain !== "all" ? { domain: filters.domain } : {}),
      limit: "100",
    }),
    refetchInterval: 15000,
  });

  const mutate = useMutation({
    mutationFn: ({ id, status }: any) => updateAlert(id, { status }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["alerts"] }); qc.invalidateQueries({ queryKey: ["alert-stats"] }); },
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => deleteAlert(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["alerts"] }); },
  });

  const createMut = useMutation({
    mutationFn: (data: any) => createAlert(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["alerts"] }); setShowCreate(false); toast({ title: "Alert created" }); },
  });

  const handleAction = (id: number, action: string) => {
    if (action === "delete") { deleteMut.mutate(id); return; }
    const statusMap: Record<string, string> = {
      acknowledge: "acknowledged", assign: "assigned", resolve: "resolved", escalate: "escalated",
    };
    mutate.mutate({ id, status: statusMap[action] });
  };

  const bySev = stats?.bySeverity ?? {};
  const byStatus = stats?.byStatus ?? {};

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-orange-400" />
          <h1 className="text-lg font-bold text-orange-400 tracking-widest">ALERT MANAGEMENT</h1>
          {recentAlerts.length > 0 && (
            <span className="text-[9px] bg-red-600 text-white px-1.5 py-0.5 rounded-sm animate-pulse">{recentAlerts.length} NEW</span>
          )}
        </div>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-1 text-[10px] text-orange-400 border border-orange-900/40 px-3 py-1.5 hover:bg-orange-950/20">
          <Plus className="h-3 w-3" /> CREATE ALERT
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
        {[["CRITICAL", bySev.critical, "text-red-400 border-red-900/40"], ["HIGH", bySev.high, "text-orange-400 border-orange-900/40"], ["MEDIUM", bySev.medium, "text-yellow-400 border-yellow-900/40"], ["LOW", bySev.low, "text-green-400 border-green-900/40"],
          ["OPEN", byStatus.open, "text-red-400 border-red-900/30"], ["ACK", byStatus.acknowledged, "text-yellow-400 border-yellow-900/30"], ["ASSIGNED", byStatus.assigned, "text-blue-400 border-blue-900/30"], ["RESOLVED", byStatus.resolved, "text-green-400 border-green-900/30"]
        ].map(([lbl, val, cls]) => (
          <div key={lbl as string} className={`border ${(cls as string).split(" ").slice(1).join(" ")} p-2 text-center`}>
            <div className={`text-xl font-bold ${(cls as string).split(" ")[0]}`}>{val ?? 0}</div>
            <div className="text-[9px] text-slate-600">{lbl}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap items-center">
        <Filter className="h-3.5 w-3.5 text-slate-600" />
        {[
          { key: "severity", opts: ["all","critical","high","medium","low"] },
          { key: "status", opts: ["all","open","acknowledged","assigned","resolved","escalated","suppressed"] },
          { key: "domain", opts: ["all","aviation","maritime","cyber","conflict","orbital","seismic","weather","nuclear","sigint","infrastructure","energy","logistics","border","telecom","public_safety"] },
        ].map(({ key, opts }) => (
          <select
            key={key}
            value={filters[key as keyof typeof filters]}
            onChange={e => setFilters(f => ({ ...f, [key]: e.target.value }))}
            className="bg-[#070e1c] border border-green-900/30 text-slate-400 text-[10px] px-2 py-1 focus:outline-none"
          >
            {opts.map(o => <option key={o} value={o}>{o.toUpperCase()}</option>)}
          </select>
        ))}
        <span className="text-[10px] text-slate-600 ml-auto">{alerts?.length ?? 0} alerts</span>
      </div>

      {/* New alerts from WebSocket */}
      {recentAlerts.length > 0 && (
        <div className="border border-orange-900/40 bg-orange-950/10 p-3">
          <div className="text-[9px] text-orange-400 tracking-wider mb-2 flex items-center gap-1"><Zap className="h-3 w-3" /> LIVE ALERTS — REAL TIME</div>
          {recentAlerts.slice(0,3).map((a: any, i) => (
            <div key={i} className="text-[10px] text-orange-300 flex gap-2 py-0.5">
              <span className="text-orange-600">⚡</span>
              <span className="truncate">{a.title}</span>
              <span className="text-orange-700 ml-auto">{a.severity?.toUpperCase()}</span>
            </div>
          ))}
        </div>
      )}

      {/* Alert list */}
      {isLoading ? (
        <div className="text-[10px] text-slate-600 py-8 text-center">LOADING ALERT FEED...</div>
      ) : (
        <div className="space-y-0.5">
          {(alerts ?? []).map((a: any) => (
            <AlertRow key={a.id} alert={a} onAction={handleAction} />
          ))}
          {!alerts?.length && <div className="text-[10px] text-slate-600 py-8 text-center">NO ALERTS MATCH CURRENT FILTERS</div>}
        </div>
      )}

      {/* Create alert dialog */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-[#070e1c] border border-green-900/40 w-full max-w-md p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm font-bold text-green-400 tracking-wider">CREATE ALERT</div>
              <button onClick={() => setShowCreate(false)}><X className="h-4 w-4 text-slate-500" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[9px] text-slate-500 block mb-1">TITLE</label>
                <input value={newAlert.title} onChange={e => setNewAlert(a => ({ ...a, title: e.target.value }))} className="w-full bg-[#050c18] border border-green-900/30 text-slate-300 text-[11px] px-2 py-1.5 focus:outline-none" />
              </div>
              <div>
                <label className="text-[9px] text-slate-500 block mb-1">DESCRIPTION</label>
                <textarea value={newAlert.description} onChange={e => setNewAlert(a => ({ ...a, description: e.target.value }))} rows={2} className="w-full bg-[#050c18] border border-green-900/30 text-slate-300 text-[11px] px-2 py-1.5 focus:outline-none resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] text-slate-500 block mb-1">SEVERITY</label>
                  <select value={newAlert.severity} onChange={e => setNewAlert(a => ({ ...a, severity: e.target.value }))} className="w-full bg-[#050c18] border border-green-900/30 text-slate-300 text-[11px] px-2 py-1.5 focus:outline-none">
                    {["critical","high","medium","low"].map(s => <option key={s} value={s}>{s.toUpperCase()}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[9px] text-slate-500 block mb-1">DOMAIN</label>
                  <select value={newAlert.domain} onChange={e => setNewAlert(a => ({ ...a, domain: e.target.value }))} className="w-full bg-[#050c18] border border-green-900/30 text-slate-300 text-[11px] px-2 py-1.5 focus:outline-none">
                    {["aviation","maritime","cyber","conflict","orbital","seismic","weather","nuclear","sigint","infrastructure","energy","logistics","border","telecom","public_safety"].map(d => <option key={d} value={d}>{d.toUpperCase()}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => createMut.mutate(newAlert)} disabled={!newAlert.title} className="flex-1 bg-green-950/40 border border-green-900/40 text-green-400 text-[10px] py-2 hover:bg-green-950/60 disabled:opacity-50 tracking-wider">CREATE</button>
                <button onClick={() => setShowCreate(false)} className="flex-1 border border-slate-800 text-slate-500 text-[10px] py-2 hover:border-slate-700">CANCEL</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
