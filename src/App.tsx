/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import {
  IndianBoard,
  IndianEducationLevel,
  UserAcademicProfile,
  WorkspaceTheme,
} from "./types";

// Import Custom Modular Tab Components
import BottomNav from "./components/BottomNav";
import DashboardTab from "./components/DashboardTab";
import PlannerTab from "./components/PlannerTab";
import ArsenalTab from "./components/ArsenalTab";
import ProfileTab from "./components/ProfileTab";

// Import Lucide Icons
import {
  Sparkles,
  Brain,
  Loader2,
  ChevronRight,
  Mail,
  KeyRound,
  ArrowRightCircle,
  Eye,
  EyeOff,
  ArrowUp,
} from "lucide-react";

// Import Firebase
import { auth, db, googleProvider } from "./lib/firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import { doc, setDoc, getDoc, onSnapshot } from "firebase/firestore";

export function NeonBrainLogo({ isCrimson, className = "w-8 h-8 rounded-[10px]" }: { isCrimson: boolean, className?: string }) {
  return (
    <div
      className={`${className} flex items-center justify-center border shadow-lg relative overflow-hidden backdrop-blur-md ${
        isCrimson
          ? "bg-gradient-to-br from-[#E340E6] to-[#FA1F1F] border-white/20 shadow-[0_0_20px_rgba(250,31,31,0.5)]"
          : "bg-gradient-to-br from-[#B122E5] to-[#1F8EFA] border-white/20 shadow-[0_0_20px_rgba(31,142,250,0.5)]"
      }`}
    >
      {/* Glossy edge highlight */}
      <div className="absolute inset-x-0 top-0 h-px bg-white/60 pointer-events-none" />
      <div className="absolute inset-y-0 left-0 w-px bg-white/40 pointer-events-none" />
      <div className="absolute inset-0 rounded-[inherit] border border-white/20 pointer-events-none mix-blend-overlay" />
      {/* Inner subtle glow */}
      <div className="absolute inset-0 bg-white/10 shadow-[inset_0_4px_15px_rgba(255,255,255,0.3)] pointer-events-none" />
      {/* Icon Group */}
      <div 
        className="relative flex items-center justify-center w-full h-full text-white"
        style={{ filter: "drop-shadow(0 0 2px rgba(255,255,255,1)) drop-shadow(0 0 6px rgba(255,255,255,0.6))" }}
      >
        <Brain className="w-[55%] h-[55%] animate-[pulse_3s_infinite]" strokeWidth={2.5} />
        <ArrowUp className="w-[30%] h-[30%] absolute animate-[pulse_3s_infinite]" strokeWidth={4} style={{ transform: 'translateY(-2%)' }} />
      </div>
    </div>
  );
}

export default function App() {
  // Navigation State
  const [activeTab, setActiveTab] = useState<
    "dashboard" | "planner" | "arsenal" | "profile"
  >("dashboard");
  const [theme, setThemeState] = useState<WorkspaceTheme>(() => {
    const savedTheme = localStorage.getItem("nova_theme");
    return (savedTheme as WorkspaceTheme) || "NovaCrimson";
  });

  const setTheme = (newTheme: WorkspaceTheme) => {
    setThemeState(newTheme);
    localStorage.setItem("nova_theme", newTheme);
  };

  const defaultProfile: UserAcademicProfile = {
    fullName: "Student Explorer",
    email: "", 
    phoneNumber: "",
    location: "",
    academicLevel: "" as any,
    board: "" as any,
    schoolCollegeName: "",
    academicYear: "",
    xp: 0,
    level: 1,
    studyHours: 0,
    totalXP: 0,
    currentLevel: 1,
    currentTitle: "Learning Explorer",
    xpToNextLevel: 100,
    currentLevelProgress: 0,
    dailyStreak: 0,
    longestStreak: 0,
    totalQuestionsAsked: 0,
    totalQuizzesCompleted: 0,
    totalDocumentsGenerated: 0,
    totalStudyPlansCreated: 0,
    streak: 0,
    completedTasks: 0,
    completedQuizzes: 0,
    badgeIds: [],
    avatarUrl: "",
    bio: "",
  };

  const loadProfile = (): UserAcademicProfile => {
    try {
      const storedProfile = localStorage.getItem("nova_profile");
      if (storedProfile) {
        return JSON.parse(storedProfile);
      }
    } catch(e) {}
    return defaultProfile;
  };

  const [profile, setProfileState] = useState<UserAcademicProfile>(loadProfile);

  const setProfile: React.Dispatch<
    React.SetStateAction<UserAcademicProfile>
  > = (action) => {
    setProfileState((prev) => {
      const nextState = typeof action === "function" ? action(prev) : action;
      localStorage.setItem("nova_profile", JSON.stringify(nextState));
      
      // Auto-sync to Firebase if logged in
      if (firebaseUser) {
        setDoc(doc(db, "users", firebaseUser.uid), nextState, { merge: true }).catch(err => {
          console.warn("Failed to sync background profile", err);
        });
      }

      return nextState;
    });
  };

  const [firebaseUser, setFirebaseUser] = useState<any | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);

  const [authName, setAuthName] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(true);
  const [authError, setAuthError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        // Fetch or create profile
        try {
          const docRef = doc(db, "users", user.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setProfile(docSnap.data() as UserAcademicProfile);
          } else {
            const newProfile = { ...defaultProfile, email: user.email || "" };
            await setDoc(docRef, newProfile);
            setProfile(newProfile);
          }
        } catch(e) {
           console.error("fetch profile err", e);
        }
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setAuthError("");
    try {
      if (isSignUp) {
        const userCred = await createUserWithEmailAndPassword(auth, authEmail.trim(), authPassword);
        const newProfile = { ...defaultProfile, fullName: authName || "Student", email: authEmail.trim() };
        await setDoc(doc(db, "users", userCred.user.uid), newProfile);
        setProfile(newProfile);
      } else {
        await signInWithEmailAndPassword(auth, authEmail.trim(), authPassword);
      }
      setShowAuthModal(false);
    } catch (err: any) {
      setAuthError(err.message || "Something went wrong.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setActionLoading(true);
    setAuthError("");
    try {
      const userCred = await signInWithPopup(auth, googleProvider);
      const docRef = doc(db, "users", userCred.user.uid);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) {
        const newProfile = { ...defaultProfile, fullName: userCred.user.displayName || "Student", email: userCred.user.email || "" };
        await setDoc(docRef, newProfile);
        setProfile(newProfile);
      } else {
        setProfile(docSnap.data() as UserAcademicProfile);
      }
      setShowAuthModal(false);
    } catch (err: any) {
      setAuthError(err.message || "Google Sign In Failed.");
    } finally {
      setActionLoading(false);
    }
  };

  const isCrimson = theme === "NovaCrimson";

  if (authLoading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isCrimson ? "bg-[#080202]" : "bg-[#030612]"}`}>
        <Loader2 className="w-8 h-8 text-white/40 animate-spin" />
      </div>
    );
  }

  // Determine if we should show the auth overlay
  const shouldShowAuth = !firebaseUser && showAuthModal;

  return (
    <div className={`min-h-screen relative w-full text-white transition-colors duration-550 select-none overflow-x-hidden ${isCrimson ? "bg-[#080202]" : "bg-[#030612]"}`}>
      {/* GLOWING ORBITS ACCENTS BACKDROP (Frosted Glass Theme) */}
      <div
        className={`fixed top-[-100px] right-[-100px] w-96 h-96 blur-[120px] rounded-full pointer-events-none transition-all duration-550 ${isCrimson ? "bg-red-600/15" : "bg-blue-600/20"}`}
      ></div>
      <div
        className={`fixed bottom-[-100px] left-[-100px] w-96 h-96 blur-[120px] rounded-full pointer-events-none transition-all duration-550 ${isCrimson ? "bg-amber-600/10" : "bg-purple-600/10"}`}
      ></div>

      {/* TOP HEADER GLOBAL BRANDING BAR */}
      <header className="sticky top-0 z-40 bg-white/5 border-b border-white/10 backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <NeonBrainLogo isCrimson={isCrimson} />
          <div>
            <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-white/50 block leading-none">
              Nova AI
            </span>
            <span className="text-xs sm:text-sm font-black text-white tracking-widest">
              WORKSPACE
              <span
                className={`text-[8px] sm:text-[10px] font-normal uppercase tracking-wider opacity-75 italic ml-1 ${isCrimson ? "text-red-400" : "text-blue-400"}`}
              >
                Frosted
              </span>
            </span>
          </div>
        </div>

        {/* Sync Profile control info on header */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-2.5">
            {firebaseUser ? (
              <span
                className="text-xs font-mono font-bold text-blue-400 capitalize hidden sm:inline flex items-center gap-1 cursor-pointer hover:opacity-80"
                onClick={() => signOut(auth)}
                title="Sign Out"
              >
                ● Connected: {profile.fullName.split(" ")[0]}
              </span>
            ) : (
              <span
                className="text-xs font-mono font-bold text-red-400 capitalize hidden sm:inline flex items-center gap-1 cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => setShowAuthModal(true)}
              >
                ● Sign In Required
              </span>
            )}
          </div>
        </div>
      </header>

      {/* PRIMARY VIEWS CONTAINER PORTAL */}
      {firebaseUser && (
        <>
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-32">
            {activeTab === "dashboard" && (
              <DashboardTab
                profile={profile}
                setProfile={setProfile}
                theme={theme}
                setActiveTab={setActiveTab}
                firebaseUser={firebaseUser}
              />
            )}
            {activeTab === "planner" && (
              <PlannerTab
                profile={profile}
                setProfile={setProfile}
                theme={theme}
                firebaseUser={firebaseUser}
              />
            )}
            {activeTab === "arsenal" && (
              <ArsenalTab
                profile={profile}
                setProfile={setProfile}
                theme={theme}
                firebaseUser={firebaseUser}
              />
            )}
            {activeTab === "profile" && (
              <ProfileTab
                profile={profile}
                setProfile={setProfile}
                theme={theme}
                setTheme={setTheme}
                handleSignOut={() => signOut(auth)}
                firebaseUser={firebaseUser}
              />
            )}
          </main>

          <BottomNav
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            theme={theme}
          />
        </>
      )}

      {/* AUTH MODAL OVERLAY */}
      {!firebaseUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className={`w-full max-w-md p-8 rounded-3xl border shadow-2xl relative ${isCrimson ? "bg-[#080202] border-red-500/20" : "bg-[#030612] border-blue-500/20"}`}>
            
            <div className="flex justify-center mb-6">
              <NeonBrainLogo isCrimson={isCrimson} className="w-12 h-12 rounded-2xl" />
            </div>

            {/* SEGMENTED CONTROL */}
            <div className={`flex w-full mb-8 rounded-2xl p-1 ${isCrimson ? "bg-red-950/20" : "bg-blue-950/20"} border border-white/5`}>
              <button 
                onClick={() => { setIsSignUp(false); setAuthError(""); }}
                className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all duration-300 ${!isSignUp ? (isCrimson ? "bg-red-600 text-white shadow-md shadow-red-900/50" : "bg-blue-600 text-white shadow-md shadow-blue-900/50") : "text-white/50 hover:text-white"}`}
              >
                Login
              </button>
              <button 
                onClick={() => { setIsSignUp(true); setAuthError(""); }}
                className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all duration-300 ${isSignUp ? (isCrimson ? "bg-red-600 text-white shadow-md shadow-red-900/50" : "bg-blue-600 text-white shadow-md shadow-blue-900/50") : "text-white/50 hover:text-white"}`}
              >
                Signup
              </button>
            </div>

            {authError && (
              <div className="mb-6 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
                {authError}
              </div>
            )}

            <form onSubmit={handleAuthSubmit} className="space-y-5">
              {isSignUp && (
                <div>
                  <input
                    type="text"
                    required={isSignUp}
                    value={authName}
                    onChange={e => setAuthName(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white placeholder:text-white/40 focus:outline-none focus:border-white/30 transition-colors"
                    placeholder="Full Name"
                  />
                </div>
              )}
              <div>
                <input
                  type="email"
                  required
                  value={authEmail}
                  onChange={e => setAuthEmail(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white placeholder:text-white/40 focus:outline-none focus:border-white/30 transition-colors"
                  placeholder="Email Address"
                />
              </div>
              <div className="space-y-3">
                <input
                  type="password"
                  required
                  value={authPassword}
                  onChange={e => setAuthPassword(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white placeholder:text-white/40 focus:outline-none focus:border-white/30 transition-colors"
                  placeholder="Password"
                />
                
                {!isSignUp && (
                  <div className="flex justify-start px-2">
                    <button type="button" className={`text-sm font-medium ${isCrimson ? "text-red-400 hover:text-red-300" : "text-blue-400 hover:text-blue-300"} transition-colors`}>
                      Forgot password?
                    </button>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={actionLoading}
                className={`w-full flex items-center justify-center gap-2 py-4 mt-2 rounded-2xl font-bold transition-all shadow-lg ${isCrimson ? "bg-red-600 hover:bg-red-500 text-white" : "bg-blue-600 hover:bg-blue-500 text-white"} ${actionLoading ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                {actionLoading && <Loader2 className="w-5 h-5 animate-spin" />}
                {isSignUp ? "Signup" : "Login"}
              </button>
            </form>

            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/10"></div></div>
              <div className="relative flex justify-center text-sm"><span className={`px-4 text-white/50 ${isCrimson ? "bg-[#080202]" : "bg-[#030612]"}`}>Or continue with</span></div>
            </div>

            <button
              onClick={handleGoogleSignIn}
              disabled={actionLoading}
              className={`w-full flex items-center justify-center gap-3 py-4 rounded-2xl font-bold border border-white/10 bg-white/5 text-white hover:bg-white/10 transition-all ${actionLoading ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Google
            </button>

            <div className="mt-8 text-center text-sm">
              <span className="text-white/50">
                {isSignUp ? "Already have an account?" : "Create an account"}{" "}
              </span>
              <button 
                type="button" 
                onClick={() => { setIsSignUp(!isSignUp); setAuthError(""); }}
                className={`font-semibold hover:underline transition-colors ${isCrimson ? "text-red-400" : "text-blue-400"}`}
              >
                {isSignUp ? "Login now" : "Signup now"}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
