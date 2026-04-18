import { useState, useEffect, useRef, useCallback } from "react";
import { useListThreats, useListIncidents, useListAssets } from "@workspace/api-client-react";
import { useRealtime } from "@/contexts/realtime";
import { ZoomIn, ZoomOut, Globe, Layers } from "lucide-react";

function latLngToXY(lat: number, lng: number, W: number, H: number) {
  return { x: ((lng + 180) / 360) * W, y: ((90 - lat) / 180) * H };
}

const DOMAIN_COLORS: Record<string, string> = {
  aviation: "#06b6d4", maritime: "#3b82f6", orbital: "#8b5cf6", seismic: "#eab308",
  conflict: "#ef4444", weather: "#64748b", cyber: "#22c55e", nuclear: "#f97316",
  sigint: "#ec4899", infrastructure: "#a78bfa", energy: "#f59e0b", logistics: "#14b8a6",
  border: "#84cc16", telecom: "#fb923c", public_safety: "#34d399",
};
const ASSET_SHAPES: Record<string, string> = {
  aircraft: "▲", vessel: "◆", satellite: "✦", ground: "■", submarine: "▼",
};
const SEV_COLORS: Record<string, string> = {
  critical: "#ef4444", high: "#f97316", medium: "#eab308", low: "#22c55e",
};

type Point = {
  id: number; type: "threat"|"asset"|"incident";
  lat: number; lng: number; label: string;
  severity?: string; domain?: string; affiliation?: string;
  assetType?: string; heading?: number;
};

export default function MapPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 800, h: 500 });
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const lastMouse = useRef({ x: 0, y: 0 });
  const [filters, setFilters] = useState({ threats: true, assets: true, incidents: true });
  const [selected, setSelected] = useState<Point | null>(null);
  const [layer, setLayer] = useState<"normal"|"heatmap">("normal");
  const { tickCount } = useRealtime();
  const [, setTick] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setTick(c => c + 1), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const obs = new ResizeObserver(entries => {
      const r = entries[0].contentRect;
      setSize({ w: r.width, h: r.height });
    });
    if (containerRef.current) obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  const { data: threats } = useListThreats({ limit: 200 }, { query: { refetchInterval: 30000 } });
  const { data: assets } = useListAssets({ limit: 250 }, { query: { refetchInterval: 15000 } });
  const { data: incidents } = useListIncidents({ limit: 150 }, { query: { refetchInterval: 30000 } });

  const { W, H } = { W: size.w, H: size.h };

  const allPoints: Point[] = [
    ...(filters.threats ? (threats ?? []).filter((t: any) => t.latitude && t.longitude).map((t: any) => ({
      id: t.id, type: "threat" as const, lat: +t.latitude, lng: +t.longitude,
      label: t.title, severity: t.severity, domain: t.domain,
    })) : []),
    ...(filters.assets ? (assets ?? []).filter((a: any) => a.latitude && a.longitude).map((a: any) => ({
      id: a.id, type: "asset" as const, lat: +a.latitude, lng: +a.longitude,
      label: a.name, affiliation: a.affiliation, assetType: a.type, heading: a.heading ? +a.heading : undefined, domain: a.domain,
    })) : []),
    ...(filters.incidents ? (incidents ?? []).filter((i: any) => i.latitude && i.longitude).map((i: any) => ({
      id: i.id, type: "incident" as const, lat: +i.latitude, lng: +i.longitude,
      label: i.title, severity: i.severity, domain: i.domain,
    })) : []),
  ];

  function toSvg(lat: number, lng: number) {
    const { x, y } = latLngToXY(lat, lng, W, H);
    return { x: x * zoom + pan.x, y: y * zoom + pan.y };
  }

  const assetColor = (p: Point) => {
    if (p.affiliation === "hostile") return "#ef4444";
    if (p.affiliation === "friendly") return "#22c55e";
    if (p.affiliation === "neutral") return "#eab308";
    return DOMAIN_COLORS[p.domain ?? ""] || "#94a3b8";
  };

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    setZoom(z => Math.max(0.4, Math.min(8, z * (e.deltaY > 0 ? 0.88 : 1.14))));
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [handleWheel]);

  return (
    <div className="flex flex-col h-full bg-[#060d1a]">
      {/* Toolbar */}
      <div className="h-10 bg-[#070e1c] border-b border-green-900/30 flex items-center px-4 gap-3 shrink-0">
        <Globe className="h-3.5 w-3.5 text-green-400" />
        <span className="text-[10px] text-green-400 tracking-widest">TACTICAL MAP — REAL-TIME TRACKING</span>
        <div className="text-[10px] text-slate-600">Tick #{tickCount}</div>
        <div className="ml-auto flex items-center gap-2">
          {[["threats","THREATS",(threats ?? []).length],["assets","ASSETS",(assets ?? []).length],["incidents","INC",(incidents ?? []).length]].map(([k, l, c]) => (
            <button key={k as string} onClick={() => setFilters(f => ({ ...f, [k as string]: !f[k as keyof typeof f] }))} className={`text-[9px] px-2 py-0.5 border transition-colors ${(filters as any)[k as string] ? "border-green-900/50 text-green-400" : "border-slate-800 text-slate-600"}`}>
              {l} ({c})
            </button>
          ))}
          <button onClick={() => setLayer(l => l === "normal" ? "heatmap" : "normal")} className="text-[9px] border border-green-900/30 text-slate-500 px-2 py-0.5 hover:text-green-400">
            <Layers className="h-3 w-3 inline mr-1" />{layer.toUpperCase()}
          </button>
          <button onClick={() => setZoom(z => Math.min(8, z * 1.4))} className="text-slate-600 hover:text-green-400"><ZoomIn className="h-3.5 w-3.5" /></button>
          <button onClick={() => setZoom(z => Math.max(0.4, z / 1.4))} className="text-slate-600 hover:text-green-400"><ZoomOut className="h-3.5 w-3.5" /></button>
          <button onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }} className="text-[9px] border border-slate-800 text-slate-600 px-2 py-0.5 hover:text-slate-400">RESET</button>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Map */}
        <div
          ref={containerRef}
          className="flex-1 relative overflow-hidden cursor-crosshair select-none"
          onMouseDown={e => { setIsPanning(true); lastMouse.current = { x: e.clientX, y: e.clientY }; }}
          onMouseMove={e => {
            if (!isPanning) return;
            setPan(p => ({ x: p.x + e.clientX - lastMouse.current.x, y: p.y + e.clientY - lastMouse.current.y }));
            lastMouse.current = { x: e.clientX, y: e.clientY };
          }}
          onMouseUp={() => setIsPanning(false)}
          onMouseLeave={() => setIsPanning(false)}
        >
          <svg className="w-full h-full" viewBox={`0 0 ${W} ${H}`} style={{ display: "block" }}>
            <defs>
              <pattern id="grid" width={W * zoom / 18} height={H * zoom / 9} patternUnits="userSpaceOnUse" patternTransform={`translate(${pan.x},${pan.y})`}>
                <path d={`M ${W * zoom / 18} 0 L 0 0 0 ${H * zoom / 9}`} fill="none" stroke="rgba(34,197,94,0.06)" strokeWidth="0.5" />
              </pattern>
              <filter id="glow-critical"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
              <filter id="glow-high"><feGaussianBlur stdDeviation="2.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
            </defs>

            <rect width="100%" height="100%" fill="#060d1a" />
            <rect width="100%" height="100%" fill="url(#grid)" />

            {/* Continent fills */}
            <g transform={`translate(${pan.x},${pan.y}) scale(${zoom})`}>
              {/* North America */}
              <path d={`M${W*0.14},${H*0.12} ${W*0.28},${H*0.08} ${W*0.32},${H*0.15} ${W*0.3},${H*0.28} ${W*0.22},${H*0.35} ${W*0.17},${H*0.5} ${W*0.12},${H*0.55} ${W*0.1},${H*0.4}Z`} fill="rgba(34,197,94,0.06)" stroke="rgba(34,197,94,0.12)" strokeWidth={0.5/zoom} />
              <path d={`M${W*0.22},${H*0.52} ${W*0.3},${H*0.5} ${W*0.33},${H*0.62} ${W*0.28},${H*0.75} ${W*0.22},${H*0.8} ${W*0.19},${H*0.65}Z`} fill="rgba(34,197,94,0.06)" stroke="rgba(34,197,94,0.12)" strokeWidth={0.5/zoom} />
              <path d={`M${W*0.45},${H*0.12} ${W*0.56},${H*0.1} ${W*0.58},${H*0.22} ${W*0.52},${H*0.3} ${W*0.45},${H*0.27}Z`} fill="rgba(34,197,94,0.06)" stroke="rgba(34,197,94,0.12)" strokeWidth={0.5/zoom} />
              <path d={`M${W*0.47},${H*0.3} ${W*0.58},${H*0.28} ${W*0.6},${H*0.45} ${W*0.55},${H*0.65} ${W*0.5},${H*0.7} ${W*0.46},${H*0.55}Z`} fill="rgba(34,197,94,0.06)" stroke="rgba(34,197,94,0.12)" strokeWidth={0.5/zoom} />
              <path d={`M${W*0.58},${H*0.08} ${W*0.88},${H*0.08} ${W*0.9},${H*0.25} ${W*0.82},${H*0.45} ${W*0.72},${H*0.48} ${W*0.62},${H*0.38} ${W*0.58},${H*0.2}Z`} fill="rgba(34,197,94,0.06)" stroke="rgba(34,197,94,0.12)" strokeWidth={0.5/zoom} />
              <path d={`M${W*0.78},${H*0.56} ${W*0.9},${H*0.54} ${W*0.92},${H*0.68} ${W*0.82},${H*0.72} ${W*0.76},${H*0.65}Z`} fill="rgba(34,197,94,0.06)" stroke="rgba(34,197,94,0.12)" strokeWidth={0.5/zoom} />
              {/* Greenland */}
              <path d={`M${W*0.3},${H*0.05} ${W*0.38},${H*0.03} ${W*0.4},${H*0.12} ${W*0.33},${H*0.14}Z`} fill="rgba(34,197,94,0.04)" stroke="rgba(34,197,94,0.08)" strokeWidth={0.5/zoom} />
            </g>

            {/* Heatmap */}
            {layer === "heatmap" && allPoints.filter(p => p.type === "threat").map(p => {
              const { x, y } = toSvg(p.lat, p.lng);
              const c = SEV_COLORS[p.severity ?? "low"] || "#22c55e";
              return <circle key={`heat-${p.id}`} cx={x} cy={y} r={30} fill={c} opacity={0.07} />;
            })}

            {/* Threat & incident points */}
            {allPoints.filter(p => p.type !== "asset").map(p => {
              const { x, y } = toSvg(p.lat, p.lng);
              const c = SEV_COLORS[p.severity ?? "low"] || "#22c55e";
              const r = p.severity === "critical" ? 5 : p.severity === "high" ? 4 : 3;
              const isSelected = selected?.id === p.id && selected.type === p.type;
              return (
                <g key={`${p.type}-${p.id}`} onClick={e => { e.stopPropagation(); setSelected(s => s?.id === p.id && s.type === p.type ? null : p); }} style={{ cursor: "pointer" }}>
                  {p.severity === "critical" && <circle cx={x} cy={y} r={r * 3} fill={c} opacity={0.12} filter="url(#glow-critical)" />}
                  {p.severity === "high" && <circle cx={x} cy={y} r={r * 2} fill={c} opacity={0.1} />}
                  <circle cx={x} cy={y} r={r} fill={c} opacity={isSelected ? 1 : 0.8} stroke={isSelected ? "#fff" : c} strokeWidth={isSelected ? 1 : 0.3} />
                  {isSelected && <circle cx={x} cy={y} r={r + 5} fill="none" stroke={c} strokeWidth={0.7} opacity={0.5} />}
                </g>
              );
            })}

            {/* Asset points with heading arrows */}
            {allPoints.filter(p => p.type === "asset").map(p => {
              const { x, y } = toSvg(p.lat, p.lng);
              const c = assetColor(p);
              const isSelected = selected?.id === p.id && selected.type === "asset";
              const heading = p.heading ?? 0;
              const rad = (heading - 90) * Math.PI / 180;
              const arrowLen = 9;
              const ax = x + Math.cos(rad) * arrowLen;
              const ay = y + Math.sin(rad) * arrowLen;
              return (
                <g key={`asset-${p.id}`} onClick={e => { e.stopPropagation(); setSelected(s => s?.id === p.id && s.type === "asset" ? null : p); }} style={{ cursor: "pointer" }}>
                  {/* Heading arrow */}
                  {p.heading !== undefined && (
                    <line x1={x} y1={y} x2={ax} y2={ay} stroke={c} strokeWidth={0.8} opacity={0.6} markerEnd={`url(#arr-${p.id})`} />
                  )}
                  <text x={x} y={y} textAnchor="middle" dominantBaseline="middle" fill={c} fontSize={isSelected ? 7 : 5.5} opacity={isSelected ? 1 : 0.75} fontFamily="monospace">
                    {ASSET_SHAPES[p.assetType ?? ""] || "●"}
                  </text>
                  {isSelected && <circle cx={x} cy={y} r={7} fill="none" stroke={c} strokeWidth={0.7} opacity={0.5} />}
                </g>
              );
            })}

            {/* Click-to-deselect backdrop */}
            <rect width="100%" height="100%" fill="transparent" onClick={() => setSelected(null)} style={{ pointerEvents: "all", zIndex: -1 }} />
          </svg>

          {/* Selected tooltip */}
          {selected && (
            <div className="absolute top-4 right-4 bg-[#070e1c]/95 border border-green-900/40 p-3 max-w-xs text-[10px] pointer-events-none">
              <div className="text-green-400 text-[9px] tracking-wider mb-1 uppercase">{selected.type}</div>
              <div className="text-white font-bold mb-1.5">{selected.label}</div>
              <div className="space-y-0.5 text-slate-500">
                <div>{selected.lat.toFixed(4)}°, {selected.lng.toFixed(4)}°</div>
                {selected.severity && <div style={{ color: SEV_COLORS[selected.severity] }}>Severity: {selected.severity.toUpperCase()}</div>}
                {selected.domain && <div className="capitalize">Domain: {selected.domain.replace("_"," ")}</div>}
                {selected.affiliation && <div className="capitalize">Affiliation: {selected.affiliation}</div>}
                {selected.heading !== undefined && <div>Heading: {selected.heading}°</div>}
                {selected.assetType && <div className="capitalize">Type: {selected.assetType}</div>}
              </div>
            </div>
          )}

          {/* Stats overlay */}
          <div className="absolute top-4 left-4 bg-[#070e1c]/90 border border-green-900/30 p-2 text-[9px] space-y-0.5 pointer-events-none">
            <div className="text-slate-600">THREATS: <span className="text-red-400">{(threats ?? []).length}</span></div>
            <div className="text-slate-600">ASSETS: <span className="text-green-400">{(assets ?? []).length}</span></div>
            <div className="text-slate-600">INCIDENTS: <span className="text-yellow-400">{(incidents ?? []).length}</span></div>
            <div className="text-slate-600">ZOOM: <span className="text-slate-400">{zoom.toFixed(1)}x</span></div>
          </div>

          {/* Legend */}
          <div className="absolute bottom-4 left-4 bg-[#070e1c]/90 border border-green-900/30 p-2 text-[9px] space-y-1 pointer-events-none">
            <div className="text-slate-600 tracking-wider mb-1">SEVERITY</div>
            {Object.entries(SEV_COLORS).map(([s, c]) => (
              <div key={s} className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: c }} />
                <span className="text-slate-600 uppercase">{s}</span>
              </div>
            ))}
            <div className="text-slate-600 tracking-wider mt-2 mb-1">ASSETS</div>
            {[["friendly","#22c55e"],["hostile","#ef4444"],["neutral","#eab308"]].map(([l,c]) => (
              <div key={l} className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: c }} />
                <span className="text-slate-600 capitalize">{l}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Side panel */}
        <div className="w-48 bg-[#070e1c] border-l border-green-900/30 overflow-y-auto shrink-0">
          <div className="p-2 border-b border-green-900/20 text-[9px] text-slate-600 tracking-wider">DOMAINS</div>
          <div className="p-2 space-y-1">
            {Object.entries(DOMAIN_COLORS).map(([d, c]) => {
              const count = allPoints.filter(p => p.domain === d).length;
              return (
                <div key={d} className="flex items-center gap-2 text-[9px]">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: c }} />
                  <span className="text-slate-600 flex-1 capitalize">{d.replace("_"," ")}</span>
                  <span className="text-slate-700">{count}</span>
                </div>
              );
            })}
          </div>
          <div className="p-2 border-t border-green-900/20 text-[9px] text-slate-600 tracking-wider">AFFILIATION</div>
          <div className="p-2 space-y-1">
            {[["friendly","#22c55e"],["hostile","#ef4444"],["neutral","#eab308"],["unknown","#94a3b8"]].map(([aff,c]) => {
              const count = (assets ?? []).filter((a: any) => a.affiliation === aff).length;
              return (
                <div key={aff} className="flex items-center gap-2 text-[9px]">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: c }} />
                  <span className="text-slate-600 flex-1 capitalize">{aff}</span>
                  <span className="text-slate-700">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
