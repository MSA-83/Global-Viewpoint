import { useState, FormEvent } from "react";
import { useAuth } from "@/contexts/auth";
import { Shield, Lock, User, Zap, AlertCircle } from "lucide-react";

export default function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(username, password);
    } catch (err: any) {
      setError(err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050c18] flex items-center justify-center font-mono relative overflow-hidden">
      {/* Animated background grid */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: "linear-gradient(rgba(34,197,94,1) 1px, transparent 1px), linear-gradient(90deg, rgba(34,197,94,1) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />
      {/* Radial glow */}
      <div className="absolute inset-0 bg-gradient-radial from-green-950/20 via-transparent to-transparent" />

      <div className="relative z-10 w-full max-w-md px-6">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 border-2 border-green-500/40 bg-green-950/40 mb-4">
            <Zap className="h-8 w-8 text-green-400" />
          </div>
          <div className="text-green-400 font-bold text-2xl tracking-[0.3em] mb-1">SENTINEL-X</div>
          <div className="text-slate-500 text-xs tracking-[0.2em]">GLOBAL SITUATIONAL AWARENESS PLATFORM</div>
          <div className="mt-3 text-[10px] text-red-400 border border-red-900/40 inline-block px-3 py-1 tracking-widest">
            SECRET // NOFORN // AUTHORIZED ACCESS ONLY
          </div>
        </div>

        {/* Login form */}
        <div className="border border-green-900/40 bg-[#070e1c]/80 backdrop-blur-sm p-6">
          <div className="flex items-center gap-2 mb-6 pb-4 border-b border-green-900/30">
            <Lock className="h-4 w-4 text-green-500" />
            <span className="text-green-400 text-sm tracking-widest">AUTHENTICATION REQUIRED</span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-[10px] text-slate-500 tracking-widest block mb-1.5">OPERATOR ID</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-600" />
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="w-full bg-[#050c18] border border-green-900/40 text-green-300 text-sm pl-9 pr-4 py-2.5 focus:outline-none focus:border-green-500/60 placeholder-slate-700 tracking-wide"
                  placeholder="username"
                  required
                  autoComplete="username"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] text-slate-500 tracking-widest block mb-1.5">ACCESS CODE</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-600" />
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-[#050c18] border border-green-900/40 text-green-300 text-sm pl-9 pr-4 py-2.5 focus:outline-none focus:border-green-500/60 placeholder-slate-700 tracking-wide"
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-red-400 text-xs border border-red-900/40 bg-red-950/20 px-3 py-2">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-500/10 hover:bg-green-500/20 border border-green-500/40 text-green-400 text-sm py-2.5 tracking-widest transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-2 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="w-3.5 h-3.5 border border-green-400 border-t-transparent rounded-full animate-spin" />
                  AUTHENTICATING...
                </>
              ) : (
                <>
                  <Shield className="h-3.5 w-3.5" />
                  AUTHENTICATE
                </>
              )}
            </button>
          </form>

          {/* Demo credentials */}
          <div className="mt-5 pt-4 border-t border-green-900/30 text-[9px] text-slate-600 space-y-1.5">
            <div className="text-slate-500 mb-2 tracking-wider">DEMO ACCESS CREDENTIALS:</div>
            <div className="grid grid-cols-2 gap-1 text-[9px]">
              {[
                ["admin", "super_admin", "password"],
                ["analyst1", "analyst", "password"],
                ["operator1", "operator", "password"],
                ["exec1", "executive", "password"],
              ].map(([u, r, p]) => (
                <button
                  key={u}
                  type="button"
                  onClick={() => { setUsername(u); setPassword(p); }}
                  className="text-left border border-green-900/20 px-2 py-1 hover:border-green-900/50 hover:bg-green-950/20 transition-colors"
                >
                  <div className="text-green-600">{u}</div>
                  <div className="text-slate-700">{r}</div>
                </button>
              ))}
            </div>
            <div className="text-[9px] text-slate-700 mt-1">Password: "password" for all accounts</div>
          </div>
        </div>

        <div className="text-center mt-4 text-[9px] text-slate-700 tracking-wider">
          UNAUTHORIZED ACCESS IS A FEDERAL OFFENSE — 18 U.S.C. § 1030
        </div>
      </div>
    </div>
  );
}
