import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getKnowledgeGraph, createKnowledgeNode, deleteKnowledgeNode, createKnowledgeEdge, deleteKnowledgeEdge } from "@/lib/api";
import { Network, Plus, X, ZoomIn, ZoomOut, Move } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const NODE_TYPE_COLOR: Record<string, string> = {
  person: "#f97316", organization: "#8b5cf6", vessel: "#06b6d4", aircraft: "#22c55e",
  facility: "#eab308", event: "#ef4444", location: "#94a3b8", network: "#ec4899",
  country: "#84cc16", threat_actor: "#ef4444",
};
const NODE_SIZE: Record<string, number> = {
  country: 20, organization: 16, threat_actor: 18, facility: 14, vessel: 12, aircraft: 12, network: 13, person: 11, event: 10, location: 9,
};
const THREAT_GLOW: Record<string, string> = {
  critical: "#ef4444", high: "#f97316", medium: "#eab308", low: "#22c55e", none: "#475569",
};

type NodePos = { x: number; y: number; vx: number; vy: number };

function ForceGraph({ nodes, edges, onNodeClick }: { nodes: any[]; edges: any[]; onNodeClick: (n: any) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const posRef = useRef<Map<number, NodePos>>(new Map());
  const animRef = useRef<number>();
  const [dragging, setDragging] = useState<number | null>(null);
  const dragOffset = useRef({ x: 0, y: 0 });
  const [hoveredNode, setHoveredNode] = useState<number | null>(null);
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const isPanning = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });

  // Initialize positions
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const W = canvas.width, H = canvas.height;
    nodes.forEach((n, i) => {
      if (!posRef.current.has(n.id)) {
        const angle = (i / nodes.length) * Math.PI * 2;
        const r = Math.min(W, H) * 0.3;
        posRef.current.set(n.id, { x: W / 2 + r * Math.cos(angle), y: H / 2 + r * Math.sin(angle), vx: 0, vy: 0 });
      }
    });
  }, [nodes]);

  // Force simulation + render
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    const tick = () => {
      const W = canvas.width, H = canvas.height;
      // Force-directed physics
      const pos = posRef.current;
      const nodeArr = nodes.map(n => ({ ...n, p: pos.get(n.id)! })).filter(n => n.p);

      // Repulsion
      for (let i = 0; i < nodeArr.length; i++) {
        for (let j = i + 1; j < nodeArr.length; j++) {
          const a = nodeArr[i].p, b = nodeArr[j].p;
          const dx = b.x - a.x, dy = b.y - a.y;
          const dist = Math.max(1, Math.sqrt(dx * dx + dy * dy));
          const force = 8000 / (dist * dist);
          const fx = (dx / dist) * force, fy = (dy / dist) * force;
          if (dragging !== nodeArr[i].id) { a.vx -= fx; a.vy -= fy; }
          if (dragging !== nodeArr[j].id) { b.vx += fx; b.vy += fy; }
        }
      }

      // Attraction for edges
      edges.forEach(e => {
        const a = pos.get(e.sourceNodeId), b = pos.get(e.targetNodeId);
        if (!a || !b) return;
        const dx = b.x - a.x, dy = b.y - a.y;
        const dist = Math.max(1, Math.sqrt(dx * dx + dy * dy));
        const target = 120;
        const force = (dist - target) * 0.05;
        const fx = (dx / dist) * force, fy = (dy / dist) * force;
        if (dragging !== e.sourceNodeId) { a.vx += fx; a.vy += fy; }
        if (dragging !== e.targetNodeId) { b.vx -= fx; b.vy -= fy; }
      });

      // Center gravity
      nodeArr.forEach(({ id, p }) => {
        if (dragging === id) return;
        p.vx += (W / 2 - p.x) * 0.003;
        p.vy += (H / 2 - p.y) * 0.003;
        p.vx *= 0.85;
        p.vy *= 0.85;
        p.x += p.vx;
        p.y += p.vy;
        p.x = Math.max(30, Math.min(W - 30, p.x));
        p.y = Math.max(30, Math.min(H - 30, p.y));
      });

      // Draw
      ctx.clearRect(0, 0, W, H);
      ctx.save();
      ctx.translate(pan.x, pan.y);
      ctx.scale(scale, scale);

      // Edges
      edges.forEach(e => {
        const a = pos.get(e.sourceNodeId), b = pos.get(e.targetNodeId);
        if (!a || !b) return;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.strokeStyle = "rgba(34,197,94,0.2)";
        ctx.lineWidth = Math.max(0.5, (e.strength || 0.5));
        ctx.stroke();
        // Edge label
        if (e.label) {
          ctx.fillStyle = "#475569";
          ctx.font = "8px monospace";
          ctx.fillText(e.label.slice(0, 12), (a.x + b.x) / 2, (a.y + b.y) / 2);
        }
      });

      // Nodes
      nodeArr.forEach(n => {
        const p = n.p;
        const r = (NODE_SIZE[n.nodeType] || 10);
        const color = NODE_TYPE_COLOR[n.nodeType] || "#94a3b8";
        const glowColor = THREAT_GLOW[n.threatLevel] || "#475569";
        const isHovered = hoveredNode === n.id;

        // Glow
        if (n.threatLevel === "critical" || n.threatLevel === "high" || isHovered) {
          ctx.shadowColor = isHovered ? color : glowColor;
          ctx.shadowBlur = isHovered ? 20 : 10;
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.fillStyle = color + (isHovered ? "ff" : "cc");
        ctx.fill();
        ctx.strokeStyle = color;
        ctx.lineWidth = isHovered ? 2 : 1;
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Label
        ctx.fillStyle = isHovered ? "#ffffff" : "#94a3b8";
        ctx.font = `${isHovered ? "bold " : ""}9px monospace`;
        ctx.textAlign = "center";
        ctx.fillText(n.label.slice(0, 18), p.x, p.y + r + 11);
      });

      ctx.restore();
      animRef.current = requestAnimationFrame(tick);
    };

    animRef.current = requestAnimationFrame(tick);
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [nodes, edges, dragging, hoveredNode, scale, pan]);

  const getNodeAt = (mx: number, my: number) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const cx = (mx - rect.left - pan.x) / scale;
    const cy = (my - rect.top - pan.y) / scale;
    for (const n of nodes) {
      const p = posRef.current.get(n.id);
      if (!p) continue;
      const r = NODE_SIZE[n.nodeType] || 10;
      if ((cx - p.x) ** 2 + (cy - p.y) ** 2 <= r * r) return n;
    }
    return null;
  };

  return (
    <div className="relative w-full h-full">
      <canvas
        ref={canvasRef}
        width={800}
        height={500}
        className="w-full h-full cursor-crosshair"
        onMouseDown={e => {
          const n = getNodeAt(e.clientX, e.clientY);
          if (n) {
            setDragging(n.id);
            const p = posRef.current.get(n.id)!;
            const rect = canvasRef.current!.getBoundingClientRect();
            dragOffset.current = { x: e.clientX - rect.left - p.x * scale - pan.x, y: e.clientY - rect.top - p.y * scale - pan.y };
          } else {
            isPanning.current = true;
            lastMouse.current = { x: e.clientX, y: e.clientY };
          }
        }}
        onMouseMove={e => {
          if (dragging !== null) {
            const rect = canvasRef.current!.getBoundingClientRect();
            const p = posRef.current.get(dragging)!;
            p.x = (e.clientX - rect.left - dragOffset.current.x - pan.x) / scale;
            p.y = (e.clientY - rect.top - dragOffset.current.y - pan.y) / scale;
            p.vx = 0; p.vy = 0;
          } else if (isPanning.current) {
            setPan(p => ({ x: p.x + e.clientX - lastMouse.current.x, y: p.y + e.clientY - lastMouse.current.y }));
            lastMouse.current = { x: e.clientX, y: e.clientY };
          } else {
            const n = getNodeAt(e.clientX, e.clientY);
            setHoveredNode(n?.id ?? null);
          }
        }}
        onMouseUp={e => {
          if (dragging !== null) {
            const n = nodes.find(n => n.id === dragging);
            if (n) onNodeClick(n);
            setDragging(null);
          }
          isPanning.current = false;
        }}
        onWheel={e => {
          e.preventDefault();
          setScale(s => Math.max(0.3, Math.min(3, s * (e.deltaY > 0 ? 0.9 : 1.1))));
        }}
      />
    </div>
  );
}

export default function KnowledgeGraphPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newNode, setNewNode] = useState({ nodeType: "organization", label: "", description: "", country: "", threatLevel: "medium" });

  const { data: graph, isLoading } = useQuery({ queryKey: ["knowledge-graph"], queryFn: getKnowledgeGraph, refetchInterval: 60000 });

  const createMut = useMutation({
    mutationFn: (data: any) => createKnowledgeNode(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["knowledge-graph"] }); setShowCreate(false); toast({ title: "Entity created" }); },
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => deleteKnowledgeNode(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["knowledge-graph"] }); setSelectedNode(null); },
  });

  return (
    <div className="p-4 flex flex-col h-full gap-4">
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Network className="h-5 w-5 text-purple-400" />
          <h1 className="text-lg font-bold text-purple-400 tracking-widest">KNOWLEDGE GRAPH</h1>
          <span className="text-[10px] text-slate-600">{graph?.nodes?.length ?? 0} entities · {graph?.edges?.length ?? 0} relationships</span>
        </div>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-1 text-[10px] text-purple-400 border border-purple-900/40 px-3 py-1.5 hover:bg-purple-950/20">
          <Plus className="h-3 w-3" /> ADD ENTITY
        </button>
      </div>

      {/* Legend */}
      <div className="flex gap-3 flex-wrap text-[9px] shrink-0">
        {Object.entries(NODE_TYPE_COLOR).map(([type, color]) => (
          <div key={type} className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
            <span className="text-slate-600 capitalize">{type.replace("_"," ")}</span>
          </div>
        ))}
      </div>

      <div className="flex flex-1 min-h-0 gap-4">
        {/* Graph */}
        <div className="flex-1 border border-purple-900/30 bg-[#070e1c] overflow-hidden relative">
          {isLoading ? (
            <div className="flex items-center justify-center h-full text-[10px] text-slate-600">LOADING GRAPH...</div>
          ) : graph?.nodes?.length ? (
            <ForceGraph
              nodes={graph.nodes}
              edges={graph.edges}
              onNodeClick={n => setSelectedNode(n)}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-[10px] text-slate-600">NO ENTITIES IN GRAPH</div>
          )}
        </div>

        {/* Node detail */}
        {selectedNode && (
          <div className="w-64 border border-purple-900/30 bg-[#070e1c] p-4 shrink-0 overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <div className="text-[10px] text-purple-400 tracking-wider">ENTITY DETAILS</div>
              <button onClick={() => setSelectedNode(null)}><X className="h-3.5 w-3.5 text-slate-600" /></button>
            </div>
            <div className="space-y-2 text-[10px]">
              <div>
                <div className="w-3 h-3 rounded-full mb-2" style={{ backgroundColor: NODE_TYPE_COLOR[selectedNode.nodeType] || "#94a3b8" }} />
                <div className="font-bold text-slate-200">{selectedNode.label}</div>
                <div className="text-slate-600 capitalize mt-0.5">{selectedNode.nodeType?.replace("_"," ")}</div>
              </div>
              {selectedNode.country && <div><span className="text-slate-600">Country:</span> <span className="text-slate-300">{selectedNode.country}</span></div>}
              {selectedNode.threatLevel && <div><span className="text-slate-600">Threat:</span> <span className={THREAT_GLOW[selectedNode.threatLevel] ? "" : "text-slate-300"} style={{ color: THREAT_GLOW[selectedNode.threatLevel] }}>{selectedNode.threatLevel?.toUpperCase()}</span></div>}
              {selectedNode.confidence && <div><span className="text-slate-600">Confidence:</span> <span className="text-slate-300 capitalize">{selectedNode.confidence}</span></div>}
              {selectedNode.description && <div className="text-slate-500 mt-2">{selectedNode.description}</div>}
              {selectedNode.identifier && <div><span className="text-slate-600">ID:</span> <span className="text-cyan-400">{selectedNode.identifier}</span></div>}
              {selectedNode.latitude && <div><span className="text-slate-600">Coords:</span> <span className="text-slate-300">{selectedNode.latitude?.toFixed(2)}°, {selectedNode.longitude?.toFixed(2)}°</span></div>}
            </div>
            <button onClick={() => deleteMut.mutate(selectedNode.id)} className="mt-4 w-full border border-red-900/30 text-red-400 text-[9px] py-1.5 hover:bg-red-950/20">DELETE ENTITY</button>
          </div>
        )}
      </div>

      {/* Create node */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-[#070e1c] border border-purple-900/40 w-full max-w-md p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm font-bold text-purple-400 tracking-wider">ADD ENTITY</div>
              <button onClick={() => setShowCreate(false)}><X className="h-4 w-4 text-slate-500" /></button>
            </div>
            <div className="space-y-3">
              {[
                { key: "label", label: "ENTITY LABEL", type: "text" },
                { key: "description", label: "DESCRIPTION", type: "text" },
                { key: "country", label: "COUNTRY", type: "text" },
              ].map(({ key, label, type }) => (
                <div key={key}>
                  <label className="text-[9px] text-slate-500 block mb-1">{label}</label>
                  <input value={(newNode as any)[key]} onChange={e => setNewNode(n => ({ ...n, [key]: e.target.value }))} className="w-full bg-[#050c18] border border-green-900/30 text-slate-300 text-[11px] px-2 py-1.5 focus:outline-none" />
                </div>
              ))}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] text-slate-500 block mb-1">TYPE</label>
                  <select value={newNode.nodeType} onChange={e => setNewNode(n => ({ ...n, nodeType: e.target.value }))} className="w-full bg-[#050c18] border border-green-900/30 text-slate-300 text-[11px] px-2 py-1.5 focus:outline-none">
                    {Object.keys(NODE_TYPE_COLOR).map(t => <option key={t} value={t}>{t.replace("_"," ").toUpperCase()}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[9px] text-slate-500 block mb-1">THREAT LEVEL</label>
                  <select value={newNode.threatLevel} onChange={e => setNewNode(n => ({ ...n, threatLevel: e.target.value }))} className="w-full bg-[#050c18] border border-green-900/30 text-slate-300 text-[11px] px-2 py-1.5 focus:outline-none">
                    {["critical","high","medium","low","none"].map(l => <option key={l} value={l}>{l.toUpperCase()}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => createMut.mutate(newNode)} disabled={!newNode.label} className="flex-1 bg-purple-950/40 border border-purple-900/40 text-purple-400 text-[10px] py-2 hover:bg-purple-950/60 disabled:opacity-50">CREATE</button>
                <button onClick={() => setShowCreate(false)} className="flex-1 border border-slate-800 text-slate-500 text-[10px] py-2">CANCEL</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
