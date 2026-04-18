import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listWorkspaces, createWorkspace, updateWorkspace, deleteWorkspace } from "@/lib/api";
import { Layers, Plus, X, Settings, Lock, Globe, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth";

const TYPE_COLOR: Record<string, string> = {
  general: "text-blue-400 border-blue-900/40",
  operation: "text-red-400 border-red-900/40",
  exercise: "text-yellow-400 border-yellow-900/40",
  investigation: "text-orange-400 border-orange-900/40",
  monitoring: "text-green-400 border-green-900/40",
};
const TYPE_ICON: Record<string, any> = {
  general: Globe, operation: Lock, exercise: Users, investigation: Users, monitoring: Globe,
};

export default function WorkspacesPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [newWs, setNewWs] = useState({ name: "", description: "", type: "general", classification: "unclassified", color: "#22c55e" });

  const { data: workspaces, isLoading } = useQuery({ queryKey: ["workspaces"], queryFn: listWorkspaces, refetchInterval: 60000 });

  const createMut = useMutation({
    mutationFn: createWorkspace,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["workspaces"] }); setShowCreate(false); toast({ title: "Workspace created" }); },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: any) => updateWorkspace(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["workspaces"] }),
  });

  const deleteMut = useMutation({
    mutationFn: deleteWorkspace,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["workspaces"] }); setSelected(null); },
  });

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="h-5 w-5 text-blue-400" />
          <h1 className="text-lg font-bold text-blue-400 tracking-widest">WORKSPACES</h1>
          <span className="text-[10px] text-slate-600">{workspaces?.length ?? 0} workspaces</span>
        </div>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-1 text-[10px] text-blue-400 border border-blue-900/40 px-3 py-1.5 hover:bg-blue-950/20">
          <Plus className="h-3 w-3" /> NEW WORKSPACE
        </button>
      </div>

      <div className="text-[10px] text-slate-600 border border-blue-900/20 bg-blue-950/10 p-3">
        Workspaces allow teams to collaborate on intelligence analysis. Share views, alerts, and case findings with authorized personnel.
      </div>

      {isLoading ? (
        <div className="text-[10px] text-slate-600 py-8 text-center">LOADING WORKSPACES...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {(workspaces ?? []).map((ws: any) => {
            const cls = TYPE_COLOR[ws.type] ?? "text-slate-400 border-slate-800";
            const [textCls, borderCls] = cls.split(" ");
            const Icon = TYPE_ICON[ws.type] ?? Layers;
            return (
              <div
                key={ws.id}
                className={`border ${borderCls} bg-[#070e1c] p-4 cursor-pointer hover:bg-opacity-20 transition-all`}
                onClick={() => setSelected(ws)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-full min-h-[40px] rounded-sm" style={{ backgroundColor: ws.color || "#22c55e" }} />
                    <div>
                      <div className="text-sm text-slate-200 font-bold">{ws.name}</div>
                      <div className={`text-[9px] ${textCls} uppercase flex items-center gap-1 mt-0.5`}>
                        <Icon className="h-2.5 w-2.5" /> {ws.type}
                      </div>
                    </div>
                  </div>
                  <div className="text-[9px] text-red-400 uppercase">{ws.classification?.replace("_"," ")}</div>
                </div>

                {ws.description && (
                  <div className="text-[10px] text-slate-500 mb-3 line-clamp-2">{ws.description}</div>
                )}

                <div className="flex items-center gap-3 text-[9px] text-slate-600">
                  {ws.sharedWith?.length > 0 && <span><Users className="h-2.5 w-2.5 inline mr-0.5" />{ws.sharedWith.length}</span>}
                  <span>Updated: {new Date(ws.updatedAt).toLocaleDateString()}</span>
                  {ws.isArchived && <span className="text-slate-700">ARCHIVED</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!workspaces?.length && !isLoading && (
        <div className="border border-green-900/20 bg-[#070e1c] p-8 text-center">
          <Layers className="h-10 w-10 text-slate-700 mx-auto mb-3" />
          <div className="text-[11px] text-slate-600">No workspaces yet</div>
          <div className="text-[9px] text-slate-700 mt-1">Create a workspace to collaborate with your team</div>
        </div>
      )}

      {/* Detail panel */}
      {selected && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-end p-4">
          <div className="bg-[#070e1c] border border-blue-900/40 w-full max-w-md h-auto max-h-[80vh] overflow-y-auto p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm font-bold text-blue-400">{selected.name}</div>
              <button onClick={() => setSelected(null)}><X className="h-4 w-4 text-slate-500" /></button>
            </div>
            <div className="space-y-3 text-[10px]">
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-slate-600">TYPE:</span> <span className="text-slate-300 uppercase">{selected.type}</span></div>
                <div><span className="text-slate-600">CLASSIFICATION:</span> <span className="text-red-400 uppercase">{selected.classification?.replace("_"," ")}</span></div>
                <div><span className="text-slate-600">OWNER:</span> <span className="text-slate-300">{selected.ownerId}</span></div>
                <div><span className="text-slate-600">CREATED:</span> <span className="text-slate-300">{new Date(selected.createdAt).toLocaleDateString()}</span></div>
              </div>

              {selected.description && (
                <div className="text-slate-400 pt-1 border-t border-green-900/20">{selected.description}</div>
              )}

              {selected.settings && (
                <div className="pt-1 border-t border-green-900/20">
                  <div className="text-[9px] text-slate-600 mb-2">SETTINGS</div>
                  <pre className="text-[9px] text-slate-500 bg-[#050c18] p-2 overflow-x-auto">
                    {JSON.stringify(selected.settings, null, 2)}
                  </pre>
                </div>
              )}

              <div className="flex gap-2 pt-3">
                <button onClick={() => updateMut.mutate({ id: selected.id, data: { isArchived: !selected.isArchived } })} className="flex-1 border border-slate-800 text-slate-400 text-[9px] py-1.5 hover:border-slate-700">
                  {selected.isArchived ? "UNARCHIVE" : "ARCHIVE"}
                </button>
                <button onClick={() => deleteMut.mutate(selected.id)} className="border border-red-900/40 text-red-400 text-[9px] px-3 py-1.5 hover:bg-red-950/20">DELETE</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create workspace */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-[#070e1c] border border-blue-900/40 w-full max-w-md p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm font-bold text-blue-400">NEW WORKSPACE</div>
              <button onClick={() => setShowCreate(false)}><X className="h-4 w-4 text-slate-500" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[9px] text-slate-500 block mb-1">NAME</label>
                <input value={newWs.name} onChange={e => setNewWs(w => ({ ...w, name: e.target.value }))} className="w-full bg-[#050c18] border border-green-900/30 text-slate-300 text-[11px] px-2 py-1.5 focus:outline-none" />
              </div>
              <div>
                <label className="text-[9px] text-slate-500 block mb-1">DESCRIPTION</label>
                <textarea value={newWs.description} onChange={e => setNewWs(w => ({ ...w, description: e.target.value }))} rows={2} className="w-full bg-[#050c18] border border-green-900/30 text-slate-300 text-[11px] px-2 py-1.5 focus:outline-none resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] text-slate-500 block mb-1">TYPE</label>
                  <select value={newWs.type} onChange={e => setNewWs(w => ({ ...w, type: e.target.value }))} className="w-full bg-[#050c18] border border-green-900/30 text-slate-300 text-[11px] px-2 py-1.5 focus:outline-none">
                    {["general","operation","exercise","investigation","monitoring"].map(t => <option key={t} value={t}>{t.toUpperCase()}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[9px] text-slate-500 block mb-1">CLASSIFICATION</label>
                  <select value={newWs.classification} onChange={e => setNewWs(w => ({ ...w, classification: e.target.value }))} className="w-full bg-[#050c18] border border-green-900/30 text-slate-300 text-[11px] px-2 py-1.5 focus:outline-none">
                    {["unclassified","confidential","secret","top_secret"].map(c => <option key={c} value={c}>{c.replace("_"," ").toUpperCase()}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[9px] text-slate-500 block mb-1">COLOR</label>
                <div className="flex gap-2 items-center">
                  {["#22c55e","#06b6d4","#8b5cf6","#f97316","#ef4444","#eab308"].map(c => (
                    <button key={c} onClick={() => setNewWs(w => ({ ...w, color: c }))} className={`w-6 h-6 rounded-sm border-2 ${newWs.color === c ? "border-white" : "border-transparent"}`} style={{ backgroundColor: c }} />
                  ))}
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => createMut.mutate({ ...newWs, code: newWs.name.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10) + Math.random().toString(36).slice(2, 5).toUpperCase(), ownerId: user?.id })} disabled={!newWs.name} className="flex-1 bg-blue-950/40 border border-blue-900/40 text-blue-400 text-[10px] py-2 disabled:opacity-50">CREATE</button>
                <button onClick={() => setShowCreate(false)} className="flex-1 border border-slate-800 text-slate-500 text-[10px] py-2">CANCEL</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
