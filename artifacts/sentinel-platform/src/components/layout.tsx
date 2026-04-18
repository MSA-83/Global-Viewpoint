import { FC, ReactNode, useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import {
  Activity, Map as MapIcon, AlertTriangle, ShieldAlert, Navigation,
  Radio, Settings, Server, Crosshair, Bell, Search, Users,
  FolderOpen, Network, BarChart3, Bot, Shield, Layers,
  ChevronLeft, ChevronRight, Globe, Zap, Database, Lock,
  AlertCircle, LayoutDashboard, Briefcase
} from "lucide-react";
import { useAuth } from "@/contexts/auth";
import { useRealtime } from "@/contexts/realtime";
import { useQuery } from "@tanstack/react-query";
import { getAnalyticsOverview } from "@/lib/api";
import { Badge } from "@/components/ui/badge";

const NAV_GROUPS = [
  {
    label: "COMMAND",
    items: [
      { href: "/", label: "GLOBAL WATCH", icon: Globe },
      { href: "/map", label: "TACTICAL MAP", icon: MapIcon },
      { href: "/analytics", label: "ANALYTICS", icon: BarChart3 },
    ],
  },
  {
    label: "INTELLIGENCE",
    items: [
      { href: "/alerts", label: "ALERTS", icon: Bell, badge: "alerts" },
      { href: "/threats", label: "THREAT INTEL", icon: AlertTriangle },
      { href: "/incidents", label: "INCIDENTS", icon: ShieldAlert },
      { href: "/signals", label: "SIGINT", icon: Radio },
      { href: "/gps", label: "GPS / EW", icon: Crosshair },
    ],
  },
  {
    label: "OPERATIONS",
    items: [
      { href: "/assets", label: "ASSET TRACKING", icon: Navigation },
      { href: "/cases", label: "CASE MANAGEMENT", icon: Briefcase },
      { href: "/workspaces", label: "WORKSPACES", icon: Layers },
    ],
  },
  {
    label: "ANALYSIS",
    items: [
      { href: "/knowledge", label: "KNOWLEDGE GRAPH", icon: Network },
      { href: "/search", label: "GLOBAL SEARCH", icon: Search },
      { href: "/copilot", label: "AI COPILOT", icon: Bot },
    ],
  },
  {
    label: "SYSTEM",
    items: [
      { href: "/admin", label: "ADMIN CONSOLE", icon: Shield },
      { href: "/settings", label: "SETTINGS", icon: Settings },
    ],
  },
];

function useTick(ms = 1000) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick(c => c + 1), ms);
    return () => clearInterval(t);
  }, [ms]);
}

export const Layout: FC<{ children: ReactNode }> = ({ children }) => {
  const [location] = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, logout } = useAuth();
  const { wsStatus, recentAlerts } = useRealtime();
  useTick();

  const { data: overview } = useQuery({
    queryKey: ["analytics-overview"],
    queryFn: getAnalyticsOverview,
    refetchInterval: 30000,
  });

  const criticalAlerts = overview?.counts?.criticalAlerts ?? 0;
  const openAlerts = overview?.counts?.openAlerts ?? 0;
  const gti = overview?.globalThreatIndex ?? 0;

  const sidebarWidth = collapsed ? "w-14" : "w-60";
  const now = new Date();

  const wsColor = wsStatus === "connected" ? "bg-green-400" : wsStatus === "connecting" ? "bg-yellow-400" : "bg-red-500";
  const gtiColor = gti > 200 ? "text-red-400" : gti > 100 ? "text-orange-400" : gti > 50 ? "text-yellow-400" : "text-green-400";

  return (
    <div className="flex flex-col h-screen w-full bg-[#060d1a] text-foreground overflow-hidden font-mono">

      {/* TOP COMMAND BAR */}
      <div className="h-10 bg-[#080f1f] border-b border-green-900/40 flex items-center px-3 gap-4 shrink-0 z-50">
        {/* Classification */}
        <div className="text-[10px] font-bold text-red-400 tracking-widest border border-red-900/60 px-2 py-0.5 bg-red-950/30 shrink-0">
          SECRET//NOFORN
        </div>

        {/* System ID */}
        <div className="text-[10px] text-green-400 tracking-wider shrink-0 hidden sm:block">
          SENTINEL-X v2.0
        </div>

        <div className="flex-1" />

        {/* Global Threat Index */}
        <div className="hidden md:flex items-center gap-1 text-[10px]">
          <span className="text-slate-500">GTI:</span>
          <span className={`font-bold ${gtiColor}`}>{gti}</span>
        </div>

        {/* Alerts count */}
        {openAlerts > 0 && (
          <Link href="/alerts" className="flex items-center gap-1 text-[10px] text-red-400 border border-red-900/50 px-2 py-0.5 bg-red-950/20 hover:bg-red-950/40 cursor-pointer">
            <AlertCircle className="h-3 w-3 animate-pulse" />
            <span>{openAlerts} OPEN</span>
          </Link>
        )}

        {/* WS Status */}
        <div className="flex items-center gap-1 text-[10px] text-slate-500 shrink-0">
          <div className={`w-1.5 h-1.5 rounded-full ${wsColor} ${wsStatus === "connected" ? "animate-pulse" : ""}`} />
          <span className="hidden sm:block">{wsStatus === "connected" ? "LIVE" : wsStatus.toUpperCase()}</span>
        </div>

        {/* Time */}
        <div className="text-[10px] text-slate-400 shrink-0 hidden md:block">
          {now.toISOString().replace("T", " ").slice(0, 19)} UTC
        </div>

        {/* Operator */}
        {user && (
          <div className="flex items-center gap-1.5 text-[10px] shrink-0">
            <Lock className="h-3 w-3 text-green-500" />
            <span className="text-green-400 uppercase">{user.displayName}</span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-500 uppercase">{user.role.replace("_"," ")}</span>
            <button onClick={logout} className="text-slate-600 hover:text-red-400 ml-1 transition-colors">⏻</button>
          </div>
        )}
      </div>

      <div className="flex flex-1 overflow-hidden">

        {/* SIDEBAR */}
        <div className={`${sidebarWidth} bg-[#070e1c] border-r border-green-900/30 flex flex-col transition-all duration-200 shrink-0 relative z-40`}>

          {/* Logo */}
          <div className={`h-12 border-b border-green-900/30 flex items-center px-3 gap-2 shrink-0 ${collapsed ? "justify-center" : ""}`}>
            <div className="w-7 h-7 border border-green-500/40 flex items-center justify-center bg-green-950/40 shrink-0">
              <Zap className="h-4 w-4 text-green-400" />
            </div>
            {!collapsed && (
              <div>
                <div className="text-green-400 font-bold text-sm tracking-widest">SENTINEL</div>
                <div className="text-[9px] text-slate-600 tracking-wider">GLOBAL AWARENESS</div>
              </div>
            )}
          </div>

          {/* Nav */}
          <nav className="flex-1 overflow-y-auto py-2 scrollbar-thin">
            {NAV_GROUPS.map((group) => (
              <div key={group.label} className="mb-2">
                {!collapsed && (
                  <div className="px-3 py-1 text-[9px] text-slate-600 tracking-widest font-bold">{group.label}</div>
                )}
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
                  const showBadge = item.badge === "alerts" && criticalAlerts > 0;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-2.5 px-3 py-2 text-[11px] transition-all border-l-2 relative ${isActive
                        ? "bg-green-950/40 text-green-400 border-green-400"
                        : "text-slate-500 border-transparent hover:bg-green-950/20 hover:text-slate-300"
                      }`}
                      title={collapsed ? item.label : undefined}
                    >
                      <Icon className="h-3.5 w-3.5 shrink-0" />
                      {!collapsed && <span className="tracking-wide truncate">{item.label}</span>}
                      {showBadge && !collapsed && (
                        <span className="ml-auto bg-red-600 text-white text-[9px] px-1 rounded-sm">{criticalAlerts}</span>
                      )}
                      {showBadge && collapsed && (
                        <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
                      )}
                    </Link>
                  );
                })}
              </div>
            ))}
          </nav>

          {/* Bottom status */}
          {!collapsed && (
            <div className="p-3 border-t border-green-900/30 text-[9px] space-y-1">
              <div className="flex items-center justify-between text-slate-600">
                <span>DATABASE</span>
                <span className="text-green-400">ONLINE</span>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span>REAL-TIME</span>
                <span className={wsStatus === "connected" ? "text-green-400" : "text-red-400"}>{wsStatus.toUpperCase()}</span>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span>SOURCES</span>
                <span className="text-green-400">7 ACTIVE</span>
              </div>
            </div>
          )}

          {/* Collapse toggle */}
          <button
            onClick={() => setCollapsed(c => !c)}
            className="h-9 border-t border-green-900/30 flex items-center justify-center text-slate-600 hover:text-green-400 transition-colors bg-[#070e1c] hover:bg-green-950/20 shrink-0"
          >
            {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
          </button>
        </div>

        {/* MAIN CONTENT */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <main className="flex-1 overflow-y-auto relative bg-[#060d1a]">
            {/* Subtle grid overlay */}
            <div
              className="absolute inset-0 pointer-events-none opacity-[0.025]"
              style={{ backgroundImage: "linear-gradient(rgba(34,197,94,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(34,197,94,0.5) 1px, transparent 1px)", backgroundSize: "40px 40px" }}
            />
            <div className="relative z-10 h-full">
              {children}
            </div>
          </main>

          {/* BOTTOM TELEMETRY STRIP */}
          <div className="h-7 bg-[#070e1c] border-t border-green-900/30 flex items-center px-4 gap-6 text-[9px] font-mono text-slate-600 shrink-0">
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
              <span>SENTINEL-X OPERATIONAL</span>
            </div>
            <div>THREATS: <span className="text-red-400">{overview?.counts?.threats ?? "—"}</span></div>
            <div>ALERTS: <span className="text-orange-400">{overview?.counts?.openAlerts ?? "—"} OPEN</span></div>
            <div>ASSETS: <span className="text-green-400">{overview?.counts?.assets ?? "—"} TRACKED</span></div>
            <div>CASES: <span className="text-cyan-400">{overview?.counts?.cases ?? "—"} ACTIVE</span></div>
            <div className="ml-auto hidden lg:block">TS/SCI FACILITY // AUTHORIZED PERSONNEL ONLY</div>
          </div>
        </div>
      </div>
    </div>
  );
};
