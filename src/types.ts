/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Indian Education Levels
export enum IndianEducationLevel {
  PRIMARY_SCHOOL = "Primary School (Class 1-5)",
  MIDDLE_SCHOOL = "Middle School (Class 6-8)",
  SECONDARY_SCHOOL = "Secondary School (Class 9-10)",
  HIGHER_SECONDARY_SCIENCE = "Higher Secondary Science (Class 11-12)",
  HIGHER_SECONDARY_COMMERCE = "Higher Secondary Commerce (Class 11-12)",
  HIGHER_SECONDARY_ARTS = "Higher Secondary Arts (Class 11-12)",
  DIPLOMA_COURSES = "Diploma Courses",
  UNDERGRADUATE = "Undergraduate",
  POSTGRADUATE = "Postgraduate",
  COMPETITIVE_EXAMS = "Competitive Exams"
}

// Indian Boards
export enum IndianBoard {
  CBSE = "CBSE",
  ICSE = "ICSE",
  ISC = "ISC",
  IB = "IB",
  CAMBRIDGE = "Cambridge",
  STATE_BOARD = "State Board",
  MAHARASHTRA_BOARD = "Maharashtra Board",
  GUJARAT_BOARD = "Gujarat Board",
  KARNATAKA_BOARD = "Karnataka Board",
  TAMIL_NADU_BOARD = "Tamil Nadu Board",
  TELANGANA_BOARD = "Telangana Board",
  KERALA_BOARD = "Kerala Board",
  PUNJAB_BOARD = "Punjab Board",
  RAJASTHAN_BOARD = "Rajasthan Board",
  JEE = "JEE",
  NEET = "NEET",
  UPSC = "UPSC",
  SSC = "SSC",
  BANKING = "Banking",
  UNIVERSITY = "University Curriculum"
}

export interface UserAcademicProfile {
  fullName: string;
  email: string;
  phoneNumber: string;
  location: string;
  academicLevel: IndianEducationLevel;
  board: IndianBoard;
  schoolCollegeName: string;
  academicYear: string;
  
  // XP & GAMIFICATION Engine
  xp: number;                 // Legacy generic XP mapping, sync with totalXP
  totalXP: number;
  currentLevel: number;
  currentTitle: string;
  xpToNextLevel: number;
  currentLevelProgress: number;
  dailyStreak: number;
  longestStreak: number;

  totalQuestionsAsked: number;
  totalQuizzesCompleted: number;
  totalDocumentsGenerated: number;
  totalStudyPlansCreated: number;
  totalResumesCreated?: number;
  totalStudyTime?: number;

  level: number;              // Legacy level mapping
  studyHours: number;
  streak: number;
  completedTasks: number;
  completedQuizzes: number;
  badgeIds: string[];
  avatarUrl: string;
  bio: string;
}

export interface Task {
  id: string;
  title: string;
  completed: boolean;
  dueDate: string;
  priority: "High" | "Medium" | "Low";
  subject?: string;
  createdAt: string;
}

export interface UpcomingExam {
  id: string;
  subject: string;
  examName: string;
  date: string;
  daysRemaining: number;
}

export interface RecentActivity {
  id: string;
  type: "quiz" | "doubt" | "synthesis" | "flashcard" | "study";
  title: string;
  timestamp: string;
  xpEarned?: number;
}

export interface RecommendedBadge {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlocked: boolean;
}

// Study Plan Interface
export interface AIStudyPlan {
  id: string;
  academicLevel: IndianEducationLevel;
  board: IndianBoard;
  subjects: string[];
  dailyHours: number;
  examDate: string;
  priorityLevel: "High" | "Medium" | "Low";
  weakSubjects: string[];
  generatedAt: string;
  dailyTimetable: {
    timeSlot: string;
    activity: string;
    subject: string;
  }[];
  weeklySchedule: {
    day: string;
    slots: {
      time: string;
      subject: string;
      topic: string;
    }[];
  }[];
  revisionPlan: {
    subject: string;
    focusAreas: string[];
    gapDays: number;
  }[];
  mockTestSchedule: {
    testDate: string;
    subject: string;
    format: string;
  }[];
  examRoadmap: string[];
}

// Quiz Master structures
export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number; // index of correct answer (0-3)
  explanation: string;
}

export interface QuizSession {
  subject: string;
  level: string;
  questions: QuizQuestion[];
  currentQuestionIndex: number;
  selectedAnswers: { [questionIndex: number]: number };
  completed: boolean;
  score: number;
}

// Smart Flashcard structure
export interface Flashcard {
  id: string;
  front: string;
  back: string;
  subject: string;
  difficulty: "Easy" | "Good" | "Hard" | "New";
  nextReviewDate: string;
}

// System configuration for Theme Mode
export type WorkspaceTheme = "NovaCrimson" | "AuraIndigo";
