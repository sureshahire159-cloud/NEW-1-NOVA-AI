import { db } from "./firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

export const LEVEL_TITLES = [
  { maxLevel: 3, title: "Learning Explorer" },
  { maxLevel: 6, title: "Knowledge Builder" },
  { maxLevel: 10, title: "Academic Achiever" },
  { maxLevel: 15, title: "Advanced Maverick" },
  { maxLevel: 20, title: "Elite Scholar" },
  { maxLevel: 30, title: "Master Strategist" },
  { maxLevel: 50, title: "NOVA Legend" },
  { maxLevel: Infinity, title: "NOVA Grandmaster" },
];

export const XP_REWARDS: Record<string, number> = {
  // Doubt Solver
  ASK_QUESTION: 10,
  FOLLOW_UP_QUESTION: 5,
  MARK_ANSWER_HELPFUL: 15,
  COMPLETE_DOUBT_SESSION: 20,

  // Document Synthesizer
  UPLOAD_DOCUMENT: 15,
  GENERATE_SUMMARY: 25,
  EXPORT_NOTES: 20,

  // Quiz
  START_QUIZ: 10,
  COMPLETE_QUIZ: 50,
  QUIZ_SCORE_80: 75,
  QUIZ_PERFECT_SCORE: 150,
  DAILY_QUIZ_STREAK: 25,

  // Career Studio
  RESUME_CREATED: 100,
  RESUME_DOWNLOADED: 25,
  ATS_ANALYSIS: 50,
  CAREER_ROADMAP: 75,

  // AI Study Planner
  CREATE_STUDY_PLAN: 50,
  COMPLETE_DAILY_GOAL: 25,
  COMPLETE_WEEKLY_GOAL: 100,
  COMPLETE_MONTHLY_GOAL: 300,

  // Productivity
  FOCUS_SESSION_COMPLETED: 20,
  POMODORO_COMPLETED: 10,
  DEEP_FOCUS_SESSION: 30,

  // Daily Login
  DAILY_LOGIN: 5,
  STREAK_7_DAY: 50,
  STREAK_30_DAY: 250,

  // Achievements
  FIRST_QUESTION: 50,
  QUIZ_CHAMPION: 500,
  STUDY_MASTER: 1000,
  CAREER_EXPERT: 750,
  KNOWLEDGE_TITAN: 2000,
};

export const FIXED_LEVELS = [
  0, // Level 1
  100, // Level 2
  250, // Level 3
  500, // Level 4
  800, // Level 5
  1200, // Level 6
  1700, // Level 7
  2300, // Level 8
  3000, // Level 9
  4000, // Level 10
];

export function getLevelForXP(xp: number): {
  level: number;
  title: string;
  currentLevelReq: number;
  nextLevelReq: number;
  progress: number;
} {
  let level = 1;
  let currentLevelReq = 0;
  let nextLevelReq = 100;

  if (xp < 100) {
    return {
      level: 1,
      title: getTitle(1),
      currentLevelReq: 0,
      nextLevelReq: 100,
      progress: (xp / 100) * 100,
    };
  }

  // Iterate up to find the current level
  for (let i = 1; i <= 500; i++) {
    // cap at 500 to prevent infinite
    let reqStart = getXPRequirementForLevel(i);
    let reqEnd = getXPRequirementForLevel(i + 1);

    if (xp >= reqStart && xp < reqEnd) {
      level = i;
      currentLevelReq = reqStart;
      nextLevelReq = reqEnd;
      break;
    }
  }

  let title = getTitle(level);
  let progress =
    ((xp - currentLevelReq) / (nextLevelReq - currentLevelReq)) * 100;

  return {
    level,
    title,
    currentLevelReq,
    nextLevelReq,
    progress: Math.min(100, Math.max(0, progress)),
  };
}

export function getXPRequirementForLevel(level: number): number {
  if (level <= 10) {
    return FIXED_LEVELS[level - 1] || 0;
  }

  let currentXP = FIXED_LEVELS[9]; // Level 10 requirement (4000)
  for (let i = 11; i <= level; i++) {
    currentXP = Math.round(currentXP * 1.25);
  }
  return currentXP;
}

export function getTitle(level: number): string {
  for (const t of LEVEL_TITLES) {
    if (level <= t.maxLevel) return t.title;
  }
  return "NOVA Grandmaster";
}

export async function checkDailyStreak(userId: string) {
  if (!userId || userId === "local" || userId === "local_user") return;
  try {
    const docRef = doc(db, "users", userId);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return;
    const data = docSnap.data();
    const lastLogin = data.lastLoginTimestamp;
    const now = Date.now();
    const isNewDay = !lastLogin || (new Date(now).setHours(0,0,0,0) > new Date(lastLogin).setHours(0,0,0,0));
    
    if (isNewDay) {
      const isConsecutive = lastLogin && (new Date(now).setHours(0,0,0,0) - new Date(lastLogin).setHours(0,0,0,0) <= 86400000);
      const currentStreak = isConsecutive ? (data.dailyStreak || 0) + 1 : 1;
      const longestStreak = Math.max(currentStreak, data.longestStreak || 0);

      await setDoc(docRef, {
        lastLoginTimestamp: now,
        dailyStreak: currentStreak,
        longestStreak
      }, { merge: true });

      if (currentStreak === 7) awardXP(userId, "STREAK_7_DAY");
      if (currentStreak === 30) awardXP(userId, "STREAK_30_DAY");
      awardXP(userId, "DAILY_LOGIN");
    }
  } catch (err) {
    console.error("Streak check error", err);
  }
}

export async function awardXP(
  userId: string,
  actionId: keyof typeof XP_REWARDS,
  deduplicationId?: string,
  feature?: string,
  metadata?: any,
) {
  const earnedXP = XP_REWARDS[actionId] || 0;
  if (!earnedXP) return;
  
  // Local profile sync
  try {
    const rawProfile = localStorage.getItem("nova_profile");
    if (rawProfile) {
      const profile = JSON.parse(rawProfile);
      let xp = profile.xp || 0;
      xp += earnedXP;
      profile.xp = xp;
      profile.totalXP = xp;
      
      const { level, title, nextLevelReq, progress } = getLevelForXP(xp);
      profile.currentLevel = level;
      profile.level = level;
      profile.currentTitle = title;
      profile.xpToNextLevel = nextLevelReq;
      profile.currentLevelProgress = progress;

      if (actionId.includes("QUESTION")) profile.totalQuestionsAsked = (profile.totalQuestionsAsked || 0) + 1;
      if (actionId.includes("RESUME")) profile.totalResumesCreated = (profile.totalResumesCreated || 0) + 1;
      if (actionId.includes("STUDY_PLAN")) profile.totalStudyPlansCreated = (profile.totalStudyPlansCreated || 0) + 1;
      if (actionId.includes("QUIZ")) profile.totalQuizzesCompleted = (profile.totalQuizzesCompleted || 0) + 1;
      
      localStorage.setItem("nova_profile", JSON.stringify(profile));
    }
  } catch(e) {}

  if (!userId || userId === "local" || userId === "local_user") return;

  // Firebase remote sync
  try {
    const docRef = doc(db, "users", userId);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return;
    const profile = docSnap.data();

    let xp = profile.xp || 0;
    xp += earnedXP;
    profile.xp = xp;
    profile.totalXP = xp;
    
    const { level, title, nextLevelReq, progress } = getLevelForXP(xp);
    profile.currentLevel = level;
    profile.level = level;
    profile.currentTitle = title;
    profile.xpToNextLevel = nextLevelReq;
    profile.currentLevelProgress = progress;

    if (actionId.includes("QUESTION")) profile.totalQuestionsAsked = (profile.totalQuestionsAsked || 0) + 1;
    if (actionId.includes("RESUME")) profile.totalResumesCreated = (profile.totalResumesCreated || 0) + 1;
    if (actionId.includes("STUDY_PLAN")) profile.totalStudyPlansCreated = (profile.totalStudyPlansCreated || 0) + 1;
    if (actionId.includes("QUIZ")) profile.totalQuizzesCompleted = (profile.totalQuizzesCompleted || 0) + 1;

    await setDoc(docRef, profile, { merge: true });

    // Save XP transaction to history
    const xpRef = doc(db, `users/${userId}/xp_transactions`, `${Date.now()}_${actionId}`);
    await setDoc(xpRef, {
      xpAmount: earnedXP,
      actionId,
      feature,
      metadata,
      timestamp: Date.now()
    });

  } catch(e) {
    console.error("XP Firebase Sync Error", e);
  }
}
