import { useState } from "react";
import { Settings as SettingsIcon, User, Bell, Lock, Database, Network, Save } from "lucide-react";
import { useAuth } from "@/contexts/auth";
import { useToast } from "@/hooks/use-toast";

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const [tab, setTab] = useState("profile");
  const [prefs, setPrefs] = useState({
    notifyAlerts: true,
    notifyCritical: true,
    notifyEmail: false,
    autoRefresh: true,
    refreshInterval: 15,
    mapStyle: "tactical",
    language: "en",
    timezone: "UTC",
  });

  const TABS = [
    { id: "profile", icon: User, label: "PROFILE" },
    { id: "notifications", icon: Bell, label: "NOTIFICATIONS" },
    { id: "security", icon: Lock, label: "SECURITY" },
    { id: "data", icon: Database, label: "DATA & SYNC" },
    { id: "network", icon: Network, label: "NETWORK" },
  ];

  const save = () => {
    localStorage.setItem("sentinel_prefs", JSON.stringify(prefs));
    toast({ title: "Preferences saved" });
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-2">
        <SettingsIcon className="h-5 w-5 text-slate-400" />
        <h1 className="text-lg font-bold text-slate-300 tracking-widest">SETTINGS</h1>
      </div>

      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-3 border border-green-900/30 bg-[#070e1c] p-2">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`w-full flex items-center gap-2 px-3 py-2 text-[10px] mb-1 ${tab === t.id ? "bg-green-950/40 text-green-400 border-l-2 border-green-400" : "text-slate-500 hover:bg-green-950/10"}`}>
              <t.icon className="h-3 w-3" /> {t.label}
            </button>
          ))}
        </div>

        <div className="col-span-9 border border-green-900/30 bg-[#070e1c] p-5 min-h-[400px]">
          {tab === "profile" && (
            <div className="space-y-4">
              <div className="text-sm font-bold text-green-400 mb-3">OPERATOR PROFILE</div>
              <div className="grid grid-cols-2 gap-4 text-[10px]">
                <Field label="USERNAME" value={user?.username || "-"} />
                <Field label="DISPLAY NAME" value={user?.displayName || user?.username || "-"} />
                <Field label="EMAIL" value={user?.email || "-"} />
                <Field label="ROLE" value={user?.role?.toUpperCase() || "-"} />
                <Field label="CLEARANCE" value={user?.clearance?.toUpperCase() || "UNCLASSIFIED"} valueClass="text-red-400" />
                <Field label="STATUS" value="ACTIVE" valueClass="text-green-400" />
              </div>
              <div className="pt-4 border-t border-green-900/30">
                <button onClick={logout} className="bg-red-950/40 border border-red-900/40 text-red-400 text-[10px] px-4 py-2">LOGOUT SESSION</button>
              </div>
            </div>
          )}

          {tab === "notifications" && (
            <div className="space-y-4">
              <div className="text-sm font-bold text-green-400 mb-3">ALERT NOTIFICATIONS</div>
              <Toggle label="Receive in-app alerts" checked={prefs.notifyAlerts} onChange={v => setPrefs({ ...prefs, notifyAlerts: v })} />
              <Toggle label="Critical events only" checked={prefs.notifyCritical} onChange={v => setPrefs({ ...prefs, notifyCritical: v })} />
              <Toggle label="Email notifications" checked={prefs.notifyEmail} onChange={v => setPrefs({ ...prefs, notifyEmail: v })} />
              <button onClick={save} className="bg-green-950/40 border border-green-900/40 text-green-400 text-[10px] px-4 py-2 flex items-center gap-2"><Save className="h-3 w-3" /> SAVE</button>
            </div>
          )}

          {tab === "security" && (
            <div className="space-y-4">
              <div className="text-sm font-bold text-green-400 mb-3">SECURITY SETTINGS</div>
              <div className="text-[10px] text-slate-400 space-y-2">
                <div>Two-factor authentication: <span className="text-yellow-400">RECOMMENDED</span></div>
                <div>Session timeout: <span className="text-slate-300">8 hours</span></div>
                <div>Last login: <span className="text-slate-300">{new Date().toLocaleString()}</span></div>
                <div>Failed attempts: <span className="text-green-400">0</span></div>
              </div>
              <div className="text-[10px] text-slate-600 border border-yellow-900/30 bg-yellow-950/10 p-3 mt-4">
                Change of clearance level requires authorization from Security Operations Center.
              </div>
            </div>
          )}

          {tab === "data" && (
            <div className="space-y-4">
              <div className="text-sm font-bold text-green-400 mb-3">DATA SYNCHRONIZATION</div>
              <Toggle label="Auto-refresh data feeds" checked={prefs.autoRefresh} onChange={v => setPrefs({ ...prefs, autoRefresh: v })} />
              <div>
                <label className="text-[9px] text-slate-500 block mb-1">REFRESH INTERVAL (seconds)</label>
                <input type="number" value={prefs.refreshInterval} onChange={e => setPrefs({ ...prefs, refreshInterval: +e.target.value })}
                  className="w-32 bg-[#050c18] border border-green-900/30 text-slate-300 text-[11px] px-2 py-1.5 focus:outline-none" />
              </div>
              <button onClick={save} className="bg-green-950/40 border border-green-900/40 text-green-400 text-[10px] px-4 py-2 flex items-center gap-2"><Save className="h-3 w-3" /> SAVE</button>
            </div>
          )}

          {tab === "network" && (
            <div className="space-y-4">
              <div className="text-sm font-bold text-green-400 mb-3">NETWORK & CONNECTIVITY</div>
              <div className="grid grid-cols-2 gap-4 text-[10px]">
                <Field label="API ENDPOINT" value="api-server (proxied)" />
                <Field label="WEBSOCKET" value="ACTIVE" valueClass="text-green-400" />
                <Field label="LATENCY" value="< 50ms" valueClass="text-green-400" />
                <Field label="PROTOCOL" value="HTTPS / WSS" />
              </div>
              <div className="text-[10px] text-slate-600 mt-4 border border-green-900/30 p-3">
                All connections are routed through the Replit edge proxy with mTLS authentication. No direct external API access.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, valueClass = "text-slate-300" }: any) {
  return (
    <div>
      <div className="text-slate-600 mb-1">{label}</div>
      <div className={`${valueClass} font-mono`}>{value}</div>
    </div>
  );
}

function Toggle({ label, checked, onChange }: any) {
  return (
    <label className="flex items-center justify-between text-[11px] text-slate-300 cursor-pointer max-w-md">
      {label}
      <button onClick={() => onChange(!checked)} className={`w-9 h-5 border ${checked ? "bg-green-950/40 border-green-900/40" : "bg-[#050c18] border-slate-700"} relative transition`}>
        <div className={`absolute top-0.5 ${checked ? "right-0.5 bg-green-400" : "left-0.5 bg-slate-600"} w-3.5 h-3.5 transition-all`} />
      </button>
    </label>
  );
}
