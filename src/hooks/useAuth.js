import { useState, useEffect } from "react";
import {
  signInWithPopup,
  signOut,
  GoogleAuthProvider,
  onAuthStateChanged,
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../firebase";

const PLAYER_COLORS = [
  "#e74c3c",
  "#3498db",
  "#2ecc71",
  "#f1c40f",
  "#9b59b6",
  "#e67e22",
  "#1abc9c",
  "#e84393",
];

const googleProvider = new GoogleAuthProvider();

export function useAuth() {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser && firebaseUser.isAnonymous) {
        await signOut(auth);
        return;
      }
      if (firebaseUser) {
        setUser(firebaseUser);
        const userDoc = await ensureUserDocument(firebaseUser.uid);
        setUserData(userDoc);
      } else {
        setUser(null);
        setUserData(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const loginGoogle = async () => {
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      console.error("Google sign-in failed:", err);
      setLoading(false);
    }
  };

  return { user, userData, setUserData, loading, loginGoogle };
}

async function ensureUserDocument(uid) {
  const userRef = doc(db, "users", uid);
  const snap = await getDoc(userRef);

  if (snap.exists()) {
    return snap.data();
  }

  const newUser = {
    colorIndex: Math.floor(Math.random() * PLAYER_COLORS.length),
    ap: 5,
    lastLoginTime: serverTimestamp(),
  };

  await setDoc(userRef, newUser);
  return { ...newUser, lastLoginTime: new Date() };
}
