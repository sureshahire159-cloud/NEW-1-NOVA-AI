import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBxBjp1sm8fdORJEw_PFGX3rJtpnp4QiNM",
  authDomain: "nova-ai-1-839c2.firebaseapp.com",
  projectId: "nova-ai-1-839c2",
  storageBucket: "nova-ai-1-839c2.firebasestorage.app",
  messagingSenderId: "950813749790",
  appId: "1:950813749790:web:2e3302e94424e0a816f40f"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
