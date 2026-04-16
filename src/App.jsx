import { useState, useMemo, useEffect, useRef } from "react";
import { useAuth } from "./hooks/useAuth";
import {
  useMatch, claimTile, eliminatePlayer,
  finishMatch as finishMatchFn, playAgain, resetToLobby, kothCenterUpdate,
  goldScoreUpdate, spawnGold,
} from "./hooks/useMatch";
import { useApRegen } from "./hooks/useApRegen";
import HexGrid from "./components/HexGrid";
import Leaderboard from "./components/Leaderboard";
import Home from "./components/Home";
import Lobby from "./components/Lobby";
import { PLAYER_COLORS, MAX_AP, parseTile, getTileAction, getNeighborKeys, CENTER_HEX } from "./gameLogic";
import { playSound } from "./audio";

/* ─── Root ─── */

function App() {
  const {
    user, userData, setUserData, loading: authLoading,
    loginGoogle, logout, setUsername,
  } = useAuth();
  const [screen, setScreen] = useState("home");
  const [matchId, setMatchId] = useState(null);
  const { match, loading: matchLoading } = useMatch(matchId);

  const navigate = (scr, id) => {
    setScreen(scr);
    setMatchId(id || null);
  };

  if (authLoading) return <LoadingScreen text="Loading..." />;
  if (!user) return <LoginScreen loginGoogle={loginGoogle} />;

  if (userData && !userData.username) {
    return <UsernameModal defaultName={user.displayName || ""} onSave={setUsername} />;
  }

  const color = PLAYER_COLORS[userData?.colorIndex ?? 0];
  const username = userData?.username || user.displayName || "Player";

  if (screen === "home") {
    return <Home user={user} username={username} color={color} onNavigate={navigate} logout={logout} />;
  }

  if (matchLoading) return <LoadingScreen text="Connecting to match..." />;

  if (!match) {
    return <Home user={user} username={username} color={color} onNavigate={navigate} logout={logout} />;
  }

  if (screen === "lobby") {
    return <Lobby match={match} user={user} onNavigate={navigate} />;
  }

  // When host resets to lobby, redirect everyone still on the game screen
  if (match.status === "waiting" && screen === "game") {
    navigate("lobby", match.id);
    return <LoadingScreen text="Returning to lobby..." />;
  }

  return (
    <GameView
      user={user}
      userData={userData}
      setUserData={setUserData}
      match={match}
      onNavigate={navigate}
    />
  );
}

/* ─── Loading ─── */

function LoadingScreen({ text }) {
  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_center,#0d0a1a,#03071e_70%,#000)] flex flex-col items-center justify-center gap-4">
      <div className="w-10 h-10 border-[3px] border-[#6a040f]/40 border-t-[#ffba08] rounded-full animate-spin" />
      <p className="text-sm text-[#faa307]/50 font-medium">{text}</p>
    </div>
  );
}

/* ─── Login ─── */

function LoginScreen({ loginGoogle }) {
  return (
    <div className="screen screen--center">
      <div className="orb orb--top-left" />
      <div className="orb orb--bottom-right" />

      <div className="login-card">
        <span className="login-hex">{"\u2B21"}</span>
        <h1 className="login-title">Hex Territory</h1>
        <p className="login-sub">Capture the grid. Claim your territory.</p>

        <div className="google-btn-wrap">
          <button className="google-btn" onClick={loginGoogle}>
            <svg className="w-6 h-6" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Sign in with Google
          </button>
        </div>

        <div className="how-card">
          <h2 className="how-card__label">How to Play</h2>
          <div>
            {[
              { num: "1", title: "Claim your first tile", desc: "click any empty hex" },
              { num: "2", title: "Expand outward", desc: "each new tile must touch yours" },
              { num: "3", title: "Spend Action Points", desc: "1 AP per tile, 5 max" },
              { num: "4", title: "Eliminate rivals", desc: "take all their hexes!" },
              { num: "5", title: "Last one standing wins!", desc: "" },
            ].map((step) => (
              <div key={step.num} className="how-step">
                <span className="how-step__num">{step.num}</span>
                <p className="how-step__text">
                  <strong>{step.title}</strong>
                  {step.desc && <em> — {step.desc}</em>}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Username ─── */

function UsernameModal({ defaultName, onSave }) {
  const [name, setName] = useState(defaultName.slice(0, 12));
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed || trimmed.length > 12) return;
    setSaving(true);
    await onSave(trimmed);
  };

  return (
    <div className="screen screen--center">
      <div className="orb orb--top-left" />
      <div className="orb orb--bottom-right" />

      <div className="username-card">
        <span className="login-hex">{"\u2B21"}</span>
        <h1 className="login-title">Choose Username</h1>
        <p className="login-sub">Pick a name for the battlefield (max 12 chars)</p>

        <input
          className="input-field"
          placeholder="Username"
          maxLength={12}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSave()}
          autoFocus
        />
        <button
          className="btn btn--primary"
          onClick={handleSave}
          disabled={saving || !name.trim()}
        >
          {saving ? "Saving..." : "Continue"}
        </button>
      </div>
    </div>
  );
}

/* ─── Helpers ─── */

function formatCountdown(s) {
  if (s == null) return null;
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
}

/* ─── Tile Hint ─── */

function getHintForTile(q, r, tiles, uid, ap) {
  const key = `${q},${r}`;
  const raw = tiles[key];
  if (raw === undefined) return null;

  const parsed = parseTile(raw);
  const { owner, fortified } = parsed;
  const ownsAny = Object.values(tiles).some((v) => parseTile(v).owner === uid);

  if (!owner) {
    if (!ownsAny) {
      return ap >= 1
        ? { text: "Claim starting tile \u2014 1 AP", type: "action" }
        : { text: "Need 1 AP to claim", type: "warn" };
    }
    const adj = getNeighborKeys(q, r).some((nk) => parseTile(tiles[nk] || "").owner === uid);
    if (!adj) return { text: "Must be adjacent to your territory", type: "warn" };
    return ap >= 1
      ? { text: "Claim empty tile \u2014 1 AP", type: "action" }
      : { text: "Need 1 AP to claim", type: "warn" };
  }

  if (parsed.gold) {
    if (!ownsAny) {
      return ap >= 1
        ? { text: "Grab gold \u2014 1 AP (+1 score)", type: "action" }
        : { text: "Need 1 AP", type: "warn" };
    }
    const adj = getNeighborKeys(q, r).some((nk) => parseTile(tiles[nk] || "").owner === uid);
    if (!adj) return { text: "Must be adjacent to grab gold", type: "warn" };
    return ap >= 1
      ? { text: "Grab gold \u2014 1 AP (+1 score)", type: "action" }
      : { text: "Need 1 AP", type: "warn" };
  }

  if (owner === uid) {
    if (fortified) return { text: "Your tile (fortified)", type: "info" };
    return ap >= 3
      ? { text: "Fortify your tile \u2014 3 AP", type: "action" }
      : { text: "Fortify \u2014 need 3 AP", type: "warn" };
  }

  const adj = getNeighborKeys(q, r).some((nk) => parseTile(tiles[nk] || "").owner === uid);
  if (!adj) return { text: "Must be adjacent to attack", type: "warn" };

  if (fortified) {
    return ap >= 5
      ? { text: "Attack fortified tile \u2014 5 AP", type: "action" }
      : { text: "Attack fortified \u2014 need 5 AP", type: "warn" };
  }

  return ap >= 3
    ? { text: "Attack enemy tile \u2014 3 AP", type: "action" }
    : { text: "Attack \u2014 need 3 AP", type: "warn" };
}

/* ─── Game View ─── */

function GameView({ user, userData, setUserData, match, onNavigate }) {
  const ap = userData?.ap ?? 0;
  const countdown = useApRegen(user, userData, setUserData);
  const countdownStr = formatCountdown(countdown);

  const players = match.players || {};
  const tiles = match.tiles || {};
  const myPlayer = players[user.uid];
  const color = PLAYER_COLORS[myPlayer?.colorIndex ?? 0];
  const isHost = user.uid === match.hostId;

  /* ── Spectator / elimination ── */
  const [hadTiles, setHadTiles] = useState(false);
  const [showEliminatedOverlay, setShowEliminatedOverlay] = useState(false);
  const myTileCount = useMemo(
    () => Object.values(tiles).filter((v) => parseTile(v).owner === user.uid).length,
    [tiles, user.uid],
  );

  useEffect(() => { if (myTileCount > 0) setHadTiles(true); }, [myTileCount]);
  useEffect(() => { if (match.status === "playing") { setHadTiles(false); setShowEliminatedOverlay(false); } }, [match.status]);

  const isSpectator = myPlayer && !myPlayer.isAlive;

  /* ── Fog of war visibility ── */
  const visibleSet = useMemo(() => {
    if (isSpectator || match.status === "finished") return null;
    const hasOwn = Object.values(tiles).some((v) => parseTile(v).owner === user.uid);
    if (!hasOwn) return null;
    const visible = new Set();
    Object.entries(tiles).forEach(([key, val]) => {
      if (parseTile(val).owner === user.uid) {
        visible.add(key);
        const [q, r] = key.split(",").map(Number);
        getNeighborKeys(q, r).forEach((nk) => visible.add(nk));
      }
    });
    if (match.gameMode === "koth") visible.add(CENTER_HEX);
    return visible;
  }, [tiles, user.uid, isSpectator, match.status, match.gameMode]);

  useEffect(() => {
    if (match.status !== "playing" || !myPlayer?.isAlive) return;
    if (hadTiles && myTileCount === 0) {
      eliminatePlayer(match.id, user.uid);
      setShowEliminatedOverlay(true);
      setTimeout(() => setShowEliminatedOverlay(false), 3500);
    }
  }, [hadTiles, myTileCount, match.status, myPlayer?.isAlive]);

  /* ── Win condition (domination / capital) ── */
  const matchPlayersRef = useRef(new Set());
  const finishCalledRef = useRef(false);

  useEffect(() => {
    matchPlayersRef.current = new Set();
    finishCalledRef.current = false;
  }, [match.status]);

  useEffect(() => {
    if (match.status !== "playing") return;
    if (match.gameMode === "koth" || match.gameMode === "blitz" || match.gameMode === "gold_rush") return;
    const owners = new Set();
    Object.values(tiles).forEach((v) => {
      const { owner } = parseTile(v);
      if (owner) { owners.add(owner); matchPlayersRef.current.add(owner); }
    });
    if (
      owners.size === 1 &&
      matchPlayersRef.current.size >= 2 &&
      !finishCalledRef.current
    ) {
      finishCalledRef.current = true;
      finishMatchFn(match.id, [...owners][0]);
    }
  }, [tiles, match.status, match.gameMode]);

  /* ── Gold Rush host spawn ── */
  const tilesRef = useRef(tiles);
  useEffect(() => { tilesRef.current = tiles; }, [tiles]);

  useEffect(() => {
    if (match.gameMode !== "gold_rush" || !isHost || match.status !== "playing") return;
    const id = setInterval(() => {
      const empties = Object.entries(tilesRef.current).filter(([, v]) => v === "empty");
      if (empties.length === 0) return;
      const [key] = empties[Math.floor(Math.random() * empties.length)];
      spawnGold(match.id, key);
    }, 8000);
    return () => clearInterval(id);
  }, [match.gameMode, isHost, match.status, match.id]);

  /* ── Gold Rush win condition ── */
  useEffect(() => {
    if (match.gameMode !== "gold_rush" || match.status !== "playing") return;
    const myScore = players[user.uid]?.score || 0;
    if (myScore >= 5 && !finishCalledRef.current) {
      finishCalledRef.current = true;
      finishMatchFn(match.id, user.uid);
    }
  }, [players, match.gameMode, match.status, user.uid, match.id]);

  /* ── KOTH countdown ── */
  const [kothElapsed, setKothElapsed] = useState(0);
  const kothFinishRef = useRef(false);

  useEffect(() => { kothFinishRef.current = false; }, [match.status]);

  // Extract ms value to avoid restarting interval on every Firestore snapshot
  const kothClaimMs = useMemo(() => {
    const ct = match.kothClaimTime;
    if (!ct) return null;
    return ct.toDate ? ct.toDate().getTime() : ct.seconds ? ct.seconds * 1000 : null;
  }, [match.kothOwner, match.kothClaimTime]);

  useEffect(() => {
    if (match.gameMode !== "koth" || !match.kothOwner || match.status !== "playing") {
      setKothElapsed(0);
      return;
    }
    if (!kothClaimMs) { setKothElapsed(0); return; }

    const tick = () => setKothElapsed(Math.min(Math.max((Date.now() - kothClaimMs) / 1000, 0), 30));
    tick();
    const id = setInterval(tick, 100);
    return () => clearInterval(id);
  }, [match.kothOwner, kothClaimMs, match.status, match.gameMode]);

  useEffect(() => {
    if (match.gameMode !== "koth" || match.status !== "playing") return;
    if (kothElapsed >= 30 && match.kothOwner === user.uid && !kothFinishRef.current) {
      kothFinishRef.current = true;
      finishMatchFn(match.id, match.kothOwner);
    }
  }, [kothElapsed, match.kothOwner, user.uid, match.status, match.gameMode]);

  const kothOwnerInfo = match.kothOwner ? players[match.kothOwner] : null;
  const kothOwnerColor = kothOwnerInfo ? PLAYER_COLORS[kothOwnerInfo.colorIndex ?? 0] : "#f1c40f";
  const kothOwnerName = kothOwnerInfo?.displayName || "Unknown";

  const prevKothOwnerRef = useRef(match.kothOwner);
  useEffect(() => {
    if (match.gameMode !== "koth" || match.status !== "playing") return;
    if (match.kothOwner && match.kothOwner !== prevKothOwnerRef.current) {
      playSound("alarm.wav", 0.4);
    }
    prevKothOwnerRef.current = match.kothOwner;
  }, [match.kothOwner, match.gameMode, match.status]);

  /* ── Blitz countdown ── */
  const BLITZ_DURATION = 120;
  const [blitzRemaining, setBlitzRemaining] = useState(BLITZ_DURATION);
  const blitzFinishRef = useRef(false);

  useEffect(() => { blitzFinishRef.current = false; }, [match.status]);

  // Extract ms value to avoid restarting interval on every Firestore snapshot
  const blitzStartMs = useMemo(() => {
    const st = match.startTime;
    if (!st) return null;
    return st.toDate ? st.toDate().getTime() : st.seconds ? st.seconds * 1000 : null;
  }, [match.startTime]);

  useEffect(() => {
    if (match.gameMode !== "blitz" || match.status !== "playing") {
      setBlitzRemaining(BLITZ_DURATION);
      return;
    }
    if (!blitzStartMs) return;

    const tick = () => setBlitzRemaining(Math.max(BLITZ_DURATION - (Date.now() - blitzStartMs) / 1000, 0));
    tick();
    const id = setInterval(tick, 100);
    return () => clearInterval(id);
  }, [blitzStartMs, match.status, match.gameMode]);

  const blitzFrozen = match.gameMode === "blitz" && blitzRemaining <= 0 && match.status === "playing";

  const blitzAlarmRef = useRef(0);
  useEffect(() => {
    if (match.gameMode !== "blitz" || match.status !== "playing") return;
    if (blitzRemaining <= 10 && blitzRemaining > 0) {
      const sec = Math.ceil(blitzRemaining);
      if (sec !== blitzAlarmRef.current) {
        blitzAlarmRef.current = sec;
        playSound("alarm.wav", 0.3);
      }
    }
  }, [blitzRemaining, match.gameMode, match.status]);

  useEffect(() => {
    if (!blitzFrozen || !isHost || blitzFinishRef.current) return;
    blitzFinishRef.current = true;
    const counts = {};
    Object.values(tiles).forEach((v) => {
      const { owner } = parseTile(v);
      if (owner) counts[owner] = (counts[owner] || 0) + 1;
    });
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    if (sorted.length === 0) return;
    const maxCount = sorted[0][1];
    const tied = sorted.filter(([, c]) => c === maxCount);
    const winner = tied[Math.floor(Math.random() * tied.length)][0];
    finishMatchFn(match.id, winner);
  }, [blitzFrozen, isHost, tiles]);

  /* ── Status message ── */
  const statusMessage = useMemo(() => {
    if (isSpectator || match.status !== "playing") return "";
    const ownsAny = Object.values(tiles).some((v) => parseTile(v).owner === user.uid);
    if (!ownsAny) return "Click any hex to claim your starting territory!";
    if (ap === 0) return "Out of AP! Next AP regenerates soon.";
    if (ap < MAX_AP) return "Click an adjacent hex to expand.";
    return "Full AP! Expand your territory.";
  }, [tiles, user.uid, ap, isSpectator, match.status]);

  /* ── Hover hint ── */
  const [hoveredHex, setHoveredHex] = useState(null);
  const [guideOpen, setGuideOpen] = useState(false);

  const hoveredKey =
    hoveredHex && !isSpectator && match.status === "playing"
      ? `${hoveredHex.q},${hoveredHex.r}`
      : null;

  const hint = useMemo(() => {
    if (!hoveredHex || isSpectator || match.status !== "playing") return null;
    return getHintForTile(hoveredHex.q, hoveredHex.r, tiles, user.uid, ap);
  }, [hoveredHex, tiles, user.uid, ap, isSpectator, match.status]);

  /* ── Claim handler ── */
  const [apShake, setApShake] = useState(false);

  const handleClaimTile = async (q, r) => {
    if (isSpectator || match.status !== "playing" || blitzFrozen) return;
    const action = getTileAction(q, r, tiles, user.uid, ap);
    if (!action) {
      setApShake(true);
      setTimeout(() => setApShake(false), 400);
      playSound("error.wav", 0.25);
      return;
    }
    const key = `${q},${r}`;
    let extra = (match.gameMode === "koth" && key === CENTER_HEX && action.type !== "fortify")
      ? kothCenterUpdate(user.uid) : null;
    if (action.type === "claim_gold") {
      const ge = goldScoreUpdate(user.uid);
      extra = extra ? { ...extra, ...ge } : ge;
    }
    setUserData((prev) => ({ ...prev, ap: prev.ap - action.cost }));
    playSound("capture.wav", 0.2);
    try {
      await claimTile(match.id, key, user.uid, ap, action.newValue, action.cost, extra);
    } catch (err) {
      console.error("Claim failed:", err);
      setUserData((prev) => ({ ...prev, ap: prev.ap + action.cost }));
    }
  };

  /* ── Winner info ── */
  const winnerInfo = match.winnerId ? players[match.winnerId] : null;
  const winnerColor = winnerInfo ? PLAYER_COLORS[winnerInfo.colorIndex ?? 0] : "#fff";
  const winnerName = winnerInfo?.displayName || "Unknown";
  const isWinner = match.winnerId === user.uid;

  /* ── Render ── */
  return (
    <div className="flex flex-col min-h-screen bg-[radial-gradient(ellipse_at_top,#0d0a1a,#03071e_60%,#000)]">
      {isSpectator && match.status === "playing" && (
        <div className="text-center py-2.5 px-4 text-sm font-extrabold tracking-wider text-white uppercase bg-gradient-to-r from-[#9d0208] to-[#d00000] shadow-[0_2px_12px_rgba(157,2,8,0.3)]">
          YOU WERE ELIMINATED &mdash; SPECTATING
        </div>
      )}

      {/* ── Header ── */}
      <header className="flex items-center justify-between px-5 py-2.5 bg-[#370617]/20 border-b border-[#6a040f]/20 backdrop-blur-sm flex-wrap gap-2.5">
        <div className="flex items-center gap-2">
          <span className="text-xl text-[#ffba08] leading-none drop-shadow-[0_0_8px_rgba(255,186,8,0.4)]">{"\u2B21"}</span>
          <h1 className="text-base font-bold text-white/90 tracking-tight hidden sm:block">Hex Territory</h1>
          <span className="text-[0.7rem] font-extrabold tracking-[0.15em] text-[#faa307] bg-[#faa307]/10 px-2 py-0.5 rounded font-mono">{match.id}</span>
        </div>

        <div className="flex items-center">
          {!isSpectator ? (
            <div className={`flex items-center gap-1.5${apShake ? " animate-[shake_0.4s_ease-out]" : ""}`}>
              {[...Array(5)].map((_, i) => (
                <span
                  key={i}
                  className={`inline-block w-3.5 h-3.5 rounded-full border-2 transition-all duration-250 ${
                    i < ap
                      ? `bg-[#faa307] border-[#ffba08] shadow-[0_0_6px_rgba(250,163,7,0.5)]${ap >= MAX_AP ? " animate-[ap-pulse_2s_ease-in-out_infinite]" : ""}`
                      : "bg-white/[0.06] border-[#6a040f]/40"
                  }`}
                />
              ))}
              <span className="font-bold text-sm ml-1.5 text-[#ffba08]">{ap} AP</span>
              {countdownStr && (
                <span className="text-[0.75rem] font-semibold text-[#f48c06] ml-2 bg-[#e85d04]/10 px-2 py-0.5 rounded tabular-nums">+1 in {countdownStr}</span>
              )}
            </div>
          ) : (
            <span className="text-sm font-bold text-[#d00000] uppercase tracking-wider">Spectating</span>
          )}
        </div>

        <div className="flex items-center gap-2.5">
          {user.photoURL && (
            <img className="w-7 h-7 rounded-full object-cover border-2 border-[#6a040f]/40" src={user.photoURL} alt="" referrerPolicy="no-referrer" />
          )}
          <span className="text-sm text-slate-300 max-w-[120px] truncate hidden sm:block">{user.displayName || "Player"}</span>
          <span className="w-3 h-3 rounded-full border-2 border-white/20 shrink-0" style={{ backgroundColor: color }} />
          <button
            className="px-3 py-1.5 text-[0.75rem] font-semibold rounded-md border border-[#6a040f]/30 bg-[#370617]/30 text-slate-400 hover:bg-[#6a040f]/20 hover:text-white transition-all cursor-pointer"
            onClick={() => onNavigate("home")}
          >Leave</button>
        </div>
      </header>

      {/* ── Mode-specific bars ── */}
      {match.gameMode === "gold_rush" && match.status === "playing" && !isSpectator && (
        <div className="flex items-center justify-center h-9 bg-[#ffba08]/[0.06] border-b border-[#f48c06]/15">
          <span className="text-sm font-extrabold text-[#ffba08] tracking-wide">
            {"\u2B50"} Gold: {players[user.uid]?.score || 0} / 5
          </span>
        </div>
      )}

      {match.gameMode === "blitz" && match.status === "playing" && (
        <div className={`flex items-center justify-center gap-3 h-11 border-b transition-colors ${
          blitzRemaining <= 10
            ? "bg-[#d00000]/10 border-[#d00000]/20 animate-[blitz-flash_0.5s_ease-in-out_infinite]"
            : "bg-[#e85d04]/[0.06] border-[#e85d04]/15"
        }`}>
          <span className={`text-2xl font-black tabular-nums tracking-wider ${blitzRemaining <= 10 ? "text-[#d00000]" : "text-[#f48c06]"}`}>
            {formatCountdown(Math.ceil(blitzRemaining))}
          </span>
          <span className={`text-[0.7rem] font-extrabold tracking-[0.15em] uppercase ${blitzRemaining <= 10 ? "text-[#9d0208]" : "text-[#e85d04]"}`}>BLITZ</span>
        </div>
      )}

      {match.gameMode === "koth" && match.kothOwner && match.status === "playing" && (
        <div className="relative w-full h-10 bg-[#ffba08]/[0.06] border-b border-[#f48c06]/15 overflow-hidden">
          <div
            className="absolute top-0 left-0 bottom-0 transition-[width] duration-150 ease-linear opacity-35"
            style={{ width: `${(kothElapsed / 30) * 100}%`, backgroundColor: kothOwnerColor }}
          />
          <span className="relative flex items-center justify-center h-full text-sm font-bold text-[#ffba08] z-[1] drop-shadow-[0_1px_4px_rgba(0,0,0,0.6)]">
            {match.kothOwner === user.uid ? "You hold" : `${kothOwnerName} holds`} the Hill
            &nbsp;&mdash;&nbsp;{Math.ceil(30 - kothElapsed)}s
          </span>
        </div>
      )}

      {/* ── Status hint ── */}
      {!isSpectator && (hint || statusMessage) && (
        <p className={`text-center py-2 px-4 text-sm font-medium border-b border-[#6a040f]/10 ${
          hint
            ? hint.type === "action" ? "text-[#faa307] bg-[#e85d04]/[0.06]"
              : hint.type === "warn" ? "text-[#dc2f02] bg-[#d00000]/[0.06]"
              : "text-slate-500 bg-[#370617]/10"
            : ap === 0 ? "text-[#dc2f02] bg-[#d00000]/[0.06]" : "text-slate-500 bg-[#370617]/10"
        }`}>
          {hint ? hint.text : statusMessage}
        </p>
      )}

      {/* ── Main content ── */}
      <main className="flex flex-1 max-md:flex-col">
        <div className="flex-1 flex items-start justify-center p-6 min-w-0 max-md:p-4 max-sm:p-1.5">
          <HexGrid
            tiles={tiles}
            playerInfo={players}
            onHexClick={handleClaimTile}
            currentUid={user.uid}
            visibleSet={visibleSet}
            onHexHover={setHoveredHex}
            gameMode={match.gameMode}
            hoveredKey={hoveredKey}
          />
        </div>

        <aside className="w-[280px] shrink-0 p-5 border-l border-[#6a040f]/15 bg-[#370617]/10 flex flex-col gap-4 max-md:w-full max-md:border-l-0 max-md:border-t max-md:border-[#6a040f]/15 max-md:max-w-[400px] max-md:self-center max-sm:p-3">
          <Leaderboard tiles={tiles} playerInfo={players} currentUid={user.uid} gameMode={match.gameMode} />

          {/* Game Guide */}
          <div className="rounded-xl bg-[#03071e]/40 border border-[#6a040f]/20 overflow-hidden">
            <button
              className="w-full px-4 py-3 flex items-center justify-between bg-transparent border-none text-slate-300 text-[0.8rem] font-bold uppercase tracking-wider cursor-pointer hover:bg-[#6a040f]/10 transition-colors"
              onClick={() => setGuideOpen((p) => !p)}
            >
              <span>Game Guide</span>
              <span className="text-[#6a040f]">{guideOpen ? "\u25BE" : "\u25B8"}</span>
            </button>
            {guideOpen && (
              <div className="px-4 pb-3 flex flex-col gap-2">
                {[
                  { bg: '#1a1028', label: 'Empty tile', cost: '1 AP' },
                  { bg: color, label: 'Your tile — tap to fortify', cost: '3 AP' },
                  { bg: color, label: 'Fortified (extra defense)', cost: '—', fort: true },
                  { bg: '#9d0208', label: 'Enemy tile — attack', cost: '3 AP' },
                  { bg: '#9d0208', label: 'Enemy fortified — break', cost: '5 AP', fort: true },
                  { bg: '#03071e', label: 'Fog of war (hidden)', cost: '—' },
                ].map((row, i) => (
                  <div key={i} className="flex items-center gap-2.5 text-[0.82rem] text-slate-400">
                    <span
                      className={`w-[18px] h-[18px] rounded shrink-0 border-[1.5px] border-[#6a040f]/40${row.fort ? " relative" : ""}`}
                      style={{ background: row.bg }}
                    >
                      {row.fort && <span className="absolute inset-[3px] border-[1.5px] border-white/50 rounded-sm" />}
                    </span>
                    <span className="flex-1">{row.label}</span>
                    <span className="text-[#faa307] text-[0.75rem] font-bold ml-auto whitespace-nowrap">{row.cost}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>
      </main>

      {/* ── Eliminated Overlay ── */}
      {showEliminatedOverlay && (
        <div className="fixed inset-0 flex items-center justify-center bg-[#03071e]/80 backdrop-blur-sm z-[300] animate-[modal-in_0.3s_ease-out]">
          <div className="relative flex flex-col items-center gap-4 px-12 py-10 rounded-2xl bg-[#6a040f]/60 border-2 border-[#d00000]/60 backdrop-blur-md shadow-[0_0_60px_rgba(208,0,0,0.4)]">
            <div className="text-6xl animate-[ap-pulse_0.8s_ease-in-out_infinite]">☠️</div>
            <h2 className="text-4xl font-black tracking-widest text-[#ff4444] drop-shadow-[0_0_20px_rgba(255,68,68,0.6)]">YOU LOSE</h2>
            <p className="text-slate-300 text-sm font-medium">All your tiles were captured — you are now spectating</p>
          </div>
        </div>
      )}

      {/* ── Game Over Overlay ── */}
      {match.status === "finished" && (
        <div className="fixed inset-0 flex items-center justify-center bg-[#03071e]/90 backdrop-blur-md z-[200] animate-[modal-in_0.35s_ease-out]">
          <div className="relative w-full max-w-sm mx-4">
            <div className="absolute -inset-6 bg-gradient-to-br from-[#d00000]/10 to-[#e85d04]/10 rounded-3xl blur-2xl pointer-events-none" />
            <div className="relative flex flex-col items-center gap-6 p-10 rounded-2xl bg-[#370617]/40 border border-[#6a040f]/30 backdrop-blur-md shadow-[0_24px_80px_rgba(0,0,0,0.6)]">
              <h1 className="text-4xl font-black tracking-wider bg-gradient-to-r from-[#f48c06] to-[#ffba08] bg-clip-text text-transparent drop-shadow-[0_0_20px_rgba(255,186,8,0.3)]">GAME OVER</h1>
              <div className="flex items-center gap-4">
                <span
                  className="w-9 h-9 rounded-full border-[3px] border-white/20 shadow-[0_0_12px_var(--glow)]"
                  style={{ backgroundColor: winnerColor, '--glow': winnerColor + '66' }}
                />
                <span className="text-xl font-bold text-slate-200">{isWinner ? "🏆 YOU WON!" : `${winnerName} wins!`}</span>
              </div>
              {!isWinner && (
                <p className="text-sm text-[#d00000] font-semibold">You lost this round — better luck next time!</p>
              )}
              {isHost && (
                <>
                  <button
                    className="w-full py-3 rounded-lg font-bold tracking-wide text-white bg-gradient-to-r from-[#d00000] via-[#e85d04] to-[#f48c06] hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(232,93,4,0.4)] active:scale-[0.97] transition-all duration-200 cursor-pointer"
                    onClick={() => playAgain(match.id, players)}
                  >
                    ▶ Play Again
                  </button>
                  <button
                    className="w-full py-2.5 rounded-lg font-bold tracking-wide text-white bg-gradient-to-r from-[#370617] via-[#6a040f] to-[#370617] border border-[#6a040f]/50 hover:scale-[1.02] hover:border-[#faa307]/40 hover:shadow-[0_0_16px_rgba(250,163,7,0.25)] active:scale-[0.97] transition-all duration-200 cursor-pointer"
                    onClick={() => { resetToLobby(match.id, players); onNavigate("lobby", match.id); }}
                  >
                    🔁 Back to Lobby
                  </button>
                </>
              )}
              <button
                className="text-sm text-[#6a040f] hover:text-[#faa307] transition-colors underline-offset-4 hover:underline cursor-pointer bg-transparent border-none"
                onClick={() => onNavigate("home")}
              >Leave</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
