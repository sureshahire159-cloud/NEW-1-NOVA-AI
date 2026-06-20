/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import {
  Trophy,
  Flame,
  Play,
  Pause,
  RotateCcw,
  CheckSquare,
  Plus,
  CalendarDays,
  Sparkles,
  Target,
  Award,
  BellRing,
  Clock,
  Trash2,
  BookOpen,
  ArrowRight,
  TrendingUp,
  Brain,
} from "lucide-react";
import { awardXP, getLevelForXP } from "../lib/xpSystem";
import {
  UserAcademicProfile,
  Task,
  UpcomingExam,
  RecentActivity,
  WorkspaceTheme,
  IndianEducationLevel,
  IndianBoard,
} from "../types";

interface DashboardTabProps {
  profile: UserAcademicProfile;
  setProfile: React.Dispatch<React.SetStateAction<UserAcademicProfile>>;
  theme: WorkspaceTheme;
  setActiveTab: (tab: "dashboard" | "planner" | "arsenal" | "profile") => void;
  firebaseUser?: any;
}

export default function DashboardTab({
  profile,
  setProfile,
  theme,
  setActiveTab,
  firebaseUser,
}: DashboardTabProps) {
  // Pomodoro state
  const [timerMode, setTimerMode] = useState<"focus" | "break" | "long">(
    "focus",
  );
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [timerRunning, setTimerRunning] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Today's Tasks
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState<
    "High" | "Medium" | "Low"
  >("Medium");

  // Notifications State
  const [notifications] = useState<
    { id: string; text: string; time: string }[]
  >([]);

  // Upcoming Exams
  const [upcomingExams, setUpcomingExams] = useState<UpcomingExam[]>([]);

  // Handle Pomodoro Time setup
  useEffect(() => {
    let secs = 25 * 60;
    if (timerMode === "break") secs = 5 * 60;
    if (timerMode === "long") secs = 15 * 60;
    setTimeLeft(secs);
    setTimerRunning(false);
    if (timerRef.current) clearInterval(timerRef.current);
  }, [timerMode]);

  // Run Pomodoro Timer
  useEffect(() => {
    if (timerRunning) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            setTimerRunning(false);
            // Reward study XP when focus completes
            if (timerMode === "focus") {
              if (firebaseUser) {
                awardXP(firebaseUser.uid, "FOCUS_SESSION_COMPLETED");
              }
              alert(
                `Fantastic lock-in! You completed your Focus block and earned XP!`,
              );
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timerRunning, timerMode, setProfile]);

  const toggleTimer = () => setTimerRunning(!timerRunning);
  const resetTimer = () => {
    setTimerRunning(false);
    let defaultSecs = 25 * 60;
    if (timerMode === "break") defaultSecs = 5 * 60;
    if (timerMode === "long") defaultSecs = 15 * 60;
    setTimeLeft(defaultSecs);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Toggle Task Completion
  const toggleTask = (id: string, currentlyCompleted: boolean) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)),
    );

    // Reward XP on task completion
    if (!currentlyCompleted) {
      if (firebaseUser) awardXP(firebaseUser.uid, "COMPLETE_DAILY_GOAL"); 
    }
  };

  // Add Task
  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    const newTask: Task = {
      id: Math.random().toString(),
      title: newTaskTitle.trim(),
      completed: false,
      dueDate: "Today",
      priority: newTaskPriority,
      createdAt: new Date().toISOString(),
    };

    setTasks((prev) => [...prev, newTask]);
    setNewTaskTitle("");
  };

  // Delete Task
  const deleteTask = (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  const runtimeLevelInfo = getLevelForXP(
    profile.totalXP !== undefined
      ? profile.totalXP
      : profile.xp !== undefined
        ? profile.xp
        : 0,
  );
  const runtimeLevel =
    profile.currentLevel !== undefined
      ? profile.currentLevel
      : runtimeLevelInfo.level;
  const runtimeTitle = profile.currentTitle || runtimeLevelInfo.title;
  const runtimePercent =
    profile.currentLevelProgress !== undefined
      ? profile.currentLevelProgress
      : runtimeLevelInfo.progress;
  const xpAmount =
    profile.totalXP !== undefined
      ? profile.totalXP
      : profile.xp !== undefined
        ? profile.xp
        : 0;

  const progressPercentage = Math.floor(runtimePercent);

  const isCrimson = theme === "NovaCrimson";

  return (
    <div className="space-y-8 pb-32 animate-[fadeIn_0.4s_ease-out]">
      {/* 1. Personalized Welcome Header (Glowing Gradient Glass Block) */}
      <div
        className={`flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6 p-8 rounded-3xl border border-white/10 relative overflow-hidden backdrop-blur-md ${
          isCrimson
            ? "bg-gradient-to-r from-red-650/15 via-red-950/10 to-amber-700/10 shadow-lg"
            : "bg-gradient-to-r from-blue-650/15 via-blue-950/10 to-purple-700/10 shadow-lg"
        }`}
      >
        <div className="relative z-10">
          <span
            className={`text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-md border text-white/80 ${
              isCrimson
                ? "bg-red-500/10 border-red-500/20"
                : "bg-blue-500/10 border-blue-500/20"
            }`}
          >
            {profile.academicLevel || "Grade Level"} • {profile.board || "Curriculum Board"}
          </span>
          <h1 className="text-3xl md:text-3xl md:text-4xl font-extrabold text-white mt-2 tracking-tight">
            Welcome back,{" "}
            <span
              className={`bg-gradient-to-r ${isCrimson ? "from-red-400 to-amber-400" : "from-blue-400 to-purple-400"} bg-clip-text text-transparent`}
            >
              {profile.fullName?.toUpperCase() || "SCHOLAR"}
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-white/70 mt-2 max-w-xl leading-relaxed">
            Your workspace studies are synchronized. Deep research systems are
            calibrated to the {profile.board || "Global"} Curriculum. Ready to lock in?
          </p>
        </div>

        {/* Quick Stream Badges */}
        <div className="flex items-center gap-3 relative z-10">
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-xs sm:text-sm text-white/90 backdrop-blur-md">
            <Flame className="w-4 h-4 text-orange-400 animate-pulse" />
            <span className="font-bold uppercase tracking-wider">
              {profile.dailyStreak !== undefined
                ? profile.dailyStreak
                : profile.streak || 0}{" "}
              DAY STREAK
            </span>
          </div>

          <div className="px-4 py-2 rounded-full bg-white/5 border border-white/10 text-xs sm:text-sm text-white/90 backdrop-blur-md">
            <span className="font-bold font-mono">Level {runtimeLevel}</span>
          </div>
        </div>
      </div>
      {/* 2. XP & Goal Tracker Bento Progress */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        <div
          className={`md:col-span-2 p-6 rounded-3xl glass-card flex flex-col justify-between relative overflow-hidden border ${isCrimson ? "hover:border-red-500/30" : "hover:border-blue-500/30"} transition-all duration-300`}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent opacity-50 pointer-events-none"></div>
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`p-2.5 rounded-2xl border ${isCrimson ? "bg-red-500/10 border-red-500/25" : "bg-blue-500/10 border-blue-500/25"}`}
              >
                <Trophy
                  className={`w-5 h-5 ${isCrimson ? "text-red-400" : "text-blue-400"}`}
                />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white/50 uppercase tracking-widest">
                  Total Experience Block
                </h3>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-2xl sm:text-3xl font-extrabold text-white font-mono">
                    {xpAmount}
                  </span>
                  <span className="text-xs text-white/40">XP</span>
                </div>
              </div>
            </div>

            <div className="text-right">
              <span
                className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full border ${isCrimson ? "bg-red-955/40 border-red-500/20 text-red-300" : "bg-blue-955/40 border-blue-500/20 text-blue-300"}`}
              >
                {runtimeTitle}
              </span>
            </div>
          </div>

          <div className="mt-6 space-y-2">
            <div className="flex items-center justify-between text-[11px] font-semibold text-white/60">
              <span className="uppercase tracking-wider">
                {progressPercentage}% TO LEVEL UP
              </span>
              <span className="font-mono">
                {xpAmount} / {runtimeLevelInfo.nextLevelReq} XP
              </span>
            </div>
            <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden border border-white/10">
              <div
                className={`h-full transition-all duration-700 ease-out rounded-full ${
                  isCrimson
                    ? "bg-gradient-to-r from-red-600 via-amber-500 to-red-400 shadow-[0_0_12px_rgba(220,38,38,0.5)]"
                    : "bg-gradient-to-r from-blue-500 via-purple-500 to-violet-400 shadow-[0_0_12px_rgba(59,130,246,0.5)]"
                }`}
                style={{ width: `${progressPercentage}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* AI motivation Card */}
        <div className="p-4 md:p-6 rounded-3xl glass-card flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <span className="text-[10px] font-bold tracking-widest text-white/50 uppercase">
              NEURAL SPARK
            </span>
            <Sparkles
              className={`w-4 h-4 ${isCrimson ? "text-red-450" : "text-blue-450"}`}
            />
          </div>
          <p className="text-xs sm:text-sm font-medium italic text-white/80 my-4 leading-relaxed">
            "
            {profile.bio
              ? profile.bio
              : `${profile.fullName}, Board exam roadmap is locked. Do not play. Focus completely on Chapter assignments today.`}
            "
          </p>
          <div className="flex items-center justify-between pt-2.5 border-t border-white/10">
            <span className="text-[9px] font-mono text-white/40">
              PROPOSED BY NOVA ADVANCED API
            </span>
            <button
              onClick={() => setActiveTab("planner")}
              className={`text-xs font-bold inline-flex items-center gap-1 cursor-pointer transition-colors ${isCrimson ? "text-red-400 hover:text-red-300" : "text-blue-400 hover:text-blue-300"}`}
            >
              Planner <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>{" "}
      {/* 3. Productivity Timer & Tasks Dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 md:gap-8">
        {/* Productivity Timer (LEFT / 5 Cols - Frosted Glass Glass Card) */}
        <div className="lg:col-span-5 p-6 rounded-3xl glass-card flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs sm:text-sm font-bold text-white/70 uppercase tracking-widest flex items-center gap-2">
                <Clock
                  className={`w-4 h-4 ${isCrimson ? "text-red-400" : "text-blue-400"}`}
                />
                Productivity Timer
              </h2>
              <span className="text-[10px] font-mono text-white/40">
                POMODORO CORE
              </span>
            </div>

            <div className="flex justify-center gap-1.5 my-4 bg-white/5 p-1 rounded-full border border-white/10">
              {(["focus", "break", "long"] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setTimerMode(mode)}
                  className={`flex-1 py-1 px-3 text-[11px] font-bold rounded-full capitalize transition-all cursor-pointer ${
                    timerMode === mode
                      ? isCrimson
                        ? "bg-red-650/40 border border-red-500/30 text-white shadow-md"
                        : "bg-blue-650/40 border border-blue-500/30 text-white shadow-md"
                      : "text-white/40 hover:text-white/70"
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          <div className="text-center py-6">
            <span className="text-3xl sm:text-4xl md:text-5xl sm:text-6xl md:text-7xl font-extrabold tracking-tighter text-white font-mono antialiased drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)]">
              {formatTime(timeLeft)}
            </span>
          </div>

          <div className="flex items-center justify-center gap-4 mt-2">
            <button
              onClick={toggleTimer}
              className={`w-14 h-14 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-lg border border-white/10 ${
                isCrimson
                  ? "bg-red-600/70 hover:bg-red-550 text-white shadow-red-500/20"
                  : "bg-blue-600/70 hover:bg-blue-550 text-white shadow-blue-500/20"
              }`}
            >
              {timerRunning ? (
                <Pause className="w-6 h-6" />
              ) : (
                <Play className="w-6 h-6 ml-1" />
              )}
            </button>

            <button
              onClick={resetTimer}
              className="w-11 h-11 rounded-full bg-white/5 hover:bg-white/10 text-white/40 hover:text-white border border-white/10 flex items-center justify-center transition-all cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Today's Tasks List (RIGHT / 7 Cols - Frosted Glass Glass Card) */}
        <div className="lg:col-span-7 p-6 rounded-3xl glass-card flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs sm:text-sm font-bold text-white/70 uppercase tracking-widest flex items-center gap-2">
                <CheckSquare className={`w-4 h-4 ${isCrimson ? "text-red-400" : "text-blue-400"}`} />
                Today's Learning Tasks
              </h2>
              <span className="text-[11px] font-semibold text-white/50">
                {tasks.filter((t) => t.completed).length}/{tasks.length}{" "}
                Completed
              </span>
            </div>

            {/* Tasks List */}
            <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
              {tasks.length === 0 ? (
                <p className="text-sm text-white/40 italic py-4 text-center">
                  No tasks currently set. Plan new targets below!
                </p>
              ) : (
                tasks.map((task) => (
                  <div
                    key={task.id}
                    className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all ${
                      task.completed
                        ? "bg-white/2 border-white/5 text-white/30"
                        : "bg-white/5 border border-white/10 text-white/90 hover:bg-white/8"
                    }`}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <input
                        type="checkbox"
                        checked={task.completed}
                        onChange={() => toggleTask(task.id, task.completed)}
                        className={`w-4 h-4 rounded border-white/25 bg-white/5 leading-tight focus:ring-0 cursor-pointer ${
                          isCrimson ? "accent-red-600" : "accent-blue-600"
                        }`}
                      />
                      <span
                        className={`text-xs sm:text-sm font-medium truncate ${task.completed ? "line-through text-white/30" : "text-white/80"}`}
                      >
                        {task.title}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 ml-2">
                      <span
                        className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                          task.priority === "High"
                            ? "bg-red-550/15 text-red-300 border border-red-500/25"
                            : task.priority === "Medium"
                              ? "bg-amber-550/15 text-amber-300 border border-amber-500/25"
                              : "bg-white/5 text-white/40 border border-white/10"
                        }`}
                      >
                        {task.priority}
                      </span>

                      <button
                        onClick={() => deleteTask(task.id)}
                        className="text-white/30 hover:text-red-400 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Quick Task Add Form */}
          <form
            onSubmit={handleAddTask}
            className="mt-4 pt-4 border-t border-white/10 flex flex-col sm:flex-row gap-3"
          >
            <input
              type="text"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              placeholder="e.g. Solve Trigonometry PyQ formulas..."
              className="flex-1 px-4 py-2 text-xs sm:text-sm rounded-xl glass-input placeholder-white/30 focus:outline-none"
            />
            <div className="flex items-center gap-2">
              <select
                value={newTaskPriority}
                onChange={(e) => setNewTaskPriority(e.target.value as any)}
                className="px-3 py-2 text-xs rounded-xl bg-white/5 border border-white/10 text-white/70 focus:outline-none"
              >
                <option value="High" className="bg-[#121216]">
                  High
                </option>
                <option value="Medium" className="bg-[#121216]">
                  Medium
                </option>
                <option value="Low" className="bg-[#121216]">
                  Low
                </option>
              </select>
              <button
                type="submit"
                className={`p-2.5 rounded-xl text-white font-bold cursor-pointer transition-colors shadow-md ${
                  isCrimson
                    ? "bg-red-600/75 hover:bg-red-650"
                    : "bg-blue-600/75 hover:bg-blue-650"
                }`}
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>
      </div>
      {/* 4. Real-Time Activity Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 md:gap-8">
        {/* Real Analytics Grid (LEFT / 7 Cols) */}
        <div className="lg:col-span-7 p-6 rounded-3xl glass-card flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs sm:text-sm font-bold text-white/70 uppercase tracking-widest flex items-center gap-2">
                <TrendingUp
                  className={`w-4 h-4 ${isCrimson ? "text-red-400" : "text-blue-400"}`}
                />
                Real-Time Diagnostics
              </h2>
              <span className="text-[10px] font-semibold text-white/40">
                LIFETIME DATA
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className={`p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col items-center text-center transition-all ${isCrimson ? 'hover:border-red-500/30' : 'hover:border-blue-500/30'}`}>
                <Clock className={`w-5 h-5 mb-2 opacity-80 ${isCrimson ? 'text-red-400' : 'text-blue-400'}`} />
                <span className="text-xl sm:text-2xl font-mono font-bold text-white mb-0.5">
                  {Math.floor((profile.totalStudyTime || 0) / 60)}h{" "}
                  {(profile.totalStudyTime || 0) % 60}m
                </span>
                <span className="text-[9px] uppercase tracking-wider text-white/40 font-bold">
                  Total Focus Time
                </span>
              </div>
              <div className={`p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col items-center text-center transition-all ${isCrimson ? 'hover:border-red-500/30' : 'hover:border-blue-500/30'}`}>
                <Brain className={`w-5 h-5 mb-2 opacity-80 ${isCrimson ? 'text-red-400' : 'text-blue-400'}`} />
                <span className="text-xl sm:text-2xl font-mono font-bold text-white mb-0.5">
                  {profile.totalQuestionsAsked || 0}
                </span>
                <span className="text-[9px] uppercase tracking-wider text-white/40 font-bold">
                  Questions Solved
                </span>
              </div>
              <div className={`p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col items-center text-center transition-all ${isCrimson ? 'hover:border-red-500/30' : 'hover:border-blue-500/30'}`}>
                <BookOpen className={`w-5 h-5 mb-2 opacity-80 ${isCrimson ? 'text-red-400' : 'text-blue-400'}`} />
                <span className="text-xl sm:text-2xl font-mono font-bold text-white mb-0.5">
                  {profile.totalDocumentsGenerated || 0}
                </span>
                <span className="text-[9px] uppercase tracking-wider text-white/40 font-bold">
                  Docs Synthesized
                </span>
              </div>
              <div className={`p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col items-center text-center transition-all ${isCrimson ? 'hover:border-red-500/30' : 'hover:border-blue-500/30'}`}>
                <CheckSquare className={`w-5 h-5 mb-2 opacity-80 ${isCrimson ? 'text-red-400' : 'text-blue-400'}`} />
                <span className="text-xl sm:text-2xl font-mono font-bold text-white mb-0.5">
                  {profile.totalQuizzesCompleted || 0}
                </span>
                <span className="text-[9px] uppercase tracking-wider text-white/40 font-bold">
                  Quizzes Passed
                </span>
              </div>
              <div className={`p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col items-center text-center transition-all ${isCrimson ? 'hover:border-red-500/30' : 'hover:border-blue-500/30'}`}>
                <Target className={`w-5 h-5 mb-2 opacity-80 ${isCrimson ? 'text-red-400' : 'text-blue-400'}`} />
                <span className="text-xl sm:text-2xl font-mono font-bold text-white mb-0.5">
                  {profile.totalResumesCreated || 0}
                </span>
                <span className="text-[9px] uppercase tracking-wider text-white/40 font-bold">
                  Resumes Created
                </span>
              </div>
              <div className={`p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col items-center text-center transition-all ${isCrimson ? 'hover:border-red-500/30' : 'hover:border-blue-500/30'}`}>
                <CalendarDays className={`w-5 h-5 mb-2 opacity-80 ${isCrimson ? 'text-red-400' : 'text-blue-400'}`} />
                <span className="text-xl sm:text-2xl font-mono font-bold text-white mb-0.5">
                  {profile.totalStudyPlansCreated || 0}
                </span>
                <span className="text-[9px] uppercase tracking-wider text-white/40 font-bold">
                  Plans Generated
                </span>
              </div>
            </div>
          </div>

          <div className="flex justify-around items-center pt-2 mt-4 border-t border-white/10 text-center">
            <div>
              <span className="text-xs text-white/40 block">
                Retention Score
              </span>
              <p className="text-sm font-bold text-emerald-400">High</p>
            </div>
            <div>
              <span className="text-xs text-white/40 block">Active Status</span>
              <p className="text-sm font-bold text-white/80">Synced</p>
            </div>
          </div>
        </div>

        {/* Upcoming Exams Countdown List (RIGHT / 5 Cols - Frosted Glass Glass Card) */}
        <div className="lg:col-span-5 p-6 rounded-3xl glass-card flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs sm:text-sm font-bold text-white/70 uppercase tracking-widest flex items-center gap-2">
                <CalendarDays className={`w-4 h-4 ${isCrimson ? 'text-red-400' : 'text-blue-400'}`} />
                Upcoming Examinations
              </h2>
              <span className="text-[10px] font-mono text-white/40">
                BOARD ALERTS
              </span>
            </div>

            <div className="space-y-3.5">
              {upcomingExams.map((exam) => (
                <div
                  key={exam.id}
                  className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between"
                >
                  <div>
                    <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">
                      {exam.subject}
                    </span>
                    <h4 className="text-sm font-semibold text-white/80 mt-0.5 leading-tight">
                      {exam.examName}
                    </h4>
                    <span className="text-xs text-white/50 font-mono mt-2 block">
                      {new Date(exam.date).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </div>

                  <div className="text-right">
                    <span
                      className={`text-2xl font-extrabold block leading-none font-mono ${exam.daysRemaining <= 15 ? "text-red-400" : "text-blue-400"}`}
                    >
                      {exam.daysRemaining}
                    </span>
                    <span className="text-[9px] font-bold text-white/30 uppercase tracking-wider">
                      Days left
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-white/10 flex justify-between items-center text-xs">
            <span className="text-white/40 font-medium">
              Synced with Academic Year Syllabus
            </span>
            <button
              onClick={() => setActiveTab("planner")}
              className={`font-semibold cursor-pointer ${isCrimson ? "text-red-400 hover:text-red-350" : "text-blue-400 hover:text-blue-350"}`}
            >
              Adjust Planner & Exams
            </button>
          </div>
        </div>
      </div>
      {/* End of Main Content Blocks */}
    </div>
  );
}
