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
    <div className="screen screen--center">
      <div className="card">
        <span className="card-hex">⬡</span>
        <h1 className="card-title">Hex Territory</h1>
        <p className="card-sub">Private lobby battles</p>

        <div className="card-player">
          {user.photoURL && (
            <img className="avatar" src={user.photoURL} alt="" referrerPolicy="no-referrer" />
          )}
          <span>{username}</span>
          <span className="color-dot" style={{ backgroundColor: color }} />
        </div>

        <button className="primary-btn" onClick={handleCreate} disabled={busy}>
          Create Match
        </button>

        <div className="divider">or join a friend</div>

        <div className="join-row">
          <input
            className="code-input"
            placeholder="CODE"
            maxLength={5}
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === "Enter" && handleJoin()}
          />
          <button className="primary-btn primary-btn--sm" onClick={handleJoin} disabled={busy}>
            Join
          </button>
        </div>

        {error && <p className="card-error">{error}</p>}
        <button className="sign-out-btn" onClick={logout}>Sign Out</button>
      </div>
    </div>
  );
}
