import { useState, useRef, useEffect } from "react";
import { generateBriefing, aiQuery } from "@/lib/api";
import { Bot, Send, FileText, Zap, AlertCircle, Clock, ChevronDown, Loader2, Trash2 } from "lucide-react";

type Message = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  confidence?: number;
  timestamp: string;
};

const QUICK_QUERIES = [
  "What are the current critical threats?",
  "Summarize open alerts",
  "How many active cases?",
  "What is the current threat landscape?",
  "Show intelligence assessment",
  "List priority incidents",
];

export default function CopilotPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "0",
      role: "system",
      content: "SENTINEL-X AI ANALYST ONLINE\n\nI am the SENTINEL-X intelligence fusion assistant. I can query live database, generate situational briefings, summarize threats, and answer questions about the current operational picture.\n\nNote: All outputs require human analyst review before action.",
      timestamp: new Date().toISOString(),
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [briefingType, setBriefingType] = useState("situation");
  const [briefingLoading, setBriefingLoading] = useState(false);
  const [briefing, setBriefing] = useState<any>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const sendMessage = async (q: string) => {
    if (!q.trim() || loading) return;
    const userMsg: Message = { id: Date.now().toString(), role: "user", content: q, timestamp: new Date().toISOString() };
    setMessages(m => [...m, userMsg]);
    setInput("");
    setLoading(true);
    try {
      const res = await aiQuery(q);
      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: res.answer,
        confidence: res.confidence,
        timestamp: new Date().toISOString(),
      };
      setMessages(m => [...m, aiMsg]);
    } catch (e: any) {
      const errMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "system",
        content: `Query failed: ${e.message}`,
        timestamp: new Date().toISOString(),
      };
      setMessages(m => [...m, errMsg]);
    } finally {
      setLoading(false);
    }
  };

  const generateBriefingFn = async () => {
    setBriefingLoading(true);
    try {
      const b = await generateBriefing({ type: briefingType });
      setBriefing(b);
    } finally {
      setBriefingLoading(false);
    }
  };

  return (
    <div className="p-4 h-full flex flex-col gap-4">
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-cyan-400" />
          <h1 className="text-lg font-bold text-cyan-400 tracking-widest">AI COPILOT</h1>
          <span className="text-[9px] border border-cyan-900/40 text-cyan-600 px-2 py-0.5">HUMAN REVIEW REQUIRED</span>
          <span className="text-[9px] text-slate-600">{messages.filter(m => m.role !== "system").length} MSGS</span>
        </div>
        <button
          onClick={() => setMessages(messages.slice(0, 1))}
          className="flex items-center gap-1 text-[9px] border border-red-900/30 text-red-400 px-2 py-1 hover:bg-red-950/20"
          title="Clear conversation"
        >
          <Trash2 className="h-3 w-3" /> CLEAR
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 flex-1 min-h-0">
        {/* Chat interface */}
        <div className="flex flex-col border border-cyan-900/30 bg-[#070e1c] min-h-0">
          <div className="p-3 border-b border-cyan-900/20 text-[10px] text-cyan-400 tracking-wider flex items-center gap-1.5">
            <Zap className="h-3 w-3" /> INTELLIGENCE QUERY INTERFACE
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
            {messages.map(msg => (
              <div key={msg.id} className={`${msg.role === "user" ? "ml-8" : msg.role === "system" ? "" : "mr-8"}`}>
                <div className={`text-[9px] mb-1 flex items-center gap-2 ${msg.role === "user" ? "text-green-600 justify-end" : msg.role === "system" ? "text-cyan-700" : "text-cyan-600"}`}>
                  {msg.role === "user" ? "OPERATOR" : msg.role === "system" ? "SYSTEM" : "AI ANALYST"}
                  <span className="text-slate-700">{new Date(msg.timestamp).toLocaleTimeString()}</span>
                  {msg.confidence && <span className="text-cyan-700">{msg.confidence}% CONF</span>}
                </div>
                <div className={`text-[10px] p-2.5 border whitespace-pre-line leading-relaxed ${
                  msg.role === "user"
                    ? "border-green-900/30 bg-green-950/10 text-slate-300"
                    : msg.role === "system"
                    ? "border-cyan-900/20 bg-cyan-950/10 text-cyan-300"
                    : "border-cyan-900/30 bg-[#080f1f] text-slate-300"
                }`}>
                  {msg.content}
                </div>
                {msg.role === "assistant" && (
                  <div className="text-[9px] text-slate-700 mt-1 flex items-center gap-1">
                    <AlertCircle className="h-2.5 w-2.5" /> Human analyst review required before action
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex items-center gap-2 text-[10px] text-cyan-600">
                <Loader2 className="h-3 w-3 animate-spin" /> Processing query through intelligence database...
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Quick queries */}
          <div className="px-3 py-2 border-t border-cyan-900/20 flex gap-1.5 flex-wrap">
            {QUICK_QUERIES.map(q => (
              <button key={q} onClick={() => sendMessage(q)} className="text-[9px] border border-cyan-900/20 text-cyan-700 px-2 py-0.5 hover:border-cyan-900/50 hover:text-cyan-500 transition-colors">
                {q}
              </button>
            ))}
          </div>

          {/* Input */}
          <div className="p-3 border-t border-cyan-900/20 flex gap-2">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); } }}
              placeholder="Query intelligence database..."
              className="flex-1 bg-[#050c18] border border-cyan-900/30 text-slate-300 text-[10px] px-3 py-2 focus:outline-none focus:border-cyan-900/60 placeholder-slate-700"
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || loading}
              className="border border-cyan-900/40 text-cyan-400 px-3 hover:bg-cyan-950/20 disabled:opacity-50"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Briefing generator */}
        <div className="flex flex-col border border-purple-900/30 bg-[#070e1c] min-h-0">
          <div className="p-3 border-b border-purple-900/20 text-[10px] text-purple-400 tracking-wider flex items-center gap-1.5 shrink-0">
            <FileText className="h-3 w-3" /> INTELLIGENCE BRIEFING GENERATOR
          </div>

          <div className="p-3 border-b border-purple-900/20 flex gap-2 items-center shrink-0">
            <select
              value={briefingType}
              onChange={e => setBriefingType(e.target.value)}
              className="bg-[#050c18] border border-purple-900/30 text-slate-300 text-[10px] px-2 py-1.5 focus:outline-none"
            >
              {["situation","threat","maritime","cyber","executive"].map(t => (
                <option key={t} value={t}>{t.toUpperCase()}</option>
              ))}
            </select>
            <button
              onClick={generateBriefingFn}
              disabled={briefingLoading}
              className="flex items-center gap-1.5 border border-purple-900/40 text-purple-400 text-[10px] px-3 py-1.5 hover:bg-purple-950/20 disabled:opacity-50"
            >
              {briefingLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Zap className="h-3 w-3" />}
              GENERATE
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 min-h-0">
            {briefing ? (
              <div className="space-y-4 text-[10px]">
                {/* Header */}
                <div className="border border-purple-900/40 p-3 bg-purple-950/10">
                  <div className="text-red-400 font-bold tracking-wider mb-1">{briefing.classification}</div>
                  <div className="text-purple-300 font-bold">{briefing.type?.toUpperCase()} ASSESSMENT — {briefing.region}</div>
                  <div className="text-slate-600 flex items-center gap-1 mt-1"><Clock className="h-3 w-3" /> {new Date(briefing.generatedAt).toLocaleString()}</div>
                </div>

                {briefing.sections?.map((section: any) => (
                  <div key={section.heading}>
                    <div className="text-purple-400 font-bold tracking-wider mb-1 text-[9px]">{section.heading}</div>
                    <div className="text-slate-300 leading-relaxed whitespace-pre-line">{section.content}</div>
                  </div>
                ))}

                <div className="border border-purple-900/30 p-2 bg-purple-950/10">
                  <div className="text-[9px] text-purple-600 mb-1">INTELLIGENCE METADATA</div>
                  <div className="text-slate-500 flex gap-3 flex-wrap">
                    <span>Confidence: {briefing.metadata?.confidence}%</span>
                    <span>Sources: {briefing.metadata?.sourcesConsulted?.join(", ")}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-[9px] text-amber-600 border border-amber-900/30 p-2 bg-amber-950/10">
                  <AlertCircle className="h-3 w-3" />
                  Human analyst review required. Do not distribute without verification.
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <FileText className="h-10 w-10 text-slate-700 mx-auto mb-3" />
                  <div className="text-[10px] text-slate-600">Select briefing type and generate</div>
                  <div className="text-[9px] text-slate-700 mt-1">Generated from live intelligence database</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
