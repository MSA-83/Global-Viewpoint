import { useState, useEffect, useRef } from "react";
import { globalSearch } from "@/lib/api";
import { Search, AlertTriangle, Shield, Navigation, Radio, Bell, Briefcase, Network, Loader2 } from "lucide-react";

const TYPE_CONFIG: Record<string, { icon: any; color: string; label: string }> = {
  threat: { icon: AlertTriangle, color: "text-red-400", label: "THREAT" },
  incident: { icon: Shield, color: "text-yellow-400", label: "INCIDENT" },
  asset: { icon: Navigation, color: "text-green-400", label: "ASSET" },
  signal: { icon: Radio, color: "text-cyan-400", label: "SIGNAL" },
  alert: { icon: Bell, color: "text-orange-400", label: "ALERT" },
  case: { icon: Briefcase, color: "text-blue-400", label: "CASE" },
  knowledge: { icon: Network, color: "text-purple-400", label: "ENTITY" },
};

const SEV_COLOR: Record<string, string> = {
  critical: "text-red-400", high: "text-orange-400", medium: "text-yellow-400", low: "text-green-400",
};

function ResultItem({ item }: { item: any }) {
  const config = TYPE_CONFIG[item._type] ?? { icon: Search, color: "text-slate-400", label: item._type?.toUpperCase() };
  const Icon = config.icon;
  const label = item.title || item.name || item.label || item.caseNumber || "—";
  const sub = item.region || item.country || item.domain || item.source || "";
  const sev = item.severity || item.threatLevel || item.priority;
  return (
    <div className="flex items-start gap-3 border border-green-900/20 bg-[#070e1c] p-3 hover:border-green-900/40 transition-colors">
      <div className={`shrink-0 mt-0.5 ${config.color}`}><Icon className="h-4 w-4" /></div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-[9px] font-bold tracking-wider ${config.color}`}>{config.label}</span>
          {sev && <span className={`text-[9px] ${SEV_COLOR[sev] ?? "text-slate-500"} uppercase`}>{sev}</span>}
          {item.confidence && <span className="text-[9px] text-slate-600">{item.confidence}% CONF</span>}
        </div>
        <div className="text-[11px] text-slate-200 mt-0.5 truncate">{label}</div>
        <div className="flex gap-3 mt-0.5 text-[9px] text-slate-600 flex-wrap">
          {sub && <span>{sub}</span>}
          {item.status && <span className="uppercase">{item.status}</span>}
          {item.type && <span className="capitalize">{item.type}</span>}
          {item.latitude && item.longitude && <span>{Number(item.latitude).toFixed(2)}°, {Number(item.longitude).toFixed(2)}°</span>}
        </div>
        {item.description && <div className="text-[9px] text-slate-500 mt-1 line-clamp-2">{item.description}</div>}
      </div>
    </div>
  );
}

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const doSearch = async (q: string) => {
    if (!q.trim()) { setResults(null); return; }
    setLoading(true);
    setError("");
    try {
      const r = await globalSearch(q, 30);
      setResults(r);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => doSearch(query), 400);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [query]);

  const allResults = results ? [
    ...results.results.threats.map((i: any) => ({ ...i, _type: "threat" })),
    ...results.results.incidents.map((i: any) => ({ ...i, _type: "incident" })),
    ...results.results.assets.map((i: any) => ({ ...i, _type: "asset" })),
    ...results.results.signals.map((i: any) => ({ ...i, _type: "signal" })),
    ...results.results.alerts.map((i: any) => ({ ...i, _type: "alert" })),
    ...results.results.cases.map((i: any) => ({ ...i, _type: "case" })),
    ...results.results.knowledge.map((i: any) => ({ ...i, _type: "knowledge" })),
  ] : [];

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Search className="h-5 w-5 text-slate-400" />
        <h1 className="text-lg font-bold text-slate-300 tracking-widest">GLOBAL INTELLIGENCE SEARCH</h1>
      </div>

      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-600" />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search threats, assets, vessels, signals, cases, entities..."
          autoFocus
          className="w-full bg-[#070e1c] border border-green-900/40 text-slate-200 pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-green-500/60 placeholder-slate-700 font-mono"
        />
        {loading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-600 animate-spin" />}
      </div>

      {/* Quick filters */}
      <div className="flex gap-2 flex-wrap text-[9px] text-slate-600">
        {["APT","missile","vessel","aircraft","Iran","Russia","North Korea","critical infrastructure","cyber"].map(term => (
          <button key={term} onClick={() => setQuery(term)} className="border border-slate-800 px-2 py-0.5 hover:border-green-900/40 hover:text-green-500 transition-colors">
            {term}
          </button>
        ))}
      </div>

      {/* Results */}
      {error && <div className="text-[10px] text-red-400 border border-red-900/30 p-3">{error}</div>}

      {results && (
        <div>
          <div className="text-[10px] text-slate-600 mb-3">
            Found <span className="text-green-400">{results.total}</span> results for "<span className="text-slate-400">{results.query}</span>"
          </div>

          {/* Type summary */}
          <div className="flex gap-2 flex-wrap mb-4">
            {Object.entries(results.results).map(([type, items]: [string, any]) =>
              items.length > 0 ? (
                <div key={type} className={`flex items-center gap-1 text-[9px] border px-2 py-0.5 ${TYPE_CONFIG[type]?.color?.replace("text-","border-")?.replace("400","900/40") ?? "border-slate-800"}`}>
                  <span className={TYPE_CONFIG[type]?.color}>{TYPE_CONFIG[type]?.label ?? type.toUpperCase()}</span>
                  <span className="text-slate-600">{items.length}</span>
                </div>
              ) : null
            )}
          </div>

          <div className="space-y-2">
            {allResults.map((item: any, i) => <ResultItem key={i} item={item} />)}
          </div>
        </div>
      )}

      {!query && !results && (
        <div className="border border-green-900/20 bg-[#070e1c] p-6 text-center">
          <Search className="h-8 w-8 text-slate-700 mx-auto mb-3" />
          <div className="text-[11px] text-slate-600">Search across all intelligence domains</div>
          <div className="text-[9px] text-slate-700 mt-2">Threats • Assets • Incidents • Signals • Alerts • Cases • Knowledge Graph</div>
        </div>
      )}
    </div>
  );
}
