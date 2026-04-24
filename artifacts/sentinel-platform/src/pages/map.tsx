import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { listAssets, listThreats, listGpsAnomalies, getOsintEarthquakes, getOsintDisasters, getOsintISS, getOsintGdacs, getActiveFires, getWeatherTile, getAisStreamToken } from "@/lib/api";
import { MapContainer, TileLayer, CircleMarker, Popup, LayersControl, LayerGroup, Circle, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Globe2, Plane, Ship, Satellite, Activity, AlertTriangle, Layers as LayersIcon, Radio, Target, Flame, Waves, Radiation, Cloud } from "lucide-react";

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
  const [showQuakes, setShowQuakes] = useState(true);
  const [showDisasters, setShowDisasters] = useState(true);
  const [showIss, setShowIss] = useState(true);
  const [showGdacs, setShowGdacs] = useState(false);
  const [showFires, setShowFires] = useState(true);
  const [showVessels, setShowVessels] = useState(false);
  const [weatherOverlay, setWeatherOverlay] = useState<"" | "clouds_new" | "precipitation_new" | "temp_new" | "wind_new">("");
  const [tileStyle, setTileStyle] = useState<"dark" | "satellite" | "tactical">("dark");
  const [vessels, setVessels] = useState<Map<string, any>>(new Map());

  const { data: assets } = useQuery({ queryKey: ["assets"], queryFn: listAssets, refetchInterval: 15000 });
  const { data: threats } = useQuery({ queryKey: ["threats"], queryFn: () => listThreats(), refetchInterval: 30000 });
  const { data: gpsAnomalies } = useQuery({ queryKey: ["gps"], queryFn: listGpsAnomalies, refetchInterval: 30000 });

  const { data: quakes } = useQuery({
    queryKey: ["osint", "quakes"], queryFn: () => getOsintEarthquakes("day"),
    refetchInterval: 60_000, enabled: showQuakes, retry: 1,
  });
  const { data: disasters } = useQuery({
    queryKey: ["osint", "disasters"], queryFn: () => getOsintDisasters(10),
    refetchInterval: 5 * 60_000, enabled: showDisasters, retry: 1,
  });
  const { data: iss } = useQuery({
    queryKey: ["osint", "iss"], queryFn: getOsintISS,
    refetchInterval: 10_000, enabled: showIss, retry: 1,
  });
  const { data: gdacs } = useQuery({
    queryKey: ["osint", "gdacs"], queryFn: getOsintGdacs,
    refetchInterval: 5 * 60_000, enabled: showGdacs, retry: 1,
  });
  const { data: fires } = useQuery({
    queryKey: ["intel", "fires"], queryFn: () => getActiveFires("VIIRS_SNPP_NRT", 1, "world"),
    refetchInterval: 10 * 60_000, enabled: showFires, retry: 1,
  });
  const { data: weatherTile } = useQuery({
    queryKey: ["intel", "weather-tile", weatherOverlay],
    queryFn: () => getWeatherTile(weatherOverlay || "clouds_new"),
    enabled: !!weatherOverlay, retry: 1,
  });

  // AISStream: live vessel positions via WebSocket
  useEffect(() => {
    if (!showVessels) { setVessels(new Map()); return; }
    let ws: WebSocket | null = null;
    let cancelled = false;
    (async () => {
      try {
        const cfg: any = await getAisStreamToken();
        if (cancelled) return;
        ws = new WebSocket(cfg.endpoint);
        ws.onopen = () => {
          ws?.send(JSON.stringify({
            APIKey: cfg.apiKey,
            BoundingBoxes: [[[-90, -180], [90, 180]]],
            FilterMessageTypes: ["PositionReport", "ShipStaticData"],
          }));
        };
        ws.onmessage = (ev) => {
          try {
            const msg = JSON.parse(ev.data);
            const meta = msg.MetaData || {};
            const mmsi = meta.MMSI;
            if (!mmsi) return;
            setVessels((prev) => {
              const next = new Map(prev);
              const existing = next.get(String(mmsi)) || {};
              if (msg.MessageType === "PositionReport") {
                const p = msg.Message?.PositionReport || {};
                next.set(String(mmsi), {
                  ...existing,
                  mmsi,
                  lat: p.Latitude,
                  lon: p.Longitude,
                  sog: p.Sog, cog: p.Cog, heading: p.TrueHeading,
                  navStatus: p.NavigationalStatus,
                  timestamp: meta.time_utc || new Date().toISOString(),
                  shipName: meta.ShipName || existing.shipName,
                });
              } else if (msg.MessageType === "ShipStaticData") {
                const s = msg.Message?.ShipStaticData || {};
                next.set(String(mmsi), {
                  ...existing,
                  mmsi,
                  shipName: s.Name?.trim() || existing.shipName,
                  callSign: s.CallSign?.trim(),
                  imo: s.ImoNumber,
                  type: s.Type,
                  destination: s.Destination?.trim(),
                  draught: s.MaximumStaticDraught,
                  dimension: s.Dimension,
                });
              }
              if (next.size > 600) {
                const oldest = Array.from(next.keys()).slice(0, next.size - 600);
                oldest.forEach(k => next.delete(k));
              }
              return next;
            });
          } catch {}
        };
        ws.onerror = (e) => console.warn("AISStream error", e);
      } catch (e) { console.warn("AISStream init failed", e); }
    })();
    return () => { cancelled = true; ws?.close(); };
  }, [showVessels]);

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
          <Cloud className="h-3 w-3 text-cyan-600" />
          <span className="text-[9px] text-slate-500 mr-1">WX:</span>
          {[
            { k: "", label: "OFF" },
            { k: "clouds_new", label: "CLOUD" },
            { k: "precipitation_new", label: "PRECIP" },
            { k: "temp_new", label: "TEMP" },
            { k: "wind_new", label: "WIND" },
          ].map(w => (
            <button key={w.k || "off"} onClick={() => setWeatherOverlay(w.k as any)}
              className={`text-[9px] px-2 py-0.5 ${weatherOverlay === w.k ? "bg-cyan-950/60 text-cyan-400" : "text-slate-500 hover:text-slate-300"}`}>
              {w.label}
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
            { k: "fires", label: "NASA FIRMS", val: showFires, set: setShowFires, c: "#dc2626" },
            { k: "vessels", label: "AIS LIVE", val: showVessels, set: setShowVessels, c: "#3b82f6" },
            { k: "quakes", label: "USGS QUAKES", val: showQuakes, set: setShowQuakes, c: "#fb923c" },
            { k: "disasters", label: "NASA EONET", val: showDisasters, set: setShowDisasters, c: "#dc2626" },
            { k: "iss", label: "ISS LIVE", val: showIss, set: setShowIss, c: "#a855f7" },
            { k: "gdacs", label: "GDACS", val: showGdacs, set: setShowGdacs, c: "#f43f5e" },
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

          {/* OpenWeatherMap overlay */}
          {weatherOverlay && weatherTile?.template && (
            <TileLayer url={weatherTile.template} opacity={0.55} attribution="&copy; OpenWeatherMap" zIndex={350} />
          )}

          {/* NASA FIRMS active fires (heat-colored by FRP) */}
          {showFires && (fires?.events ?? []).map((f: any) => {
            const frp = f.frp ?? 0;
            const color = frp > 100 ? "#dc2626" : frp > 30 ? "#f97316" : frp > 10 ? "#fb923c" : "#fbbf24";
            const radius = Math.min(6, 2 + Math.log10(Math.max(frp, 1)));
            return (
              <CircleMarker key={`fire-${f.id}`} center={[f.latitude, f.longitude]} radius={radius}
                pathOptions={{ color, weight: 0.5, fillColor: color, fillOpacity: 0.6 }}>
                <Popup className="sentinel-popup" maxWidth={300}>
                  <div className="text-slate-200 font-mono">
                    <div className="text-[10px] tracking-wider mb-1.5 pb-1.5 border-b flex items-center justify-between"
                      style={{ borderColor: color + "60" }}>
                      <span className="px-1.5 py-0.5 border" style={{ color, borderColor: color + "80" }}>
                        ACTIVE FIRE
                      </span>
                      <span className="text-slate-500">NASA FIRMS · {f.satellite}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[10px]">
                      <div><span className="text-slate-500">FRP</span><br/><span className="text-orange-400">{frp?.toFixed(1) ?? "-"} MW</span></div>
                      <div><span className="text-slate-500">CONFIDENCE</span><br/><span className="text-slate-300">{f.confidence}</span></div>
                      <div><span className="text-slate-500">DAY/NIGHT</span><br/><span className="text-slate-300">{f.daynight === "D" ? "DAY" : "NIGHT"}</span></div>
                      <div><span className="text-slate-500">SAT</span><br/><span className="text-slate-300">{f.satellite}</span></div>
                      <div><span className="text-slate-500">LAT</span><br/><span className="text-cyan-400">{f.latitude?.toFixed(4)}</span></div>
                      <div><span className="text-slate-500">LON</span><br/><span className="text-cyan-400">{f.longitude?.toFixed(4)}</span></div>
                    </div>
                    <div className="mt-2 pt-1.5 border-t border-slate-700 text-[9px] text-slate-500">
                      DETECTED {f.date} @ {f.time}Z
                    </div>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}

          {/* Live AIS vessels via AISStream */}
          {showVessels && Array.from(vessels.values()).filter(v => v.lat != null && v.lon != null).map((v: any) => {
            const SHIP_TYPE: Record<number, string> = {
              30: "Fishing", 31: "Tug", 32: "Tug", 33: "Dredger", 34: "Dive ops",
              35: "Military", 36: "Sailing", 37: "Pleasure",
              52: "Tug", 60: "Passenger", 70: "Cargo", 80: "Tanker", 90: "Other",
            };
            const cat = Math.floor((v.type ?? 0) / 10) * 10;
            const color = v.type === 35 ? "#ef4444"  // military = red
              : cat === 70 ? "#3b82f6"               // cargo = blue
              : cat === 80 ? "#a855f7"               // tanker = purple
              : cat === 60 ? "#10b981"               // passenger = green
              : cat === 30 ? "#fbbf24"               // fishing = yellow
              : "#94a3b8";                            // default = gray
            return (
              <CircleMarker key={`v-${v.mmsi}`} center={[v.lat, v.lon]} radius={3}
                pathOptions={{ color, weight: 0.8, fillColor: color, fillOpacity: 0.65 }}>
                <Popup className="sentinel-popup" maxWidth={300}>
                  <div className="text-slate-200 font-mono">
                    <div className="text-[10px] tracking-wider mb-1.5 pb-1.5 border-b flex items-center justify-between"
                      style={{ borderColor: color + "60" }}>
                      <span className="px-1.5 py-0.5 border" style={{ color, borderColor: color + "80" }}>
                        {SHIP_TYPE[v.type] || SHIP_TYPE[cat] || "VESSEL"}
                      </span>
                      <span className="text-slate-500">MMSI {v.mmsi}</span>
                    </div>
                    <div className="text-[12px] font-bold mb-1.5">{v.shipName?.trim() || `MMSI ${v.mmsi}`}</div>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[10px]">
                      {v.callSign && <div><span className="text-slate-500">CALL</span><br/><span className="text-slate-300">{v.callSign}</span></div>}
                      {v.imo != null && <div><span className="text-slate-500">IMO</span><br/><span className="text-slate-300">{v.imo}</span></div>}
                      {v.sog != null && <div><span className="text-slate-500">SOG</span><br/><span className="text-cyan-400">{v.sog?.toFixed(1)} kt</span></div>}
                      {v.cog != null && <div><span className="text-slate-500">COG</span><br/><span className="text-slate-300">{v.cog?.toFixed(0)}°</span></div>}
                      {v.heading != null && v.heading < 511 && <div><span className="text-slate-500">HDG</span><br/><span className="text-slate-300">{v.heading?.toFixed(0)}°</span></div>}
                      {v.draught != null && <div><span className="text-slate-500">DRAUGHT</span><br/><span className="text-slate-300">{v.draught?.toFixed(1)} m</span></div>}
                      <div><span className="text-slate-500">LAT</span><br/><span className="text-cyan-400">{v.lat?.toFixed(4)}</span></div>
                      <div><span className="text-slate-500">LON</span><br/><span className="text-cyan-400">{v.lon?.toFixed(4)}</span></div>
                      {v.destination && <div className="col-span-2"><span className="text-slate-500">DEST</span><br/><span className="text-slate-300">{v.destination}</span></div>}
                    </div>
                    <div className="mt-2 pt-1.5 border-t border-slate-700 text-[9px] text-slate-500">
                      AISStream · {v.timestamp ? new Date(v.timestamp).toLocaleTimeString() : ""}
                    </div>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}

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
          {/* USGS Earthquakes */}
          {showQuakes && (quakes?.events ?? []).map((q: any) => {
            const mag = q.magnitude ?? 0;
            const color = mag >= 6 ? "#dc2626" : mag >= 5 ? "#f97316" : mag >= 3 ? "#fb923c" : "#fbbf24";
            return (
              <LayerGroup key={`q-${q.id}`}>
                <Circle center={[q.lat, q.lon]} radius={Math.max(20000, mag * 35000)}
                  pathOptions={{ color, weight: 0.8, fillColor: color, fillOpacity: 0.05, dashArray: "2,3" }} />
                <CircleMarker center={[q.lat, q.lon]} radius={Math.max(3, mag * 1.4)}
                  pathOptions={{ color, weight: 1.2, fillColor: color, fillOpacity: 0.7 }}>
                  <Popup className="sentinel-popup" maxWidth={320}>
                    <div className="text-slate-200 font-mono">
                      <div className="text-[10px] tracking-wider mb-1.5 pb-1.5 border-b flex items-center justify-between"
                        style={{ borderColor: color + "60" }}>
                        <span className="px-1.5 py-0.5 border" style={{ color, borderColor: color + "80" }}>
                          M {mag?.toFixed(1)} {q.tsunami ? "⚠ TSUNAMI" : ""}
                        </span>
                        <span className="text-slate-500">USGS</span>
                      </div>
                      <div className="text-[12px] font-bold mb-1.5">{q.place}</div>
                      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[10px]">
                        <div><span className="text-slate-500">DEPTH</span><br/><span className="text-slate-300">{q.depthKm?.toFixed(1)} km</span></div>
                        <div><span className="text-slate-500">SIG</span><br/><span className="text-slate-300">{q.sig ?? "-"}</span></div>
                        <div><span className="text-slate-500">TYPE</span><br/><span className="text-slate-300">{q.type}</span></div>
                        <div><span className="text-slate-500">ALERT</span><br/><span style={{ color: q.alert ? "#ef4444" : "#64748b" }}>{(q.alert || "none").toUpperCase()}</span></div>
                        <div><span className="text-slate-500">LAT</span><br/><span className="text-cyan-400">{q.lat?.toFixed(4)}</span></div>
                        <div><span className="text-slate-500">LON</span><br/><span className="text-cyan-400">{q.lon?.toFixed(4)}</span></div>
                      </div>
                      <div className="mt-2 pt-1.5 border-t border-slate-700 text-[9px] text-slate-500">
                        {new Date(q.time).toLocaleString()}
                        {q.url && <a href={q.url} target="_blank" rel="noreferrer" className="block text-cyan-500 mt-0.5">USGS Report ↗</a>}
                      </div>
                    </div>
                  </Popup>
                </CircleMarker>
              </LayerGroup>
            );
          })}

          {/* NASA EONET — wildfires, storms, volcanoes */}
          {showDisasters && (disasters?.events ?? []).map((d: any) => {
            const colorMap: Record<string, string> = {
              "Wildfires": "#dc2626", "Severe Storms": "#a855f7", "Volcanoes": "#f43f5e",
              "Sea and Lake Ice": "#22d3ee", "Floods": "#3b82f6", "Earthquakes": "#fb923c",
              "Drought": "#ca8a04", "Dust and Haze": "#a16207", "Snow": "#e2e8f0",
              "Temperature Extremes": "#eab308", "Manmade": "#94a3b8",
            };
            const color = colorMap[d.category] || "#dc2626";
            return (
              <CircleMarker key={`d-${d.id}`} center={[d.lat, d.lon]} radius={5}
                pathOptions={{ color, weight: 1.5, fillColor: color, fillOpacity: 0.6 }}>
                <Popup className="sentinel-popup" maxWidth={320}>
                  <div className="text-slate-200 font-mono">
                    <div className="text-[10px] tracking-wider mb-1.5 pb-1.5 border-b flex items-center justify-between"
                      style={{ borderColor: color + "60" }}>
                      <span className="px-1.5 py-0.5 border" style={{ color, borderColor: color + "80" }}>
                        {d.category?.toUpperCase()}
                      </span>
                      <span className="text-slate-500">NASA EONET</span>
                    </div>
                    <div className="text-[12px] font-bold mb-1.5">{d.title}</div>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[10px]">
                      <div><span className="text-slate-500">SOURCES</span><br/><span className="text-slate-300">{d.sources?.join(", ") || "-"}</span></div>
                      {d.magnitude && (
                        <div><span className="text-slate-500">MAGNITUDE</span><br/><span className="text-slate-300">{d.magnitude} {d.magnitudeUnit}</span></div>
                      )}
                      <div><span className="text-slate-500">LAT</span><br/><span className="text-cyan-400">{d.lat?.toFixed(4)}</span></div>
                      <div><span className="text-slate-500">LON</span><br/><span className="text-cyan-400">{d.lon?.toFixed(4)}</span></div>
                    </div>
                    <div className="mt-2 pt-1.5 border-t border-slate-700 text-[9px] text-slate-500">
                      OBSERVED {d.date ? new Date(d.date).toLocaleString() : "-"}
                      {d.link && <a href={d.link} target="_blank" rel="noreferrer" className="block text-cyan-500 mt-0.5">EONET Detail ↗</a>}
                    </div>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}

          {/* GDACS active disaster alerts */}
          {showGdacs && (gdacs?.events ?? []).map((g: any) => {
            const color = g.alertLevel === "Red" ? "#dc2626" : g.alertLevel === "Orange" ? "#f97316" : "#22c55e";
            return (
              <CircleMarker key={`gd-${g.id}-${g.episodeId}`} center={[g.lat, g.lon]} radius={6}
                pathOptions={{ color, weight: 1.5, fillColor: color, fillOpacity: 0.55 }}>
                <Popup className="sentinel-popup" maxWidth={320}>
                  <div className="text-slate-200 font-mono">
                    <div className="text-[10px] tracking-wider mb-1.5 pb-1.5 border-b flex items-center justify-between"
                      style={{ borderColor: color + "60" }}>
                      <span className="px-1.5 py-0.5 border" style={{ color, borderColor: color + "80" }}>
                        {g.eventType} • {g.alertLevel?.toUpperCase()}
                      </span>
                      <span className="text-slate-500">GDACS</span>
                    </div>
                    <div className="text-[12px] font-bold mb-1.5">{g.eventName}</div>
                    {g.severityText && <div className="text-[10px] text-slate-400 mb-2">{g.severityText}</div>}
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[10px]">
                      <div><span className="text-slate-500">COUNTRY</span><br/><span className="text-slate-300">{g.country || "-"}</span></div>
                      <div><span className="text-slate-500">SCORE</span><br/><span className="text-orange-400">{g.alertScore?.toFixed(1) ?? "-"}</span></div>
                      {g.population != null && (
                        <div><span className="text-slate-500">EXPOSED POP</span><br/><span className="text-slate-300">{g.population?.toLocaleString()}</span></div>
                      )}
                      <div><span className="text-slate-500">LAT</span><br/><span className="text-cyan-400">{g.lat?.toFixed(4)}</span></div>
                      <div><span className="text-slate-500">LON</span><br/><span className="text-cyan-400">{g.lon?.toFixed(4)}</span></div>
                    </div>
                    <div className="mt-2 pt-1.5 border-t border-slate-700 text-[9px] text-slate-500">
                      {g.from ? new Date(g.from).toLocaleString() : ""}
                      {g.url && <a href={g.url} target="_blank" rel="noreferrer" className="block text-cyan-500 mt-0.5">GDACS Report ↗</a>}
                    </div>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}

          {/* International Space Station */}
          {showIss && iss?.lat != null && (
            <LayerGroup>
              <Circle center={[iss.lat, iss.lon]} radius={(iss.footprintKm || 4500) * 1000 / 2}
                pathOptions={{ color: "#a855f7", weight: 0.8, fillColor: "#a855f7", fillOpacity: 0.05, dashArray: "3,4" }} />
              <CircleMarker center={[iss.lat, iss.lon]} radius={8}
                pathOptions={{ color: "#a855f7", weight: 2, fillColor: "#c084fc", fillOpacity: 0.8, className: "sentinel-pulse" }}>
                <Popup className="sentinel-popup" maxWidth={320}>
                  <div className="text-slate-200 font-mono">
                    <div className="text-[10px] tracking-wider mb-1.5 pb-1.5 border-b flex items-center justify-between border-purple-900/60">
                      <span className="px-1.5 py-0.5 border border-purple-700 text-purple-400">ORBITAL</span>
                      <span className="text-slate-500">wheretheiss.at</span>
                    </div>
                    <div className="text-[12px] font-bold mb-1.5">{iss.name}</div>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[10px]">
                      <div><span className="text-slate-500">ALTITUDE</span><br/><span className="text-purple-400">{iss.altitudeKm?.toFixed(1)} km</span></div>
                      <div><span className="text-slate-500">VELOCITY</span><br/><span className="text-purple-400">{iss.velocityKmh?.toFixed(0)} km/h</span></div>
                      <div><span className="text-slate-500">FOOTPRINT</span><br/><span className="text-slate-300">{iss.footprintKm?.toFixed(0)} km</span></div>
                      <div><span className="text-slate-500">VISIBILITY</span><br/><span className="text-slate-300">{iss.visibility}</span></div>
                      <div><span className="text-slate-500">LAT</span><br/><span className="text-cyan-400">{iss.lat?.toFixed(4)}</span></div>
                      <div><span className="text-slate-500">LON</span><br/><span className="text-cyan-400">{iss.lon?.toFixed(4)}</span></div>
                    </div>
                    <div className="mt-2 pt-1.5 border-t border-slate-700 text-[9px] text-slate-500">
                      LIVE • Refreshes every 10s
                    </div>
                  </div>
                </Popup>
              </CircleMarker>
            </LayerGroup>
          )}
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
