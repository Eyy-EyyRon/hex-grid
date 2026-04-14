import { useState } from "react";
import { createMatch, joinMatch } from "../hooks/useMatch";

export default function Home({ user, username, color, onNavigate, logout }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const handleCreate = async () => {
    setBusy(true);
    try {
      const id = await createMatch(user, username);
      onNavigate("lobby", id);
    } catch (e) { setError(e.message); setBusy(false); }
  };

  const handleJoin = async () => {
    const c = code.trim().toUpperCase();
    if (c.length !== 5) { setError("Enter a 5-character room code"); return; }
    setBusy(true); setError("");
    try {
      await joinMatch(c, user, username);
      onNavigate("lobby", c);
    } catch (e) { setError(e.message); setBusy(false); }
  };

  return (
    /* Step 31 — Deep radial gradient background */
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-800 via-slate-950 to-black flex items-center justify-center p-4 relative overflow-hidden">
      {/* Ambient floating orbs for depth */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-teal-500/[0.06] blur-[120px] animate-float" />
        <div className="absolute bottom-[-15%] right-[-5%] w-[500px] h-[500px] rounded-full bg-indigo-500/[0.05] blur-[120px] animate-float [animation-delay:-7s]" />
      </div>

      {/* Step 32 — True glassmorphism card */}
      <div className="relative w-full max-w-md">
        {/* Glow orb behind card */}
        <div className="absolute -inset-4 bg-gradient-to-br from-emerald-500/[0.08] to-indigo-500/[0.08] rounded-3xl blur-2xl pointer-events-none" />

        <div className="relative w-full p-8 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md shadow-2xl overflow-hidden flex flex-col items-center gap-5 animate-[modal-in_0.3s_ease-out]">

          {/* Step 33 — Glowing logo + title */}
          <span className="text-6xl leading-none text-teal-400 drop-shadow-[0_0_20px_rgba(45,212,191,0.6)]">{"\u2B21"}</span>
          <h1 className="text-[2.4rem] font-black tracking-tight bg-gradient-to-r from-blue-400 to-teal-400 bg-clip-text text-transparent leading-tight drop-shadow-[0_0_15px_rgba(45,212,191,0.5)]">
            Hex Territory
          </h1>
          <p className="text-sm text-slate-400 -mt-2 font-medium">Private lobby battles</p>

          {/* Step 35 — Transparent user badge */}
          <div className="flex items-center gap-3 px-5 py-2.5 w-full justify-center rounded-full bg-black/20 border border-white/5">
            {user.photoURL && (
              <img className="w-7 h-7 rounded-full object-cover border-2 border-white/10" src={user.photoURL} alt="" referrerPolicy="no-referrer" />
            )}
            <span className="font-semibold text-slate-200 text-sm">{username}</span>
            <span className="w-3 h-3 rounded-full border-2 border-white/20 shrink-0" style={{ backgroundColor: color }} />
          </div>

          {/* Step 34 — Create Match (tactile gradient button) */}
          <button
            className="w-full py-3 rounded-lg font-bold tracking-wide text-white bg-gradient-to-r from-emerald-500 to-teal-500 hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(16,185,129,0.4)] active:scale-[0.97] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            onClick={handleCreate}
            disabled={busy}
          >
            Create Match
          </button>

          {/* Divider */}
          <div className="flex items-center w-full gap-4 my-0.5">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            <span className="text-[0.68rem] font-bold text-slate-500 uppercase tracking-[0.15em]">or join a friend</span>
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          </div>

          {/* Step 34 — Join row (input + secondary button with glow hover) */}
          <div className="flex gap-3 w-full">
            <input
              className="flex-1 min-w-0 px-4 py-3 rounded-lg bg-slate-800/80 border border-white/10 text-white font-bold text-center tracking-[0.3em] uppercase placeholder:text-slate-600 placeholder:tracking-[0.2em] placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500/30 transition-all"
              placeholder="CODE"
              maxLength={5}
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && handleJoin()}
            />
            <button
              className="px-6 py-3 rounded-lg font-bold text-sm border border-white/10 text-slate-300 bg-white/5 hover:border-teal-500/40 hover:text-white hover:shadow-[0_0_12px_rgba(45,212,191,0.2)] active:scale-[0.97] transition-all duration-200 disabled:opacity-50 cursor-pointer"
              onClick={handleJoin}
              disabled={busy}
            >
              Join
            </button>
          </div>

          {error && <p className="text-sm font-semibold text-red-400">{error}</p>}

          {/* Step 35 — Clean sign out text */}
          <button
            className="text-sm text-slate-400 hover:text-white transition-colors underline-offset-4 hover:underline mt-1 cursor-pointer bg-transparent border-none"
            onClick={logout}
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
