import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import firebaseConfigData from "../../firebase-applet-config.json";

// Initialize Firebase
const app = initializeApp(firebaseConfigData);
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfigData.firestoreDatabaseId || "(default)");

