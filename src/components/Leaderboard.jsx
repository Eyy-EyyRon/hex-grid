import { useMemo } from "react";
import { PLAYER_COLORS, parseTile } from "../gameLogic";
import "./Leaderboard.css";

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
    <div className="leaderboard">
      <h2 className="lb-title">Leaderboard</h2>

      {rankings.length === 0 ? (
        <p className="lb-empty">No territories claimed yet.</p>
      ) : (
        <div className="lb-list">
          {rankings.map((player, i) => {
            const color = PLAYER_COLORS[player.colorIndex ?? 0];
            const isYou = player.uid === currentUid;
            return (
              <div
                key={player.uid}
                className={`lb-row${isYou ? " lb-row--you" : ""}`}
              >
                <span className="lb-rank">#{i + 1}</span>
                {player.photoURL ? (
                  <img
                    className="lb-avatar"
                    src={player.photoURL}
                    alt=""
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span
                    className="lb-swatch"
                    style={{ backgroundColor: color }}
                  />
                )}
                <span className="lb-name">
                  {player.displayName || "Unknown"}
                  {isYou && <span className="lb-you-tag">YOU</span>}
                </span>
                <span className="lb-count">
                  {gameMode === "gold_rush" ? `${player.score || 0}★ · ${player.count}` : player.count}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {totalClaimed > 0 && (
        <p className="lb-total">{totalClaimed} / 61 hexes claimed</p>
      )}
    </div>
  );
}
