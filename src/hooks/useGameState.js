import { useState, useEffect } from "react";
import { doc, onSnapshot, setDoc, writeBatch } from "firebase/firestore";
import { db } from "../firebase";
import { generateGrid } from "../gameLogic";

export function useGameState() {
  const [matchStatus, setMatchStatus] = useState(null);
  const [winnerId, setWinnerId] = useState(null);

  useEffect(() => {
    const ref = doc(db, "game_state", "global");
    const unsubscribe = onSnapshot(ref, async (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setMatchStatus(data.matchStatus);
        setWinnerId(data.winnerId || null);
      } else {
        await setDoc(ref, { matchStatus: "lobby", winnerId: null });
      }
    });
    return unsubscribe;
  }, []);

  const startNewMatch = async () => {
    const batch = writeBatch(db);
    const emptyTiles = {};
    generateGrid().forEach(({ q, r }) => {
      emptyTiles[`${q},${r}`] = "empty";
    });
    batch.set(doc(db, "map_chunks", "chunk_0_0"), { tiles: emptyTiles });
    batch.set(doc(db, "game_state", "global"), {
      matchStatus: "playing",
      winnerId: null,
    });
    await batch.commit();
  };

  const finishMatch = async (uid) => {
    await setDoc(doc(db, "game_state", "global"), {
      matchStatus: "finished",
      winnerId: uid,
    });
  };

  const returnToLobby = async () => {
    await setDoc(doc(db, "game_state", "global"), {
      matchStatus: "lobby",
      winnerId: null,
    });
  };

  return { matchStatus, winnerId, startNewMatch, finishMatch, returnToLobby };
}
