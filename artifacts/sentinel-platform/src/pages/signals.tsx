import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { listSignals } from "@/lib/api";
import { Radio, Search, X } from "lucide-react";

const TYPE_COLOR: Record<string, string> = {
  comint: "text-blue-400 border-blue-900/40",
  elint: "text-purple-400 border-purple-900/40",
  fisint: "text-orange-400 border-orange-900/40",
  radar: "text-cyan-400 border-cyan-900/40",
};

export default function SignalsPage() {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<any>(null);

  const { data: signals, isLoading } = useQuery({
    queryKey: ["signals"],
    queryFn: listSignals,
    refetchInterval: 30000,
  });

  const filtered = (signals ?? []).filter((s: any) =>
    !search || s.source?.toLowerCase().includes(search.toLowerCase()) || s.frequency?.toString().includes(search)
  );

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Radio className="h-5 w-5 text-purple-400" />
          <h1 className="text-lg font-bold text-purple-400 tracking-widest">SIGINT INTERCEPTS</h1>
        </div>
        <div className="text-[10px] text-slate-500">{filtered.length} INTERCEPTS</div>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-600" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search signals..."
          className="w-full bg-[#070e1c] border border-green-900/30 text-slate-300 text-[11px] pl-7 pr-2 py-1.5 focus:outline-none focus:border-green-700" />
      </div>

      {isLoading ? (
        <div className="text-[10px] text-slate-600 py-8 text-center">SCANNING...</div>
      ) : (
        <div className="border border-green-900/30 bg-[#070e1c]">
          <div className="grid grid-cols-12 gap-2 text-[9px] text-slate-500 px-3 py-2 border-b border-green-900/30 bg-[#050c18]">
            <div className="col-span-2">TYPE</div>
            <div className="col-span-2">FREQ (MHz)</div>
            <div className="col-span-3">SOURCE</div>
            <div className="col-span-2">REGION</div>
            <div className="col-span-2">CONFIDENCE</div>
            <div className="col-span-1">SIG</div>
          </div>
          <div className="max-h-[calc(100vh-220px)] overflow-y-auto">
            {filtered.map((s: any) => (
              <div key={s.id} onClick={() => setSelected(s)}
                className="grid grid-cols-12 gap-2 text-[10px] px-3 py-2 border-b border-green-900/10 hover:bg-green-950/10 cursor-pointer">
                <div className="col-span-2"><span className={`px-1.5 py-0.5 border ${TYPE_COLOR[s.type] ?? "text-slate-400 border-slate-700"}`}>{s.type?.toUpperCase()}</span></div>
                <div className="col-span-2 text-cyan-400 font-mono">{s.frequency?.toFixed(2) || "-"}</div>
                <div className="col-span-3 text-slate-300 truncate">{s.source || "UNKNOWN"}</div>
                <div className="col-span-2 text-slate-500">{s.region || "-"}</div>
                <div className="col-span-2 text-slate-400 font-mono">{s.confidence ? `${Math.round(s.confidence * 100)}%` : "-"}</div>
                <div className="col-span-1 text-yellow-400 font-mono">{s.signalStrength?.toFixed(0) || "-"}</div>
              </div>
            ))}
            {filtered.length === 0 && <div className="text-[10px] text-slate-600 py-8 text-center">NO INTERCEPTS</div>}
          </div>
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setSelected(null)}>
          <div onClick={e => e.stopPropagation()} className="bg-[#070e1c] border border-purple-900/40 max-w-2xl w-full p-5">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className={`inline-block text-[9px] px-1.5 py-0.5 border mb-2 ${TYPE_COLOR[selected.type] ?? ""}`}>{selected.type?.toUpperCase()}</div>
                <div className="text-sm font-bold text-slate-200">{selected.source || "UNKNOWN EMITTER"}</div>
              </div>
              <button onClick={() => setSelected(null)}><X className="h-4 w-4 text-slate-500" /></button>
            </div>
            <div className="grid grid-cols-3 gap-3 text-[10px]">
              <div><div className="text-slate-600 mb-0.5">FREQUENCY</div><div className="text-cyan-400 font-mono">{selected.frequency?.toFixed(3)} MHz</div></div>
              <div><div className="text-slate-600 mb-0.5">SIGNAL</div><div className="text-yellow-400 font-mono">{selected.signalStrength?.toFixed(1)} dBm</div></div>
              <div><div className="text-slate-600 mb-0.5">CONFIDENCE</div><div className="text-slate-300 font-mono">{Math.round((selected.confidence ?? 0) * 100)}%</div></div>
              <div><div className="text-slate-600 mb-0.5">REGION</div><div className="text-slate-300">{selected.region}</div></div>
              <div><div className="text-slate-600 mb-0.5">LATITUDE</div><div className="text-cyan-400 font-mono">{selected.lat?.toFixed(4)}</div></div>
              <div><div className="text-slate-600 mb-0.5">LONGITUDE</div><div className="text-cyan-400 font-mono">{selected.lng?.toFixed(4)}</div></div>
            </div>
            {selected.description && <div className="text-[11px] text-slate-400 mt-3 pt-3 border-t border-green-900/30">{selected.description}</div>}
          </div>
        </div>
      )}
    </div>
  );
}
