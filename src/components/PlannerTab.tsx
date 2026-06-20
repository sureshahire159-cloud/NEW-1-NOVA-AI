/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { 
  Compass, 
  Layers, 
  MapPin, 
  BookOpen, 
  Sliders, 
  Calendar, 
  AlertTriangle, 
  Sparkles, 
  Bookmark, 
  Copy, 
  Check, 
  Download, 
  Loader2, 
  ChevronRight, 
  Info,
  Clock,
  BookMarked,
  Settings,
  History as HistoryIcon,
  Trash2,
  Plus
} from "lucide-react";
import { awardXP } from "../lib/xpSystem";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { IndianEducationLevel, IndianBoard, AIStudyPlan, WorkspaceTheme, UserAcademicProfile } from "../types";
import { db } from "../lib/firebase";
import { doc, setDoc, getDoc, collection, getDocs, query, orderBy, limit, deleteDoc } from "firebase/firestore";

interface PlannerTabProps {
  profile: UserAcademicProfile;
  setProfile: React.Dispatch<React.SetStateAction<UserAcademicProfile>>;
  theme: WorkspaceTheme;
  firebaseUser: any;
}

export default function PlannerTab({ profile, setProfile, theme, firebaseUser }: PlannerTabProps) {
  // Input Form States
  const [academicLevel, setAcademicLevel] = useState<IndianEducationLevel>(profile.academicLevel);
  const [board, setBoard] = useState<IndianBoard>(profile.board);
  const [subjectsList, setSubjectsList] = useState<string[]>(["Mathematics", "Physics", "Chemistry"]);
  const [newSubjectInput, setNewSubjectInput] = useState("");
  const [dailyHours, setDailyHours] = useState(6);
  const [examDate, setExamDate] = useState("2026-06-25");
  const [priorityLevel, setPriorityLevel] = useState<"High" | "Medium" | "Low">("Medium");
  
  // Weak subjects checking
  const [weakSubjects, setWeakSubjects] = useState<string[]>(["Chemistry"]);

  // Gen AI loading States
  const [loading, setLoading] = useState(false);
  const [generatedPlan, setGeneratedPlan] = useState<AIStudyPlan | null>(null);
  
  // Copy clipboard visual feedback
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showConfig, setShowConfig] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [historyPlans, setHistoryPlans] = useState<any[]>([]);

  const isCrimson = theme === "NovaCrimson";

  React.useEffect(() => {
    async function loadPlannerState() {
      if (!firebaseUser) return;
      try {
        const pRef = doc(db, "users", firebaseUser.uid, "planner", "latest");
        const snap = await getDoc(pRef);
        if (snap.exists()) {
          const data = snap.data();
          if (data.academicLevel) setAcademicLevel(data.academicLevel);
          if (data.board) setBoard(data.board);
          if (data.subjectsList) setSubjectsList(data.subjectsList);
          if (data.dailyHours) setDailyHours(data.dailyHours);
          if (data.examDate) setExamDate(data.examDate);
          if (data.priorityLevel) setPriorityLevel(data.priorityLevel);
          if (data.weakSubjects) setWeakSubjects(data.weakSubjects);
          if (data.generatedPlan) {
            setGeneratedPlan(data.generatedPlan);
            setSaved(true);
            setShowConfig(false);
          }
        }
      } catch (err) {
        // console.error("Failed to load planner state:", err);
      }
    }
    loadPlannerState();
  }, [firebaseUser]);

  // Subjects Management
  const addSubject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubjectInput.trim()) return;
    if (subjectsList.includes(newSubjectInput.trim())) return;
    setSubjectsList(prev => [...prev, newSubjectInput.trim()]);
    setNewSubjectInput("");
  };

  const removeSubject = (subj: string) => {
    setSubjectsList(prev => prev.filter(s => s !== subj));
    setWeakSubjects(prev => prev.filter(s => s !== subj));
  };

  const toggleWeakSubject = (subj: string) => {
    if (weakSubjects.includes(subj)) {
      setWeakSubjects(prev => prev.filter(s => s !== subj));
    } else {
      setWeakSubjects(prev => [...prev, subj]);
    }
  };

  // Connect backend to produce AI Plan
  const handleGenerateAIStrategy = async () => {
    if (subjectsList.length === 0) {
      alert("Please add at least one subject to structure your timetable!");
      return;
    }

    setLoading(true);
    setGeneratedPlan(null);
    setSaved(false);
    setCopied(false);

    try {
      const response = await fetch("/api/generate-strategy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          academicLevel,
          board,
          subjects: subjectsList,
          dailyHours,
          examDate,
          priorityLevel,
          weakSubjects
        })
      });

      if (!response.ok) {
        throw new Error("Backend server error while calling Gemini AI Strategy Model.");
      }

      const data = await response.json();
      
      const planItem: AIStudyPlan = {
        id: Math.random().toString(),
        academicLevel,
        board,
        subjects: subjectsList,
        dailyHours,
        examDate,
        priorityLevel,
        weakSubjects,
        generatedAt: new Date().toISOString(),
        dailyTimetable: data.dailyTimetable || [],
        weeklySchedule: data.weeklySchedule || [],
        revisionPlan: data.revisionPlan || [],
        mockTestSchedule: data.mockTestSchedule || [],
        examRoadmap: data.examRoadmap || []
      };

      setGeneratedPlan(planItem);
      setShowConfig(false);
      
      // Update profile board/level setup
      setProfile((p) => ({
        ...p,
        academicLevel,
        board
      }));

      if (firebaseUser) {
        try {
          const pRef = doc(db, "users", firebaseUser.uid, "planner", "latest");
          await setDoc(pRef, {
            academicLevel,
            board,
            subjectsList,
            dailyHours,
            examDate,
            priorityLevel,
            weakSubjects,
            generatedPlan: planItem
          });
          setSaved(true);
        } catch (err) {
          // console.error("Save to cloud failed:", err);
        }
      }

    } catch (error) {
      // console.error(error);
      alert(`Strategy formulation failed: ${error instanceof Error ? error.message : String(error)}. Please try again.`);
    } finally {
      setLoading(false);
    }
  };

  // Firestore Saved Timetables sync
  const handleSaveToCloud = async () => {
    if (!generatedPlan) return;
    
    if (firebaseUser) {
      try {
        const timestamp = Date.now().toString();
        const pRef = doc(db, "users", firebaseUser.uid, "planner", "latest");
        const historyRef = doc(db, "users", firebaseUser.uid, "planner_history", timestamp);
        const planData = {
          academicLevel,
          board,
          subjectsList,
          dailyHours,
          examDate,
          priorityLevel,
          weakSubjects,
          generatedPlan,
          createdAt: timestamp
        };
        await setDoc(pRef, planData);
        await setDoc(historyRef, planData);
      } catch (err) {
        // console.error(err);
      }
    }

    if (!saved) {
      // Reward XP on saving plan only once
      awardXP(firebaseUser?.uid, "CREATE_STUDY_PLAN");
    }

    // Offline simulation fallback
    setSaved(true);
  };

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleDeletePlan = async () => {
    if (firebaseUser) {
      try {
        const pRef = doc(db, "users", firebaseUser.uid, "planner", "latest");
        await deleteDoc(pRef);
      } catch (err) {
        // console.error("Delete failed:", err);
      }
    }
    setGeneratedPlan(null);
    setSaved(false);
    setShowConfig(true);
    setShowDeleteConfirm(false);
  };

  const handleDeleteHistoryItem = async (e: React.MouseEvent, planId: string) => {
    e.stopPropagation();
    if (!firebaseUser) return;
    try {
      const pRef = doc(db, "users", firebaseUser.uid, "planner_history", planId);
      await deleteDoc(pRef);
      setHistoryPlans(prev => prev.filter(p => p.id !== planId));
    } catch (err) {
      // console.error("Delete history item failed:", err);
    }
  };

  const loadHistory = async () => {
    if (!firebaseUser) return;
    try {
      const q = query(
        collection(db, "users", firebaseUser.uid, "planner_history"),
        limit(20)
      );
      const querySnapshot = await getDocs(q);
      const plans: any[] = [];
      querySnapshot.forEach((doc) => {
        plans.push({ id: doc.id, ...doc.data() });
      });
      plans.sort((a, b) => {
        const timeA = a.createdAt ? parseInt(a.createdAt) : 0;
        const timeB = b.createdAt ? parseInt(b.createdAt) : 0;
        return timeB - timeA;
      });
      setHistoryPlans(plans);
      setShowHistory(true);
    } catch (err) {
      // console.error("Load history failed:", err);
      setShowHistory(true);
    }
  };

  const viewHistoryItem = (item: any) => {
    setAcademicLevel(item.academicLevel || profile.academicLevel);
    setBoard(item.board || profile.board);
    setSubjectsList(item.subjectsList || []);
    setDailyHours(item.dailyHours || 6);
    setExamDate(item.examDate || new Date().toISOString().split("T")[0]);
    setPriorityLevel(item.priorityLevel || "Medium");
    setWeakSubjects(item.weakSubjects || []);
    setGeneratedPlan(item.generatedPlan);
    setSaved(true);
    setShowConfig(false);
    setShowHistory(false);
  };

  const generateTextSummary = () => {
    if (!generatedPlan) return "";
    let textSummary = `NOVA AI ACADEMIC STUDY STRATEGY\n`;
    textSummary += `===============================\n`;
    textSummary += `Level: ${generatedPlan.academicLevel}\n`;
    textSummary += `Board: ${generatedPlan.board}\n`;
    textSummary += `Commitment: ${generatedPlan.dailyHours} Hours/Day\n\n`;
    textSummary += `DAILY TIMETABLE:\n`;
    generatedPlan.dailyTimetable.forEach(slot => {
      textSummary += `- [${slot.timeSlot}] (${slot.subject}) ${slot.activity}\n`;
    });
    textSummary += `\nROADMAP TO EXAM:\n`;
    generatedPlan.examRoadmap.forEach((step, idx) => {
      textSummary += `${idx + 1}. ${step}\n`;
    });
    return textSummary;
  };

  const handleCopyClipboard = () => {
    if (!generatedPlan) return;
    navigator.clipboard.writeText(generateTextSummary());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const [isExporting, setIsExporting] = useState(false);

  const handleDownloadPlan = async () => {
    if (!generatedPlan) return;
    setIsExporting(true);
    try {
      await new Promise(r => setTimeout(r, 100)); // allow UI update
      const element = document.getElementById("study-plan-render-container");
      if (!element) throw new Error("Study Plan container not found");
      
      const canvas = await html2canvas(element, { 
        scale: 1.5, 
        useCORS: true, 
        logging: false,
        backgroundColor: '#FFFFFF',
        windowWidth: element.scrollWidth,
        windowHeight: element.scrollHeight
      });
      
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save("Nova_AI_Study_Strategy.pdf");
    } catch (e) {
      // console.error("PDF generation failed:", e);
      alert("Failed to export PDF format.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleNewPlan = () => {
    setGeneratedPlan(null);
    setSaved(false);
    setShowConfig(true);
  };

  const getDialsLabel = (hours: number) => {
    if (hours <= 3) return { cat: "Core Refresh Routine", style: "text-green-400 bg-green-950/40" };
    if (hours <= 7) return { cat: "Cognition Building Routine", style: "text-amber-400 bg-amber-950/40" };
    return { cat: "Intense Study Block Schedule", style: "text-red-400 bg-red-950/40" };
  };

  const currentDials = getDialsLabel(dailyHours);

  return (
    <div className="space-y-8 pb-32 animate-[fadeIn_0.4s_ease-out]">
      
      {/* Overview Card */}
      <div className="p-4 md:p-6 rounded-3xl glass-card flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-2xl border ${isCrimson ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-blue-500/10 border-blue-500/20 text-blue-400'}`}>
            <Compass className="w-5 h-5 animate-[spin_8s_linear_infinite]" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight">Dynamic AI Study Planner</h1>
            <p className="text-xs text-white/50">Specify your study commitments to output high-yield roadmaps.</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={loadHistory}
            className="md:self-start bg-white/5 border border-white/10 hover:text-white px-3 py-2 rounded-xl text-xs font-bold text-white/80 hover:bg-white/10 transition-colors flex items-center gap-1.5 cursor-pointer backdrop-blur-sm "
          >
            <HistoryIcon className="w-4 h-4 text-white/60" />
            <span className="hidden sm:inline">History</span>
          </button>
          
          {generatedPlan && (
            <>
              <button
                onClick={() => setShowConfig(!showConfig)}
                className="md:self-start bg-white/5 border border-white/10 hover:text-white px-3 py-2 rounded-xl text-xs font-bold text-white/80 hover:bg-white/10 transition-colors flex items-center gap-1.5 cursor-pointer backdrop-blur-sm "
              >
                <Settings className="w-4 h-4 text-white/60" />
                <span className="hidden sm:inline">{showConfig ? "Close Settings" : "Edit Plan"}</span>
              </button>
              
              <button
                onClick={handleDownloadPlan}
                className="md:self-start bg-emerald-500/10 border border-emerald-500/20 hover:text-emerald-300 hover:bg-emerald-500/20 px-3 py-2 rounded-xl text-xs font-bold text-emerald-400 transition-colors flex items-center gap-1.5 cursor-pointer backdrop-blur-sm "
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Download</span>
              </button>
              
              <button
                onClick={handleNewPlan}
                className="md:self-start bg-white/5 border border-white/10 hover:text-white px-3 py-2 rounded-xl text-xs font-bold text-white/80 hover:bg-white/10 transition-colors flex items-center gap-1.5 cursor-pointer backdrop-blur-sm "
              >
                <Plus className="w-4 h-4 text-white/60" />
                <span className="hidden sm:inline">New Plan</span>
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 md:gap-8">
        
        {/* INPUT COLUMN (5/12) */}
        {showConfig && (
        <div className="lg:col-span-5 space-y-6">
          <div className="p-4 md:p-6 rounded-3xl glass-card space-y-5">
            <h2 className="text-xs sm:text-sm font-bold text-white/70 uppercase tracking-widest flex items-center gap-2 border-b border-white/10 pb-3">
              <Sliders className="w-4 h-4 text-white/40" />
              Syllabus Configurations
            </h2>

            {/* 1. Academic Level Select */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-white/30" />
                Education Grade Level
              </label>
              <select
                value={academicLevel}
                onChange={(e) => setAcademicLevel(e.target.value as IndianEducationLevel)}
                className="w-full px-4 py-2 rounded-2xl text-xs sm:text-sm focus:outline-none glass-input"
              >
                {Object.values(IndianEducationLevel).map((level) => (
                  <option key={level} value={level} className="bg-[#121216] text-white">{level}</option>
                ))}
              </select>
            </div>

            {/* 2. Educational Board Select */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-white/30" />
                Education Board
              </label>
              <select
                value={board}
                onChange={(e) => setBoard(e.target.value as IndianBoard)}
                className="w-full px-4 py-2 rounded-2xl text-xs sm:text-sm focus:outline-none glass-input"
              >
                {Object.values(IndianBoard).map((bd) => (
                  <option key={bd} value={bd} className="bg-[#121216] text-white">{bd} Syllabus</option>
                ))}
              </select>
            </div>

            {/* 3. Subject Mappings */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-white/30" />
                Subject Mappings ({subjectsList.length})
              </label>
              
              {/* Added Subjects chips */}
              <div className="flex flex-wrap gap-2 py-1">
                {subjectsList.map((subj) => (
                  <span 
                    key={subj} 
                    className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full bg-white/5 border border-white/10 text-white/80 backdrop-blur-sm"
                  >
                    {subj}
                    <button 
                      type="button" 
                      onClick={() => removeSubject(subj)}
                      className="text-white/40 hover:text-red-400 font-bold ml-1 cursor-pointer transition-colors"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>

              {/* Add Subject mini form */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newSubjectInput}
                  onChange={(e) => setNewSubjectInput(e.target.value)}
                  placeholder="Type subject (e.g. Accountancy)..."
                  className="flex-1 px-3 py-1.5 rounded-xl text-xs glass-input focus:outline-none"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      if (newSubjectInput.trim()) {
                        setSubjectsList(prev => [...prev, newSubjectInput.trim()]);
                        setNewSubjectInput("");
                      }
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={(e) => {
                    if (newSubjectInput.trim()) {
                      setSubjectsList(prev => [...prev, newSubjectInput.trim()]);
                      setNewSubjectInput("");
                    }
                  }}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold text-white cursor-pointer bg-white/5 hover:bg-white/10 border border-white/10 transition-colors backdrop-blur-sm"
                >
                  Add
                </button>
              </div>
            </div>

            {/* 4. Commitment hours */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-[10px] font-bold text-white/40 uppercase tracking-widest font-sans">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-white/30" />
                  Daily Commitment
                </span>
                <span className="text-white font-mono text-xs">{dailyHours} Hours/Day</span>
              </div>
              <input
                type="range"
                min="1"
                max="16"
                value={dailyHours}
                onChange={(e) => setDailyHours(parseInt(e.target.value))}
                className={`w-full cursor-pointer h-1.5 bg-white/5 rounded-lg appearance-none ${isCrimson ? 'accent-red-650' : 'accent-blue-500'}`}
              />
              <div className={`text-[9px] font-bold text-center px-4 py-1.5 rounded-xl ${currentDials.style}`}>
                {currentDials.cat.toUpperCase()}
              </div>
            </div>

            {/* 5. Exam Date Countdown Target */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-white/30" />
                Target exam milestone date
              </label>
              <input
                type="date"
                min={new Date().toISOString().split("T")[0]}
                value={examDate}
                onChange={(e) => setExamDate(e.target.value)}
                className="w-full px-4 py-2 rounded-2xl text-xs sm:text-sm focus:outline-none glass-input"
              />
            </div>

            {/* 6. Board Urgency Rate */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-white/30" />
                Syllabus urgency rate
              </label>
              <div className="flex gap-2">
                {(["High", "Medium", "Low"] as const).map((pr) => (
                  <button
                    key={pr}
                    type="button"
                    onClick={() => setPriorityLevel(pr)}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-xl border cursor-pointer transition-all ${
                      priorityLevel === pr 
                        ? (isCrimson ? "bg-red-500/15 border-red-500 text-red-400  shadow-red-500/10" : "bg-blue-500/15 border-blue-550 text-blue-300  shadow-blue-500/10")
                        : "bg-white/5 border-white/10 text-white/40 hover:bg-white/10 hover:text-white/80"
                    }`}
                  >
                    {pr}
                  </button>
                ))}
              </div>
            </div>

            {/* 7. Weak Curriculum Subjects */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                Weak subjects checklist
              </label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {subjectsList.map((subj) => (
                  <label 
                    key={subj} 
                    className={`flex items-center gap-2 p-2 rounded-xl border cursor-pointer transition-all ${
                      weakSubjects.includes(subj) 
                        ? "border-amber-500/40 text-amber-400 bg-amber-500/15  shadow-amber-500/5 backdrop-blur-sm" 
                        : "border-white/10 text-white/45 bg-white/2 hover:text-white/70 hover:bg-white/5"
                    }`}
                  >
                    <input 
                      type="checkbox"
                      checked={weakSubjects.includes(subj)}
                      onChange={() => toggleWeakSubject(subj)}
                      className="accent-amber-500 cursor-pointer w-3.5 h-3.5 rounded border-white/20 bg-white/5"
                    />
                    <span className="truncate">{subj}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Launch AI calculation trigger */}
            <button
              onClick={handleGenerateAIStrategy}
              disabled={loading}
              className={`w-full py-3.5 rounded-2xl font-bold text-xs sm:text-sm text-white cursor-pointer shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center gap-2 border ${
                loading 
                  ? "bg-white/5 text-white/20 border-white/10 pointer-events-none" 
                  : (isCrimson ? 'bg-red-600/70 hover:bg-red-550 border-red-550/30 hover:shadow-red-500/20 shadow-red-500/10' : 'bg-blue-600/70 hover:bg-blue-550 border-blue-550/30 hover:shadow-blue-500/20 shadow-blue-500/10')
              }`}
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Generating Study Strategy...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 animate-pulse" />
                  Generate Study Strategy
                </>
              )}
            </button>
          </div>
        </div>
        )}

        {/* OUTPUT SCREEN COLUMN (7/12) */}
        <div className={`${showConfig ? "lg:col-span-7" : "lg:col-span-12"} space-y-6`}>
          
          {loading && (
            <div className="p-6 md:p-12 rounded-3xl glass-card flex flex-col items-center justify-center text-center space-y-4 min-h-[400px]">
              <div className="relative">
                <div className={`w-12 h-12 rounded-full border-4 border-t-transparent animate-spin ${isCrimson ? 'border-red-500' : 'border-blue-500'}`}></div>
                <Sparkles className={`w-5 h-5 absolute top-3.5 left-3.5 animate-bounce ${isCrimson ? 'text-red-400' : 'text-blue-400'}`} />
              </div>
              <h3 className="text-sm font-bold text-white uppercase tracking-widest">Nova AI Strategist is calculating...</h3>
              <p className="text-xs text-white/50 max-w-sm leading-relaxed">
                Analyzing board pattern distributions, mapping weak-spots priority levels, and locking in spacing frequencies for robust CBSE/State retention modules.
              </p>
            </div>
          )}

          {!generatedPlan && !loading && (
            <div className="p-6 md:p-12 rounded-3xl glass-card flex flex-col items-center justify-center text-center space-y-4 min-h-[400px]">
              <Compass className="w-12 h-12 text-white/20 animate-pulse" />
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-widest">No active timetable formulated</h3>
                <p className="text-xs text-white/50 max-w-sm leading-relaxed mt-1">
                  Adjust standard parameters (level, syllabus tracking, priority coefficients) on the left panel, and click "Generate Study Strategy" to formulate a layout.
                </p>
              </div>
            </div>
          )}

          {generatedPlan && !loading && (
            <div className="space-y-6 animate-[fadeIn_0.5s_ease-out]">
              
              {/* Output Actions Toolbar Header */}
              <div className="p-4 rounded-2xl bg-black/40 border border-white/10 flex items-center justify-between  backdrop-blur-md">
                <span className="text-[10px] font-bold text-white/40 tracking-widest">STRATEGY READY</span>
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={handleCopyClipboard}
                    className="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/15 hover:text-white border border-white/10 text-xs font-bold text-white/80 flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span className="hidden sm:inline">{copied ? "Copied" : "Copy"}</span>
                  </button>

                  <button
                    onClick={handleSaveToCloud}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer text-white border ${
                      saved 
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                        : (isCrimson ? 'bg-red-600/70 hover:bg-red-550 border-red-500/30' : 'bg-blue-600/70 hover:bg-blue-550 border-blue-500/30')
                    }`}
                  >
                    <Bookmark className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">{saved ? "Saved" : "Save Plan"}</span>
                  </button>
                  
                  {showDeleteConfirm ? (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-bold text-red-400 sm:inline hidden">Confirm?</span>
                      <button
                        onClick={handleDeletePlan}
                        className="px-3.5 py-1.5 rounded-xl bg-red-500 hover:bg-red-600 border border-red-400 text-xs font-bold text-white transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        Delete
                      </button>
                      <button
                        onClick={() => setShowDeleteConfirm(false)}
                        className="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-white/80 transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      className="px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer text-red-400 border bg-red-500/10 border-red-500/20 hover:bg-red-500/20"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Delete</span>
                    </button>
                  )}
                </div>
              </div>

              {/* SECTION A: Daily Study Schedule (Pomodoro style slots) */}
              <div className="p-4 md:p-6 rounded-3xl glass-card space-y-4">
                <h3 className="text-xs sm:text-sm font-bold text-white/75 uppercase tracking-widest flex items-center gap-2 border-b border-white/10 pb-3">
                  <Clock className={`w-4 h-4 ${isCrimson ? 'text-red-400' : 'text-blue-400'}`} />
                  Daily Study Milestones
                </h3>

                <div className="space-y-3">
                  {generatedPlan.dailyTimetable.map((slot, idx) => (
                    <div key={idx} className="p-3.5 rounded-xl bg-white/5 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                      <div className="flex items-center gap-3">
                        <span className={`text-[10px] font-mono font-bold px-2.5 py-1 rounded-full ${isCrimson ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'}`}>
                          {slot.timeSlot}
                        </span>
                        <span className="text-xs font-semibold text-white/80">
                          {slot.activity}
                        </span>
                      </div>
                      <span className="text-xs font-bold text-white/50 px-3 py-1 rounded-lg bg-black/40 border border-white/10 tracking-widest truncate sm:max-w-[200px]" title={slot.subject}>
                        {slot.subject}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* SECTION B: Weekly study topics mapping */}
              <div className="p-4 md:p-6 rounded-3xl glass-card space-y-4">
                <h3 className="text-xs sm:text-sm font-bold text-white/75 uppercase tracking-widest flex items-center gap-2 border-b border-white/10 pb-3">
                  <BookMarked className={`w-4 h-4 ${isCrimson ? 'text-red-400' : 'text-blue-400'}`} />
                  Weekly Subject Roadmap (Suggested Topics)
                </h3>

                <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1">
                  {generatedPlan.weeklySchedule.map((dayPlan, dIdx) => (
                    <div key={dIdx} className="space-y-2">
                      <h4 className="text-[10px] font-bold text-white/40 uppercase tracking-widest pl-1">{dayPlan.day}</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {dayPlan.slots.map((subSlot, sIdx) => (
                          <div key={sIdx} className="p-3 rounded-xl bg-white/5 border border-white/10">
                            <span className="text-[9px] font-bold text-white/45 uppercase block tracking-wider">{subSlot.subject}</span>
                            <span className="text-xs font-semibold text-white/85 block mt-0.5">{subSlot.topic}</span>
                            <span className="text-[9px] font-mono text-white/30 block mt-1.5">{subSlot.time}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* SECTION C: AI Revision and Weak topic coverage */}
              <div className="p-4 md:p-6 rounded-3xl glass-card space-y-4">
                <h3 className="text-xs sm:text-sm font-bold text-white/75 uppercase tracking-widest flex items-center gap-2 border-b border-white/10 pb-3">
                  <AlertTriangle className={`w-4 h-4 ${isCrimson ? 'text-red-400' : 'text-blue-400'}`} />
                  AI Assisted Revision Scheduling
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {generatedPlan.revisionPlan.map((rev, rIdx) => (
                    <div key={rIdx} className="p-4 rounded-xl bg-white/5 border border-white/10 flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-center text-xs font-bold mb-2">
                          <span className="text-white truncate max-w-[120px]">{rev.subject}</span>
                          <span className="text-amber-450 font-mono">Every {rev.gapDays} days</span>
                        </div>
                        <ul className="space-y-1.5 pr-1">
                          {rev.focusAreas.map((area, aIdx) => (
                            <li key={aIdx} className="text-xs text-white/55 flex items-start gap-1.5">
                              <span className="text-amber-500/80 mt-1">•</span>
                              <span className="leading-relaxed">{area}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* SECTION D: Mock Tests schedule & Exam Roadmap */}
              <div className="p-4 md:p-6 rounded-3xl glass-card space-y-4">
                <h3 className="text-xs sm:text-sm font-bold text-white/75 uppercase tracking-widest flex items-center gap-2 border-b border-white/10 pb-3">
                  <Compass className={`w-4 h-4 ${isCrimson ? 'text-red-400' : 'text-blue-400'}`} />
                  Target Mock Evaluation Roadmap
                </h3>

                <div className="space-y-3.5 pl-4 border-l-2 border-white/10">
                  {generatedPlan.examRoadmap.map((road, rdIdx) => (
                    <div key={rdIdx} className="relative">
                      {/* bullet dot on line */}
                      <div className={`w-3 h-3 rounded-full absolute -left-[22px] top-1.5 border-2 bg-black ${isCrimson ? 'border-red-500' : 'border-blue-500'}`}></div>
                      <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider block">PHASE 0{rdIdx + 1}</span>
                      <p className="text-xs sm:text-sm font-medium text-white/80 mt-0.5 leading-relaxed">{road}</p>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

        </div>

      </div>

      {showHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm cursor-pointer" onClick={() => setShowHistory(false)}></div>
          <div className="relative w-full max-w-xl max-h-[80vh] overflow-y-auto rounded-3xl glass-card border border-white/10 p-6 shadow-2xl flex flex-col space-y-4 animate-[fadeIn_0.2s_ease-out]">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <HistoryIcon className={`w-5 h-5 ${isCrimson ? 'text-red-400' : 'text-blue-400'}`} />
                Planner History
              </h2>
              <button 
                onClick={() => setShowHistory(false)}
                className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-colors text-xs font-bold"
              >
                Close
              </button>
            </div>
            
            <div className="flex-1 space-y-3">
              {historyPlans.length === 0 ? (
                <div className="text-center py-8 text-white/50 text-sm font-medium">No saved plans found in history.</div>
              ) : (
                historyPlans.map((plan) => (
                  <div key={plan.id} className="p-4 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 transition-colors cursor-pointer group flex items-center justify-between" onClick={() => viewHistoryItem(plan)}>
                    <div>
                      <h3 className="text-sm font-bold text-white/90 group-hover:text-white">{plan.board} - {plan.academicLevel.split('(')[0].trim()}</h3>
                      <p className="text-xs text-white/50 mt-1">
                        {new Date(parseInt(plan.createdAt)).toLocaleString()} • {plan.generatedPlan?.examRoadmap ? "Completed Plan" : "Draft"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                       <button
                         onClick={(e) => handleDeleteHistoryItem(e, plan.id)}
                         className="p-1.5 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                         title="Delete Plan"
                       >
                         <Trash2 className="w-4 h-4" />
                       </button>
                       <ChevronRight className="w-4 h-4 text-white/30 group-hover:text-white/70" />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {generatedPlan && (
        <div className="fixed top-[20000px] left-[20000px] pointer-events-none">
          <div 
            id="study-plan-render-container" 
            className="w-[850px] bg-[#ffffff] text-[#0B2B5E] p-[48px] font-sans relative flex flex-col"
            style={{ 
              fontFamily: "'Inter', sans-serif"
            }}
          >
            {/* Header section */}
            <div className="flex flex-col items-center border-b-[2px] border-[#C89D42] pb-6 mb-8 relative">
              <div className="flex items-center gap-4 mb-2">
                {/* Logo mark */}
                <div className="text-[44px] font-black text-[#0B2B5E] leading-none" style={{ fontFamily: "'Space Grotesk', sans-serif"}}>
                  N<span className="text-[#C89D42]">.</span>
                </div>
                <div className="flex flex-col">
                  <h1 className="text-[36px] font-black tracking-widest text-[#0B2B5E] leading-none" style={{ fontFamily: "'Space Grotesk', sans-serif"}}>NOVA AI</h1>
                  <p className="text-[10px] font-bold text-[#C89D42] tracking-[0.2em] uppercase mt-1 flex items-center gap-2">
                    <span className="w-6 h-[1px] bg-[#C89D42]"></span>
                    SMARTER LEARNING, BETTER FUTURES
                    <span className="w-6 h-[1px] bg-[#C89D42]"></span>
                  </p>
                </div>
              </div>
              <h2 className="text-[38px] font-black tracking-widest uppercase text-[#0B2B5E] mt-4" style={{ fontFamily: "'Space Grotesk', sans-serif"}}>
                ACADEMIC STUDY STRATEGY
              </h2>
              {/* Star overlay on border */}
              <div className="absolute -bottom-[12px] bg-[#ffffff] px-2 text-[#C89D42]">
                ✦
              </div>
            </div>

            {/* Profile Cards */}
            <div className="grid grid-cols-3 gap-4 md:gap-6 mb-10">
              <div className="rounded-2xl border border-[#e4e4e7] p-5 flex flex-col items-center bg-[#ffffff] ">
                <div className="bg-[#0B2B5E] text-[#ffffff] p-3 rounded-xl mb-3">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
                </div>
                <p className="text-[13px] font-black tracking-widest uppercase text-[#0B2B5E] mb-1">LEVEL</p>
                <p className="text-[12px] font-bold text-[#27272a] text-center">{generatedPlan.academicLevel}</p>
              </div>
              <div className="rounded-2xl border border-[#e4e4e7] p-5 flex flex-col items-center bg-[#ffffff] ">
                <div className="bg-[#0B2B5E] text-[#ffffff] p-3 rounded-xl mb-3">
                  <BookOpen className="w-6 h-6" />
                </div>
                <p className="text-[13px] font-black tracking-widest uppercase text-[#0B2B5E] mb-1">BOARD</p>
                <p className="text-[12px] font-bold text-[#27272a] text-center">{generatedPlan.board}</p>
              </div>
              <div className="rounded-2xl border border-[#e4e4e7] p-5 flex flex-col items-center bg-[#ffffff] ">
                <div className="bg-[#0B2B5E] text-[#ffffff] p-3 rounded-xl mb-3">
                  <Clock className="w-6 h-6" />
                </div>
                <p className="text-[13px] font-black tracking-widest uppercase text-[#0B2B5E] mb-1">COMMITMENT</p>
                <p className="text-[12px] font-bold text-[#27272a] text-center">{generatedPlan.dailyHours} Hours/Day</p>
              </div>
            </div>

            {/* Daily Timetable Section */}
            <div className="flex justify-center relative mb-6 mt-2">
               <div className="absolute w-full h-[2px] bg-[#0B2B5E] top-1/2 -translate-y-1/2 z-0"></div>
               <div className="relative z-10 px-8 py-2 bg-[#0B2B5E] text-[#ffffff] rounded-full text-lg font-black tracking-widest uppercase">
                 DAILY TIMETABLE
               </div>
            </div>

            <div className="flex flex-col gap-3 mb-12">
              {generatedPlan.dailyTimetable.slice(0, Math.min(8, generatedPlan.dailyTimetable.length)).map((slot, i) => (
                <div key={i} className="flex border border-[#e4e4e7] rounded-xl overflow-hidden  h-[50px]">
                  <div className="w-[180px] bg-[#0B2B5E] text-[#ffffff] font-bold px-4 flex items-center justify-center text-[13px] tracking-wider shrink-0 h-full">
                    {slot.timeSlot}
                  </div>
                  <div className="w-[200px] border-r border-[#e4e4e7] px-4 font-black text-[#0B2B5E] text-[13px] uppercase tracking-wider flex items-center justify-start shrink-0 h-full">
                    {slot.subject}
                  </div>
                  <div className="flex-1 px-4 font-semibold text-[#27272a] text-[13px] flex items-center bg-[#fafafa] h-full">
                    {slot.activity}
                  </div>
                </div>
              ))}
            </div>

            {/* Roadmap to Exam Section */}
            <div className="flex justify-center relative mb-8 mt-2">
               <div className="absolute w-full h-[2px] bg-[#0B2B5E] top-1/2 -translate-y-1/2 z-0"></div>
               <div className="relative z-10 px-8 py-2 bg-[#0B2B5E] text-[#ffffff] rounded-full text-lg font-black tracking-widest uppercase">
                 ROADMAP TO EXAM
               </div>
            </div>

            <div className="flex flex-col gap-4 md:gap-6 mb-16 px-4">
              {generatedPlan.examRoadmap.slice(0, 5).map((step, i) => {
                let dateStr = 'Phase ' + (i+1);

                return (
                <div key={i} className="flex items-center gap-4 md:gap-6 relative">
                  {/* Vertical connecting line */}
                  {i < Math.min(4, generatedPlan.examRoadmap.length - 1) && (
                    <div className="absolute left-5 top-10 w-[2px] h-[45px] bg-[#C89D42] opacity-50 z-0"></div>
                  )}

                  {/* Circle number */}
                  <div className="w-10 h-10 rounded-full bg-[#0B2B5E] text-[#ffffff] flex items-center justify-center font-black text-[18px] shrink-0  relative z-10">
                    {i + 1}
                  </div>
                  
                  {/* Content card */}
                  <div className="flex-1 border border-[#e6decc] bg-[#fcf9f2] rounded border-l-0  pr-6 h-[50px] flex items-center relative overflow-hidden">
                     {/* Orange left edge */}
                     <div className="flex-1 px-4 font-bold text-[#27272a] text-[14px]">
                      {step}
                     </div>
                     <div className="flex items-center gap-2 text-[#C89D42] font-black text-[14px] shrink-0 border-l border-[#e6decc] pl-6 h-full mr-4 bg-[#fffaf0]">
                       <Calendar className="w-5 h-5 opacity-80" />
                       {dateStr}
                     </div>
                  </div>
                </div>
              )})}
            </div>

            {/* Footer */}
            <div className="mt-auto pt-6 border-t-[2px] border-[#C89D42] relative flex flex-col items-center">
              {/* Star overlay on border */}
              <div className="absolute -top-[12px] bg-[#ffffff] px-2 text-[#C89D42]">
                ✦
              </div>

              <div className="flex items-center gap-3 mb-4">
                <div className="bg-[#0B2B5E] text-[#ffffff] p-2 rounded-full ">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
                </div>
                <h3 className="text-[15px] font-black tracking-widest uppercase text-[#0B2B5E]">
                  PLAN TODAY. STUDY SMART. SUCCEED TOMORROW.
                </h3>
              </div>

              <div className="flex items-center gap-5 md:gap-8 text-[12px] font-bold text-[#0B2B5E] opacity-80 mt-2">
                <div className="flex items-center gap-2">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                  www.novaai.in
                </div>
                <div className="w-[1px] h-4 bg-[#0B2B5E] opacity-30"></div>
                <div className="flex items-center gap-2">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                  hello@novaai.in
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}
