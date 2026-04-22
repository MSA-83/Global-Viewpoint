import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { listAssets } from "@/lib/api";
import { Navigation, Search, X } from "lucide-react";

const AFF_COLOR: Record<string, string> = {
  friendly: "text-blue-400 border-blue-900/40",
  hostile: "text-red-400 border-red-900/40",
  neutral: "text-green-400 border-green-900/40",
  unknown: "text-slate-400 border-slate-700",
};

export default function AssetsPage() {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<any>(null);
  const [domainFilter, setDomainFilter] = useState("all");

  const { data: assets, isLoading } = useQuery({
    queryKey: ["assets"],
    queryFn: listAssets,
    refetchInterval: 15000,
  });

  const filtered = (assets ?? []).filter((a: any) =>
    (domainFilter === "all" || a.domain === domainFilter) &&
    (!search || a.name?.toLowerCase().includes(search.toLowerCase()) || a.designation?.toLowerCase().includes(search.toLowerCase()))
  );

  const domains = Array.from(new Set((assets ?? []).map((a: any) => a.domain).filter(Boolean)));

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Navigation className="h-5 w-5 text-cyan-400" />
          <h1 className="text-lg font-bold text-cyan-400 tracking-widest">ASSET TRACKING</h1>
        </div>
        <div className="text-[10px] text-slate-500">{filtered.length} ASSETS LIVE</div>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-600" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search assets..."
            className="w-full bg-[#070e1c] border border-green-900/30 text-slate-300 text-[11px] pl-7 pr-2 py-1.5 focus:outline-none focus:border-green-700" />
        </div>
        <select value={domainFilter} onChange={e => setDomainFilter(e.target.value)}
          className="bg-[#070e1c] border border-green-900/30 text-slate-300 text-[11px] px-2 py-1.5 focus:outline-none">
          <option value="all">ALL DOMAINS</option>
          {domains.map((d: any) => <option key={d} value={d}>{d.toUpperCase()}</option>)}
        </select>
      </div>

      {isLoading ? (
        <div className="text-[10px] text-slate-600 py-8 text-center">LOADING...</div>
      ) : (
        <div className="border border-green-900/30 bg-[#070e1c]">
          <div className="grid grid-cols-12 gap-2 text-[9px] text-slate-500 px-3 py-2 border-b border-green-900/30 bg-[#050c18]">
            <div className="col-span-3">NAME / CALLSIGN</div>
            <div className="col-span-2">DOMAIN</div>
            <div className="col-span-2">TYPE</div>
            <div className="col-span-2">AFFILIATION</div>
            <div className="col-span-2">POSITION</div>
            <div className="col-span-1">SPEED</div>
          </div>
          <div className="max-h-[calc(100vh-220px)] overflow-y-auto">
            {filtered.map((a: any) => (
              <div key={a.id} onClick={() => setSelected(a)}
                className="grid grid-cols-12 gap-2 text-[10px] px-3 py-2 border-b border-green-900/10 hover:bg-green-950/10 cursor-pointer">
                <div className="col-span-3 text-slate-300 truncate">{a.name} {a.designation && <span className="text-slate-600">/ {a.designation}</span>}</div>
                <div className="col-span-2 text-slate-500 uppercase">{a.domain}</div>
                <div className="col-span-2 text-slate-500">{a.type || "-"}</div>
                <div className="col-span-2"><span className={`px-1.5 py-0.5 border ${AFF_COLOR[a.affiliation] ?? ""}`}>{a.affiliation?.toUpperCase()}</span></div>
                <div className="col-span-2 text-cyan-400 font-mono text-[9px]">{a.lat?.toFixed(2)}, {a.lng?.toFixed(2)}</div>
                <div className="col-span-1 text-slate-400 font-mono">{a.speed ? `${Math.round(a.speed)}kt` : "-"}</div>
              </div>
            ))}
            {filtered.length === 0 && <div className="text-[10px] text-slate-600 py-8 text-center">NO ASSETS</div>}
          </div>
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setSelected(null)}>
          <div onClick={e => e.stopPropagation()} className="bg-[#070e1c] border border-cyan-900/40 max-w-2xl w-full p-5">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className={`inline-block text-[9px] px-1.5 py-0.5 border mb-2 ${AFF_COLOR[selected.affiliation] ?? ""}`}>{selected.affiliation?.toUpperCase()}</div>
                <div className="text-sm font-bold text-slate-200">{selected.name}</div>
                {selected.designation && <div className="text-[10px] text-slate-500">{selected.designation}</div>}
              </div>
              <button onClick={() => setSelected(null)}><X className="h-4 w-4 text-slate-500" /></button>
            </div>
            <div className="grid grid-cols-3 gap-3 text-[10px]">
              <div><div className="text-slate-600 mb-0.5">DOMAIN</div><div className="text-slate-300 uppercase">{selected.domain}</div></div>
              <div><div className="text-slate-600 mb-0.5">TYPE</div><div className="text-slate-300">{selected.type}</div></div>
              <div><div className="text-slate-600 mb-0.5">FLAG</div><div className="text-slate-300">{selected.flag || selected.country || "-"}</div></div>
              <div><div className="text-slate-600 mb-0.5">LATITUDE</div><div className="text-cyan-400 font-mono">{selected.lat?.toFixed(4)}</div></div>
              <div><div className="text-slate-600 mb-0.5">LONGITUDE</div><div className="text-cyan-400 font-mono">{selected.lng?.toFixed(4)}</div></div>
              <div><div className="text-slate-600 mb-0.5">ALTITUDE</div><div className="text-slate-300 font-mono">{selected.altitude ? `${Math.round(selected.altitude)}ft` : "-"}</div></div>
              <div><div className="text-slate-600 mb-0.5">SPEED</div><div className="text-slate-300 font-mono">{selected.speed ? `${Math.round(selected.speed)} kt` : "-"}</div></div>
              <div><div className="text-slate-600 mb-0.5">HEADING</div><div className="text-slate-300 font-mono">{selected.heading ? `${Math.round(selected.heading)}°` : "-"}</div></div>
              <div><div className="text-slate-600 mb-0.5">STATUS</div><div className="text-green-400">{selected.status?.toUpperCase() || "ACTIVE"}</div></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
