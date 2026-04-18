import { useQuery } from "@tanstack/react-query";
import { getAnalyticsOverview, getThreatTrend, getDomainStats, getRegionStats, listAlerts } from "@/lib/api";
import { useListThreats, useGetActivityFeed } from "@workspace/api-client-react";
import { useRealtime } from "@/contexts/realtime";
import { useAuth } from "@/contexts/auth";
import {
  AlertTriangle, Shield, Navigation, Radio, Globe,
  TrendingUp, Activity, ChevronRight, Bell, Briefcase
} from "lucide-react";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Link } from "wouter";

const SEV_COLOR: Record<string, string> = {
  critical: "#ef4444", high: "#f97316", medium: "#eab308", low: "#22c55e",
};

function StatCard({ label, value, sub, color = "green", icon: Icon, href }: any) {
  const border = { red: "border-red-900/40 bg-red-950/10", orange: "border-orange-900/40 bg-orange-950/10", yellow: "border-yellow-900/40 bg-yellow-950/10", green: "border-green-900/40 bg-green-950/10", cyan: "border-cyan-900/40 bg-cyan-950/10", blue: "border-blue-900/40 bg-blue-950/10" };
  const text = { red: "text-red-400", orange: "text-orange-400", yellow: "text-yellow-400", green: "text-green-400", cyan: "text-cyan-400", blue: "text-blue-400" };
  const Wrap: any = href ? Link : "div";
  return (
    <Wrap href={href} className={`border ${border[color as keyof typeof border]} p-4 ${href ? "hover:opacity-80 cursor-pointer transition-all" : ""}`}>
      <div className="flex items-start justify-between mb-2">
        <div className="text-[10px] text-slate-500 tracking-widest">{label}</div>
        {Icon && <Icon className={`h-4 w-4 ${text[color as keyof typeof text]}`} />}
      </div>
      <div className={`text-3xl font-bold ${text[color as keyof typeof text]}`}>{value ?? "—"}</div>
      {sub && <div className="text-[10px] text-slate-600 mt-1">{sub}</div>}
    </Wrap>
  );
}

function ThreatGauge({ index }: { index: number }) {
  const pct = Math.min((index / 500) * 100, 100);
  const color = index > 300 ? "#ef4444" : index > 200 ? "#f97316" : index > 100 ? "#eab308" : "#22c55e";
  const label = index > 300 ? "CRITICAL" : index > 200 ? "HIGH" : index > 100 ? "ELEVATED" : "NORMAL";
  return (
    <div className="border border-green-900/30 bg-[#070e1c] p-4">
      <div className="text-[10px] text-slate-500 tracking-widest mb-3">GLOBAL THREAT INDEX</div>
      <div className="flex items-end gap-3 mb-3">
        <div className="text-4xl font-bold" style={{ color }}>{index}</div>
        <div className="text-[10px] pb-1 font-bold tracking-wider" style={{ color }}>{label}</div>
      </div>
      <div className="w-full h-2 bg-[#050c18] border border-green-900/20">
        <div className="h-full transition-all duration-1000" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <div className="flex justify-between text-[9px] text-slate-700 mt-1"><span>0</span><span>250</span><span>500</span></div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const { recentAlerts, tickCount } = useRealtime();

  const { data: overview } = useQuery({ queryKey: ["analytics-overview"], queryFn: getAnalyticsOverview, refetchInterval: 30000 });
  const { data: trend } = useQuery({ queryKey: ["threat-trend"], queryFn: getThreatTrend, refetchInterval: 60000 });
  const { data: domains } = useQuery({ queryKey: ["domain-stats"], queryFn: getDomainStats, refetchInterval: 60000 });
  const { data: regions } = useQuery({ queryKey: ["region-stats"], queryFn: getRegionStats, refetchInterval: 60000 });
  const { data: alertsList } = useQuery({ queryKey: ["alerts-open"], queryFn: () => listAlerts({ status: "open", limit: "8" }), refetchInterval: 15000 });
  const { data: threats } = useListThreats({ limit: 8 }, { query: { refetchInterval: 20000 } });
  const { data: activity } = useGetActivityFeed({ limit: 20 }, { query: { refetchInterval: 15000 } });

  const counts = overview?.counts ?? {};
  const gti = overview?.globalThreatIndex ?? 0;

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-green-400" />
            <h1 className="text-lg font-bold text-green-400 tracking-widest">GLOBAL WATCH</h1>
            <span className="text-[10px] text-slate-500 border border-green-900/30 px-2 py-0.5">LIVE · TICK #{tickCount}</span>
          </div>
          <div className="text-[10px] text-slate-600 mt-0.5">
            {user?.displayName?.toUpperCase()} · {user?.role?.toUpperCase()} · {new Date().toISOString().slice(0, 19)} UTC
          </div>
        </div>
        <Link href="/map" className="flex items-center gap-1 text-[10px] text-green-500 border border-green-900/40 px-3 py-1.5 hover:bg-green-950/20 transition-colors">
          TACTICAL MAP <ChevronRight className="h-3 w-3" />
        </Link>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard label="THREATS" value={counts.threats} sub="multi-domain" color="red" icon={AlertTriangle} href="/threats" />
        <StatCard label="OPEN ALERTS" value={counts.openAlerts} sub={`${counts.criticalAlerts ?? 0} critical`} color="orange" icon={Bell} href="/alerts" />
        <StatCard label="INCIDENTS" value={counts.incidents} sub="ongoing" color="yellow" icon={Shield} href="/incidents" />
        <StatCard label="ASSETS" value={counts.assets} sub="all domains" color="green" icon={Navigation} href="/assets" />
        <StatCard label="SIGINT" value={counts.signals} sub="intercepted" color="cyan" icon={Radio} href="/signals" />
        <StatCard label="CASES" value={counts.cases} sub="active" color="blue" icon={Briefcase} href="/cases" />
      </div>

      {/* Main row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 border border-green-900/30 bg-[#070e1c] p-4">
          <div className="text-[10px] text-slate-500 tracking-widest mb-4 flex items-center gap-2">
            <TrendingUp className="h-3.5 w-3.5" /> THREAT ACTIVITY — 24H
          </div>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend?.trend ?? []} margin={{ top: 5, right: 5, bottom: 5, left: -25 }}>
                <defs>
                  {[["critical","#ef4444"],["high","#f97316"],["medium","#eab308"]].map(([k,c]) => (
                    <linearGradient key={k} id={`g-${k}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={c} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={c} stopOpacity={0} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="2 4" stroke="#0f200f" />
                <XAxis dataKey="label" tick={{ fill: "#475569", fontSize: 9 }} />
                <YAxis tick={{ fill: "#475569", fontSize: 9 }} />
                <Tooltip contentStyle={{ background: "#070e1c", border: "1px solid #14532d", borderRadius: 0, fontSize: 10, fontFamily: "monospace" }} />
                <Area type="monotone" dataKey="critical" stroke="#ef4444" fill="url(#g-critical)" strokeWidth={1.5} />
                <Area type="monotone" dataKey="high" stroke="#f97316" fill="url(#g-high)" strokeWidth={1.5} />
                <Area type="monotone" dataKey="medium" stroke="#eab308" fill="url(#g-medium)" strokeWidth={1.5} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="space-y-4">
          <ThreatGauge index={gti} />
          <div className="border border-green-900/30 bg-[#070e1c] p-4">
            <div className="text-[10px] text-slate-500 tracking-widest mb-3">TOP ALERT DOMAINS</div>
            <div className="space-y-2">
              {(domains?.domains ?? []).slice(0, 5).map((d: any) => (
                <div key={d.name} className="flex items-center gap-2">
                  <div className="text-[10px] text-slate-400 w-20 truncate capitalize">{d.name.replace("_"," ")}</div>
                  <div className="flex-1 h-1.5 bg-[#050c18]">
                    <div className="h-full bg-green-500/60" style={{ width: `${Math.min(100, (d.count / (domains?.domains?.[0]?.count ?? 1)) * 100)}%` }} />
                  </div>
                  <div className="text-[10px] text-slate-600 w-5 text-right">{d.count}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Open Alerts */}
        <div className="border border-green-900/30 bg-[#070e1c] p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-[10px] text-slate-500 tracking-widest flex items-center gap-1.5"><Bell className="h-3 w-3" /> OPEN ALERTS</div>
            <Link href="/alerts" className="text-[9px] text-green-700 hover:text-green-400">ALL →</Link>
          </div>
          <div className="space-y-1.5">
            {(alertsList ?? []).slice(0,7).map((a: any) => (
              <div key={a.id} className="flex items-center gap-2 text-[10px]">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: SEV_COLOR[a.severity] ?? "#94a3b8" }} />
                <span className="text-slate-300 truncate flex-1">{a.title}</span>
                <span className="text-slate-600 capitalize text-[9px]">{a.domain}</span>
              </div>
            ))}
            {!alertsList?.length && <div className="text-[10px] text-slate-600">No open alerts</div>}
          </div>
        </div>

        {/* Priority Threats */}
        <div className="border border-green-900/30 bg-[#070e1c] p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-[10px] text-slate-500 tracking-widest flex items-center gap-1.5"><AlertTriangle className="h-3 w-3" /> PRIORITY THREATS</div>
            <Link href="/threats" className="text-[9px] text-green-700 hover:text-green-400">ALL →</Link>
          </div>
          <div className="space-y-1.5">
            {(threats ?? []).slice(0,7).map((t: any) => (
              <div key={t.id} className="flex items-center gap-2 text-[10px]">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: SEV_COLOR[t.severity] ?? "#94a3b8" }} />
                <span className="text-slate-300 truncate flex-1">{t.title}</span>
                <span className="text-slate-600 text-[9px]">{t.region?.split(" ")[0]}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Activity feed */}
        <div className="border border-green-900/30 bg-[#070e1c] p-4">
          <div className="text-[10px] text-slate-500 tracking-widest mb-3 flex items-center gap-1.5"><Activity className="h-3 w-3" /> LIVE FEED</div>
          <div className="space-y-1.5 max-h-44 overflow-y-auto">
            {recentAlerts.slice(0, 3).map((a: any, i) => (
              <div key={`ws-${i}`} className="border-l-2 border-orange-900/60 pl-2 py-0.5">
                <div className="text-[10px] text-orange-400 truncate">⚡ {a.title}</div>
                <div className="text-[9px] text-slate-600">LIVE · {a.severity?.toUpperCase()}</div>
              </div>
            ))}
            {(activity ?? []).slice(0,12).map((e: any) => (
              <div key={e.id} className={`border-l-2 pl-2 py-0.5 ${e.severity === "critical" ? "border-red-900/50" : e.severity === "high" ? "border-orange-900/50" : "border-green-900/30"}`}>
                <div className="text-[10px] text-slate-400 truncate">{e.title || e.type?.replace(/_/g," ")?.toUpperCase()}</div>
                <div className="text-[9px] text-slate-600">{e.region} · {new Date(e.timestamp).toLocaleTimeString()}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Regional chart */}
      <div className="border border-green-900/30 bg-[#070e1c] p-4">
        <div className="text-[10px] text-slate-500 tracking-widest mb-4 flex items-center gap-1.5"><Globe className="h-3.5 w-3.5" /> REGIONAL THREAT DISTRIBUTION</div>
        <div className="h-28">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={(regions?.regions ?? []).slice(0, 12)} margin={{ top: 5, right: 10, bottom: 20, left: -25 }}>
              <CartesianGrid strokeDasharray="2 4" stroke="#0f200f" />
              <XAxis dataKey="name" tick={{ fill: "#475569", fontSize: 8 }} angle={-25} textAnchor="end" />
              <YAxis tick={{ fill: "#475569", fontSize: 8 }} />
              <Tooltip contentStyle={{ background: "#070e1c", border: "1px solid #14532d", borderRadius: 0, fontSize: 10, fontFamily: "monospace" }} />
              <Bar dataKey="threats" fill="#22c55e" opacity={0.7} />
              <Bar dataKey="critical" fill="#ef4444" opacity={0.8} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
