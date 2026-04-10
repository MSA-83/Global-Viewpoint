import { useHealthCheck } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings, Server, Database, Shield, Radio, Wifi, WifiOff, CheckCircle, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const DATA_SOURCES = [
  { name: "NASA EONET", description: "Earth Observatory Natural Events", status: "connected", type: "Natural Hazards" },
  { name: "OpenStreetMap", description: "Geospatial reference data", status: "connected", type: "Geospatial" },
  { name: "AIS Stream", description: "Maritime vessel tracking", status: "degraded", type: "Maritime" },
  { name: "AVWX API", description: "Aviation weather / SIGMETs", status: "connected", type: "Aviation" },
  { name: "GNSS Monitor", description: "GPS anomaly detection feed", status: "connected", type: "Navigation" },
  { name: "Shodan", description: "Cyber intelligence / exposed hosts", status: "offline", type: "Cyber" },
  { name: "Space-Track", description: "Orbital / satellite TLE data", status: "degraded", type: "Orbital" },
  { name: "OSINT Aggregator", description: "Open-source intelligence feed", status: "connected", type: "OSINT" },
];

const STATUS_COLORS: Record<string, string> = {
  connected: "bg-primary/20 text-primary border-primary/50",
  degraded: "bg-yellow-500/20 text-yellow-400 border-yellow-500/50",
  offline: "bg-destructive/20 text-destructive border-destructive/50",
};

export default function SettingsPage() {
  const { data: health, isLoading } = useHealthCheck({ query: { refetchInterval: 30000 } });

  const systemOnline = health?.status === "ok";

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold font-mono text-primary border-b border-primary/20 pb-2 flex items-center gap-2">
        <Settings className="h-6 w-6" />
        SYSTEM CONFIGURATION
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className={`rounded-none border ${systemOnline ? "border-primary/40 bg-primary/5" : "border-destructive/40 bg-destructive/5"}`}>
          <CardContent className="p-4 flex items-center gap-4">
            <Server className={`h-8 w-8 ${systemOnline ? "text-primary" : "text-destructive"}`} />
            <div className="font-mono">
              <div className="text-xs text-muted-foreground">SENTINEL API</div>
              <div className={`font-bold text-lg ${systemOnline ? "text-primary" : "text-destructive"}`}>
                {isLoading ? "CHECKING..." : systemOnline ? "ONLINE" : "OFFLINE"}
              </div>
            </div>
            {systemOnline ? <CheckCircle className="h-5 w-5 text-primary ml-auto" /> : <XCircle className="h-5 w-5 text-destructive ml-auto" />}
          </CardContent>
        </Card>

        <Card className="rounded-none border-primary/40 bg-primary/5">
          <CardContent className="p-4 flex items-center gap-4">
            <Database className="h-8 w-8 text-primary" />
            <div className="font-mono">
              <div className="text-xs text-muted-foreground">DATABASE</div>
              <div className="font-bold text-lg text-primary">ONLINE</div>
            </div>
            <CheckCircle className="h-5 w-5 text-primary ml-auto" />
          </CardContent>
        </Card>

        <Card className="rounded-none border-primary/40 bg-primary/5">
          <CardContent className="p-4 flex items-center gap-4">
            <Shield className="h-8 w-8 text-primary" />
            <div className="font-mono">
              <div className="text-xs text-muted-foreground">ENCRYPTION</div>
              <div className="font-bold text-lg text-primary">TLS 1.3</div>
            </div>
            <CheckCircle className="h-5 w-5 text-primary ml-auto" />
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-none border-primary/20 bg-card/50">
        <CardHeader>
          <CardTitle className="text-sm font-mono text-primary flex items-center gap-2">
            <Radio className="h-4 w-4" />
            DATA SOURCE CONNECTIVITY
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {DATA_SOURCES.map((ds) => (
              <div key={ds.name} className="flex items-center justify-between border border-border/40 bg-background/40 px-4 py-3 font-mono text-sm">
                <div className="flex items-center gap-4">
                  {ds.status === "offline" ? (
                    <WifiOff className="h-4 w-4 text-destructive" />
                  ) : (
                    <Wifi className={`h-4 w-4 ${ds.status === "connected" ? "text-primary" : "text-yellow-400"}`} />
                  )}
                  <div>
                    <div className="font-bold">{ds.name}</div>
                    <div className="text-xs text-muted-foreground">{ds.description}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">{ds.type}</span>
                  <Badge variant="outline" className={`${STATUS_COLORS[ds.status]} rounded-none font-mono uppercase text-xs`}>
                    {ds.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="rounded-none border-primary/20 bg-card/50">
          <CardHeader>
            <CardTitle className="text-sm font-mono text-primary">CLASSIFICATION CONTROLS</CardTitle>
          </CardHeader>
          <CardContent className="font-mono text-sm space-y-3">
            {[
              { label: "CURRENT CLASSIFICATION", value: "SECRET//NOFORN", color: "text-destructive" },
              { label: "HANDLING CAVEAT", value: "ORCON/PROPIN", color: "text-orange-400" },
              { label: "COMPARTMENT", value: "HCS-P / SI-G", color: "text-yellow-400" },
              { label: "DOWNGRADE DATE", value: "25X1-HUMAN", color: "text-muted-foreground" },
            ].map(({ label, value, color }) => (
              <div key={label} className="flex justify-between border-b border-border/30 pb-2">
                <span className="text-muted-foreground">{label}</span>
                <span className={`font-bold ${color}`}>{value}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="rounded-none border-primary/20 bg-card/50">
          <CardHeader>
            <CardTitle className="text-sm font-mono text-primary">PLATFORM INFORMATION</CardTitle>
          </CardHeader>
          <CardContent className="font-mono text-sm space-y-3">
            {[
              { label: "PLATFORM", value: "SENTINEL v4.0" },
              { label: "BUILD", value: "2026.04.10-SEC" },
              { label: "ENCRYPTION", value: "AES-256-GCM" },
              { label: "NODE", value: "ALPHA-STATION-07" },
              { label: "UPTIME", value: "99.97% (30d)" },
              { label: "SESSION", value: "OP: ALPHA-7" },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between border-b border-border/30 pb-2">
                <span className="text-muted-foreground">{label}</span>
                <span className="text-primary">{value}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
