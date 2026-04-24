import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { listAssets, listThreats, listGpsAnomalies } from "@/lib/api";
import { MapContainer, TileLayer, CircleMarker, Popup, LayersControl, LayerGroup, Circle, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Globe2, Plane, Ship, Satellite, Activity, AlertTriangle, Layers as LayersIcon, Radio, Target } from "lucide-react";

const DOMAIN_COLOR: Record<string, string> = {
  aviation: "#22d3ee", maritime: "#3b82f6", orbital: "#a855f7",
  seismic: "#f97316", conflict: "#ef4444", weather: "#eab308",
  cyber: "#10b981", nuclear: "#f43f5e", sigint: "#8b5cf6",
  infrastructure: "#06b6d4", energy: "#fbbf24", logistics: "#84cc16",
  border: "#ec4899", telecom: "#14b8a6", public_safety: "#f59e0b",
};
const SEV_COLOR: Record<string, string> = {
  critical: "#ef4444", high: "#f97316", medium: "#eab308", low: "#22c55e", info: "#3b82f6",
};
const AFF_COLOR: Record<string, string> = {
  friendly: "#3b82f6", hostile: "#ef4444", neutral: "#22c55e", unknown: "#94a3b8",
};

const DOMAIN_ICONS: Record<string, any> = {
  aviation: Plane, maritime: Ship, orbital: Satellite, sigint: Radio,
};

function StatPill({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="border bg-[#070e1c] px-2.5 py-1.5" style={{ borderColor: color + "40" }}>
      <div className="text-[8px] text-slate-500 tracking-wider">{label}</div>
      <div className="text-base font-mono font-bold" style={{ color }}>{value}</div>
    </div>
  );
}

function MapResizer() {
  const map = useMap();
  useEffect(() => {
    const t = setTimeout(() => map.invalidateSize(), 100);
    return () => clearTimeout(t);
  }, [map]);
  return null;
}

export default function MapPage() {
  const [domainFilter, setDomainFilter] = useState<string>("all");
  const [showThreats, setShowThreats] = useState(true);
  const [showAssets, setShowAssets] = useState(true);
  const [showGps, setShowGps] = useState(true);
  const [tileStyle, setTileStyle] = useState<"dark" | "satellite" | "tactical">("dark");

  const { data: assets } = useQuery({ queryKey: ["assets"], queryFn: listAssets, refetchInterval: 15000 });
  const { data: threats } = useQuery({ queryKey: ["threats"], queryFn: () => listThreats(), refetchInterval: 30000 });
  const { data: gpsAnomalies } = useQuery({ queryKey: ["gps"], queryFn: listGpsAnomalies, refetchInterval: 30000 });

  const filteredAssets = useMemo(() => (assets ?? []).filter((a: any) =>
    a.lat != null && a.lng != null && (domainFilter === "all" || a.domain === domainFilter)
  ), [assets, domainFilter]);

  const filteredThreats = useMemo(() => (threats ?? []).filter((t: any) =>
    t.lat != null && t.lng != null && (domainFilter === "all" || t.category === domainFilter || t.domain === domainFilter)
  ), [threats, domainFilter]);

  const filteredGps = useMemo(() => (gpsAnomalies ?? []).filter((g: any) =>
    g.lat != null && g.lng != null
  ), [gpsAnomalies]);

  const stats = {
    total: filteredAssets.length,
    hostile: filteredAssets.filter((a: any) => a.affiliation === "hostile").length,
    threats: filteredThreats.length,
    critical: filteredThreats.filter((t: any) => t.severity === "critical").length,
    gps: filteredGps.length,
  };

  const tileConfig = {
    dark: {
      url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
      attribution: '&copy; OpenStreetMap &copy; CARTO',
      subdomains: "abcd",
    },
    satellite: {
      url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      attribution: 'Tiles &copy; Esri',
      subdomains: "",
    },
    tactical: {
      url: "https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png",
      attribution: '&copy; OpenStreetMap &copy; CARTO',
      subdomains: "abcd",
    },
  }[tileStyle];

  return (
    <div className="p-3 h-full flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Globe2 className="h-5 w-5 text-green-400" />
          <h1 className="text-lg font-bold text-green-400 tracking-widest">TACTICAL MAP</h1>
          <span className="text-[9px] text-slate-500 border border-green-900/40 px-2 py-0.5 flex items-center gap-1">
            <Activity className="h-2.5 w-2.5 text-green-400 animate-pulse" /> LIVE FEED
          </span>
        </div>
        <div className="flex gap-2 items-center">
          <StatPill label="ASSETS" value={stats.total} color="#22c55e" />
          <StatPill label="HOSTILE" value={stats.hostile} color="#ef4444" />
          <StatPill label="THREATS" value={stats.threats} color="#f97316" />
          <StatPill label="CRITICAL" value={stats.critical} color="#ef4444" />
          <StatPill label="GPS EVT" value={stats.gps} color="#eab308" />
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1 border border-green-900/30 bg-[#070e1c] px-2 py-1">
          <LayersIcon className="h-3 w-3 text-green-600" />
          <span className="text-[9px] text-slate-500 mr-1">TILES:</span>
          {[
            { k: "dark", label: "DARK" },
            { k: "tactical", label: "TACTICAL" },
            { k: "satellite", label: "SATELLITE" },
          ].map(t => (
            <button key={t.k} onClick={() => setTileStyle(t.k as any)}
              className={`text-[9px] px-2 py-0.5 ${tileStyle === t.k ? "bg-green-950/60 text-green-400" : "text-slate-500 hover:text-slate-300"}`}>
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1 border border-green-900/30 bg-[#070e1c] px-2 py-1">
          <span className="text-[9px] text-slate-500 mr-1">DOMAIN:</span>
          <select value={domainFilter} onChange={e => setDomainFilter(e.target.value)}
            className="bg-transparent text-[10px] text-slate-300 focus:outline-none">
            <option value="all">ALL</option>
            {Object.keys(DOMAIN_COLOR).map(d => <option key={d} value={d}>{d.toUpperCase()}</option>)}
          </select>
        </div>

        <div className="flex items-center gap-1 border border-green-900/30 bg-[#070e1c] px-2 py-1">
          <span className="text-[9px] text-slate-500 mr-1">LAYERS:</span>
          {[
            { k: "assets", label: "ASSETS", val: showAssets, set: setShowAssets, c: "#22c55e" },
            { k: "threats", label: "THREATS", val: showThreats, set: setShowThreats, c: "#f97316" },
            { k: "gps", label: "GPS ANOM", val: showGps, set: setShowGps, c: "#eab308" },
          ].map(l => (
            <button key={l.k} onClick={() => l.set(!l.val)}
              className="text-[9px] px-2 py-0.5 flex items-center gap-1"
              style={{ color: l.val ? l.c : "#475569" }}>
              <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: l.val ? l.c : "#334155" }} />
              {l.label}
            </button>
          ))}
        </div>
      </div>

      {/* Map */}
      <div className="flex-1 border border-green-900/30 bg-[#050a14] relative min-h-[500px]">
        <MapContainer
          center={[20, 0]}
          zoom={2}
          minZoom={2}
          maxZoom={12}
          style={{ height: "100%", width: "100%", background: "#050a14" }}
          worldCopyJump
          preferCanvas
        >
          <MapResizer />
          <TileLayer url={tileConfig.url} attribution={tileConfig.attribution}
            subdomains={tileConfig.subdomains as any} />

          {showAssets && filteredAssets.map((a: any) => {
            const color = AFF_COLOR[a.affiliation] || "#94a3b8";
            return (
              <CircleMarker key={`a-${a.id}`} center={[a.lat, a.lng]}
                radius={a.affiliation === "hostile" ? 6 : 5}
                pathOptions={{
                  color,
                  weight: 1.5,
                  fillColor: color,
                  fillOpacity: 0.55,
                }}>
                <Popup className="sentinel-popup" maxWidth={320}>
                  <div className="text-slate-200 font-mono">
                    <div className="text-[10px] tracking-wider mb-1.5 pb-1.5 border-b border-green-900/40 flex items-center justify-between">
                      <span style={{ color }}>{a.affiliation?.toUpperCase()}</span>
                      <span className="text-slate-500">{(a.domain || "").toUpperCase()}</span>
                    </div>
                    <div className="text-[12px] font-bold mb-0.5">{a.name}</div>
                    {a.designation && <div className="text-[10px] text-slate-400 mb-2">{a.designation}</div>}
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[10px]">
                      <div><span className="text-slate-500">TYPE</span><br/><span className="text-slate-300">{a.type || "-"}</span></div>
                      <div><span className="text-slate-500">FLAG</span><br/><span className="text-slate-300">{a.flag || a.country || "-"}</span></div>
                      <div><span className="text-slate-500">LAT</span><br/><span className="text-cyan-400">{a.lat?.toFixed(4)}</span></div>
                      <div><span className="text-slate-500">LON</span><br/><span className="text-cyan-400">{a.lng?.toFixed(4)}</span></div>
                      {a.altitude != null && <div><span className="text-slate-500">ALT</span><br/><span className="text-slate-300">{Math.round(a.altitude)}ft</span></div>}
                      {a.speed != null && <div><span className="text-slate-500">SPD</span><br/><span className="text-slate-300">{Math.round(a.speed)}kt</span></div>}
                      {a.heading != null && <div><span className="text-slate-500">HDG</span><br/><span className="text-slate-300">{Math.round(a.heading)}°</span></div>}
                      <div><span className="text-slate-500">STATUS</span><br/><span className="text-green-400">{(a.status || "ACTIVE").toUpperCase()}</span></div>
                    </div>
                    {a.metadata && Object.keys(a.metadata).length > 0 && (
                      <div className="mt-2 pt-1.5 border-t border-green-900/40">
                        <div className="text-[9px] text-slate-500 mb-1">METADATA</div>
                        <div className="text-[9px] text-slate-400 max-h-20 overflow-y-auto">
                          {Object.entries(a.metadata).slice(0, 6).map(([k, v]) => (
                            <div key={k}><span className="text-slate-500">{k}:</span> {String(v).slice(0, 40)}</div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}

          {showThreats && filteredThreats.map((t: any) => {
            const color = SEV_COLOR[t.severity] || "#94a3b8";
            const radius = t.severity === "critical" ? 11 : t.severity === "high" ? 9 : 7;
            return (
              <LayerGroup key={`t-${t.id}`}>
                <Circle center={[t.lat, t.lng]} radius={50000 + (t.severity === "critical" ? 200000 : 0)}
                  pathOptions={{ color, weight: 0.8, fillColor: color, fillOpacity: 0.08 }} />
                <CircleMarker center={[t.lat, t.lng]} radius={radius}
                  pathOptions={{
                    color,
                    weight: 2,
                    fillColor: color,
                    fillOpacity: 0.7,
                    className: t.severity === "critical" ? "sentinel-pulse" : undefined,
                  }}>
                  <Popup className="sentinel-popup" maxWidth={340}>
                    <div className="text-slate-200 font-mono">
                      <div className="text-[10px] tracking-wider mb-1.5 pb-1.5 border-b flex items-center justify-between"
                        style={{ borderColor: color + "60" }}>
                        <span className="px-1.5 py-0.5 border" style={{ color, borderColor: color + "80" }}>
                          {t.severity?.toUpperCase()} THREAT
                        </span>
                        <span className="text-slate-500">{(t.category || t.domain || "").toUpperCase()}</span>
                      </div>
                      <div className="text-[12px] font-bold mb-1.5">{t.title}</div>
                      {t.description && (
                        <div className="text-[10px] text-slate-400 mb-2 max-h-24 overflow-y-auto leading-snug">
                          {t.description}
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[10px]">
                        <div><span className="text-slate-500">REGION</span><br/><span className="text-slate-300">{t.region || "-"}</span></div>
                        <div><span className="text-slate-500">SOURCE</span><br/><span className="text-slate-300">{t.source || "INTERNAL"}</span></div>
                        <div><span className="text-slate-500">SCORE</span><br/><span className="text-cyan-400">{t.score ?? t.confidence ?? "-"}</span></div>
                        <div><span className="text-slate-500">STATUS</span><br/><span className="text-orange-400">{t.status?.toUpperCase()}</span></div>
                        <div><span className="text-slate-500">LAT</span><br/><span className="text-cyan-400">{t.lat?.toFixed(4)}</span></div>
                        <div><span className="text-slate-500">LON</span><br/><span className="text-cyan-400">{t.lng?.toFixed(4)}</span></div>
                      </div>
                      <div className="mt-2 pt-1.5 border-t border-slate-700 text-[9px] text-slate-500">
                        DETECTED {t.createdAt ? new Date(t.createdAt).toLocaleString() : "-"}
                      </div>
                    </div>
                  </Popup>
                </CircleMarker>
              </LayerGroup>
            );
          })}

          {showGps && filteredGps.map((g: any) => {
            const color = g.type === "spoofing" ? "#ef4444" : g.type === "jamming" ? "#f97316" : "#eab308";
            return (
              <LayerGroup key={`g-${g.id}`}>
                <Circle center={[g.lat, g.lng]} radius={(g.radius || 50) * 1000}
                  pathOptions={{ color, weight: 1, fillColor: color, fillOpacity: 0.15, dashArray: "4,4" }}>
                  <Popup className="sentinel-popup" maxWidth={320}>
                    <div className="text-slate-200 font-mono">
                      <div className="text-[10px] tracking-wider mb-1.5 pb-1.5 border-b flex items-center justify-between"
                        style={{ borderColor: color + "60" }}>
                        <span className="px-1.5 py-0.5 border" style={{ color, borderColor: color + "80" }}>
                          GPS {g.type?.toUpperCase()}
                        </span>
                        <span className="text-slate-500">{(g.severity || "").toUpperCase()}</span>
                      </div>
                      <div className="text-[12px] font-bold mb-1.5">{g.region || "Unknown Region"}</div>
                      {g.description && <div className="text-[10px] text-slate-400 mb-2">{g.description}</div>}
                      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[10px]">
                        <div><span className="text-slate-500">RADIUS</span><br/><span className="text-yellow-400">{g.radius?.toFixed(0)} km</span></div>
                        <div><span className="text-slate-500">CONFIDENCE</span><br/><span className="text-slate-300">{Math.round((g.confidence ?? 0) * 100)}%</span></div>
                        <div><span className="text-slate-500">LAT</span><br/><span className="text-cyan-400">{g.lat?.toFixed(4)}</span></div>
                        <div><span className="text-slate-500">LON</span><br/><span className="text-cyan-400">{g.lng?.toFixed(4)}</span></div>
                        {g.duration && <div><span className="text-slate-500">DURATION</span><br/><span className="text-slate-300">{Math.round(g.duration / 60)} min</span></div>}
                      </div>
                    </div>
                  </Popup>
                </Circle>
              </LayerGroup>
            );
          })}
        </MapContainer>

        {/* Legend overlay */}
        <div className="absolute bottom-3 right-3 z-[1000] border border-green-900/40 bg-[#070e1c]/95 backdrop-blur p-2 text-[9px] space-y-1">
          <div className="text-slate-500 tracking-wider mb-1 flex items-center gap-1">
            <Target className="h-2.5 w-2.5" /> LEGEND
          </div>
          {Object.entries(SEV_COLOR).map(([k, c]) => (
            <div key={k} className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ background: c }} />
              <span className="text-slate-400">{k.toUpperCase()}</span>
            </div>
          ))}
          <div className="border-t border-slate-800 pt-1 mt-1">
            <div className="text-slate-500">AFFILIATION</div>
            {Object.entries(AFF_COLOR).map(([k, c]) => (
              <div key={k} className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full border" style={{ borderColor: c }} />
                <span className="text-slate-400">{k.toUpperCase()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
