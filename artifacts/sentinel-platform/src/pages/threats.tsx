import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listThreats, deleteThreat, updateThreat, getMalwareSamples, getSecurityNews, getShodanSummary } from "@/lib/api";
import { AlertTriangle, Search, Filter, Trash2, X, Bug, Newspaper, Server, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const SEV_COLOR: Record<string, string> = {
  critical: "text-red-400 border-red-900/40 bg-red-950/30",
  high: "text-orange-400 border-orange-900/40 bg-orange-950/30",
  medium: "text-yellow-400 border-yellow-900/40 bg-yellow-950/30",
  low: "text-green-400 border-green-900/40 bg-green-950/30",
  info: "text-blue-400 border-blue-900/40 bg-blue-950/30",
};
const STATUS_COLOR: Record<string, string> = {
  active: "text-red-400", monitoring: "text-yellow-400", resolved: "text-green-400", investigating: "text-orange-400",
};

export default function ThreatsPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [sevFilter, setSevFilter] = useState<string>("all");
  const [selected, setSelected] = useState<any>(null);

  const { data: threats, isLoading } = useQuery({
    queryKey: ["threats", sevFilter],
    queryFn: () => listThreats(sevFilter !== "all" ? { severity: sevFilter } : undefined),
    refetchInterval: 30000,
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: any) => updateThreat(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["threats"] }); toast({ title: "Threat updated" }); },
  });

  const deleteMut = useMutation({
    mutationFn: deleteThreat,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["threats"] }); setSelected(null); toast({ title: "Threat removed" }); },
  });

  const filtered = (threats ?? []).filter((t: any) =>
    !search || t.title?.toLowerCase().includes(search.toLowerCase()) || t.region?.toLowerCase().includes(search.toLowerCase())
  );

  // Live threat intel feeds
  const { data: malware } = useQuery<any>({
    queryKey: ["intel", "malware"], queryFn: getMalwareSamples,
    refetchInterval: 5 * 60_000, retry: 1,
  });
  const { data: news } = useQuery<any>({
    queryKey: ["intel", "news-cyber"],
    queryFn: () => getSecurityNews("cyber attack OR ransomware OR data breach"),
    refetchInterval: 10 * 60_000, retry: 0,
  });
  const [shodanQ, setShodanQ] = useState("country:US port:22");
  const [shodanInput, setShodanInput] = useState("country:US port:22");
  const { data: shodan, isFetching: shodanLoading } = useQuery<any>({
    queryKey: ["intel", "shodan", shodanQ],
    queryFn: () => getShodanSummary(shodanQ),
    enabled: !!shodanQ, retry: 0,
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard?.writeText(text);
    toast({ title: "COPIED", description: text.slice(0, 32) + (text.length > 32 ? "…" : "") });
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-orange-400" />
          <h1 className="text-lg font-bold text-orange-400 tracking-widest">THREAT REGISTRY</h1>
        </div>
        <div className="text-[10px] text-slate-500">{filtered.length} ACTIVE RECORDS</div>
      </div>

      {/* LIVE THREAT INTEL */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Abuse.ch Malware Samples */}
        <div className="border border-fuchsia-900/40 bg-[#0a0510] p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="text-[10px] text-fuchsia-400 tracking-widest flex items-center gap-1.5">
              <Bug className="h-3 w-3" /> ABUSE.CH MALWARE BAZAAR
            </div>
            <span className="text-[9px] text-slate-600">{(malware?.samples ?? []).length} SAMPLES</span>
          </div>
          <div className="max-h-40 overflow-y-auto space-y-1 text-[10px] font-mono">
            {(malware?.samples ?? []).slice(0, 12).map((s: any) => (
              <div key={s.sha256} className="border-l-2 border-fuchsia-900/40 pl-2 py-0.5 group cursor-pointer hover:bg-fuchsia-950/20"
                onClick={() => copyToClipboard(s.sha256)} title="Click to copy SHA256">
                <div className="flex items-center gap-1">
                  <span className="px-1 py-0.5 bg-fuchsia-950/40 text-fuchsia-300 text-[8px]">{(s.type || "UNK").toUpperCase()}</span>
                  <span className="text-slate-300 truncate flex-1">{s.name}</span>
                  <Copy className="h-2.5 w-2.5 text-slate-700 group-hover:text-fuchsia-400" />
                </div>
                <div className="text-[9px] text-slate-600 truncate">{s.sha256?.slice(0, 24)}… · {s.firstSeen}</div>
              </div>
            ))}
            {!malware?.samples?.length && <div className="text-[10px] text-slate-700 py-3 text-center">FEED UNAVAILABLE</div>}
          </div>
        </div>

        {/* Cyber Security News */}
        <div className="border border-cyan-900/40 bg-[#050d18] p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="text-[10px] text-cyan-400 tracking-widest flex items-center gap-1.5">
              <Newspaper className="h-3 w-3" /> CYBER OSINT — NEWS
            </div>
            <span className="text-[9px] text-slate-600">{(news?.articles ?? []).length} STORIES</span>
          </div>
          <div className="max-h-40 overflow-y-auto space-y-1 text-[10px]">
            {(news?.articles ?? []).slice(0, 8).map((a: any, i: number) => (
              <a key={i} href={a.url} target="_blank" rel="noreferrer"
                className="block border-l-2 border-cyan-900/40 pl-2 py-0.5 hover:bg-cyan-950/20">
                <div className="text-slate-300 truncate">{a.title}</div>
                <div className="text-[9px] text-slate-600 truncate">{a.source} · {a.publishedAt ? new Date(a.publishedAt).toLocaleString() : ""}</div>
              </a>
            ))}
            {(!news?.articles?.length || news?.error) && (
              <div className="text-[10px] text-slate-700 py-3 text-center">
                {news?.error === "news_unavailable" ? "NEWSAPI RATE LIMITED · RETRY 10M" : "NO STORIES"}
              </div>
            )}
          </div>
        </div>

        {/* Shodan Host Lookup */}
        <div className="border border-orange-900/40 bg-[#100806] p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="text-[10px] text-orange-400 tracking-widest flex items-center gap-1.5">
              <Server className="h-3 w-3" /> SHODAN — EXPOSED ASSETS
            </div>
          </div>
          <form onSubmit={(e) => { e.preventDefault(); setShodanQ(shodanInput); }}
            className="flex gap-1 mb-2">
            <input value={shodanInput} onChange={e => setShodanInput(e.target.value)}
              placeholder="port:22 country:US"
              className="flex-1 bg-[#070e1c] border border-orange-900/30 text-slate-300 text-[10px] px-2 py-1 focus:outline-none focus:border-orange-700 font-mono" />
            <button type="submit" className="text-[9px] px-2 py-1 bg-orange-950/40 border border-orange-900/40 text-orange-400">QUERY</button>
          </form>
          {shodanLoading ? (
            <div className="text-[10px] text-slate-700 py-3 text-center">SCANNING SHODAN…</div>
          ) : shodan?.error ? (
            <div className="text-[10px] text-red-500 py-3 text-center">{shodan.message || shodan.error}</div>
          ) : (
            <div className="space-y-2">
              <div>
                <div className="text-[9px] text-slate-500">RESULTS · {shodan?.query}</div>
                <div className="text-3xl font-bold text-orange-400">{(shodan?.total ?? 0).toLocaleString()}</div>
                <div className="text-[9px] text-slate-600">exposed hosts on the internet</div>
              </div>
              <div className="grid grid-cols-2 gap-1 text-[9px]">
                {[
                  "port:22 country:CN", "port:445 country:RU",
                  "product:elasticsearch", "vuln:cve-2021-44228",
                ].map(q => (
                  <button key={q} onClick={() => { setShodanInput(q); setShodanQ(q); }}
                    className="text-left text-slate-500 hover:text-orange-400 truncate font-mono">› {q}</button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-2 items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-600" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search threats..."
            className="w-full bg-[#070e1c] border border-green-900/30 text-slate-300 text-[11px] pl-7 pr-2 py-1.5 focus:outline-none focus:border-green-700" />
        </div>
        <Filter className="h-3 w-3 text-slate-600" />
        <select value={sevFilter} onChange={e => setSevFilter(e.target.value)}
          className="bg-[#070e1c] border border-green-900/30 text-slate-300 text-[11px] px-2 py-1.5 focus:outline-none">
          {["all","critical","high","medium","low","info"].map(s => <option key={s} value={s}>{s.toUpperCase()}</option>)}
        </select>
      </div>

      {isLoading ? (
        <div className="text-[10px] text-slate-600 py-8 text-center">LOADING THREATS...</div>
      ) : (
        <div className="border border-green-900/30 bg-[#070e1c] overflow-hidden">
          <div className="grid grid-cols-12 gap-2 text-[9px] text-slate-500 px-3 py-2 border-b border-green-900/30 bg-[#050c18]">
            <div className="col-span-1">SEV</div>
            <div className="col-span-4">TITLE</div>
            <div className="col-span-2">DOMAIN</div>
            <div className="col-span-2">REGION</div>
            <div className="col-span-1">SCORE</div>
            <div className="col-span-2">STATUS</div>
          </div>
          <div className="max-h-[calc(100vh-220px)] overflow-y-auto">
            {filtered.map((t: any) => (
              <div key={t.id} onClick={() => setSelected(t)}
                className="grid grid-cols-12 gap-2 text-[10px] px-3 py-2 border-b border-green-900/10 hover:bg-green-950/10 cursor-pointer">
                <div className="col-span-1">
                  <span className={`px-1.5 py-0.5 border ${SEV_COLOR[t.severity] ?? ""}`}>{t.severity?.toUpperCase()}</span>
                </div>
                <div className="col-span-4 text-slate-300 truncate">{t.title}</div>
                <div className="col-span-2 text-slate-500 uppercase">{t.category || t.domain || "-"}</div>
                <div className="col-span-2 text-slate-500">{t.region || "-"}</div>
                <div className="col-span-1 text-cyan-400 font-mono">{t.score ?? t.confidence ?? "-"}</div>
                <div className={`col-span-2 ${STATUS_COLOR[t.status] ?? "text-slate-500"}`}>{t.status?.toUpperCase()}</div>
              </div>
            ))}
            {filtered.length === 0 && <div className="text-[10px] text-slate-600 py-8 text-center">NO THREATS MATCH FILTERS</div>}
          </div>
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setSelected(null)}>
          <div onClick={e => e.stopPropagation()} className="bg-[#070e1c] border border-orange-900/40 max-w-2xl w-full p-5">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className={`inline-block text-[9px] px-1.5 py-0.5 border mb-2 ${SEV_COLOR[selected.severity] ?? ""}`}>{selected.severity?.toUpperCase()}</div>
                <div className="text-sm font-bold text-slate-200">{selected.title}</div>
              </div>
              <button onClick={() => setSelected(null)}><X className="h-4 w-4 text-slate-500" /></button>
            </div>
            <div className="text-[11px] text-slate-400 mb-4">{selected.description || "No additional details."}</div>
            <div className="grid grid-cols-3 gap-3 text-[10px] mb-4">
              <div><div className="text-slate-600 mb-0.5">DOMAIN</div><div className="text-slate-300 uppercase">{selected.category || selected.domain}</div></div>
              <div><div className="text-slate-600 mb-0.5">REGION</div><div className="text-slate-300">{selected.region}</div></div>
              <div><div className="text-slate-600 mb-0.5">SCORE</div><div className="text-cyan-400 font-mono">{selected.score ?? selected.confidence}</div></div>
              <div><div className="text-slate-600 mb-0.5">SOURCE</div><div className="text-slate-300">{selected.source || "INTERNAL"}</div></div>
              <div><div className="text-slate-600 mb-0.5">STATUS</div><div className={STATUS_COLOR[selected.status] ?? "text-slate-300"}>{selected.status?.toUpperCase()}</div></div>
              <div><div className="text-slate-600 mb-0.5">CREATED</div><div className="text-slate-300">{selected.createdAt ? new Date(selected.createdAt).toLocaleString() : "-"}</div></div>
            </div>
            <div className="flex gap-2">
              {selected.status !== "resolved" && (
                <button onClick={() => updateMut.mutate({ id: selected.id, data: { status: "resolved" } })}
                  className="flex-1 bg-green-950/40 border border-green-900/40 text-green-400 text-[10px] py-2">MARK RESOLVED</button>
              )}
              {selected.status !== "investigating" && (
                <button onClick={() => updateMut.mutate({ id: selected.id, data: { status: "investigating" } })}
                  className="flex-1 bg-orange-950/40 border border-orange-900/40 text-orange-400 text-[10px] py-2">INVESTIGATE</button>
              )}
              <button onClick={() => deleteMut.mutate(selected.id)}
                className="bg-red-950/40 border border-red-900/40 text-red-400 text-[10px] py-2 px-3"><Trash2 className="h-3 w-3" /></button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
