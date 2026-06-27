import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAEqkhF6F2972fuc2zw9qDyThf4Zo5o9PU",
  authDomain: "power-by-nova.firebaseapp.com",
  projectId: "power-by-nova",
  storageBucket: "power-by-nova.firebasestorage.app",
  messagingSenderId: "320252824380",
  appId: "1:320252824380:web:7f264e5b7206842dc96c39"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
