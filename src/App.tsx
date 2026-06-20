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
import { auth, db } from "./lib/firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import { doc, setDoc, getDoc, onSnapshot } from "firebase/firestore";
import { checkDailyStreak } from "./lib/xpSystem";

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


  // Authentication and Profile States
  const [firebaseUser, setFirebaseUser] = useState<any | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Authentication Fields (Login / Sign Up)
  const [authName, setAuthName] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSignUp, setIsSignUp] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const defaultProfile: UserAcademicProfile = {
    fullName: "",
    email: "", // Mapped user email context
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
    return defaultProfile;
  };

  const [profile, setProfileState] = useState<UserAcademicProfile>(loadProfile);

  const setProfile: React.Dispatch<
    React.SetStateAction<UserAcademicProfile>
  > = (action) => {
    setProfileState((prev) => {
      const nextState = typeof action === "function" ? action(prev) : action;
      if (firebaseUser) {
        // Exclude XP logic from standard profile updates since XP handles it server-side transactionally
        const {
          xp,
          totalXP,
          currentLevel,
          currentTitle,
          xpToNextLevel,
          currentLevelProgress,
          dailyStreak,
          longestStreak,
          totalQuestionsAsked,
          totalQuizzesCompleted,
          totalDocumentsGenerated,
          totalStudyPlansCreated,
          level,
          ...syncableData
        } = nextState;

        setDoc(doc(db, "users", firebaseUser.uid), syncableData, {
          merge: true,
        }).catch((err) => {
          // console.error("Failed to sync profile subset:", err);
        });
      }
      return nextState;
    });
  };

  useEffect(() => {
    // Disabled localstorage to ensure fresh realtime DB state
  }, [profile]);

  const [authError, setAuthError] = useState("");

  // Handle manual account authentication action
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    if (!authEmail.trim() || !authPassword || (isSignUp && !authName.trim())) {
      setAuthError("Please fill in all requested fields!");
      return;
    }

    setActionLoading(true);
    try {
      if (isSignUp) {
        const userCred = await createUserWithEmailAndPassword(
          auth,
          authEmail.trim(),
          authPassword,
        );
        // Save default profile to firestore
        const newProfile: UserAcademicProfile = { 
          ...defaultProfile, 
          fullName: authName.trim(),
          email: authEmail.trim(),
          xp: 0,
          totalXP: 0,
          currentLevel: 1,
          level: 1,
          currentTitle: "Learning Explorer",
          currentLevelProgress: 0,
          xpToNextLevel: 100
        };
        await setDoc(doc(db, "users", userCred.user.uid), newProfile);
        setProfile(newProfile);
      } else {
        const userCred = await signInWithEmailAndPassword(
          auth,
          authEmail.trim(),
          authPassword,
        );
        // Load profile from firestore
        const docSnap = await getDoc(doc(db, "users", userCred.user.uid));
        if (docSnap.exists()) {
          setProfile(docSnap.data() as UserAcademicProfile);
        }
      }
      setShowAuthModal(false);
    } catch (err: any) {
      // console.error(err);
      if (err.code === "auth/email-already-in-use") {
        setAuthError("This email is already in use. Please sign in instead.");
      } else if (err.code === "auth/user-not-found" || err.code === "auth/wrong-password" || err.code === "auth/invalid-credential") {
        setAuthError("Invalid email or password.");
      } else if (err.code === "auth/weak-password") {
        setAuthError("Password should be at least 6 characters.");
      } else {
        setAuthError(`Error: ${err.message || "Something went wrong."}`);
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (err: any) {
      // console.error("Error signing out:", err);
    }
  };

  useEffect(() => {
    setAuthLoading(true);
    let unsubscribeSnapshot: () => void;

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        // Realtime sync
        unsubscribeSnapshot = onSnapshot(
          doc(db, "users", user.uid),
          (docSnap) => {
            if (docSnap.exists()) {
              const data = docSnap.data() as Partial<UserAcademicProfile>;

              // Reconcile XP fields
              const xp =
                data.totalXP !== undefined
                  ? data.totalXP
                  : data.xp !== undefined
                    ? data.xp
                    : 0;
              const currentLevel = data.currentLevel || 1;
              const currentTitle = data.currentTitle || "Learning Explorer";

              setProfile((prev) => ({
                ...prev,
                ...data,
                xp,
                totalXP: xp,
                currentLevel,
                currentTitle,
                level: currentLevel,
              }));
            } else {
              // Fallback profile init
              const initData = { 
                ...defaultProfile, 
                email: user.email,
                xp: 0,
                totalXP: 0,
                currentLevel: 1,
                level: 1,
                currentTitle: "Learning Explorer",
                currentLevelProgress: 0,
                xpToNextLevel: 100
              };
              setProfile((prev) => ({ ...prev, ...initData }));
              setDoc(
                doc(db, "users", user.uid),
                initData,
                { merge: true },
              );
            }
          },
        );

        // Ensure daily streak is updated
        checkDailyStreak(user.uid);
      } else {
        if (unsubscribeSnapshot) unsubscribeSnapshot();
      }
      setAuthLoading(false);
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeSnapshot) unsubscribeSnapshot();
    };
  }, []);

  const isCrimson = theme === "NovaCrimson";

  if (authLoading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isCrimson ? "bg-[#080202]" : "bg-[#030612]"}`}>
        <Loader2 className="w-8 h-8 text-white/40 animate-spin" />
      </div>
    );
  }

  if (!firebaseUser) {
    return (
      <div className={`min-h-screen relative w-full text-white transition-colors duration-550 select-none overflow-x-hidden ${isCrimson ? "bg-[#080202]" : "bg-[#030612]"} flex items-center justify-center p-4`}>
        {/* TOP LEFT LOGO */}
        <div className="absolute top-6 left-6 flex items-center gap-3 z-30">
          <NeonBrainLogo isCrimson={isCrimson} className="w-10 h-10 rounded-[12px]" />
          <span className="text-lg font-black text-white tracking-widest uppercase">Nova AI</span>
        </div>

        {/* GLOWING ORBITS ACCENTS BACKDROP (Frosted Glass Theme) */}
        <div
          className={`absolute top-[-100px] right-[-100px] w-96 h-96 blur-[120px] rounded-full pointer-events-none transition-all duration-550 ${isCrimson ? "bg-red-600/15" : "bg-blue-600/20"}`}
        ></div>
        <div
          className={`absolute bottom-[-100px] left-[-100px] w-96 h-96 blur-[120px] rounded-full pointer-events-none transition-all duration-550 ${isCrimson ? "bg-amber-600/10" : "bg-purple-600/10"}`}
        ></div>

        <div className="w-full max-w-sm p-8 rounded-3xl bg-zinc-950/80 backdrop-blur-xl border border-zinc-800 shadow-2xl relative z-10">
          <div className="flex bg-zinc-900 rounded-full p-1 mb-8">
            <button
              onClick={() => setIsSignUp(false)}
              className={`flex-1 py-2.5 rounded-full text-sm font-bold transition-all ${
                !isSignUp
                  ? isCrimson ? "bg-red-600 text-white shadow-lg shadow-red-900/20" : "bg-blue-600 text-white shadow-lg shadow-blue-900/20"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Login
            </button>
            <button
              onClick={() => setIsSignUp(true)}
              className={`flex-1 py-2.5 rounded-full text-sm font-bold transition-all ${
                isSignUp
                  ? isCrimson ? "bg-red-600 text-white shadow-lg shadow-red-900/20" : "bg-blue-600 text-white shadow-lg shadow-blue-900/20"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Signup
            </button>
          </div>

          <form onSubmit={handleAuthSubmit} className="space-y-4">
            {authError && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs text-center font-medium">
                {authError}
              </div>
            )}

            {isSignUp && (
              <div className="space-y-1.5">
                <input
                  type="text"
                  value={authName}
                  onChange={(e) => setAuthName(e.target.value)}
                  placeholder="Full Name"
                  className="w-full bg-transparent text-white px-4 py-3.5 rounded-xl border border-zinc-800 placeholder-zinc-500 focus:outline-none focus:border-zinc-600 focus:bg-zinc-900/50 transition-all text-sm"
                  required
                />
              </div>
            )}

            <div className="space-y-1.5">
              <input
                type="email"
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                placeholder="Email Address"
                className="w-full bg-transparent text-white px-4 py-3.5 rounded-xl border border-zinc-800 placeholder-zinc-500 focus:outline-none focus:border-zinc-600 focus:bg-zinc-900/50 transition-all text-sm"
                required
              />
            </div>

            <div className="space-y-1.5 relative">
              <input
                type={showPassword ? "text" : "password"}
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                placeholder="Password"
                className="w-full bg-transparent text-white px-4 py-3.5 rounded-xl border border-zinc-800 placeholder-zinc-500 focus:outline-none focus:border-zinc-600 focus:bg-zinc-900/50 transition-all text-sm pr-12"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200"
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>

            {!isSignUp && (
              <div className="text-left w-full">
                <button
                  type="button"
                  className={`text-xs font-semibold hover:underline ${isCrimson ? "text-red-400" : "text-blue-400"}`}
                >
                  Forgot password?
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={actionLoading}
              className={`w-full py-3.5 mt-2 rounded-2xl font-bold text-sm text-white cursor-pointer transition-all shadow-lg flex justify-center items-center gap-2 ${isCrimson ? "bg-red-700 hover:bg-red-600 shadow-red-900/20" : "bg-blue-700 hover:bg-blue-600 shadow-blue-900/20"}`}
            >
              {actionLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : null}
              {isSignUp ? "Signup" : "Login"}
            </button>
          </form>

          <div className="mt-8 text-center text-sm">
            <span className="text-zinc-400">
              {isSignUp ? "Already have an account? " : "Create an account "}
            </span>
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className={`font-semibold hover:underline ${isCrimson ? "text-red-400" : "text-blue-400"}`}
            >
              {isSignUp ? "Login now" : "Signup now"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen relative w-full text-white transition-colors duration-550 select-none overflow-x-hidden ${isCrimson ? "bg-[#080202]" : "bg-[#030612]"}`}>
      {/* GLOWING ORBITS ACCENTS BACKDROP (Frosted Glass Theme) */}
      <div
        className={`absolute top-[-100px] right-[-100px] w-96 h-96 blur-[120px] rounded-full pointer-events-none transition-all duration-550 ${isCrimson ? "bg-red-600/15" : "bg-blue-600/20"}`}
      ></div>
      <div
        className={`absolute bottom-[-100px] left-[-100px] w-96 h-96 blur-[120px] rounded-full pointer-events-none transition-all duration-550 ${isCrimson ? "bg-amber-600/10" : "bg-purple-600/10"}`}
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
          {authLoading ? (
            <Loader2 className="w-4 h-4 text-white/40 animate-spin" />
          ) : firebaseUser ? (
            <div className="flex items-center gap-2.5">
              <span
                className="text-xs font-mono font-bold hover:underline text-emerald-400 capitalize hidden sm:inline"
                title={firebaseUser.email}
              >
                ● Synced: {profile.fullName.split(" ")[0]}
              </span>
              <button
                onClick={handleSignOut}
                className="px-3.5 py-1.5 rounded-xl border border-white/10 bg-white/5 text-white/70 hover:text-white font-bold text-xs cursor-pointer transition-colors backdrop-blur-md"
              >
                Logout
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowAuthModal(true)}
              className={`px-3.5 py-1.5 rounded-xl font-bold text-xs text-white cursor-pointer transition-all flex items-center gap-1 shadow-lg backdrop-blur-md border border-white/10 ${
                isCrimson
                  ? "bg-red-600/35 hover:bg-red-600/50"
                  : "bg-blue-600/35 hover:bg-blue-600/50"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 animate-pulse" />
              Sync Cloud Profile
            </button>
          )}
        </div>
      </header>

      {/* PRIMARY VIEWS CONTAINER PORTAL */}
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
            handleSignOut={handleSignOut}
            firebaseUser={firebaseUser}
          />
        )}
      </main>

      {/* CORE FLOATING BOT NAVIGATION BAR */}
      <BottomNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        theme={theme}
      />
    </div>
  );
}
