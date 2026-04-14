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
    <div className="min-h-screen flex items-center justify-center p-5 relative overflow-hidden">
      {/* Ambient background orbs */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-indigo-500/[0.07] blur-[100px] animate-float" />
        <div className="absolute bottom-[-15%] right-[-5%] w-[400px] h-[400px] rounded-full bg-emerald-500/[0.06] blur-[100px] animate-float [animation-delay:-7s]" />
      </div>

      <div className="relative w-full max-w-[420px]">
        <div className="backdrop-blur-xl bg-white/[0.03] border border-white/[0.07] rounded-3xl p-9 shadow-[0_24px_80px_rgba(0,0,0,0.5)] flex flex-col items-center gap-5 animate-[modal-in_0.3s_ease-out]">

          {/* Logo + Title */}
          <span className="text-5xl leading-none text-indigo-400 drop-shadow-[0_0_16px_rgba(99,102,241,0.4)]">{"\u2B21"}</span>
          <h1 className="text-[2.2rem] font-black tracking-tight bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent leading-tight">
            Hex Territory
          </h1>
          <p className="text-sm text-slate-400 -mt-2 font-medium">Private lobby battles</p>

          {/* Player identity bar */}
          <div className="flex items-center gap-3 px-5 py-3 w-full justify-center rounded-xl bg-white/[0.04] border border-white/[0.06]">
            {user.photoURL && (
              <img className="w-7 h-7 rounded-full object-cover border-2 border-white/10" src={user.photoURL} alt="" referrerPolicy="no-referrer" />
            )}
            <span className="font-semibold text-slate-200 text-sm">{username}</span>
            <span className="w-3 h-3 rounded-full border-2 border-white/20 shrink-0" style={{ backgroundColor: color }} />
          </div>

          {/* Create button */}
          <button
            className="w-full py-4 rounded-xl font-bold text-[1.05rem] bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/20 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-emerald-500/30 active:scale-[0.97] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            onClick={handleCreate}
            disabled={busy}
          >
            Create Match
          </button>

          {/* Divider */}
          <div className="flex items-center w-full gap-4 my-1">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />
            <span className="text-[0.68rem] font-bold text-slate-500 uppercase tracking-[0.15em]">or join a friend</span>
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />
          </div>

          {/* Join row */}
          <div className="flex gap-3 w-full">
            <input
              className="flex-1 min-w-0 px-4 py-3.5 rounded-xl bg-slate-800/80 border border-white/[0.08] text-white font-bold text-center tracking-[0.3em] uppercase placeholder:text-slate-600 placeholder:tracking-[0.2em] placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/30 transition-all"
              placeholder="CODE"
              maxLength={5}
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && handleJoin()}
            />
            <button
              className="px-6 py-3.5 rounded-xl font-bold text-sm bg-slate-700/50 border border-white/[0.08] text-slate-300 hover:bg-indigo-500/20 hover:border-indigo-500/30 hover:text-white active:scale-[0.97] transition-all duration-200 disabled:opacity-50 cursor-pointer"
              onClick={handleJoin}
              disabled={busy}
            >
              Join
            </button>
          </div>

          {error && <p className="text-sm font-semibold text-red-400">{error}</p>}

          <button
            className="text-xs font-semibold text-slate-500 hover:text-slate-300 transition-colors mt-1 cursor-pointer"
            onClick={logout}
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
