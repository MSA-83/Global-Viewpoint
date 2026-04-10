import { useGetDashboardSummary, useGetThreatTrend, useGetRegionalBreakdown, useGetActivityFeed, useGetGpsStats } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, AlertTriangle, Crosshair, Navigation, Radio, ShieldAlert } from "lucide-react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { SeverityBadge } from "@/components/badges";

export default function Dashboard() {
  const { data: summary } = useGetDashboardSummary({ query: { refetchInterval: 10000 } });
  const { data: trend } = useGetThreatTrend({ query: { refetchInterval: 10000 } });
  const { data: regional } = useGetRegionalBreakdown({ query: { refetchInterval: 10000 } });
  const { data: activity } = useGetActivityFeed({ limit: 10 }, { query: { refetchInterval: 10000 } });
  const { data: gpsStats } = useGetGpsStats({ query: { refetchInterval: 10000 } });

  const statCards = [
    { title: "ACTIVE THREATS", value: summary?.totalThreats || 0, icon: AlertTriangle, color: "text-warning" },
    { title: "CRITICAL", value: summary?.criticalThreats || 0, icon: AlertTriangle, color: "text-destructive" },
    { title: "INCIDENTS", value: summary?.activeIncidents || 0, icon: ShieldAlert, color: "text-primary" },
    { title: "GPS ANOMALIES", value: summary?.gpsAnomalies || 0, icon: Crosshair, color: "text-warning" },
    { title: "ASSETS TRACKED", value: summary?.trackedAssets || 0, icon: Navigation, color: "text-primary" },
    { title: "ACTIVE SIGNALS", value: summary?.activeSignals || 0, icon: Radio, color: "text-primary" },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold font-mono text-primary border-b border-primary/20 pb-2">COMMAND DASHBOARD</h1>
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {statCards.map((stat, i) => (
          <Card key={i} className="bg-card/50 border-border rounded-none backdrop-blur-sm">
            <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-xs font-mono text-muted-foreground">{stat.title}</CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className={`text-2xl font-bold font-mono ${stat.color}`}>{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="col-span-2 bg-card/50 border-border rounded-none backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-sm font-mono text-primary flex items-center gap-2">
              <Activity className="h-4 w-4" />
              THREAT TREND (24H)
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            {trend && (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trend}>
                  <defs>
                    <linearGradient id="colorCritical" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="hour" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: 0 }}
                    itemStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                  <Area type="monotone" dataKey="total" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorTotal)" />
                  <Area type="monotone" dataKey="critical" stroke="hsl(var(--destructive))" fillOpacity={1} fill="url(#colorCritical)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-1 bg-card/50 border-border rounded-none backdrop-blur-sm flex flex-col">
          <CardHeader>
            <CardTitle className="text-sm font-mono text-primary flex items-center gap-2">
              <Activity className="h-4 w-4" />
              ACTIVITY FEED
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto space-y-4 pr-2">
            {activity?.map((event) => (
              <div key={event.id} className="border-l-2 border-primary/50 pl-3 py-1 space-y-1">
                <div className="flex justify-between items-start">
                  <SeverityBadge severity={event.severity} />
                  <span className="text-[10px] text-muted-foreground font-mono">{new Date(event.timestamp).toLocaleTimeString()}</span>
                </div>
                <div className="text-sm font-mono">{event.title}</div>
                <div className="text-xs text-muted-foreground">{event.region}</div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-card/50 border-border rounded-none backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-sm font-mono text-primary flex items-center gap-2">
              <Activity className="h-4 w-4" />
              REGIONAL BREAKDOWN
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[250px]">
            {regional && (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={regional} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                  <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="region" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} width={100} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: 0 }}
                    cursor={{ fill: 'hsl(var(--accent))' }}
                  />
                  <Bar dataKey="threatCount" fill="hsl(var(--primary))" name="Threats" />
                  <Bar dataKey="incidentCount" fill="hsl(var(--warning))" name="Incidents" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border rounded-none backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-sm font-mono text-primary flex items-center gap-2">
              <Crosshair className="h-4 w-4" />
              GPS ANOMALY STATS
            </CardTitle>
          </CardHeader>
          <CardContent>
            {gpsStats && (
              <div className="space-y-4 font-mono text-sm">
                <div className="flex justify-between border-b border-border/50 pb-2">
                  <span className="text-muted-foreground">ACTIVE JAMMING SITES</span>
                  <span className="text-warning font-bold">{gpsStats.activeJammingSites}</span>
                </div>
                <div className="flex justify-between border-b border-border/50 pb-2">
                  <span className="text-muted-foreground">ACTIVE SPOOFING SITES</span>
                  <span className="text-destructive font-bold">{gpsStats.activeSpoofingSites}</span>
                </div>
                <div className="flex justify-between border-b border-border/50 pb-2">
                  <span className="text-muted-foreground">AFFECTED AREA (KM²)</span>
                  <span className="text-primary font-bold">{gpsStats.totalAffectedArea.toLocaleString()}</span>
                </div>
                <div className="pt-2">
                  <div className="text-xs text-primary mb-2">HOTSPOTS:</div>
                  <div className="space-y-2">
                    {gpsStats.hotspots.map((hs, i) => (
                      <div key={i} className="flex justify-between text-xs">
                        <span>{hs.region}</span>
                        <span className="text-muted-foreground">{hs.count} events</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
