import { useListGpsAnomalies, useGetGpsStats } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { SeverityBadge } from "@/components/badges";
import { Crosshair, Wifi, WifiOff, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function Gps() {
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [severityFilter, setSeverityFilter] = useState<string>("all");

  const { data: anomalies, isLoading } = useListGpsAnomalies({
    type: typeFilter !== "all" ? (typeFilter as any) : undefined,
    severity: severityFilter !== "all" ? (severityFilter as any) : undefined,
  }, { query: { refetchInterval: 15000 } });

  const { data: stats } = useGetGpsStats({ query: { refetchInterval: 15000 } });

  const typeColor: Record<string, string> = {
    jamming: "bg-destructive/20 text-destructive border-destructive/50",
    spoofing: "bg-orange-500/20 text-orange-400 border-orange-500/50",
    interference: "bg-yellow-500/20 text-yellow-400 border-yellow-500/50",
    outage: "bg-muted/20 text-muted-foreground border-muted/50",
  };

  const TrendIcon = stats?.trend24h === "increasing" ? TrendingUp : stats?.trend24h === "decreasing" ? TrendingDown : Minus;

  return (
    <div className="space-y-6 h-full flex flex-col">
      <h1 className="text-2xl font-bold font-mono text-primary border-b border-primary/20 pb-2 shrink-0 flex items-center gap-2">
        <Crosshair className="h-6 w-6" />
        GPS JAMMING & SPOOFING ANOMALIES
      </h1>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 shrink-0">
          <Card className="rounded-none bg-destructive/10 border-destructive/30">
            <CardContent className="p-4">
              <div className="text-xs font-mono text-muted-foreground mb-1">ACTIVE JAMMING SITES</div>
              <div className="text-3xl font-bold font-mono text-destructive">{stats.activeJammingSites}</div>
            </CardContent>
          </Card>
          <Card className="rounded-none bg-orange-500/10 border-orange-500/30">
            <CardContent className="p-4">
              <div className="text-xs font-mono text-muted-foreground mb-1">ACTIVE SPOOFING SITES</div>
              <div className="text-3xl font-bold font-mono text-orange-400">{stats.activeSpoofingSites}</div>
            </CardContent>
          </Card>
          <Card className="rounded-none bg-primary/10 border-primary/30">
            <CardContent className="p-4">
              <div className="text-xs font-mono text-muted-foreground mb-1">AFFECTED AIRCRAFT</div>
              <div className="text-3xl font-bold font-mono text-primary">{stats.affectedAircraftCount}</div>
            </CardContent>
          </Card>
          <Card className="rounded-none bg-card border-border">
            <CardContent className="p-4">
              <div className="text-xs font-mono text-muted-foreground mb-1">24H TREND</div>
              <div className="flex items-center gap-2">
                <TrendIcon className={`h-6 w-6 ${stats.trend24h === "increasing" ? "text-destructive" : stats.trend24h === "decreasing" ? "text-primary" : "text-muted-foreground"}`} />
                <span className="font-mono font-bold uppercase">{stats.trend24h}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {stats && stats.hotspots.length > 0 && (
        <Card className="rounded-none border-primary/20 bg-card/50 shrink-0">
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-xs font-mono text-primary">JAMMING HOTSPOTS</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <div className="flex flex-wrap gap-3">
              {stats.hotspots.map((hs, i) => (
                <div key={i} className="flex items-center gap-2 bg-background/80 border border-border px-3 py-1.5 font-mono text-xs">
                  <SeverityBadge severity={hs.severity} />
                  <span>{hs.region}</span>
                  <span className="text-muted-foreground">— {hs.count} sites</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-4 items-center shrink-0">
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[180px] rounded-none border-primary/20 bg-background/50 font-mono">
            <SelectValue placeholder="Filter Type" />
          </SelectTrigger>
          <SelectContent className="rounded-none font-mono">
            <SelectItem value="all">ALL TYPES</SelectItem>
            <SelectItem value="jamming">JAMMING</SelectItem>
            <SelectItem value="spoofing">SPOOFING</SelectItem>
            <SelectItem value="interference">INTERFERENCE</SelectItem>
            <SelectItem value="outage">OUTAGE</SelectItem>
          </SelectContent>
        </Select>
        <Select value={severityFilter} onValueChange={setSeverityFilter}>
          <SelectTrigger className="w-[180px] rounded-none border-primary/20 bg-background/50 font-mono">
            <SelectValue placeholder="Filter Severity" />
          </SelectTrigger>
          <SelectContent className="rounded-none font-mono">
            <SelectItem value="all">ALL SEVERITIES</SelectItem>
            <SelectItem value="critical">CRITICAL</SelectItem>
            <SelectItem value="high">HIGH</SelectItem>
            <SelectItem value="medium">MEDIUM</SelectItem>
            <SelectItem value="low">LOW</SelectItem>
          </SelectContent>
        </Select>
        <div className="ml-auto font-mono text-xs text-muted-foreground">
          {anomalies?.length || 0} RECORDS
        </div>
      </div>

      <Card className="flex-1 rounded-none border-primary/20 bg-card/50 overflow-hidden flex flex-col">
        <div className="flex-1 overflow-auto">
          <Table>
            <TableHeader className="bg-background/80 sticky top-0 z-10 backdrop-blur-sm">
              <TableRow className="border-primary/20 hover:bg-transparent">
                <TableHead className="font-mono text-primary font-bold">ID</TableHead>
                <TableHead className="font-mono text-primary font-bold">TYPE</TableHead>
                <TableHead className="font-mono text-primary font-bold">SEVERITY</TableHead>
                <TableHead className="font-mono text-primary font-bold">STATUS</TableHead>
                <TableHead className="font-mono text-primary font-bold">REGION</TableHead>
                <TableHead className="font-mono text-primary font-bold">RADIUS (KM)</TableHead>
                <TableHead className="font-mono text-primary font-bold">SIGNAL (dB)</TableHead>
                <TableHead className="font-mono text-primary font-bold">FREQ (MHz)</TableHead>
                <TableHead className="font-mono text-primary font-bold">DETECTED</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="font-mono text-sm">
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground animate-pulse">
                    SCANNING GNSS FREQUENCIES...
                  </TableCell>
                </TableRow>
              ) : anomalies?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    NO ANOMALIES DETECTED
                  </TableCell>
                </TableRow>
              ) : (
                anomalies?.map((a) => (
                  <TableRow key={a.id} className="border-primary/10 hover:bg-primary/5">
                    <TableCell className="text-muted-foreground">G-{a.id.toString().padStart(4, "0")}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`${typeColor[a.type] || ""} rounded-none font-mono uppercase`}>
                        {a.type}
                      </Badge>
                    </TableCell>
                    <TableCell><SeverityBadge severity={a.severity} /></TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        {a.active ? (
                          <><Wifi className="h-3 w-3 text-destructive animate-pulse" /><span className="text-destructive">ACTIVE</span></>
                        ) : (
                          <><WifiOff className="h-3 w-3 text-muted-foreground" /><span className="text-muted-foreground">INACTIVE</span></>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{a.region}</TableCell>
                    <TableCell>{a.radius?.toFixed(0)}</TableCell>
                    <TableCell className="text-orange-400">{a.signalStrength != null ? `${a.signalStrength.toFixed(1)}` : "—"}</TableCell>
                    <TableCell className="text-primary">{a.frequency != null ? `${a.frequency.toFixed(1)}` : "—"}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">{new Date(a.detectedAt).toLocaleString()}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
