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
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_center,#0d0a1a,#03071e_70%,#000)] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Ambient floating orbs — ember palette */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-[#9d0208]/[0.07] blur-[120px] animate-float" />
        <div className="absolute bottom-[-15%] right-[-5%] w-[500px] h-[500px] rounded-full bg-[#e85d04]/[0.05] blur-[120px] animate-float [animation-delay:-7s]" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Warm glow behind card */}
        <div className="absolute -inset-4 bg-gradient-to-br from-[#d00000]/[0.06] to-[#e85d04]/[0.06] rounded-3xl blur-2xl pointer-events-none" />

        <div className="relative w-full p-8 rounded-2xl bg-[#370617]/30 border border-[#6a040f]/30 backdrop-blur-md shadow-[0_24px_80px_rgba(0,0,0,0.6)] overflow-hidden flex flex-col items-center gap-5 animate-[modal-in_0.3s_ease-out]">

          {/* Glowing hex icon */}
          <span className="text-6xl leading-none text-[#ffba08] drop-shadow-[0_0_24px_rgba(255,186,8,0.5)]">{"\u2B21"}</span>
          <h1 className="text-[2.4rem] font-black tracking-tight bg-gradient-to-r from-[#f48c06] to-[#ffba08] bg-clip-text text-transparent leading-tight drop-shadow-[0_0_15px_rgba(255,186,8,0.4)]">
            Hex Territory
          </h1>
          <p className="text-sm text-[#faa307]/50 -mt-2 font-medium">Private lobby battles</p>

          {/* User badge */}
          <div className="flex items-center gap-3 px-5 py-2.5 w-full justify-center rounded-full bg-[#03071e]/60 border border-[#6a040f]/25">
            {user.photoURL && (
              <img className="w-7 h-7 rounded-full object-cover border-2 border-[#6a040f]/40" src={user.photoURL} alt="" referrerPolicy="no-referrer" />
            )}
            <span className="font-semibold text-slate-200 text-sm">{username}</span>
            <span className="w-3 h-3 rounded-full border-2 border-white/20 shrink-0" style={{ backgroundColor: color }} />
          </div>

          {/* Create Match button */}
          <button
            className="w-full py-3.5 rounded-lg font-bold tracking-wide text-white bg-gradient-to-r from-[#d00000] via-[#e85d04] to-[#f48c06] hover:scale-[1.02] hover:shadow-[0_0_24px_rgba(232,93,4,0.4)] active:scale-[0.97] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            onClick={handleCreate}
            disabled={busy}
          >
            Create Match
          </button>

          {/* Divider */}
          <div className="flex items-center w-full gap-4 my-0.5">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[#6a040f]/40 to-transparent" />
            <span className="text-[0.68rem] font-bold text-[#9d0208]/60 uppercase tracking-[0.15em]">or join a friend</span>
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[#6a040f]/40 to-transparent" />
          </div>

          {/* Join row */}
          <div className="flex gap-3 w-full">
            <input
              className="flex-1 min-w-0 px-4 py-3 rounded-lg bg-[#03071e]/80 border border-[#6a040f]/30 text-white font-bold text-center tracking-[0.3em] uppercase placeholder:text-[#6a040f]/60 placeholder:tracking-[0.2em] placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-[#f48c06]/40 focus:border-[#e85d04]/40 transition-all"
              placeholder="CODE"
              maxLength={5}
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && handleJoin()}
            />
            <button
              className="px-6 py-3 rounded-lg font-bold text-sm border border-[#6a040f]/30 text-slate-300 bg-[#370617]/40 hover:border-[#e85d04]/40 hover:text-white hover:shadow-[0_0_12px_rgba(232,93,4,0.2)] active:scale-[0.97] transition-all duration-200 disabled:opacity-50 cursor-pointer"
              onClick={handleJoin}
              disabled={busy}
            >
              Join
            </button>
          </div>

          {error && <p className="text-sm font-semibold text-[#d00000]">{error}</p>}

          <button
            className="text-sm text-[#6a040f] hover:text-[#faa307] transition-colors underline-offset-4 hover:underline mt-1 cursor-pointer bg-transparent border-none"
            onClick={logout}
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
