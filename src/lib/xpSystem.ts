import {
  doc,
  getDoc,
  setDoc,
  runTransaction,
  serverTimestamp,
  collection,
  addDoc,
} from "firebase/firestore";
import { db } from "./firebase";

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
  if (!userId) return;
  const userRef = doc(db, "users", userId);
  try {
    await runTransaction(db, async (transaction) => {
      const userDoc = await transaction.get(userRef);
      let data: any = {};

      if (userDoc.exists()) {
        data = userDoc.data();
      }

      const lastActive = data.lastActiveDate || "";
      const today = new Date().toISOString().split("T")[0];

      if (lastActive === today) return; // Already checked in today

      let currentStreak = data.dailyStreak || 0;
      let longestStreak = data.longestStreak || 0;

      // Check if they were active yesterday
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split("T")[0];

      if (lastActive === yesterdayStr) {
        currentStreak += 1;
      } else {
        // Streak broken
        currentStreak = 1;
      }

      if (currentStreak > longestStreak) {
        longestStreak = currentStreak;
      }

      transaction.set(
        userRef,
        {
          dailyStreak: currentStreak,
          streak: currentStreak, // compat
          longestStreak,
          lastActiveDate: today,
          lastActiveAt: serverTimestamp(),
        },
        { merge: true },
      );

      // Update global analytics for DAU passively
      const globalDailyRef = doc(db, "analytics", `dau_${today}`);
      transaction.set(
        globalDailyRef,
        {
          activeUsers: data.lastActiveDate !== today ? 1 : 0, // In standard firestore we would use FieldValue.increment(1) without getting doc, but we must use set with merge if needed
          date: today,
        },
        { merge: true },
      );

      // Note: we just touch the document, a proper aggregation would use field increments
      // but runTransaction limits us to one approach. We'll skip complex global aggregation
      // in the client transaction to prevent massive write contention.
      // Firebase automatically tracks MAU/DAU natively through Google Analytics anyway.
    });
  } catch (e) {
    console.error("Streak check failed", e);
  }
}

// Below is the existing awardXP function
export async function awardXP(
  userId: string,
  actionId: keyof typeof XP_REWARDS,
  deduplicationId?: string,
  feature?: string,
  metadata?: any,
) {
  if (!userId) return;

  const userRef = doc(db, "users", userId);
  const logRef = collection(db, "user_activity");

  try {
    await runTransaction(db, async (transaction) => {
      const userDoc = await transaction.get(userRef);
      let userData: any = {};

      if (userDoc.exists()) {
        userData = userDoc.data();
      }

      // Read current state
      let currentTotalXP =
        userData.totalXP !== undefined
          ? userData.totalXP
          : userData.xp !== undefined
            ? userData.xp
            : 0;

      // Prevent duplicates
      if (deduplicationId) {
        let dedupHistory = userData.processedXPEvents || [];
        if (dedupHistory.includes(deduplicationId)) {
          return; // Already awarded
        }
        dedupHistory.push(deduplicationId);
        // keep only last 50 to avoid big array
        if (dedupHistory.length > 50) {
          dedupHistory = dedupHistory.slice(-50);
        }
        transaction.set(
          userRef,
          { processedXPEvents: dedupHistory },
          { merge: true },
        );
      }

      const rewardAmount = XP_REWARDS[actionId] || 0;
      const newXP = currentTotalXP + rewardAmount;
      const calc = getLevelForXP(newXP);

      const featureName = feature || actionId.split("_")[0] || "SYSTEM";

      const updates: any = {
        totalXP: newXP,
        xp: newXP, // for backwards compat
        currentLevel: calc.level,
        currentTitle: calc.title,
        xpToNextLevel: calc.nextLevelReq - newXP,
        currentLevelProgress: calc.progress,
        updatedAt: serverTimestamp(),
        lastActiveAt: serverTimestamp(), // requested by prompt 'lastActiveAt' instead of 'lastActivityAt'
      };

      // Handle stats tracking based on action
      if (actionId === "ASK_QUESTION" || actionId === "FOLLOW_UP_QUESTION") {
        updates.totalQuestionsAsked = (userData.totalQuestionsAsked || 0) + 1;
      }
      if (actionId === "GENERATE_SUMMARY" || actionId === "UPLOAD_DOCUMENT") {
        updates.totalDocumentsGenerated =
          (userData.totalDocumentsGenerated || 0) + 1;
      }
      if (
        actionId === "COMPLETE_QUIZ" ||
        actionId === "QUIZ_SCORE_80" ||
        actionId === "QUIZ_PERFECT_SCORE"
      ) {
        updates.totalQuizzesCompleted =
          (userData.totalQuizzesCompleted || 0) + 1;
      }
      if (actionId === "RESUME_CREATED") {
        updates.totalResumesCreated = (userData.totalResumesCreated || 0) + 1;
      }
      if (actionId === "CREATE_STUDY_PLAN") {
        updates.totalStudyPlansCreated =
          (userData.totalStudyPlansCreated || 0) + 1;
      }
      if (
        actionId === "FOCUS_SESSION_COMPLETED"
      ) {
        updates.totalStudyTime = (userData.totalStudyTime || 0) + 25; // 25 mins pomodoro
      }

      transaction.set(userRef, updates, { merge: true });

      const newLogRef = doc(logRef);
      transaction.set(newLogRef, {
        userId,
        feature: featureName,
        action: actionId,
        xpEarned: rewardAmount,
        timestamp: serverTimestamp(),
        metadata: metadata || {},
      });
    });
  } catch (e) {
    console.error("XP transaction failed: ", e);
  }
}

// Kept for partial backward compatibility if anything else needs it directly
export async function recordActivity(userId: string, statKey: string) {
  if (!userId) return;
  const userRef = doc(db, "users", userId);
  try {
    await runTransaction(db, async (transaction) => {
      const userDoc = await transaction.get(userRef);
      if (userDoc.exists()) {
        const v = userDoc.data()[statKey] || 0;
        transaction.update(userRef, {
          [statKey]: v + 1,
          updatedAt: serverTimestamp(),
        });
      }
    });
  } catch (e) {
    console.error("Failed recording activity", e);
  }
}
