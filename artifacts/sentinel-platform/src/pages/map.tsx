import { useListThreats, useListGpsAnomalies, useListAssets } from "@workspace/api-client-react";
import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SeverityBadge } from "@/components/badges";
import { MapPin, Crosshair, Navigation } from "lucide-react";

// World continent SVG paths (simplified Robinson projection)
const CONTINENTS = [
  {
    name: "North America",
    d: "M 140 80 L 200 70 L 240 90 L 250 130 L 230 170 L 200 180 L 185 200 L 175 190 L 165 200 L 155 185 L 140 180 L 130 160 L 120 140 L 125 110 Z",
    fill: "rgba(30, 60, 40, 0.6)"
  },
  {
    name: "South America",
    d: "M 185 210 L 215 200 L 235 220 L 240 260 L 235 310 L 220 340 L 200 350 L 185 330 L 175 290 L 170 250 L 175 220 Z",
    fill: "rgba(30, 60, 40, 0.6)"
  },
  {
    name: "Europe",
    d: "M 330 60 L 380 55 L 400 70 L 390 90 L 370 100 L 350 95 L 330 85 Z",
    fill: "rgba(30, 60, 40, 0.6)"
  },
  {
    name: "Africa",
    d: "M 340 120 L 380 110 L 410 125 L 420 170 L 415 220 L 400 270 L 375 290 L 355 275 L 335 230 L 325 180 L 325 140 Z",
    fill: "rgba(30, 60, 40, 0.6)"
  },
  {
    name: "Asia",
    d: "M 390 55 L 480 40 L 560 50 L 600 70 L 610 110 L 580 140 L 540 150 L 500 160 L 460 150 L 430 130 L 400 120 L 390 90 Z",
    fill: "rgba(30, 60, 40, 0.6)"
  },
  {
    name: "Australia",
    d: "M 520 230 L 570 220 L 600 235 L 610 265 L 595 285 L 560 290 L 530 275 L 515 255 Z",
    fill: "rgba(30, 60, 40, 0.6)"
  },
];

// Convert lat/lon to SVG coordinates (simple equirectangular)
function latLonToSvg(lat: number, lon: number, w = 760, h = 420) {
  const x = ((lon + 180) / 360) * w;
  const y = ((90 - lat) / 180) * h;
  return { x, y };
}

type Marker = {
  id: number;
  lat: number;
  lon: number;
  severity: string;
  label: string;
  kind: "threat" | "gps" | "asset";
  radius?: number;
};

export default function MapPage() {
  const { data: threats } = useListThreats({ limit: 200 }, { query: { refetchInterval: 20000 } });
  const { data: gpsAnomalies } = useListGpsAnomalies({ active: true }, { query: { refetchInterval: 20000 } });
  const { data: assets } = useListAssets({ limit: 200 }, { query: { refetchInterval: 20000 } });

  const [selected, setSelected] = useState<Marker | null>(null);
  const [layers, setLayers] = useState({ threats: true, gps: true, assets: true });

  const markers = useMemo<Marker[]>(() => {
    const all: Marker[] = [];
    if (layers.threats && threats) {
      threats.forEach(t => {
        if (t.latitude != null && t.longitude != null) {
          all.push({ id: t.id, lat: t.latitude, lon: t.longitude, severity: t.severity, label: t.title, kind: "threat" });
        }
      });
    }
    if (layers.gps && gpsAnomalies) {
      gpsAnomalies.forEach(g => {
        if (g.latitude != null && g.longitude != null) {
          all.push({ id: g.id, lat: g.latitude, lon: g.longitude, severity: g.severity, label: `GPS: ${g.type.toUpperCase()} - ${g.region}`, kind: "gps", radius: g.radius });
        }
      });
    }
    if (layers.assets && assets) {
      assets.forEach(a => {
        if (a.latitude != null && a.longitude != null) {
          all.push({ id: a.id, lat: a.latitude, lon: a.longitude, severity: a.affiliation === "hostile" ? "critical" : a.affiliation === "neutral" ? "medium" : "low", label: `${a.name} (${a.type})`, kind: "asset" });
        }
      });
    }
    return all;
  }, [threats, gpsAnomalies, assets, layers]);

  const sevColor: Record<string, string> = {
    critical: "#ef4444",
    high: "#f97316",
    medium: "#eab308",
    low: "#22c55e",
    none: "#3b82f6",
  };

  const W = 760, H = 420;

  return (
    <div className="h-full flex flex-col space-y-4">
      <h1 className="text-2xl font-bold font-mono text-primary border-b border-primary/20 pb-2 shrink-0 flex items-center gap-2">
        <MapPin className="h-6 w-6" />
        GLOBAL SITUATIONAL MAP
      </h1>

      <div className="flex gap-3 shrink-0 font-mono text-xs">
        {[
          { key: "threats", label: "THREATS", icon: "●", color: "text-destructive" },
          { key: "gps", label: "GPS ANOMALIES", icon: "◎", color: "text-orange-400" },
          { key: "assets", label: "ASSETS", icon: "▲", color: "text-primary" },
        ].map(({ key, label, icon, color }) => (
          <button
            key={key}
            onClick={() => setLayers(l => ({ ...l, [key]: !l[key as keyof typeof l] }))}
            className={`flex items-center gap-1.5 px-3 py-1.5 border transition-colors ${layers[key as keyof typeof layers] ? "border-primary/40 bg-primary/10 text-foreground" : "border-border/40 text-muted-foreground"}`}
          >
            <span className={color}>{icon}</span>
            {label}
          </button>
        ))}
        <div className="ml-auto text-muted-foreground py-1.5">
          {markers.length} ACTIVE MARKERS
        </div>
      </div>

      <div className="flex gap-4 flex-1 min-h-0">
        <Card className="flex-1 rounded-none border-primary/30 bg-background overflow-hidden relative">
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="w-full h-full"
            style={{ background: "linear-gradient(180deg, #050d1a 0%, #081528 100%)" }}
          >
            {/* Grid lines */}
            {Array.from({ length: 19 }, (_, i) => (
              <line key={`h${i}`} x1={0} y1={(H / 18) * i} x2={W} y2={(H / 18) * i} stroke="rgba(0,200,100,0.05)" strokeWidth={0.5} />
            ))}
            {Array.from({ length: 37 }, (_, i) => (
              <line key={`v${i}`} x1={(W / 36) * i} y1={0} x2={(W / 36) * i} y2={H} stroke="rgba(0,200,100,0.05)" strokeWidth={0.5} />
            ))}
            {/* Equator */}
            <line x1={0} y1={H / 2} x2={W} y2={H / 2} stroke="rgba(0,200,100,0.15)" strokeWidth={0.8} strokeDasharray="4,4" />
            {/* Prime meridian */}
            <line x1={W / 2} y1={0} x2={W / 2} y2={H} stroke="rgba(0,200,100,0.15)" strokeWidth={0.8} strokeDasharray="4,4" />

            {/* Ocean background */}
            <rect x={0} y={0} width={W} height={H} fill="transparent" />

            {/* Continents */}
            {CONTINENTS.map(c => (
              <path key={c.name} d={c.d} fill={c.fill} stroke="rgba(0,200,80,0.4)" strokeWidth={0.8} />
            ))}

            {/* GPS anomaly circles */}
            {layers.gps && gpsAnomalies?.map(g => {
              if (g.latitude == null || g.longitude == null) return null;
              const { x, y } = latLonToSvg(g.latitude, g.longitude, W, H);
              const r = Math.max(6, Math.min(30, (g.radius || 50) / 12));
              return (
                <g key={`gps-${g.id}`}>
                  <circle cx={x} cy={y} r={r} fill="rgba(249,115,22,0.1)" stroke="rgba(249,115,22,0.6)" strokeWidth={1} strokeDasharray="3,2">
                    <animate attributeName="r" values={`${r};${r * 1.4};${r}`} dur="3s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.8;0.3;0.8" dur="3s" repeatCount="indefinite" />
                  </circle>
                </g>
              );
            })}

            {/* Threat markers */}
            {layers.threats && threats?.map(t => {
              if (t.latitude == null || t.longitude == null) return null;
              const { x, y } = latLonToSvg(t.latitude, t.longitude, W, H);
              const color = sevColor[t.severity] || sevColor.none;
              return (
                <g key={`threat-${t.id}`} onClick={() => setSelected({ id: t.id, lat: t.latitude, lon: t.longitude, severity: t.severity, label: t.title, kind: "threat" })} style={{ cursor: "pointer" }}>
                  {t.severity === "critical" && (
                    <circle cx={x} cy={y} r={8} fill="none" stroke={color} strokeWidth={1} opacity={0.4}>
                      <animate attributeName="r" values="8;14;8" dur="2s" repeatCount="indefinite" />
                      <animate attributeName="opacity" values="0.4;0;0.4" dur="2s" repeatCount="indefinite" />
                    </circle>
                  )}
                  <circle cx={x} cy={y} r={4} fill={color} opacity={0.9} />
                  <circle cx={x} cy={y} r={4} fill="none" stroke={color} strokeWidth={0.5} opacity={0.4} />
                </g>
              );
            })}

            {/* Asset markers */}
            {layers.assets && assets?.map(a => {
              if (a.latitude == null || a.longitude == null) return null;
              const { x, y } = latLonToSvg(a.latitude, a.longitude, W, H);
              const color = a.affiliation === "hostile" ? "#ef4444" : a.affiliation === "neutral" ? "#eab308" : "#22c55e";
              const size = 5;
              return (
                <g key={`asset-${a.id}`} onClick={() => setSelected({ id: a.id, lat: a.latitude, lon: a.longitude, severity: a.affiliation === "hostile" ? "critical" : "low", label: `${a.name}`, kind: "asset" })} style={{ cursor: "pointer" }}>
                  <polygon
                    points={`${x},${y - size} ${x - size * 0.8},${y + size * 0.6} ${x + size * 0.8},${y + size * 0.6}`}
                    fill={color}
                    opacity={0.85}
                    stroke={color}
                    strokeWidth={0.5}
                  />
                </g>
              );
            })}
          </svg>

          {selected && (
            <div className="absolute bottom-4 left-4 bg-background/95 border border-primary/40 p-3 font-mono text-xs max-w-xs backdrop-blur-sm">
              <div className="flex justify-between items-start mb-2">
                <div className="text-primary font-bold uppercase">{selected.kind}</div>
                <button onClick={() => setSelected(null)} className="text-muted-foreground hover:text-foreground ml-4">×</button>
              </div>
              <div className="font-bold text-sm mb-1">{selected.label}</div>
              <div className="flex items-center gap-2 mb-1">
                <SeverityBadge severity={selected.severity} />
              </div>
              <div className="text-muted-foreground">
                {selected.lat.toFixed(4)}°N / {selected.lon.toFixed(4)}°E
              </div>
            </div>
          )}
        </Card>

        <div className="w-56 space-y-3 shrink-0 overflow-y-auto">
          <Card className="rounded-none border-primary/20 bg-card/50">
            <CardHeader className="p-3 pb-1">
              <CardTitle className="text-xs font-mono text-primary flex items-center gap-1"><Crosshair className="h-3 w-3" /> LEGEND</CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-1 space-y-2 font-mono text-xs">
              {[
                { color: "#ef4444", label: "CRITICAL THREAT" },
                { color: "#f97316", label: "HIGH THREAT" },
                { color: "#eab308", label: "MEDIUM THREAT" },
                { color: "#22c55e", label: "LOW / FRIENDLY" },
              ].map(({ color, label }) => (
                <div key={label} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                  <span className="text-muted-foreground">{label}</span>
                </div>
              ))}
              <div className="pt-1 border-t border-border">
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full border-2 border-orange-400 border-dashed" /><span className="text-muted-foreground">GPS ANOMALY ZONE</span></div>
                <div className="flex items-center gap-2 mt-1"><div className="w-0 h-0 border-l-[5px] border-r-[5px] border-b-[8px] border-transparent" style={{ borderBottomColor: "#22c55e" }} /><span className="text-muted-foreground">TRACKED ASSET</span></div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-none border-primary/20 bg-card/50">
            <CardHeader className="p-3 pb-1">
              <CardTitle className="text-xs font-mono text-primary flex items-center gap-1"><Navigation className="h-3 w-3" /> SUMMARY</CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-1 font-mono text-xs space-y-2">
              <div className="flex justify-between"><span className="text-muted-foreground">THREATS</span><span className="text-destructive font-bold">{threats?.length || 0}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">GPS SITES</span><span className="text-orange-400 font-bold">{gpsAnomalies?.length || 0}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">ASSETS</span><span className="text-primary font-bold">{assets?.length || 0}</span></div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
