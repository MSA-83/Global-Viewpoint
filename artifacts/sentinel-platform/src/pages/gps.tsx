import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { listGpsAnomalies } from "@/lib/api";
import { Satellite, Search, X, Activity } from "lucide-react";

const TYPE_COLOR: Record<string, string> = {
  spoofing: "text-red-400 border-red-900/40 bg-red-950/30",
  jamming: "text-orange-400 border-orange-900/40 bg-orange-950/30",
  interference: "text-yellow-400 border-yellow-900/40 bg-yellow-950/30",
  drift: "text-blue-400 border-blue-900/40 bg-blue-950/30",
};

export default function GpsPage() {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<any>(null);

  const { data: anomalies, isLoading } = useQuery({
    queryKey: ["gps"],
    queryFn: listGpsAnomalies,
    refetchInterval: 30000,
  });

  const filtered = (anomalies ?? []).filter((a: any) =>
    !search || a.region?.toLowerCase().includes(search.toLowerCase()) || a.type?.toLowerCase().includes(search.toLowerCase())
  );

  const stats = {
    total: filtered.length,
    spoofing: filtered.filter((a: any) => a.type === "spoofing").length,
    jamming: filtered.filter((a: any) => a.type === "jamming").length,
    interference: filtered.filter((a: any) => a.type === "interference").length,
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Satellite className="h-5 w-5 text-yellow-400" />
          <h1 className="text-lg font-bold text-yellow-400 tracking-widest">GPS ANOMALY MONITOR</h1>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-slate-500">
          <Activity className="h-3 w-3 text-green-400 animate-pulse" /> LIVE
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "TOTAL EVENTS", val: stats.total, color: "text-slate-300" },
          { label: "SPOOFING", val: stats.spoofing, color: "text-red-400" },
          { label: "JAMMING", val: stats.jamming, color: "text-orange-400" },
          { label: "INTERFERENCE", val: stats.interference, color: "text-yellow-400" },
        ].map(s => (
          <div key={s.label} className="border border-green-900/30 bg-[#070e1c] p-3">
            <div className="text-[9px] text-slate-500">{s.label}</div>
            <div className={`text-2xl font-bold font-mono ${s.color}`}>{s.val}</div>
          </div>
        ))}
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-600" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search anomalies..."
          className="w-full bg-[#070e1c] border border-green-900/30 text-slate-300 text-[11px] pl-7 pr-2 py-1.5 focus:outline-none focus:border-green-700" />
      </div>

      {isLoading ? (
        <div className="text-[10px] text-slate-600 py-8 text-center">SCANNING...</div>
      ) : (
        <div className="border border-green-900/30 bg-[#070e1c]">
          <div className="grid grid-cols-12 gap-2 text-[9px] text-slate-500 px-3 py-2 border-b border-green-900/30 bg-[#050c18]">
            <div className="col-span-2">TYPE</div>
            <div className="col-span-3">REGION</div>
            <div className="col-span-2">POSITION</div>
            <div className="col-span-2">RADIUS (km)</div>
            <div className="col-span-2">CONFIDENCE</div>
            <div className="col-span-1">DUR</div>
          </div>
          <div className="max-h-[calc(100vh-320px)] overflow-y-auto">
            {filtered.map((a: any) => (
              <div key={a.id} onClick={() => setSelected(a)}
                className="grid grid-cols-12 gap-2 text-[10px] px-3 py-2 border-b border-green-900/10 hover:bg-green-950/10 cursor-pointer">
                <div className="col-span-2"><span className={`px-1.5 py-0.5 border ${TYPE_COLOR[a.type] ?? ""}`}>{a.type?.toUpperCase()}</span></div>
                <div className="col-span-3 text-slate-300 truncate">{a.region || "-"}</div>
                <div className="col-span-2 text-cyan-400 font-mono text-[9px]">{a.lat?.toFixed(2)}, {a.lng?.toFixed(2)}</div>
                <div className="col-span-2 text-yellow-400 font-mono">{a.radius?.toFixed(0) || "-"}</div>
                <div className="col-span-2 text-slate-400 font-mono">{Math.round((a.confidence ?? 0) * 100)}%</div>
                <div className="col-span-1 text-slate-500 font-mono">{a.duration ? `${Math.round(a.duration / 60)}m` : "-"}</div>
              </div>
            ))}
            {filtered.length === 0 && <div className="text-[10px] text-slate-600 py-8 text-center">NO ANOMALIES DETECTED</div>}
          </div>
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setSelected(null)}>
          <div onClick={e => e.stopPropagation()} className="bg-[#070e1c] border border-yellow-900/40 max-w-2xl w-full p-5">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className={`inline-block text-[9px] px-1.5 py-0.5 border mb-2 ${TYPE_COLOR[selected.type] ?? ""}`}>{selected.type?.toUpperCase()}</div>
                <div className="text-sm font-bold text-slate-200">{selected.region || "UNKNOWN REGION"}</div>
              </div>
              <button onClick={() => setSelected(null)}><X className="h-4 w-4 text-slate-500" /></button>
            </div>
            <div className="grid grid-cols-3 gap-3 text-[10px]">
              <div><div className="text-slate-600 mb-0.5">LATITUDE</div><div className="text-cyan-400 font-mono">{selected.lat?.toFixed(4)}</div></div>
              <div><div className="text-slate-600 mb-0.5">LONGITUDE</div><div className="text-cyan-400 font-mono">{selected.lng?.toFixed(4)}</div></div>
              <div><div className="text-slate-600 mb-0.5">RADIUS</div><div className="text-yellow-400 font-mono">{selected.radius?.toFixed(0)} km</div></div>
              <div><div className="text-slate-600 mb-0.5">CONFIDENCE</div><div className="text-slate-300 font-mono">{Math.round((selected.confidence ?? 0) * 100)}%</div></div>
              <div><div className="text-slate-600 mb-0.5">SEVERITY</div><div className="text-orange-400 uppercase">{selected.severity || "MEDIUM"}</div></div>
              <div><div className="text-slate-600 mb-0.5">DURATION</div><div className="text-slate-300 font-mono">{selected.duration ? `${Math.round(selected.duration / 60)} min` : "-"}</div></div>
            </div>
            {selected.description && <div className="text-[11px] text-slate-400 mt-3 pt-3 border-t border-green-900/30">{selected.description}</div>}
          </div>
        </div>
      )}
    </div>
  );
}
