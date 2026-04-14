import { useState, useEffect } from "react";
import {
  signInWithPopup,
  signOut,
  GoogleAuthProvider,
  onAuthStateChanged,
} from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";
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
        const userDoc = await ensureUserDocument(
          firebaseUser.uid,
          firebaseUser.displayName,
          firebaseUser.photoURL
        );
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

  const logout = async () => {
    await signOut(auth);
  };

  return { user, userData, setUserData, loading, loginGoogle, logout };
}

async function ensureUserDocument(uid, displayName, photoURL) {
  const userRef = doc(db, "users", uid);
  const snap = await getDoc(userRef);

  if (snap.exists()) {
    const data = snap.data();
    if (data.displayName !== displayName || data.photoURL !== photoURL) {
      await updateDoc(userRef, {
        displayName: displayName || "Unknown",
        photoURL: photoURL || "",
      });
    }
    return {
      ...data,
      displayName: displayName || data.displayName || "Unknown",
      photoURL: photoURL || data.photoURL || "",
    };
  }

  const newUser = {
    colorIndex: Math.floor(Math.random() * PLAYER_COLORS.length),
    ap: 5,
    lastLoginTime: serverTimestamp(),
    displayName: displayName || "Unknown",
    photoURL: photoURL || "",
  };

  await setDoc(userRef, newUser);
  return { ...newUser, lastLoginTime: new Date() };
}
