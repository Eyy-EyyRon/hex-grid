import { useEffect, useState } from "react";
import { PLAYER_COLORS } from "../gameLogic";
import { startGame, setGameMode } from "../hooks/useMatch";
import "./Lobby.css";

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
    if (!match) return;
    const started = match.status === "playing" && !!match.startTime;
    if (started) onNavigate("game", match.id);
  }, [match?.status, match?.startTime]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(match.id);
    } catch {
      // Fallback for browsers/contexts where clipboard access is restricted.
      const ta = document.createElement("textarea");
      ta.value = match.id;
      ta.setAttribute("readonly", "true");
      ta.style.position = "absolute";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }

    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  if (!match) return null;

  return (
    <div className="lobby-screen">
      <div className="lobby-card">

          <h2 className="lobby-title">Waiting Room</h2>

          <div className="code-section" aria-label="Room code section">
            <button type="button" onClick={handleCopy} className="code-button">
              <span className="code-label">Room Code</span>
              <div className="code-display">{match.id}</div>

              <div className="code-action" aria-live="polite">
                <svg
                  className="code-icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  aria-hidden="true"
                >
                  <path d="M9 9h10v10H9z" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
                <span>{copied ? "Copied!" : "Tap to copy"}</span>
              </div>
            </button>
          </div>

          <div className="mode-section" aria-label="Game mode selection">
            <span className="mode-label">Game Mode</span>
            <div className="mode-grid">
              {MODES.map((m) => {
                const active = gameMode === m.key;
                return (
                  <button
                    key={m.key}
                    type="button"
                    disabled={!isHost}
                    onClick={() => isHost && setGameMode(match.id, m.key)}
                    className={`mode-button${active ? " active" : ""}`}
                  >
                    <span className="mode-name">{m.label}</span>
                    <span className="mode-desc">{m.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="players-section" aria-label="Player list">
            <div className="players-header">
              <span className="players-label">Players</span>
              <span className="players-count">
                {playerCount}/{MAX_PLAYERS}
              </span>
            </div>

            <div className="players-list">
              {Object.entries(players).map(([uid, p]) => {
                const color = PLAYER_COLORS[p.colorIndex ?? 0];
                const isMe = uid === user.uid;
                const isMatchHost = uid === match.hostId;

                return (
                  <div key={uid} className="player-item">
                    {p.photoURL ? (
                      <img
                        className="player-avatar"
                        src={p.photoURL}
                        alt=""
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <span
                        className="player-avatar--placeholder"
                        style={{ backgroundColor: color }}
                      />
                    )}

                    <div className="player-info">
                      <span className="player-name">{p.displayName || "Unknown"}</span>
                      <span className="player-status">
                        {isMatchHost ? "Host" : isMe ? "You" : "Joined"}
                      </span>
                    </div>

                    <span
                      className="player-color"
                      style={{ backgroundColor: color, color }}
                      aria-hidden="true"
                    />

                    {isMatchHost && <span className="player-badge">HOST</span>}
                  </div>
                );
              })}

              {playerCount < MAX_PLAYERS && (
                <div className="player-waiting">
                  <span className="player-waiting-dot" />
                  <span className="player-waiting-text">Waiting for players...</span>
                </div>
              )}
            </div>
          </div>

          {isHost ? (
            <button
              type="button"
              className="start-button"
              onClick={() => startGame(match.id)}
            >
              Start Game
            </button>
          ) : (
            <div className="waiting-message">Waiting for host to start...</div>
          )}

          <button
            type="button"
            className="leave-button"
            onClick={() => onNavigate("home")}
          >
            Leave
          </button>
        </div>
      </div>
  );
}
