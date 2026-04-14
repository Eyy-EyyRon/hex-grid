import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDKUIQnHqv1BCtZb1o2I7anQoouyTdyAno",
  authDomain: "grid-defense-dc5bf.firebaseapp.com",
  projectId: "grid-defense-dc5bf",
  storageBucket: "grid-defense-dc5bf.firebasestorage.app",
  messagingSenderId: "919965121914",
  appId: "1:919965121914:web:d944d8da47b436c354eac3",
  measurementId: "G-PZDDWTXDGF"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
