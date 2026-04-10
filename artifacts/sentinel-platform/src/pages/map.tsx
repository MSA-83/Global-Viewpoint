import { useListThreats, useListGpsAnomalies, useListAssets } from "@workspace/api-client-react";
import { useState, useMemo, useEffect } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, Circle, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SeverityBadge, StatusBadge } from "@/components/badges";
import { MapPin, Crosshair, Navigation, Radio, Shield, AlertTriangle, X } from "lucide-react";

// Fix Leaflet default icon paths broken by bundlers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Force dark overlay on the map tiles
const MAP_STYLE = `
  .leaflet-container {
    background: #050d1a;
    font-family: 'JetBrains Mono', 'Fira Code', monospace;
  }
  .leaflet-popup-content-wrapper {
    background: rgba(5, 13, 26, 0.97);
    border: 1px solid rgba(34, 197, 94, 0.4);
    border-radius: 0;
    color: #e2e8f0;
    box-shadow: 0 0 20px rgba(34, 197, 94, 0.1);
  }
  .leaflet-popup-tip {
    background: rgba(5, 13, 26, 0.97);
  }
  .leaflet-popup-close-button {
    color: rgba(34, 197, 94, 0.8) !important;
    font-size: 18px !important;
    top: 8px !important;
    right: 8px !important;
  }
  .leaflet-popup-close-button:hover {
    color: #22c55e !important;
  }
  .leaflet-control-zoom {
    border: 1px solid rgba(34, 197, 94, 0.3) !important;
    border-radius: 0 !important;
  }
  .leaflet-control-zoom a {
    background: rgba(5, 13, 26, 0.9) !important;
    color: #22c55e !important;
    border-bottom: 1px solid rgba(34, 197, 94, 0.2) !important;
  }
  .leaflet-control-zoom a:hover {
    background: rgba(34, 197, 94, 0.1) !important;
  }
  .leaflet-control-attribution {
    background: rgba(5, 13, 26, 0.7) !important;
    color: #475569 !important;
    font-size: 9px;
  }
  .leaflet-control-attribution a { color: #475569 !important; }
`;

const SEV_COLOR: Record<string, string> = {
  critical: "#ef4444",
  high: "#f97316",
  medium: "#eab308",
  low: "#22c55e",
  minimal: "#22c55e",
};

const AFFIL_COLOR: Record<string, string> = {
  friendly: "#22c55e",
  hostile: "#ef4444",
  neutral: "#eab308",
  unknown: "#94a3b8",
};

type SelectedMarker =
  | { kind: "threat"; data: any }
  | { kind: "gps"; data: any }
  | { kind: "asset"; data: any };

function MapStyleInjector() {
  const map = useMap();
  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = MAP_STYLE;
    document.head.appendChild(style);
    map.getContainer().style.background = "#050d1a";
    return () => document.head.removeChild(style);
  }, [map]);
  return null;
}

function ThreatPopup({ t }: { t: any }) {
  return (
    <div className="font-mono text-xs min-w-[260px]">
      <div className="flex items-center gap-2 mb-2 pb-2 border-b border-green-900">
        <AlertTriangle className="h-3 w-3 text-red-400 shrink-0" />
        <span className="text-green-400 font-bold uppercase text-[10px]">THREAT INTELLIGENCE</span>
      </div>
      <div className="font-bold text-sm text-white mb-2 leading-tight">{t.title}</div>
      <div className="space-y-1 mb-2">
        <div className="flex justify-between gap-4">
          <span className="text-slate-400">ID</span>
          <span className="text-green-400">T-{String(t.id).padStart(4, "0")}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-slate-400">SEVERITY</span>
          <span className={`font-bold uppercase ${t.severity === "critical" ? "text-red-400" : t.severity === "high" ? "text-orange-400" : t.severity === "medium" ? "text-yellow-400" : "text-green-400"}`}>
            {t.severity}
          </span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-slate-400">STATUS</span>
          <span className="text-white uppercase">{t.status}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-slate-400">CATEGORY</span>
          <span className="text-white uppercase">{t.category}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-slate-400">REGION</span>
          <span className="text-white">{t.region}</span>
        </div>
        {t.country && (
          <div className="flex justify-between gap-4">
            <span className="text-slate-400">COUNTRY</span>
            <span className="text-white">{t.country}</span>
          </div>
        )}
        <div className="flex justify-between gap-4">
          <span className="text-slate-400">SOURCE</span>
          <span className="text-cyan-400">{t.source}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-slate-400">CONFIDENCE</span>
          <span className="text-green-400 font-bold">{t.confidence}%</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-slate-400">COORDS</span>
          <span className="text-slate-300">{t.latitude?.toFixed(4)}°, {t.longitude?.toFixed(4)}°</span>
        </div>
      </div>
      {t.description && (
        <div className="border-t border-green-900 pt-2">
          <div className="text-slate-400 text-[10px] mb-1">ASSESSMENT</div>
          <div className="text-slate-300 text-[11px] leading-relaxed">{t.description}</div>
        </div>
      )}
      {t.tags && t.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {t.tags.map((tag: string) => (
            <span key={tag} className="bg-green-950 text-green-400 px-1.5 py-0.5 text-[10px] border border-green-900">{tag}</span>
          ))}
        </div>
      )}
      <div className="mt-2 pt-2 border-t border-green-900 text-[9px] text-slate-500">
        DETECTED: {new Date(t.detectedAt).toISOString().replace("T", " ").slice(0, 19)} UTC
      </div>
    </div>
  );
}

function GpsPopup({ g }: { g: any }) {
  return (
    <div className="font-mono text-xs min-w-[260px]">
      <div className="flex items-center gap-2 mb-2 pb-2 border-b border-green-900">
        <Radio className="h-3 w-3 text-orange-400 shrink-0" />
        <span className="text-orange-400 font-bold uppercase text-[10px]">GPS / GNSS ANOMALY</span>
      </div>
      <div className="font-bold text-sm text-white mb-2">{g.type.toUpperCase()} EVENT — {g.region}</div>
      <div className="space-y-1 mb-2">
        <div className="flex justify-between gap-4">
          <span className="text-slate-400">TYPE</span>
          <span className="text-orange-400 font-bold uppercase">{g.type}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-slate-400">SEVERITY</span>
          <span className={`font-bold uppercase ${g.severity === "critical" ? "text-red-400" : g.severity === "high" ? "text-orange-400" : g.severity === "medium" ? "text-yellow-400" : "text-green-400"}`}>
            {g.severity}
          </span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-slate-400">STATUS</span>
          <span className={g.active ? "text-red-400 font-bold" : "text-slate-400"}>
            {g.active ? "ACTIVE" : "RESOLVED"}
          </span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-slate-400">COUNTRY</span>
          <span className="text-white">{g.country || "N/A"}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-slate-400">RADIUS</span>
          <span className="text-white">{g.radius?.toLocaleString() || "?"} km</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-slate-400">FREQUENCY</span>
          <span className="text-cyan-400">{g.frequency} MHz</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-slate-400">SIGNAL STR</span>
          <span className="text-white">{g.signalStrength} dBm</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-slate-400">SOURCE</span>
          <span className="text-cyan-400">{g.source}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-slate-400">COORDS</span>
          <span className="text-slate-300">{g.latitude?.toFixed(4)}°, {g.longitude?.toFixed(4)}°</span>
        </div>
      </div>
      {g.affectedSystems?.length > 0 && (
        <div className="border-t border-green-900 pt-2">
          <div className="text-slate-400 text-[10px] mb-1">AFFECTED SYSTEMS</div>
          <div className="flex flex-wrap gap-1">
            {g.affectedSystems.map((sys: string) => (
              <span key={sys} className="bg-orange-950 text-orange-400 px-1.5 py-0.5 text-[10px] border border-orange-900 uppercase">{sys}</span>
            ))}
          </div>
        </div>
      )}
      <div className="mt-2 pt-2 border-t border-green-900 text-[9px] text-slate-500">
        DETECTED: {new Date(g.detectedAt).toISOString().replace("T", " ").slice(0, 19)} UTC
      </div>
    </div>
  );
}

function AssetPopup({ a }: { a: any }) {
  const color = AFFIL_COLOR[a.affiliation] ?? "#94a3b8";
  return (
    <div className="font-mono text-xs min-w-[260px]">
      <div className="flex items-center gap-2 mb-2 pb-2 border-b border-green-900">
        <Shield className="h-3 w-3 shrink-0" style={{ color }} />
        <span className="font-bold uppercase text-[10px]" style={{ color }}>TRACKED ASSET — {a.affiliation?.toUpperCase()}</span>
      </div>
      <div className="font-bold text-sm text-white mb-1">{a.name}</div>
      {a.designation && <div className="text-green-400 text-[11px] mb-2">{a.designation}</div>}
      <div className="space-y-1 mb-2">
        <div className="flex justify-between gap-4">
          <span className="text-slate-400">TYPE</span>
          <span className="text-white uppercase">{a.type}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-slate-400">STATUS</span>
          <span className="text-green-400 uppercase">{a.status}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-slate-400">AFFILIATION</span>
          <span className="font-bold uppercase" style={{ color }}>{a.affiliation}</span>
        </div>
        {a.country && (
          <div className="flex justify-between gap-4">
            <span className="text-slate-400">NATION</span>
            <span className="text-white">{a.country}</span>
          </div>
        )}
        {a.speed != null && (
          <div className="flex justify-between gap-4">
            <span className="text-slate-400">SPEED</span>
            <span className="text-white">{a.type === "aircraft" || a.type === "satellite" ? `${a.speed} kt` : `${a.speed} kt`}</span>
          </div>
        )}
        {a.heading != null && (
          <div className="flex justify-between gap-4">
            <span className="text-slate-400">HEADING</span>
            <span className="text-white">{String(a.heading).padStart(3, "0")}°</span>
          </div>
        )}
        {a.altitude != null && (
          <div className="flex justify-between gap-4">
            <span className="text-slate-400">ALTITUDE</span>
            <span className="text-white">{a.altitude?.toLocaleString()} m MSL</span>
          </div>
        )}
        <div className="flex justify-between gap-4">
          <span className="text-slate-400">POSITION</span>
          <span className="text-slate-300">{a.latitude?.toFixed(4)}°, {a.longitude?.toFixed(4)}°</span>
        </div>
      </div>
      <div className="mt-2 pt-2 border-t border-green-900 text-[9px] text-slate-500">
        LAST FIX: {new Date(a.lastPositionAt).toISOString().replace("T", " ").slice(0, 19)} UTC
      </div>
    </div>
  );
}

export default function MapPage() {
  const { data: threats } = useListThreats({ limit: 200 }, { query: { refetchInterval: 20000 } });
  const { data: gpsAnomalies } = useListGpsAnomalies({}, { query: { refetchInterval: 20000 } });
  const { data: assets } = useListAssets({ limit: 200 }, { query: { refetchInterval: 20000 } });

  const [layers, setLayers] = useState({ threats: true, gps: true, assets: true });

  const markerCounts = useMemo(() => ({
    threats: threats?.filter(t => t.latitude != null && t.longitude != null).length ?? 0,
    gps: gpsAnomalies?.filter(g => g.latitude != null && g.longitude != null).length ?? 0,
    assets: assets?.filter(a => a.latitude != null && a.longitude != null).length ?? 0,
  }), [threats, gpsAnomalies, assets]);

  return (
    <div className="h-full flex flex-col space-y-3">
      <h1 className="text-2xl font-bold font-mono text-primary border-b border-primary/20 pb-2 shrink-0 flex items-center gap-2">
        <MapPin className="h-6 w-6" />
        GLOBAL SITUATIONAL MAP
        <span className="text-sm font-normal text-muted-foreground ml-2">— LIVE SATELLITE VIEW</span>
      </h1>

      <div className="flex gap-2 shrink-0 font-mono text-xs flex-wrap">
        {[
          { key: "threats", label: "THREATS", count: markerCounts.threats, dotColor: "#ef4444" },
          { key: "gps", label: "GPS ANOMALIES", count: markerCounts.gps, dotColor: "#f97316" },
          { key: "assets", label: "ASSETS", count: markerCounts.assets, dotColor: "#22c55e" },
        ].map(({ key, label, count, dotColor }) => (
          <button
            key={key}
            onClick={() => setLayers(l => ({ ...l, [key]: !l[key as keyof typeof l] }))}
            className={`flex items-center gap-1.5 px-3 py-1.5 border transition-colors ${layers[key as keyof typeof layers] ? "border-primary/40 bg-primary/10 text-foreground" : "border-border/40 text-muted-foreground"}`}
          >
            <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: layers[key as keyof typeof layers] ? dotColor : "#475569" }} />
            {label}
            <span className="ml-1 opacity-60">({count})</span>
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2 text-muted-foreground py-1.5">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          ESRI WORLD IMAGERY · LIVE
        </div>
      </div>

      <div className="flex-1 min-h-0 relative border border-primary/20">
        <MapContainer
          center={[20, 15]}
          zoom={2}
          minZoom={2}
          maxZoom={18}
          style={{ height: "100%", width: "100%", background: "#050d1a" }}
          scrollWheelZoom={true}
          zoomControl={true}
        >
          <MapStyleInjector />

          {/* ESRI World Imagery satellite tiles */}
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            attribution="Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP"
            maxZoom={18}
          />

          {/* Tactical overlay — semi-transparent dark grid feel */}
          <TileLayer
            url="https://stamen-tiles.a.ssl.fastly.net/toner-lines/{z}/{x}/{y}.png"
            attribution=""
            opacity={0.15}
            maxZoom={18}
          />

          {/* GPS Anomaly Zones — pulsing circles */}
          {layers.gps && gpsAnomalies?.map(g => {
            if (g.latitude == null || g.longitude == null) return null;
            const color = SEV_COLOR[g.severity] ?? "#f97316";
            const radiusKm = g.radius ?? 100;
            return (
              <Circle
                key={`gps-${g.id}`}
                center={[g.latitude, g.longitude]}
                radius={radiusKm * 1000}
                pathOptions={{
                  color,
                  fillColor: color,
                  fillOpacity: 0.08,
                  weight: 1.5,
                  dashArray: "6,4",
                  opacity: 0.7,
                }}
              >
                <Popup maxWidth={320} minWidth={260}>
                  <GpsPopup g={g} />
                </Popup>
              </Circle>
            );
          })}

          {/* Threat markers */}
          {layers.threats && threats?.map(t => {
            if (t.latitude == null || t.longitude == null) return null;
            const color = SEV_COLOR[t.severity] ?? "#94a3b8";
            return (
              <CircleMarker
                key={`threat-${t.id}`}
                center={[t.latitude, t.longitude]}
                radius={t.severity === "critical" ? 9 : t.severity === "high" ? 7 : 5}
                pathOptions={{
                  color,
                  fillColor: color,
                  fillOpacity: 0.9,
                  weight: t.severity === "critical" ? 2 : 1.5,
                }}
              >
                <Popup maxWidth={340} minWidth={270}>
                  <ThreatPopup t={t} />
                </Popup>
              </CircleMarker>
            );
          })}

          {/* Asset markers — larger circles with affiliation color */}
          {layers.assets && assets?.map(a => {
            if (a.latitude == null || a.longitude == null) return null;
            const color = AFFIL_COLOR[a.affiliation] ?? "#94a3b8";
            return (
              <CircleMarker
                key={`asset-${a.id}`}
                center={[a.latitude, a.longitude]}
                radius={a.type === "facility" ? 8 : 6}
                pathOptions={{
                  color,
                  fillColor: color,
                  fillOpacity: 0.7,
                  weight: 2,
                  dashArray: a.affiliation === "unknown" ? "3,2" : undefined,
                }}
              >
                <Popup maxWidth={320} minWidth={260}>
                  <AssetPopup a={a} />
                </Popup>
              </CircleMarker>
            );
          })}
        </MapContainer>

        {/* Legend overlay */}
        <div className="absolute bottom-4 right-4 z-[1000] bg-background/95 border border-primary/30 backdrop-blur-sm font-mono text-xs p-3 space-y-2 min-w-[180px]">
          <div className="text-primary font-bold flex items-center gap-1 mb-2">
            <Crosshair className="h-3 w-3" /> LEGEND
          </div>
          <div className="space-y-1.5">
            <div className="text-muted-foreground text-[10px] uppercase font-bold">THREATS</div>
            {[["critical", "#ef4444"], ["high", "#f97316"], ["medium", "#eab308"], ["low", "#22c55e"]].map(([sev, col]) => (
              <div key={sev} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full border border-black/20" style={{ background: col as string }} />
                <span className="text-muted-foreground capitalize">{sev}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-border pt-2 space-y-1.5">
            <div className="text-muted-foreground text-[10px] uppercase font-bold">ASSETS</div>
            {[["friendly", "#22c55e"], ["hostile", "#ef4444"], ["neutral", "#eab308"], ["unknown", "#94a3b8"]].map(([aff, col]) => (
              <div key={aff} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full border border-black/20" style={{ background: col as string }} />
                <span className="text-muted-foreground capitalize">{aff}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-border pt-2 space-y-1.5">
            <div className="text-muted-foreground text-[10px] uppercase font-bold">GPS ANOMALY</div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full border-2 border-dashed border-orange-400" />
              <span className="text-muted-foreground">Exclusion Zone</span>
            </div>
          </div>
        </div>

        {/* Summary overlay */}
        <div className="absolute top-4 right-4 z-[1000] bg-background/95 border border-primary/30 backdrop-blur-sm font-mono text-xs p-3">
          <div className="text-primary font-bold flex items-center gap-1 mb-2">
            <Navigation className="h-3 w-3" /> SUMMARY
          </div>
          <div className="space-y-1">
            <div className="flex justify-between gap-6"><span className="text-muted-foreground">THREATS</span><span className="text-red-400 font-bold">{markerCounts.threats}</span></div>
            <div className="flex justify-between gap-6"><span className="text-muted-foreground">GPS SITES</span><span className="text-orange-400 font-bold">{markerCounts.gps}</span></div>
            <div className="flex justify-between gap-6"><span className="text-muted-foreground">ASSETS</span><span className="text-green-400 font-bold">{markerCounts.assets}</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
