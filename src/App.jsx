import { useAuth } from "./hooks/useAuth";
import { useMap } from "./hooks/useMap";
import HexGrid from "./components/HexGrid";
import { PLAYER_COLORS, canClaimTile } from "./gameLogic";
import { db } from "./firebase";
import { doc, writeBatch, updateDoc, serverTimestamp } from "firebase/firestore";
import "./App.css";

function App() {
  const {
    user, userData, setUserData, loading: authLoading,
    loginGoogle,
  } = useAuth();
  const { tiles, setTiles, uidColorMap, loading: mapLoading } = useMap();

  const loading = authLoading || mapLoading;

  if (loading) {
    return (
      <div className="screen screen--center">
        <p className="loading-text">Loading...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="modal-backdrop">
        <div className="modal">
          <h1 className="modal-title">Hex Territory</h1>
          <p className="modal-subtitle">Capture the grid. Claim your territory.</p>

          <button className="google-btn" onClick={loginGoogle}>
            <svg className="google-icon" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Sign in with Google
          </button>

          <div className="how-to-play">
            <h2>How to Play</h2>
            <ol>
              <li><strong>Claim your first tile</strong> — click any empty hex to place your starting territory.</li>
              <li><strong>Expand outward</strong> — each new tile must be adjacent to one you already own.</li>
              <li><strong>Spend Action Points</strong> — every tile costs 1 AP. You start with 5.</li>
              <li><strong>Wait and recover</strong> — once out of AP, come back later to regenerate.</li>
              <li><strong>Dominate the map</strong> — the player controlling the most hexes wins!</li>
            </ol>
          </div>
        </div>
      </div>
    );
  }

  const ap = userData?.ap ?? 0;
  const color = PLAYER_COLORS[userData?.colorIndex ?? 0];

  const handleClaimTile = async (q, r) => {
    if (!tiles || !userData) return;
    if (!canClaimTile(q, r, tiles, user.uid, ap)) {
      console.log(`Cannot claim (${q},${r}): invalid move or 0 AP`);
      return;
    }

    const key = `${q},${r}`;

    // Optimistic UI update
    setTiles((prev) => ({ ...prev, [key]: user.uid }));
    setUserData((prev) => ({ ...prev, ap: prev.ap - 1 }));

    try {
      const batch = writeBatch(db);
      batch.update(doc(db, "users", user.uid), {
        ap: ap - 1,
      });
      batch.update(doc(db, "map_chunks", "chunk_0_0"), {
        [`tiles.${key}`]: user.uid,
      });
      await batch.commit();
    } catch (err) {
      console.error("Claim failed, rolling back:", err);
      // Rollback optimistic update
      setTiles((prev) => ({ ...prev, [key]: "empty" }));
      setUserData((prev) => ({ ...prev, ap: prev.ap + 1 }));
    }
  };

  const handlePassTime = async () => {
    setUserData((prev) => ({ ...prev, ap: 5 }));
    try {
      await updateDoc(doc(db, "users", user.uid), {
        ap: 5,
        lastLoginTime: serverTimestamp(),
      });
    } catch (err) {
      console.error("Pass time failed:", err);
      setUserData((prev) => ({ ...prev, ap: userData.ap }));
    }
  };

  return (
    <div className="screen">
      <h1 className="title">Hex Territory</h1>

      <div className="game-bar">
        <div className="user-info">
          <span className="color-swatch" style={{ backgroundColor: color }} />
          <span>
            <strong>{user.displayName || `Guest ${user.uid.slice(0, 6)}`}</strong>
          </span>
        </div>

        <div className="ap-display">
          {[...Array(5)].map((_, i) => (
            <span
              key={i}
              className={`ap-pip${i < ap ? " ap-pip--filled" : ""}`}
            />
          ))}
          <span className="ap-label">{ap} AP</span>
        </div>

        <button className="pass-time-btn" onClick={handlePassTime}>
          Pass Time (Dev)
        </button>
      </div>

      <HexGrid
        tiles={tiles}
        uidColorMap={uidColorMap}
        onHexClick={handleClaimTile}
        currentUid={user.uid}
      />
    </div>
  );
}

export default App;
