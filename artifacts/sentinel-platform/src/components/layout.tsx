import { FC, ReactNode, useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { 
  Activity, 
  Map as MapIcon, 
  AlertTriangle, 
  ShieldAlert, 
  Navigation, 
  Radio, 
  Settings,
  Server,
  Crosshair
} from "lucide-react";
import { useHealthCheck } from "@workspace/api-client-react";

export const Layout: FC<{ children: ReactNode }> = ({ children }) => {
  const [location] = useLocation();
  const { data: health, isLoading } = useHealthCheck({ query: { refetchInterval: 30000 } });
  
  const navItems = [
    { href: "/", label: "DASHBOARD", icon: Activity },
    { href: "/map", label: "GLOBAL MAP", icon: MapIcon },
    { href: "/threats", label: "THREAT INTEL", icon: AlertTriangle },
    { href: "/incidents", label: "INCIDENTS", icon: ShieldAlert },
    { href: "/assets", label: "ASSET TRACKING", icon: Navigation },
    { href: "/gps", label: "GPS ANOMALIES", icon: Crosshair },
    { href: "/signals", label: "SIGINT", icon: Radio },
    { href: "/settings", label: "SYSTEM SETTINGS", icon: Settings },
  ];

  return (
    <div className="flex h-screen w-full bg-background text-foreground overflow-hidden">
      {/* Sidebar */}
      <div className="w-64 border-r border-border flex flex-col bg-card">
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-2 text-primary font-bold text-xl tracking-wider">
            <Server className="h-6 w-6" />
            <span>SENTINEL</span>
          </div>
          <div className="mt-2 text-xs font-mono text-destructive font-bold animate-pulse">
            CLASSIFICATION: SECRET//NOFORN
          </div>
        </div>
        
        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-1 px-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
              
              return (
                <li key={item.href}>
                  <Link href={item.href} className={`flex items-center gap-3 px-3 py-2 text-sm font-mono transition-colors border-l-2 ${isActive ? 'bg-accent text-primary border-primary' : 'text-muted-foreground border-transparent hover:bg-accent/50 hover:text-foreground'}`}>
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="p-4 border-t border-border text-xs font-mono">
          <div className="flex items-center gap-2 mb-2">
            <div className={`w-2 h-2 rounded-full ${health?.status === 'ok' ? 'bg-primary animate-pulse' : 'bg-destructive'}`}></div>
            <span className={health?.status === 'ok' ? 'text-primary' : 'text-destructive'}>
              SYS: {health?.status === 'ok' ? 'ONLINE' : 'OFFLINE'}
            </span>
          </div>
          <div className="text-muted-foreground flex justify-between">
            <span>UPLINK:</span>
            <span>SECURE</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Header */}
        <header className="h-14 border-b border-border flex items-center justify-between px-6 bg-card shrink-0">
          <div className="font-mono text-sm text-muted-foreground">
            {new Date().toISOString()}
          </div>
          <div className="flex items-center gap-4 text-xs font-mono">
            <div className="flex items-center gap-2 border border-primary/30 bg-primary/10 px-3 py-1 text-primary">
              <span className="w-2 h-2 bg-primary rounded-full animate-pulse"></span>
              LIVE DATA FEED
            </div>
            <div className="text-muted-foreground">
              OP: ALPHA-7
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6 bg-background relative">
          <div className="absolute inset-0 pointer-events-none opacity-5" style={{ backgroundImage: 'linear-gradient(rgba(120, 255, 120, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(120, 255, 120, 0.1) 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
          <div className="relative z-10 h-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
