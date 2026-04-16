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
    <div className="home-screen">
      <div className="orb orb--top-left" />
      <div className="orb orb--bottom-right" />

      <div className="home-card">
        <span className="home-logo">{"\u2B21"}</span>
        <h1 className="home-title">Hex Territory</h1>
        <p className="home-subtitle">Private lobby battles</p>

        <div className="home-badge">
          {user.photoURL && (
            <img src={user.photoURL} alt="User avatar" referrerPolicy="no-referrer" />
          )}
          <span className="home-badge-text">{username}</span>
          <span
            className="w-3 h-3 rounded-full border-2 border-white/20 shrink-0"
            style={{ backgroundColor: color }}
          />
        </div>

        <button
          className="home-button"
          onClick={handleCreate}
          disabled={busy}
        >
          Create Match
        </button>

        <div className="home-divider">
          <span className="home-divider-line" />
          <span className="home-divider-label">or join a friend</span>
          <span className="home-divider-line" />
        </div>

        <div className="home-form">
          <input
            className="home-input"
            placeholder="CODE"
            maxLength={5}
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === "Enter" && handleJoin()}
          />
          <button
            className="home-join-btn"
            onClick={handleJoin}
            disabled={busy}
          >
            Join
          </button>
        </div>

        {error && <p className="home-error">{error}</p>}

        <button className="home-link" onClick={logout}>
          Sign Out
        </button>
      </div>
    </div>
  );
}
