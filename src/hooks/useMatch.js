import { useState, useEffect } from "react";
import { doc, getDoc, setDoc, updateDoc, onSnapshot, writeBatch, serverTimestamp, increment } from "firebase/firestore";
import { db } from "../firebase";
import { generateGrid, PLAYER_COLORS } from "../gameLogic";

const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function generateMatchId() {
  let id = "";
  for (let i = 0; i < 5; i++) id += CHARS[Math.floor(Math.random() * CHARS.length)];
  return id;
}

export function useMatch(matchId) {
  const [match, setMatch] = useState(null);
  const [loading, setLoading] = useState(!!matchId);

  useEffect(() => {
    if (!matchId) {
      setMatch(null);
      setLoading(false);
      return;
    }

    // Clear previous match immediately so UI can't briefly render with stale status.
    setMatch(null);
    setLoading(true);
    const unsub = onSnapshot(doc(db, "matches", matchId), (snap) => {
      setMatch(snap.exists() ? { id: snap.id, ...snap.data({ serverTimestamps: 'estimate' }) } : null);
      setLoading(false);
    });
    return unsub;
  }, [matchId]);

  return { match, loading };
}

export async function createMatch(user, username) {
  const matchId = generateMatchId();
  await setDoc(doc(db, "matches", matchId), {
    status: "waiting",
    hostId: user.uid,
    gameMode: "domination",
    players: {
      [user.uid]: {
        colorIndex: 0,
        isAlive: true,
        displayName: username || user.displayName || "Unknown",
        photoURL: user.photoURL || "",
        score: 0,
      },
    },
    tiles: {},
    winnerId: null,
    startTime: null,
    kothOwner: null,
    kothClaimTime: null,
  });
  return matchId;
}

export async function joinMatch(matchId, user, username) {
  const ref = doc(db, "matches", matchId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("Match not found");
  const data = snap.data();

  // Back-compat / defensive: some older/partial matches may not have `status` populated.
  // Treat those as joinable as long as the game clearly hasn't started yet.
  const status = data.status;
  const tiles = data.tiles || {};
  const hasAnyTiles = Object.keys(tiles).length > 0;
  const hasStartTime = !!data.startTime;

  const joinable =
    status === "waiting" ||
    (status == null && !hasStartTime && !hasAnyTiles); // "waiting-like" match

  if (!joinable) throw new Error("Match already started");
  // If user is already in the player list (e.g. re-joining after a lobby reset), just let them in.
  if (data.players[user.uid]) return;

  const used = new Set(Object.values(data.players).map((p) => p.colorIndex));
  let colorIndex = 0;
  for (let i = 0; i < PLAYER_COLORS.length; i++) {
    if (!used.has(i)) { colorIndex = i; break; }
  }

  await updateDoc(ref, {
    [`players.${user.uid}`]: {
      colorIndex,
      isAlive: true,
      displayName: username || user.displayName || "Unknown",
      photoURL: user.photoURL || "",
      score: 0,
    },
  });
}

export async function startGame(matchId) {
  const tiles = {};
  generateGrid().forEach(({ q, r }) => { tiles[`${q},${r}`] = "empty"; });
  await updateDoc(doc(db, "matches", matchId), {
    status: "playing",
    tiles,
    startTime: serverTimestamp(),
    kothOwner: null,
    kothClaimTime: null,
  });
}

export async function claimTile(matchId, key, uid, currentAp, newValue, cost, extraMatchUpdates = null) {
  const batch = writeBatch(db);
  const matchUpd = { [`tiles.${key}`]: newValue };
  if (extraMatchUpdates) Object.assign(matchUpd, extraMatchUpdates);
  batch.update(doc(db, "matches", matchId), matchUpd);
  batch.update(doc(db, "users", uid), { ap: currentAp - cost });
  await batch.commit();
}

export function kothCenterUpdate(uid) {
  return { kothOwner: uid, kothClaimTime: serverTimestamp() };
}

export function goldScoreUpdate(uid) {
  return { [`players.${uid}.score`]: increment(1) };
}

export async function spawnGold(matchId, key) {
  await updateDoc(doc(db, "matches", matchId), { [`tiles.${key}`]: "gold" });
}

export async function setGameMode(matchId, mode) {
  await updateDoc(doc(db, "matches", matchId), { gameMode: mode });
}

export async function eliminatePlayer(matchId, uid) {
  await updateDoc(doc(db, "matches", matchId), {
    [`players.${uid}.isAlive`]: false,
  });
}

export async function finishMatch(matchId, winnerId) {
  await updateDoc(doc(db, "matches", matchId), {
    status: "finished",
    winnerId,
  });
}

export async function playAgain(matchId, players) {
  const tiles = {};
  generateGrid().forEach(({ q, r }) => { tiles[`${q},${r}`] = "empty"; });
  const updates = {
    status: "playing",
    tiles,
    winnerId: null,
    startTime: serverTimestamp(),
    kothOwner: null,
    kothClaimTime: null,
  };
  Object.keys(players).forEach((uid) => {
    updates[`players.${uid}.isAlive`] = true;
    updates[`players.${uid}.score`] = 0;
  });
  await updateDoc(doc(db, "matches", matchId), updates);
}

/** Reset match back to the lobby so the same invite code can be reused. */
export async function resetToLobby(matchId, players) {
  const updates = {
    status: "waiting",
    tiles: {},
    winnerId: null,
    startTime: null,
    kothOwner: null,
    kothClaimTime: null,
  };
  Object.keys(players).forEach((uid) => {
    updates[`players.${uid}.isAlive`] = true;
    updates[`players.${uid}.score`] = 0;
  });
  await updateDoc(doc(db, "matches", matchId), updates);
}
