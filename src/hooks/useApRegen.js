import { useState, useEffect, useRef } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { MAX_AP, AP_REGEN_MS } from "../gameLogic";

export function useApRegen(user, userData, setUserData) {
  const [countdown, setCountdown] = useState(null);
  const apRef = useRef(0);
  const lastRegenRef = useRef(null);
  const userRef = useRef(null);

  // Keep refs in sync with latest values
  useEffect(() => {
    apRef.current = userData?.ap ?? 0;
    userRef.current = user;
  }, [user, userData?.ap]);

  // Initialize lastRegenTime from userData on mount
  useEffect(() => {
    if (!userData?.lastLoginTime) return;
    if (lastRegenRef.current) return; // already initialized
    const lt = userData.lastLoginTime;
    lastRegenRef.current = lt.toDate ? lt.toDate() : new Date(lt);
  }, [userData?.lastLoginTime]);

  // Tick every second
  useEffect(() => {
    const interval = setInterval(async () => {
      if (!userRef.current || !lastRegenRef.current) return;

      if (apRef.current >= MAX_AP) {
        setCountdown(null);
        return;
      }

      const now = Date.now();
      const elapsed = now - lastRegenRef.current.getTime();

      if (elapsed >= AP_REGEN_MS) {
        const newAp = Math.min(apRef.current + 1, MAX_AP);
        lastRegenRef.current = new Date(
          lastRegenRef.current.getTime() + AP_REGEN_MS
        );
        apRef.current = newAp;

        setUserData((prev) => ({ ...prev, ap: newAp }));

        try {
          await updateDoc(doc(db, "users", userRef.current.uid), {
            ap: newAp,
            lastLoginTime: lastRegenRef.current,
          });
        } catch (err) {
          console.error("AP regen write failed:", err);
        }

        if (newAp >= MAX_AP) {
          setCountdown(null);
        }
      } else {
        setCountdown(Math.ceil((AP_REGEN_MS - elapsed) / 1000));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [setUserData]);

  return countdown;
}
