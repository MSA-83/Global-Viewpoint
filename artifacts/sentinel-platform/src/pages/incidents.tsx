import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listIncidents, updateIncident } from "@/lib/api";
import { ShieldAlert, Search, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const SEV_COLOR: Record<string, string> = {
  critical: "text-red-400 border-red-900/40",
  high: "text-orange-400 border-orange-900/40",
  medium: "text-yellow-400 border-yellow-900/40",
  low: "text-green-400 border-green-900/40",
};
const STATUS_COLOR: Record<string, string> = {
  open: "text-red-400", acknowledged: "text-yellow-400", investigating: "text-orange-400", resolved: "text-green-400", closed: "text-slate-500",
};

export default function IncidentsPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<any>(null);

  const { data: incidents, isLoading } = useQuery({
    queryKey: ["incidents"],
    queryFn: listIncidents,
    refetchInterval: 30000,
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: any) => updateIncident(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["incidents"] }); toast({ title: "Incident updated" }); setSelected(null); },
  });

  const filtered = (incidents ?? []).filter((i: any) =>
    !search || i.title?.toLowerCase().includes(search.toLowerCase()) || i.region?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-red-400" />
          <h1 className="text-lg font-bold text-red-400 tracking-widest">INCIDENT MANAGEMENT</h1>
        </div>
        <div className="text-[10px] text-slate-500">{filtered.length} INCIDENTS</div>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-600" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search incidents..."
          className="w-full bg-[#070e1c] border border-green-900/30 text-slate-300 text-[11px] pl-7 pr-2 py-1.5 focus:outline-none focus:border-green-700" />
      </div>

      {isLoading ? (
        <div className="text-[10px] text-slate-600 py-8 text-center">LOADING...</div>
      ) : (
        <div className="border border-green-900/30 bg-[#070e1c]">
          <div className="grid grid-cols-12 gap-2 text-[9px] text-slate-500 px-3 py-2 border-b border-green-900/30 bg-[#050c18]">
            <div className="col-span-1">SEV</div>
            <div className="col-span-5">TITLE</div>
            <div className="col-span-2">DOMAIN</div>
            <div className="col-span-2">REGION</div>
            <div className="col-span-2">STATUS</div>
          </div>
          <div className="max-h-[calc(100vh-220px)] overflow-y-auto">
            {filtered.map((i: any) => (
              <div key={i.id} onClick={() => setSelected(i)}
                className="grid grid-cols-12 gap-2 text-[10px] px-3 py-2 border-b border-green-900/10 hover:bg-green-950/10 cursor-pointer">
                <div className="col-span-1"><span className={`px-1.5 py-0.5 border ${SEV_COLOR[i.severity] ?? ""}`}>{i.severity?.toUpperCase()}</span></div>
                <div className="col-span-5 text-slate-300 truncate">{i.title}</div>
                <div className="col-span-2 text-slate-500 uppercase">{i.domain || "-"}</div>
                <div className="col-span-2 text-slate-500">{i.region || "-"}</div>
                <div className={`col-span-2 ${STATUS_COLOR[i.status] ?? "text-slate-500"}`}>{i.status?.toUpperCase()}</div>
              </div>
            ))}
            {filtered.length === 0 && <div className="text-[10px] text-slate-600 py-8 text-center">NO INCIDENTS</div>}
          </div>
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setSelected(null)}>
          <div onClick={e => e.stopPropagation()} className="bg-[#070e1c] border border-red-900/40 max-w-2xl w-full p-5">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className={`inline-block text-[9px] px-1.5 py-0.5 border mb-2 ${SEV_COLOR[selected.severity] ?? ""}`}>{selected.severity?.toUpperCase()}</div>
                <div className="text-sm font-bold text-slate-200">{selected.title}</div>
              </div>
              <button onClick={() => setSelected(null)}><X className="h-4 w-4 text-slate-500" /></button>
            </div>
            <div className="text-[11px] text-slate-400 mb-4">{selected.description || "No description."}</div>
            <div className="grid grid-cols-3 gap-3 text-[10px] mb-4">
              <div><div className="text-slate-600 mb-0.5">DOMAIN</div><div className="text-slate-300 uppercase">{selected.domain}</div></div>
              <div><div className="text-slate-600 mb-0.5">REGION</div><div className="text-slate-300">{selected.region}</div></div>
              <div><div className="text-slate-600 mb-0.5">STATUS</div><div className={STATUS_COLOR[selected.status]}>{selected.status?.toUpperCase()}</div></div>
            </div>
            <div className="flex gap-2">
              {selected.status !== "investigating" && <button onClick={() => updateMut.mutate({ id: selected.id, data: { status: "investigating" } })} className="flex-1 bg-orange-950/40 border border-orange-900/40 text-orange-400 text-[10px] py-2">INVESTIGATE</button>}
              {selected.status !== "resolved" && <button onClick={() => updateMut.mutate({ id: selected.id, data: { status: "resolved" } })} className="flex-1 bg-green-950/40 border border-green-900/40 text-green-400 text-[10px] py-2">RESOLVE</button>}
              {selected.status !== "closed" && <button onClick={() => updateMut.mutate({ id: selected.id, data: { status: "closed" } })} className="flex-1 bg-slate-800/40 border border-slate-700 text-slate-400 text-[10px] py-2">CLOSE</button>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
