import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getSystemStatus, listAdminUsers, createAdminUser, updateAdminUser, deleteAdminUser, getAuditLogs } from "@/lib/api";
import { Shield, Users, Server, FileText, Plus, X, Check, RefreshCw } from "lucide-react";
import { useAuth } from "@/contexts/auth";
import { useToast } from "@/hooks/use-toast";

const ROLE_COLOR: Record<string, string> = {
  super_admin: "text-red-400", admin: "text-orange-400", analyst: "text-cyan-400",
  operator: "text-green-400", viewer: "text-slate-400", executive: "text-purple-400",
};

function Tab({ label, active, onClick }: any) {
  return (
    <button onClick={onClick} className={`text-[10px] px-4 py-2 tracking-wider border-b-2 transition-colors ${active ? "border-green-400 text-green-400" : "border-transparent text-slate-600 hover:text-slate-400"}`}>
      {label}
    </button>
  );
}

function SystemStatus({ data }: { data: any }) {
  if (!data) return <div className="text-[10px] text-slate-600">Loading...</div>;
  const db = data.database ?? {};
  const mem = data.memory ?? {};
  const cpu = data.cpu ?? {};
  const counts = data.counts ?? {};

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* DB */}
        <div className="border border-green-900/30 p-3">
          <div className="text-[9px] text-slate-600 tracking-wider mb-2 flex items-center gap-1"><Server className="h-3 w-3" /> DATABASE</div>
          <div className="space-y-1.5 text-[10px]">
            <div className="flex justify-between"><span className="text-slate-600">Status</span><span className="text-green-400">ONLINE</span></div>
            <div className="flex justify-between"><span className="text-slate-600">Response</span><span className="text-green-400">{db.responseMs ?? 0}ms</span></div>
            <div className="flex justify-between"><span className="text-slate-600">Tables</span><span className="text-slate-400">{db.tables ?? 0}</span></div>
            <div className="flex justify-between"><span className="text-slate-600">Total Records</span><span className="text-slate-400">{db.totalRecords?.toLocaleString() ?? 0}</span></div>
          </div>
        </div>
        {/* Memory */}
        <div className="border border-green-900/30 p-3">
          <div className="text-[9px] text-slate-600 tracking-wider mb-2">MEMORY</div>
          <div className="space-y-1.5 text-[10px]">
            <div className="flex justify-between"><span className="text-slate-600">Used Heap</span><span className="text-slate-400">{mem.usedHeapMB ?? 0} MB</span></div>
            <div className="flex justify-between"><span className="text-slate-600">Total Heap</span><span className="text-slate-400">{mem.totalHeapMB ?? 0} MB</span></div>
            <div className="flex justify-between"><span className="text-slate-600">External</span><span className="text-slate-400">{mem.externalMB ?? 0} MB</span></div>
          </div>
          <div className="mt-2 h-1.5 bg-[#050c18]">
            <div className="h-full bg-blue-500/50" style={{ width: `${Math.min(100, ((mem.usedHeapMB ?? 0) / Math.max(1, mem.totalHeapMB ?? 1)) * 100)}%` }} />
          </div>
        </div>
        {/* Platform */}
        <div className="border border-green-900/30 p-3">
          <div className="text-[9px] text-slate-600 tracking-wider mb-2">PLATFORM</div>
          <div className="space-y-1.5 text-[10px]">
            <div className="flex justify-between"><span className="text-slate-600">Uptime</span><span className="text-green-400">{Math.floor((data.uptime ?? 0) / 3600)}h {Math.floor(((data.uptime ?? 0) % 3600) / 60)}m</span></div>
            <div className="flex justify-between"><span className="text-slate-600">Node</span><span className="text-slate-400">{data.nodeVersion ?? "—"}</span></div>
            <div className="flex justify-between"><span className="text-slate-600">Platform</span><span className="text-slate-400 capitalize">{data.platform ?? "—"}</span></div>
            <div className="flex justify-between"><span className="text-slate-600">WS Clients</span><span className="text-slate-400">{data.wsClients ?? 0}</span></div>
          </div>
        </div>
      </div>

      {/* Data counts */}
      <div>
        <div className="text-[9px] text-slate-600 tracking-wider mb-3">INTELLIGENCE DATABASE RECORDS</div>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {Object.entries(counts).map(([key, val]: [string, any]) => (
            <div key={key} className="border border-green-900/20 p-2 text-center">
              <div className="text-lg font-bold text-green-400">{val?.toLocaleString() ?? 0}</div>
              <div className="text-[9px] text-slate-600 capitalize">{key.replace("_"," ")}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function UsersPanel() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [showCreate, setShowCreate] = useState(false);
  const [newUser, setNewUser] = useState({ username: "", displayName: "", email: "", role: "analyst", clearanceLevel: "secret", password: "password" });

  const { data: users } = useQuery({ queryKey: ["admin-users"], queryFn: listAdminUsers });

  const createMut = useMutation({
    mutationFn: createAdminUser,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-users"] }); setShowCreate(false); toast({ title: "User created" }); },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: any) => updateAdminUser(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-users"] }),
  });

  const deleteMut = useMutation({
    mutationFn: deleteAdminUser,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-users"] }),
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-1 text-[10px] text-green-400 border border-green-900/40 px-3 py-1.5 hover:bg-green-950/20">
          <Plus className="h-3 w-3" /> ADD USER
        </button>
      </div>

      <div className="border border-green-900/20">
        <table className="w-full text-[10px]">
          <thead>
            <tr className="border-b border-green-900/20">
              {["USER","DISPLAY NAME","EMAIL","ROLE","CLEARANCE","STATUS","ACTIONS"].map(h => (
                <th key={h} className="text-[9px] text-slate-600 tracking-wider text-left px-3 py-2">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(users ?? []).map((u: any) => (
              <tr key={u.id} className="border-b border-green-900/10 hover:bg-green-950/10">
                <td className="px-3 py-2 text-slate-300 font-mono">{u.username}</td>
                <td className="px-3 py-2 text-slate-400">{u.displayName}</td>
                <td className="px-3 py-2 text-slate-500">{u.email}</td>
                <td className={`px-3 py-2 uppercase ${ROLE_COLOR[u.role] ?? "text-slate-400"}`}>{u.role?.replace("_"," ")}</td>
                <td className="px-3 py-2 text-red-400 uppercase">{u.clearanceLevel?.replace("_"," ")}</td>
                <td className="px-3 py-2">
                  <button
                    onClick={() => updateMut.mutate({ id: u.id, data: { isActive: !u.isActive } })}
                    className={`text-[9px] px-2 py-0.5 border ${u.isActive ? "border-green-900/40 text-green-400" : "border-red-900/40 text-red-400"}`}
                  >
                    {u.isActive ? "ACTIVE" : "LOCKED"}
                  </button>
                </td>
                <td className="px-3 py-2">
                  <button onClick={() => deleteMut.mutate(u.id)} className="text-red-400 hover:text-red-300">
                    <X className="h-3 w-3" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showCreate && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-[#070e1c] border border-green-900/40 w-full max-w-md p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm font-bold text-green-400">CREATE USER</div>
              <button onClick={() => setShowCreate(false)}><X className="h-4 w-4 text-slate-500" /></button>
            </div>
            <div className="space-y-3">
              {[["username","USERNAME"],["displayName","DISPLAY NAME"],["email","EMAIL"],["password","INITIAL PASSWORD"]].map(([k, l]) => (
                <div key={k}>
                  <label className="text-[9px] text-slate-500 block mb-1">{l}</label>
                  <input type={k === "password" ? "password" : "text"} value={(newUser as any)[k]} onChange={e => setNewUser(u => ({ ...u, [k]: e.target.value }))} className="w-full bg-[#050c18] border border-green-900/30 text-slate-300 text-[11px] px-2 py-1.5 focus:outline-none" />
                </div>
              ))}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] text-slate-500 block mb-1">ROLE</label>
                  <select value={newUser.role} onChange={e => setNewUser(u => ({ ...u, role: e.target.value }))} className="w-full bg-[#050c18] border border-green-900/30 text-slate-300 text-[11px] px-2 py-1.5 focus:outline-none">
                    {["super_admin","admin","analyst","operator","viewer","executive"].map(r => <option key={r} value={r}>{r.replace("_"," ").toUpperCase()}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[9px] text-slate-500 block mb-1">CLEARANCE</label>
                  <select value={newUser.clearanceLevel} onChange={e => setNewUser(u => ({ ...u, clearanceLevel: e.target.value }))} className="w-full bg-[#050c18] border border-green-900/30 text-slate-300 text-[11px] px-2 py-1.5 focus:outline-none">
                    {["unclassified","confidential","secret","top_secret","sci"].map(c => <option key={c} value={c}>{c.replace("_"," ").toUpperCase()}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => createMut.mutate(newUser)} disabled={!newUser.username || !newUser.email} className="flex-1 bg-green-950/40 border border-green-900/40 text-green-400 text-[10px] py-2 disabled:opacity-50">CREATE</button>
                <button onClick={() => setShowCreate(false)} className="flex-1 border border-slate-800 text-slate-500 text-[10px] py-2">CANCEL</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AuditLog() {
  const { data: logs } = useQuery({ queryKey: ["audit-logs"], queryFn: getAuditLogs, refetchInterval: 30000 });
  return (
    <div className="space-y-1 max-h-[60vh] overflow-y-auto">
      {(logs ?? []).map((log: any) => (
        <div key={log.id} className="flex items-start gap-3 text-[10px] border-b border-green-900/10 py-1.5">
          <div className="text-slate-600 shrink-0 w-32">{new Date(log.createdAt).toLocaleString()}</div>
          <div className="text-cyan-400 shrink-0 w-16 capitalize">{log.action}</div>
          <div className="text-slate-500 shrink-0 w-20">{log.resourceType}</div>
          <div className="text-slate-400 flex-1">{log.operatorId}</div>
          {log.ipAddress && <div className="text-slate-600 shrink-0">{log.ipAddress}</div>}
        </div>
      ))}
      {!logs?.length && <div className="text-[10px] text-slate-600 py-4 text-center">No audit logs</div>}
    </div>
  );
}

export default function AdminPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<"system" | "users" | "audit">("system");

  const { data: status, refetch } = useQuery({ queryKey: ["system-status"], queryFn: getSystemStatus, refetchInterval: 30000 });

  if (user?.role !== "admin" && user?.role !== "super_admin") {
    return (
      <div className="p-4 flex items-center justify-center h-full">
        <div className="text-center">
          <Shield className="h-12 w-12 text-red-400 mx-auto mb-3" />
          <div className="text-red-400 font-bold tracking-wider">ACCESS DENIED</div>
          <div className="text-[10px] text-slate-600 mt-2">Admin clearance required</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-red-400" />
          <h1 className="text-lg font-bold text-red-400 tracking-widest">ADMIN CONSOLE</h1>
          <span className="text-[9px] text-red-600 border border-red-900/30 px-2 py-0.5">RESTRICTED</span>
        </div>
        <button onClick={() => refetch()} className="flex items-center gap-1 text-[10px] text-slate-500 border border-slate-800 px-2 py-1 hover:border-slate-700">
          <RefreshCw className="h-3 w-3" /> REFRESH
        </button>
      </div>

      <div className="flex border-b border-green-900/20">
        <Tab label="SYSTEM STATUS" active={tab === "system"} onClick={() => setTab("system")} />
        <Tab label="USER MANAGEMENT" active={tab === "users"} onClick={() => setTab("users")} />
        <Tab label="AUDIT LOG" active={tab === "audit"} onClick={() => setTab("audit")} />
      </div>

      <div>
        {tab === "system" && <SystemStatus data={status} />}
        {tab === "users" && <UsersPanel />}
        {tab === "audit" && <AuditLog />}
      </div>
    </div>
  );
}
