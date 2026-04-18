import { useQuery } from "@tanstack/react-query";
import { getAnalyticsOverview, getThreatTrend, getDomainStats, getRegionStats, getAssetStats, getAlertMttr } from "@/lib/api";
import { BarChart3, TrendingUp, Globe, Navigation, Clock, AlertTriangle } from "lucide-react";
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, RadarChart, Radar, PolarGrid, PolarAngleAxis } from "recharts";

const COLORS = ["#ef4444","#f97316","#eab308","#22c55e","#06b6d4","#8b5cf6","#ec4899","#14b8a6","#f59e0b","#84cc16","#a78bfa","#fb7185","#34d399","#60a5fa","#c084fc"];
const SEV_COLORS = { critical: "#ef4444", high: "#f97316", medium: "#eab308", low: "#22c55e" };

function Section({ title, icon: Icon, children }: any) {
  return (
    <div className="border border-green-900/30 bg-[#070e1c] p-4">
      <div className="text-[10px] text-slate-500 tracking-widest mb-4 flex items-center gap-2">
        <Icon className="h-3.5 w-3.5" /> {title}
      </div>
      {children}
    </div>
  );
}

export default function AnalyticsPage() {
  const { data: overview } = useQuery({ queryKey: ["analytics-overview"], queryFn: getAnalyticsOverview, refetchInterval: 60000 });
  const { data: trend } = useQuery({ queryKey: ["threat-trend"], queryFn: getThreatTrend, refetchInterval: 60000 });
  const { data: domains } = useQuery({ queryKey: ["domain-stats"], queryFn: getDomainStats, refetchInterval: 60000 });
  const { data: regions } = useQuery({ queryKey: ["region-stats"], queryFn: getRegionStats, refetchInterval: 60000 });
  const { data: assets } = useQuery({ queryKey: ["asset-stats"], queryFn: getAssetStats, refetchInterval: 60000 });
  const { data: mttr } = useQuery({ queryKey: ["alert-mttr"], queryFn: getAlertMttr, refetchInterval: 60000 });

  const counts = overview?.counts ?? {};

  const domainData = (domains?.domains ?? []).map((d: any, i: number) => ({
    name: d.name.replace("_"," ").replace(/\b\w/g, (c: string) => c.toUpperCase()),
    count: d.count,
    critical: d.critical,
    fill: COLORS[i % COLORS.length],
  }));

  const assetByType = Object.entries(assets?.byType ?? {}).map(([name, value]) => ({ name, value: value as number }));
  const assetByAff = Object.entries(assets?.byAffiliation ?? {}).map(([name, value]) => ({ name, value: value as number, fill: name === "friendly" ? "#22c55e" : name === "hostile" ? "#ef4444" : name === "neutral" ? "#eab308" : "#94a3b8" }));

  const radarData = (domains?.domains ?? []).slice(0, 8).map((d: any) => ({
    domain: d.name.replace("_"," "),
    alerts: d.count,
    critical: d.critical,
  }));

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-2">
        <BarChart3 className="h-5 w-5 text-purple-400" />
        <h1 className="text-lg font-bold text-purple-400 tracking-widest">ANALYTICS DASHBOARD</h1>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
        {[
          ["THREATS", counts.threats, "#ef4444"], ["ALERTS", counts.alerts, "#f97316"], ["INCIDENTS", counts.incidents, "#eab308"],
          ["ASSETS", counts.assets, "#22c55e"], ["SIGNALS", counts.signals, "#06b6d4"], ["CASES", counts.cases, "#8b5cf6"],
        ].map(([label, value, color]) => (
          <div key={label as string} className="border border-green-900/20 bg-[#070e1c] p-3">
            <div className="text-2xl font-bold" style={{ color: color as string }}>{value ?? 0}</div>
            <div className="text-[9px] text-slate-600 mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* Threat trend */}
      <Section title="24H THREAT TREND — BY SEVERITY" icon={TrendingUp}>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trend?.trend ?? []} margin={{ top: 5, right: 5, bottom: 5, left: -25 }}>
              <defs>
                {Object.entries(SEV_COLORS).map(([k, c]) => (
                  <linearGradient key={k} id={`ag-${k}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={c} stopOpacity={0.4} />
                    <stop offset="95%" stopColor={c} stopOpacity={0} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="2 4" stroke="#0f200f" />
              <XAxis dataKey="label" tick={{ fill: "#475569", fontSize: 9 }} />
              <YAxis tick={{ fill: "#475569", fontSize: 9 }} />
              <Tooltip contentStyle={{ background: "#070e1c", border: "1px solid #14532d", borderRadius: 0, fontSize: 10, fontFamily: "monospace" }} />
              <Legend wrapperStyle={{ fontSize: 9, color: "#475569" }} />
              {Object.entries(SEV_COLORS).map(([k, c]) => (
                <Area key={k} type="monotone" dataKey={k} stroke={c} fill={`url(#ag-${k})`} strokeWidth={1.5} name={k.toUpperCase()} />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Section>

      {/* Domain + Region row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Section title="ALERT DISTRIBUTION BY DOMAIN" icon={AlertTriangle}>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={domainData.slice(0, 10)} margin={{ top: 5, right: 5, bottom: 20, left: -20 }}>
                <CartesianGrid strokeDasharray="2 4" stroke="#0f200f" />
                <XAxis dataKey="name" tick={{ fill: "#475569", fontSize: 8 }} angle={-30} textAnchor="end" />
                <YAxis tick={{ fill: "#475569", fontSize: 8 }} />
                <Tooltip contentStyle={{ background: "#070e1c", border: "1px solid #14532d", borderRadius: 0, fontSize: 10, fontFamily: "monospace" }} />
                <Bar dataKey="count" name="Total" fill="#22c55e" opacity={0.7} />
                <Bar dataKey="critical" name="Critical" fill="#ef4444" opacity={0.8} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Section>

        <Section title="REGIONAL THREAT INDEX" icon={Globe}>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={(regions?.regions ?? []).slice(0, 10)} layout="vertical" margin={{ top: 5, right: 10, bottom: 5, left: 60 }}>
                <CartesianGrid strokeDasharray="2 4" stroke="#0f200f" horizontal={false} />
                <XAxis type="number" tick={{ fill: "#475569", fontSize: 8 }} />
                <YAxis type="category" dataKey="name" tick={{ fill: "#475569", fontSize: 8 }} width={55} />
                <Tooltip contentStyle={{ background: "#070e1c", border: "1px solid #14532d", borderRadius: 0, fontSize: 10, fontFamily: "monospace" }} />
                <Bar dataKey="threats" name="Threats" fill="#22c55e" opacity={0.7} />
                <Bar dataKey="critical" name="Critical" fill="#ef4444" opacity={0.8} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Section>
      </div>

      {/* Asset + MTTR row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Section title="ASSET AFFILIATION" icon={Navigation}>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={assetByAff} cx="50%" cy="50%" outerRadius={60} dataKey="value" nameKey="name" label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                  {assetByAff.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "#070e1c", border: "1px solid #14532d", borderRadius: 0, fontSize: 10 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Section>

        <Section title="ASSET TYPES" icon={Navigation}>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={assetByType} cx="50%" cy="50%" innerRadius={30} outerRadius={60} dataKey="value" nameKey="name" label={({ name }) => name}>
                  {assetByType.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "#070e1c", border: "1px solid #14532d", borderRadius: 0, fontSize: 10 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Section>

        <Section title="ALERT MTTR TREND (7 DAYS)" icon={Clock}>
          <div className="text-xl font-bold text-green-400 mb-1">{mttr?.avgMttrMinutes ?? 0}<span className="text-xs text-slate-600 ml-1">min avg</span></div>
          <div className="h-28">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mttr?.trend ?? []} margin={{ top: 5, right: 5, bottom: 5, left: -25 }}>
                <CartesianGrid strokeDasharray="2 4" stroke="#0f200f" />
                <XAxis dataKey="day" tick={{ fill: "#475569", fontSize: 8 }} />
                <YAxis tick={{ fill: "#475569", fontSize: 8 }} />
                <Tooltip contentStyle={{ background: "#070e1c", border: "1px solid #14532d", borderRadius: 0, fontSize: 10 }} />
                <Bar dataKey="mttr" name="MTTR (min)" fill="#06b6d4" opacity={0.8} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Section>
      </div>

      {/* Domain radar */}
      <Section title="MULTI-DOMAIN ALERT RADAR" icon={BarChart3}>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={radarData}>
              <PolarGrid stroke="#0f200f" />
              <PolarAngleAxis dataKey="domain" tick={{ fill: "#475569", fontSize: 9 }} />
              <Radar name="Alerts" dataKey="alerts" stroke="#22c55e" fill="#22c55e" fillOpacity={0.15} />
              <Radar name="Critical" dataKey="critical" stroke="#ef4444" fill="#ef4444" fillOpacity={0.15} />
              <Legend wrapperStyle={{ fontSize: 9, color: "#475569" }} />
              <Tooltip contentStyle={{ background: "#070e1c", border: "1px solid #14532d", borderRadius: 0, fontSize: 10, fontFamily: "monospace" }} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </Section>
    </div>
  );
}
