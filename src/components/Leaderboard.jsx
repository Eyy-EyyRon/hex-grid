import { useMemo } from "react";
import { PLAYER_COLORS, parseTile } from "../gameLogic";

export default function Leaderboard({ tiles, playerInfo, currentUid, gameMode }) {
  const rankings = useMemo(() => {
    if (!tiles) return [];

    const counts = {};
    Object.values(tiles).forEach((val) => {
      const { owner } = parseTile(val);
      if (owner) {
        counts[owner] = (counts[owner] || 0) + 1;
      }
    });

    const list = Object.entries(counts)
      .map(([uid, count]) => ({
        uid,
        count,
        ...(playerInfo[uid] || {}),
      }));
    if (gameMode === "gold_rush") {
      list.sort((a, b) => (b.score || 0) - (a.score || 0) || b.count - a.count);
    } else {
      list.sort((a, b) => b.count - a.count);
    }
    return list;
  }, [tiles, playerInfo, gameMode]);

  const totalClaimed = rankings.reduce((sum, p) => sum + p.count, 0);

  return (
    <div className="rounded-xl bg-[#03071e]/40 border border-[#6a040f]/20 p-4 w-full">
      <h2 className="text-[0.75rem] font-bold text-[#9d0208]/60 uppercase tracking-[0.12em] text-center mb-3">Leaderboard</h2>

      {rankings.length === 0 ? (
        <p className="text-center text-sm text-[#6a040f]/50">No territories claimed yet.</p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {rankings.map((player, i) => {
            const color = PLAYER_COLORS[player.colorIndex ?? 0];
            const isYou = player.uid === currentUid;
            return (
              <div
                key={player.uid}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors ${
                  isYou ? "bg-[#e85d04]/10 border border-[#e85d04]/20" : "bg-[#370617]/15 hover:bg-[#370617]/30"
                }`}
              >
                <span className="text-[0.75rem] font-bold text-[#6a040f] min-w-[24px]">#{i + 1}</span>
                {player.photoURL ? (
                  <img className="w-6 h-6 rounded-full object-cover shrink-0 border border-[#6a040f]/30" src={player.photoURL} alt="" referrerPolicy="no-referrer" />
                ) : (
                  <span className="w-6 h-6 rounded-full shrink-0 border-2 border-white/15" style={{ backgroundColor: color }} />
                )}
                <span className="flex-1 text-sm text-slate-300 truncate">
                  {player.displayName || "Unknown"}
                  {isYou && <span className="ml-1.5 text-[0.6rem] font-bold text-[#ffba08] bg-[#ffba08]/10 px-1.5 py-0.5 rounded align-middle">YOU</span>}
                </span>
                <span className="text-sm font-extrabold text-white min-w-[24px] text-right">
                  {gameMode === "gold_rush" ? `${player.score || 0}★ · ${player.count}` : player.count}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {totalClaimed > 0 && (
        <p className="mt-3 text-center text-[0.72rem] text-[#6a040f]/50">{totalClaimed} / 61 hexes claimed</p>
      )}
    </div>
  );
}
