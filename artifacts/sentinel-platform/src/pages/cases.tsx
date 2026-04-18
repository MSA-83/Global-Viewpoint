import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listCases, getCase, createCase, updateCase, deleteCase, addCaseNote, aiSummarize } from "@/lib/api";
import { Briefcase, Plus, X, FileText, Clock, User, Tag, ChevronRight, Bot, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const PRI_COLOR: Record<string, string> = {
  critical: "text-red-400 border-red-900/40", high: "text-orange-400 border-orange-900/40",
  medium: "text-yellow-400 border-yellow-900/40", low: "text-green-400 border-green-900/40",
};
const STATUS_DOT: Record<string, string> = {
  open: "bg-red-500", active: "bg-orange-500 animate-pulse", pending: "bg-yellow-500", closed: "bg-slate-600", archived: "bg-slate-700",
};

function CaseDetail({ caseId, onClose }: { caseId: number; onClose: () => void }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [note, setNote] = useState("");
  const [noteType, setNoteType] = useState("note");
  const [aiSummary, setAiSummary] = useState<any>(null);
  const [loadingAi, setLoadingAi] = useState(false);

  const { data: caseData, isLoading } = useQuery({ queryKey: ["case", caseId], queryFn: () => getCase(caseId), refetchInterval: 30000 });

  const addNote = useMutation({
    mutationFn: (data: any) => addCaseNote(caseId, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["case", caseId] }); setNote(""); toast({ title: "Note added" }); },
  });

  const updateMut = useMutation({
    mutationFn: (data: any) => updateCase(caseId, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["case", caseId] }); qc.invalidateQueries({ queryKey: ["cases"] }); },
  });

  const handleAiSummary = async () => {
    setLoadingAi(true);
    try {
      const result = await aiSummarize("case", caseId);
      setAiSummary(result);
    } finally {
      setLoadingAi(false);
    }
  };

  if (isLoading) return <div className="p-4 text-[10px] text-slate-600">LOADING...</div>;
  if (!caseData) return null;

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-start justify-end p-4">
      <div className="bg-[#070e1c] border border-green-900/40 w-full max-w-2xl h-full max-h-[calc(100vh-2rem)] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-green-900/30">
          <div>
            <div className="text-xs font-bold text-green-400 tracking-wider">{caseData.caseNumber}</div>
            <div className="text-sm text-white mt-0.5">{caseData.title}</div>
          </div>
          <button onClick={onClose}><X className="h-4 w-4 text-slate-500 hover:text-white" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Meta */}
          <div className="grid grid-cols-2 gap-3 text-[10px]">
            <div className="space-y-1.5">
              <div><span className="text-slate-600">STATUS:</span> <span className="text-slate-300 uppercase">{caseData.status}</span></div>
              <div><span className="text-slate-600">PRIORITY:</span> <span className={PRI_COLOR[caseData.priority]?.split(" ")[0] || "text-slate-400"} >{caseData.priority?.toUpperCase()}</span></div>
              <div><span className="text-slate-600">CLASSIFICATION:</span> <span className="text-red-400 uppercase">{caseData.classification?.replace("_"," ")}</span></div>
              <div><span className="text-slate-600">LEAD:</span> <span className="text-slate-300">{caseData.leadAnalyst || "—"}</span></div>
            </div>
            <div className="space-y-1.5">
              <div><span className="text-slate-600">DOMAIN:</span> <span className="text-slate-300 capitalize">{caseData.domain?.replace("_"," ") || "—"}</span></div>
              <div><span className="text-slate-600">REGION:</span> <span className="text-slate-300">{caseData.region || "—"}</span></div>
              <div><span className="text-slate-600">TEAM:</span> <span className="text-slate-300">{caseData.assignedTeam || "—"}</span></div>
              <div><span className="text-slate-600">OPENED:</span> <span className="text-slate-300">{new Date(caseData.createdAt).toLocaleDateString()}</span></div>
            </div>
          </div>

          {caseData.description && (
            <div className="text-[10px] text-slate-400 border-t border-green-900/20 pt-3">{caseData.description}</div>
          )}

          {/* Status actions */}
          <div className="flex gap-2 flex-wrap">
            {["open","active","pending","closed"].filter(s => s !== caseData.status).map(s => (
              <button key={s} onClick={() => updateMut.mutate({ status: s })} className="text-[9px] border border-green-900/30 text-slate-400 px-2 py-1 hover:bg-green-950/20 uppercase tracking-wider">→ {s}</button>
            ))}
          </div>

          {/* AI Summary */}
          {aiSummary ? (
            <div className="border border-cyan-900/40 bg-cyan-950/10 p-3 text-[10px]">
              <div className="text-cyan-400 font-bold mb-2 flex items-center gap-1"><Bot className="h-3.5 w-3.5" /> AI INTELLIGENCE ASSESSMENT</div>
              <div className="text-slate-300 leading-relaxed">{aiSummary.summary}</div>
              <div className="text-slate-600 mt-2">Confidence: {aiSummary.confidence}% · Human review required</div>
            </div>
          ) : (
            <button onClick={handleAiSummary} disabled={loadingAi} className="flex items-center gap-1.5 text-[10px] border border-cyan-900/40 text-cyan-400 px-3 py-1.5 hover:bg-cyan-950/20 disabled:opacity-50">
              <Bot className="h-3 w-3" /> {loadingAi ? "GENERATING..." : "GENERATE AI ASSESSMENT"}
            </button>
          )}

          {/* Notes */}
          <div>
            <div className="text-[10px] text-slate-500 tracking-wider mb-2 flex items-center gap-1"><FileText className="h-3 w-3" /> CASE NOTES ({caseData.notes?.length ?? 0})</div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {(caseData.notes ?? []).map((n: any) => (
                <div key={n.id} className="border border-slate-800/60 p-2 text-[10px]">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-cyan-400 uppercase">{n.noteType}</span>
                    <span className="text-slate-600">·</span>
                    <span className="text-slate-500">{n.author}</span>
                    <span className="text-slate-700 ml-auto">{new Date(n.createdAt).toLocaleString()}</span>
                  </div>
                  <div className="text-slate-300 leading-relaxed">{n.content}</div>
                </div>
              ))}
              {!caseData.notes?.length && <div className="text-[10px] text-slate-600">No notes yet</div>}
            </div>
          </div>

          {/* Add note */}
          <div className="border-t border-green-900/20 pt-3">
            <div className="text-[9px] text-slate-600 mb-2">ADD NOTE</div>
            <div className="flex gap-2 mb-2">
              {["note","analysis","evidence","action","decision"].map(t => (
                <button key={t} onClick={() => setNoteType(t)} className={`text-[9px] px-2 py-0.5 border ${noteType === t ? "border-green-900/60 text-green-400 bg-green-950/20" : "border-slate-800 text-slate-600"}`}>{t.toUpperCase()}</button>
              ))}
            </div>
            <div className="flex gap-2">
              <textarea
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="Enter intelligence assessment, findings, or actions..."
                rows={2}
                className="flex-1 bg-[#050c18] border border-green-900/30 text-slate-300 text-[10px] px-2 py-1.5 focus:outline-none resize-none"
              />
              <button
                onClick={() => addNote.mutate({ content: note, noteType, author: "analyst" })}
                disabled={!note.trim()}
                className="border border-green-900/40 text-green-400 px-3 hover:bg-green-950/20 disabled:opacity-50"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CasesPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [selectedCase, setSelectedCase] = useState<number | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newCase, setNewCase] = useState({ title: "", description: "", priority: "medium", classification: "confidential", domain: "cyber", region: "" });

  const { data: cases, isLoading } = useQuery({ queryKey: ["cases"], queryFn: listCases, refetchInterval: 30000 });

  const createMut = useMutation({
    mutationFn: (data: any) => createCase(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["cases"] }); setShowCreate(false); toast({ title: "Case opened" }); },
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => deleteCase(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cases"] }),
  });

  const open = cases?.filter((c: any) => c.status === "open" || c.status === "active") ?? [];
  const closed = cases?.filter((c: any) => c.status === "closed" || c.status === "archived") ?? [];

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Briefcase className="h-5 w-5 text-blue-400" />
          <h1 className="text-lg font-bold text-blue-400 tracking-widest">CASE MANAGEMENT</h1>
        </div>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-1 text-[10px] text-blue-400 border border-blue-900/40 px-3 py-1.5 hover:bg-blue-950/20">
          <Plus className="h-3 w-3" /> OPEN CASE
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[["TOTAL", cases?.length ?? 0, "text-slate-400"], ["ACTIVE", open.length, "text-orange-400"], ["CRITICAL", cases?.filter((c: any) => c.priority === "critical").length ?? 0, "text-red-400"], ["CLOSED", closed.length, "text-slate-600"]].map(([l, v, c]) => (
          <div key={l as string} className="border border-green-900/20 bg-[#070e1c] p-3">
            <div className={`text-2xl font-bold ${c}`}>{v}</div>
            <div className="text-[9px] text-slate-600 mt-0.5">{l}</div>
          </div>
        ))}
      </div>

      {/* Cases */}
      {isLoading ? (
        <div className="text-[10px] text-slate-600 py-8 text-center">LOADING CASES...</div>
      ) : (
        <div className="space-y-2">
          {(cases ?? []).map((c: any) => (
            <div key={c.id} className={`border ${PRI_COLOR[c.priority]?.split(" ").slice(1).join(" ") ?? "border-slate-800"} bg-[#070e1c] p-3`}>
              <div className="flex items-start gap-3">
                <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${STATUS_DOT[c.status] ?? "bg-slate-600"}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] text-slate-600">{c.caseNumber}</span>
                    <span className={`text-[9px] px-1 border ${PRI_COLOR[c.priority] ?? ""}`}>{c.priority?.toUpperCase()}</span>
                    <span className="text-[9px] text-slate-600 uppercase">{c.classification?.replace("_"," ")}</span>
                  </div>
                  <div className="text-sm text-slate-200 mt-0.5 truncate">{c.title}</div>
                  <div className="flex gap-4 mt-1 text-[9px] text-slate-600 flex-wrap">
                    <span>{c.leadAnalyst}</span>
                    <span>{c.assignedTeam}</span>
                    <span className="capitalize">{c.domain?.replace("_"," ")}</span>
                    <span>{c.region}</span>
                    <span>Updated: {new Date(c.updatedAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => setSelectedCase(c.id)} className="text-[9px] border border-green-900/30 text-green-400 px-2 py-1 hover:bg-green-950/20 flex items-center gap-1">
                    OPEN <ChevronRight className="h-3 w-3" />
                  </button>
                  <button onClick={() => deleteMut.mutate(c.id)} className="text-[9px] border border-red-900/30 text-red-400 px-1.5 py-1 hover:bg-red-950/20">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </div>
          ))}
          {!cases?.length && <div className="text-[10px] text-slate-600 py-8 text-center">NO ACTIVE CASES</div>}
        </div>
      )}

      {/* Case detail panel */}
      {selectedCase && <CaseDetail caseId={selectedCase} onClose={() => setSelectedCase(null)} />}

      {/* Create case dialog */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-[#070e1c] border border-green-900/40 w-full max-w-lg p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm font-bold text-blue-400 tracking-wider">OPEN NEW CASE</div>
              <button onClick={() => setShowCreate(false)}><X className="h-4 w-4 text-slate-500" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[9px] text-slate-500 block mb-1">CASE TITLE</label>
                <input value={newCase.title} onChange={e => setNewCase(c => ({ ...c, title: e.target.value }))} className="w-full bg-[#050c18] border border-green-900/30 text-slate-300 text-[11px] px-2 py-1.5 focus:outline-none" placeholder="Investigation title..." />
              </div>
              <div>
                <label className="text-[9px] text-slate-500 block mb-1">DESCRIPTION</label>
                <textarea value={newCase.description} onChange={e => setNewCase(c => ({ ...c, description: e.target.value }))} rows={2} className="w-full bg-[#050c18] border border-green-900/30 text-slate-300 text-[11px] px-2 py-1.5 focus:outline-none resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: "priority", opts: ["critical","high","medium","low"] },
                  { key: "classification", opts: ["unclassified","confidential","secret","top_secret"] },
                  { key: "domain", opts: ["cyber","maritime","aviation","conflict","sigint","orbital"] },
                  { key: "region", opts: [], free: true },
                ].map(({ key, opts, free }) => (
                  <div key={key}>
                    <label className="text-[9px] text-slate-500 block mb-1">{key.toUpperCase().replace("_"," ")}</label>
                    {free ? (
                      <input value={(newCase as any)[key]} onChange={e => setNewCase(c => ({ ...c, [key]: e.target.value }))} className="w-full bg-[#050c18] border border-green-900/30 text-slate-300 text-[11px] px-2 py-1.5 focus:outline-none" />
                    ) : (
                      <select value={(newCase as any)[key]} onChange={e => setNewCase(c => ({ ...c, [key]: e.target.value }))} className="w-full bg-[#050c18] border border-green-900/30 text-slate-300 text-[11px] px-2 py-1.5 focus:outline-none">
                        {opts.map(o => <option key={o} value={o}>{o.toUpperCase().replace("_"," ")}</option>)}
                      </select>
                    )}
                  </div>
                ))}
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => createMut.mutate(newCase)} disabled={!newCase.title} className="flex-1 bg-blue-950/40 border border-blue-900/40 text-blue-400 text-[10px] py-2 hover:bg-blue-950/60 disabled:opacity-50 tracking-wider">OPEN CASE</button>
                <button onClick={() => setShowCreate(false)} className="flex-1 border border-slate-800 text-slate-500 text-[10px] py-2">CANCEL</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
