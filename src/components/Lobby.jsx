import { useEffect, useState } from "react";
import { PLAYER_COLORS } from "../gameLogic";
import { startGame, setGameMode } from "../hooks/useMatch";

const MODES = [
  { key: "domination", label: "Domination", desc: "Capture every tile to win" },
  { key: "capital", label: "Capital", desc: "Destroy enemy capitals to win" },
  { key: "koth", label: "King of the Hill", desc: "Hold the center for 30s" },
  { key: "blitz", label: "Blitz", desc: "Most tiles in 2 minutes wins" },
  { key: "gold_rush", label: "Gold Rush", desc: "Collect 5 gold tiles to win" },
  { key: "sabotage", label: "Sabotage", desc: "Plant mines to trap enemies" },
];

const MAX_PLAYERS = 8;

export default function Lobby({ match, user, onNavigate }) {
  const isHost = user.uid === match?.hostId;
  const players = match?.players || {};
  const gameMode = match?.gameMode || "domination";
  const playerCount = Object.keys(players).length;
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (match?.status === "playing") onNavigate("game", match.id);
  }, [match?.status]);

  const handleCopy = () => {
    navigator.clipboard.writeText(match.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (!match) return null;

  return (
    <div className="min-h-screen flex items-center justify-center p-5 relative overflow-hidden">
      {/* Ambient background orbs */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-indigo-500/[0.07] blur-[100px] animate-float" />
        <div className="absolute bottom-[-15%] right-[-5%] w-[400px] h-[400px] rounded-full bg-emerald-500/[0.06] blur-[100px] animate-float [animation-delay:-7s]" />
      </div>

      <div className="relative w-full max-w-[520px]">
        <div className="backdrop-blur-xl bg-white/[0.03] border border-white/[0.07] rounded-3xl p-9 shadow-[0_24px_80px_rgba(0,0,0,0.5)] flex flex-col items-center gap-6 animate-[modal-in_0.3s_ease-out]">

          <h2 className="text-2xl font-bold text-white tracking-tight">Waiting Room</h2>

          {/* Room code — massive glowing badge */}
          <button
            onClick={handleCopy}
            className="group cursor-pointer flex flex-col items-center gap-2 px-10 py-5 bg-indigo-500/[0.06] border-2 border-dashed border-indigo-400/25 rounded-2xl hover:bg-indigo-500/10 hover:border-indigo-400/40 transition-all w-full"
          >
            <span className="text-[0.6rem] font-extrabold tracking-[0.2em] uppercase text-slate-500">Room Code</span>
            <div className="flex items-center gap-3">
              <span className="text-4xl font-black tracking-[0.5em] font-mono text-indigo-400 drop-shadow-[0_0_16px_rgba(99,102,241,0.5)]">
                {match.id}
              </span>
              {/* Copy icon */}
              <svg className="w-5 h-5 text-slate-500 group-hover:text-indigo-400 transition-colors shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <rect x="9" y="9" width="13" height="13" rx="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
            </div>
            <span className="text-[0.65rem] text-slate-600 group-hover:text-slate-400 transition-colors">
              {copied ? "Copied!" : "click to copy"}
            </span>
          </button>

          {/* Mode picker */}
          <div className="w-full flex flex-col gap-2">
            <span className="text-[0.7rem] font-bold text-slate-500 uppercase tracking-[0.12em]">Game Mode</span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {MODES.map((m) => {
                const active = gameMode === m.key;
                return (
                  <button
                    key={m.key}
                    disabled={!isHost}
                    onClick={() => isHost && setGameMode(match.id, m.key)}
                    className={`flex flex-col items-center gap-1 px-3 py-3 rounded-xl border-2 transition-all duration-200 cursor-pointer disabled:cursor-default
                      ${active
                        ? "border-indigo-500 bg-indigo-500/[0.12] text-white shadow-[0_0_12px_rgba(99,102,241,0.15)]"
                        : "border-white/[0.06] bg-white/[0.02] text-slate-400 hover:border-indigo-500/30 hover:bg-indigo-500/[0.04]"
                      }`}
                  >
                    <span className="text-[0.8rem] font-bold leading-tight">{m.label}</span>
                    <span className="text-[0.6rem] opacity-60 leading-snug text-center">{m.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Player list */}
          <div className="w-full flex flex-col gap-2">
            <span className="text-[0.7rem] font-bold text-slate-500 uppercase tracking-[0.12em]">
              Players ({playerCount})
            </span>
            <div className="flex flex-col gap-2">
              {Object.entries(players).map(([uid, p]) => (
                <div
                  key={uid}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06] transition-colors"
                >
                  {p.photoURL ? (
                    <img className="w-7 h-7 rounded-full object-cover border-2 border-white/10" src={p.photoURL} alt="" referrerPolicy="no-referrer" />
                  ) : (
                    <span className="w-7 h-7 rounded-full shrink-0" style={{ backgroundColor: PLAYER_COLORS[p.colorIndex] }} />
                  )}
                  <span className="text-sm font-semibold text-slate-200 flex-1 truncate">{p.displayName}</span>
                  <span className="w-3 h-3 rounded-full border-2 border-white/20 shrink-0" style={{ backgroundColor: PLAYER_COLORS[p.colorIndex] }} />
                  {uid === match.hostId && (
                    <span className="text-[0.6rem] font-extrabold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded tracking-wider">HOST</span>
                  )}
                </div>
              ))}
              {/* Waiting slots */}
              {playerCount < MAX_PLAYERS && (
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-dashed border-white/[0.06] animate-pulse">
                  <span className="w-7 h-7 rounded-full bg-white/[0.04] shrink-0" />
                  <span className="text-sm text-slate-600 italic">Waiting for players...</span>
                </div>
              )}
            </div>
          </div>

          {/* Start / waiting */}
          {isHost ? (
            <button
              className="w-full py-5 rounded-2xl font-extrabold text-lg bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white animate-pulse-glow hover:-translate-y-0.5 hover:brightness-110 active:scale-[0.98] transition-all duration-200 cursor-pointer"
              onClick={() => startGame(match.id)}
            >
              Start Game
            </button>
          ) : (
            <p className="text-sm text-slate-500 animate-pulse py-2">Waiting for host to start...</p>
          )}

          <button
            className="text-xs font-semibold text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
            onClick={() => onNavigate("home")}
          >
            Leave
          </button>
        </div>
      </div>
    </div>
  );
}
