import { useEffect } from "react";
import { PLAYER_COLORS } from "../gameLogic";
import { startGame, setGameMode } from "../hooks/useMatch";

const MODES = [
  { key: "domination", label: "Domination", desc: "Capture every tile to win" },
  { key: "capital", label: "Capital", desc: "Destroy enemy capitals to win" },
  { key: "koth", label: "King of the Hill", desc: "Hold the center for 30s" },
  { key: "blitz", label: "Blitz", desc: "Most tiles in 2 minutes wins" },
];

export default function Lobby({ match, user, onNavigate }) {
  const isHost = user.uid === match?.hostId;
  const players = match?.players || {};
  const gameMode = match?.gameMode || "domination";

  useEffect(() => {
    if (match?.status === "playing") onNavigate("game", match.id);
  }, [match?.status]);

  if (!match) return null;

  return (
    <div className="screen screen--center">
      <div className="card">
        <h2 className="card-title">Waiting Room</h2>

        <div className="room-code-box" onClick={() => navigator.clipboard.writeText(match.id)} title="Click to copy">
          <span className="room-code-label">ROOM CODE</span>
          <span className="room-code">{match.id}</span>
          <span className="room-code-hint">tap to copy</span>
        </div>

        <div className="mode-picker">
          <span className="mode-picker-label">Game Mode</span>
          <div className="mode-options">
            {MODES.map((m) => (
              <button
                key={m.key}
                className={`mode-btn${gameMode === m.key ? " mode-btn--active" : ""}`}
                disabled={!isHost}
                onClick={() => isHost && setGameMode(match.id, m.key)}
              >
                <span className="mode-btn-name">{m.label}</span>
                <span className="mode-btn-desc">{m.desc}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="player-list">
          <h3 className="player-list-title">
            Players ({Object.keys(players).length})
          </h3>
          {Object.entries(players).map(([uid, p]) => (
            <div key={uid} className="player-list-row">
              {p.photoURL ? (
                <img className="avatar" src={p.photoURL} alt="" referrerPolicy="no-referrer" />
              ) : (
                <span className="lb-swatch" style={{ backgroundColor: PLAYER_COLORS[p.colorIndex] }} />
              )}
              <span className="player-list-name">{p.displayName}</span>
              <span className="color-dot" style={{ backgroundColor: PLAYER_COLORS[p.colorIndex] }} />
              {uid === match.hostId && <span className="host-tag">HOST</span>}
            </div>
          ))}
        </div>

        {isHost ? (
          <button className="primary-btn" onClick={() => startGame(match.id)}>
            Start Game
          </button>
        ) : (
          <p className="wait-text">Waiting for host to start...</p>
        )}

        <button className="sign-out-btn" onClick={() => onNavigate("home")}>
          Leave
        </button>
      </div>
    </div>
  );
}
