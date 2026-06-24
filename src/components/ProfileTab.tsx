/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { 
  CircleUser, 
  Settings, 
  MapPin, 
  GraduationCap, 
  Phone, 
  Mail, 
  Sparkles, 
  Save, 
  Trophy, 
  Award, 
  Flame, 
  CheckCircle2, 
  Palette, 
  Loader2, 
  Check,
  Building2,
  Calendar,
  Camera
} from "lucide-react";
import { awardXP, getLevelForXP } from "../lib/xpSystem";
import { UserAcademicProfile, WorkspaceTheme, IndianEducationLevel, IndianBoard } from "../types";

interface ProfileTabProps {
  profile: UserAcademicProfile;
  setProfile: React.Dispatch<React.SetStateAction<UserAcademicProfile>>;
  theme: WorkspaceTheme;
  setTheme: (theme: WorkspaceTheme) => void;
  handleSignOut?: () => void;
  firebaseUser?: any;
}

export default function ProfileTab({ profile, setProfile, theme, setTheme, handleSignOut, firebaseUser }: ProfileTabProps) {
  const runtimeLevelInfo = getLevelForXP(profile.totalXP || profile.xp || 0);
  const displayLevel = profile.currentLevel || runtimeLevelInfo.level;
  
  const [editing, setEditing] = useState(false);
  const [loadingBio, setLoadingBio] = useState(false);
  const [careerPersona, setCareerPersona] = useState("Targeting engineering at IIT Bombay");

  const isCrimson = theme === "NovaCrimson";

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 1 * 1024 * 1024) {
      alert("Please upload an image smaller than 1MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
       const img = new Image();
       img.onload = () => {
         const canvas = document.createElement('canvas');
         const MAX_WIDTH = 500;
         const MAX_HEIGHT = 500;
         let width = img.width;
         let height = img.height;

         if (width > height) {
           if (width > MAX_WIDTH) {
             height *= MAX_WIDTH / width;
             width = MAX_WIDTH;
           }
         } else {
           if (height > MAX_HEIGHT) {
             width *= MAX_HEIGHT / height;
             height = MAX_HEIGHT;
           }
         }
         canvas.width = width;
         canvas.height = height;
         const ctx = canvas.getContext('2d');
         ctx?.drawImage(img, 0, 0, width, height);
         // Compress down to smaller byte size to avoid quota exceeded
         const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
         
         setProfile(p => ({ ...p, avatarUrl: dataUrl }));
       };
       img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };


  // AI-powered custom study slogan bio generator
  const handleGenerateAIBio = async () => {
    setLoadingBio(true);
    try {
      const res = await fetch("/api/auto-bio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: profile.fullName,
          academicLevel: profile.academicLevel,
          board: profile.board,
          schoolCollegeName: profile.schoolCollegeName,
          careerPersona: careerPersona
        })
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Profile API Error ${res.status}: ${res.statusText}. Details: ${errText}`);
      }

      const data = await res.json();
      
      setProfile((p) => ({
        ...p,
        bio: data.bio ? `${data.bio} | Motto: ${data.motivationQuote}` : p.bio
      }));
      awardXP(firebaseUser?.uid || "local_user", "RESUME_CREATED");

      alert("AI study persona slogan generated & updated on your dashboard summary!");
    } catch (err: any) {
      console.error("Firebase Error: AI identity generation failed", err);
      alert(`AI identity generation failed: ${err.message || String(err)}`);
    } finally {
      setLoadingBio(false);
    }
  };

  const badges = [
    { id: "1", name: "Concept Maverick", desc: "For solving doubts step logic", color: "from-rose-500/20 to-red-650/40 text-red-400" },
    { id: "2", name: "Consistent Scholar", desc: "Completing structured AI strategy plans", color: "from-amber-500/20 to-orange-600/40 text-amber-400" },
    { id: "3", name: "Quiz Conqueror", desc: "Scoring full marks in MCQ tests sessions", color: "from-emerald-500/20 to-teal-500/40 text-emerald-400" },
  ];

  return (
    <div className="space-y-8 pb-32 animate-[fadeIn_0.4s_ease-out]">
      
      {/* 1. PROFILE TOP HEADER PROFILE CARD */}
      <div className="p-4 md:p-6 rounded-3xl glass-card flex flex-col md:flex-row items-center gap-4 md:gap-6 relative overflow-hidden">
        
        {/* Colorful neon background aura */}
        <div className={`absolute top-0 right-0 w-80 h-85 rounded-full blur-[100px] pointer-events-none ${isCrimson ? 'bg-red-500/10' : 'bg-blue-500/10'}`}></div>

        <div className="relative">
          <label className={`w-28 h-28 rounded-full border flex flex-col items-center justify-center bg-white/5 backdrop-blur-sm shadow-xl cursor-pointer relative group overflow-hidden ${isCrimson ? 'border-red-500/40 shadow-red-500/10' : 'border-blue-500/40 shadow-blue-500/10'}`}>
            <input type="file" className="hidden" accept="image/*" onChange={handleAvatarChange} />
            {profile.avatarUrl ? (
              <img src={profile.avatarUrl} className="w-full h-full object-cover rounded-full" alt="avatar" />
            ) : (
              <CircleUser className={`w-20 h-20 ${isCrimson ? 'text-red-400/85' : 'text-blue-400/85'}`} />
            )}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-opacity text-white text-[10px] font-bold">
              <Camera className="w-4 h-4 mb-1" /> Change
            </div>
          </label>
          <div className="absolute -bottom-1 -right-1 px-3 py-1 rounded-full bg-black/65 border border-white/10 text-[10px] font-bold text-white/80 font-mono backdrop-blur-md">
            LVL {displayLevel}
          </div>
        </div>

        <div className="flex-1 text-center md:text-left space-y-2">
          <div className="flex flex-col md:flex-row md:items-center gap-2">
            <h1 className="text-2xl font-extrabold text-white tracking-tight">{profile.fullName}</h1>
            <span className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full w-fit mx-auto md:mx-0 ${isCrimson ? 'bg-red-500/10 border border-red-500/20 text-red-500' : 'bg-blue-500/10 border border-blue-500/20 text-blue-400'}`}>
              Scholar Certificate ID LOCKED
            </span>
          </div>

          <p className="text-xs sm:text-sm text-white/60 font-medium leading-relaxed max-w-xl">
            {profile.bio ? profile.bio : "Use the AI Persona customized studio below to forge details, study taglines, and target board certifications!"}
          </p>

          <div className="flex flex-wrap justify-center md:justify-start gap-4 text-xs text-white/40 pt-1 font-medium">
            <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-white/30" /> {profile.location || "Location not configured"}</span>
            <span className="flex items-center gap-1.5"><GraduationCap className="w-3.5 h-3.5 text-white/30" /> {profile.academicLevel || "Grade Not Set"} • {profile.board || "Board Not Set"}</span>
            <span className="flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5 text-white/30" /> {profile.schoolCollegeName || "Not configured"}</span>
          </div>
        </div>

        <button
          onClick={() => {
            setEditing(!editing);
          }}
          className="md:self-start bg-white/5 border border-white/10 hover:text-white px-4 py-2 rounded-xl text-xs font-bold text-white/80 hover:bg-white/10 transition-colors flex items-center gap-1.5 cursor-pointer backdrop-blur-sm"
        >
          <Settings className="w-4 h-4 text-white/60" />
          {editing ? "Close" : "Edit Profile"}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 md:gap-8">
        
        {/* EDIT WORKSPACE FORM / CREDENTIALS DETAILS (LEFT / 7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          
          {editing ? (
            <div className="p-4 md:p-6 rounded-3xl glass-card space-y-4">
              <h2 className="text-xs sm:text-sm font-bold text-white/70 uppercase tracking-widest border-b border-white/10 pb-3 flex items-center gap-2">
                <Settings className="w-4 h-4 text-white/40" /> Configure Qualifications (Autosaves)
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest block animate-pulse">Full Name</label>
                  <input 
                    type="text"
                    value={profile.fullName}
                    onChange={(e) => setProfile(p => ({ ...p, fullName: e.target.value }))}
                    className="w-full text-white text-xs sm:text-sm px-4 py-2.5 rounded-xl border glass-input focus:outline-none"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest block">Contact Phone No</label>
                  <input 
                    type="text"
                    value={profile.phoneNumber}
                    onChange={(e) => setProfile(p => ({ ...p, phoneNumber: e.target.value }))}
                    placeholder="e.g. +91 9876543210"
                    className="w-full text-white text-xs sm:text-sm px-4 py-2.5 rounded-xl border glass-input focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest block">City / State</label>
                  <input 
                    type="text"
                    value={profile.location}
                    onChange={(e) => setProfile(p => ({ ...p, location: e.target.value }))}
                    placeholder="e.g. Mumbai, Maharashtra"
                    className="w-full text-white text-xs sm:text-sm px-4 py-2.5 rounded-xl border glass-input focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest block">Affiliated School or College</label>
                  <input 
                    type="text"
                    value={profile.schoolCollegeName}
                    onChange={(e) => setProfile(p => ({ ...p, schoolCollegeName: e.target.value }))}
                    placeholder="e.g. Kendriya Vidyalaya CBSE"
                    className="w-full text-white text-xs sm:text-sm px-4 py-2.5 rounded-xl border glass-input focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest block">Academic Year</label>
                  <input 
                    type="text"
                    value={profile.academicYear}
                    onChange={(e) => setProfile(p => ({ ...p, academicYear: e.target.value }))}
                    placeholder="e.g. 2026-2027"
                    className="w-full text-white text-xs sm:text-sm px-4 py-2.5 rounded-xl border glass-input focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Education Grade Level</label>
                  <select
                    value={profile.academicLevel}
                    onChange={(e) => setProfile(p => ({ ...p, academicLevel: e.target.value as any }))}
                    className="w-full text-white text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border focus:outline-none glass-input"
                  >
                    {Object.values(IndianEducationLevel).map(v => (
                      <option key={v} value={v} className="bg-[#121216] text-white">{v}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Education Board</label>
                  <select
                    value={profile.board}
                    onChange={(e) => setProfile(p => ({ ...p, board: e.target.value as any }))}
                    className="w-full text-white text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border focus:outline-none glass-input"
                  >
                    {Object.values(IndianBoard).map(v => (
                      <option key={v} value={v} className="bg-[#121216] text-white">{v}</option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setEditing(false)}
                className={`w-full py-3.5 rounded-xl text-xs font-bold text-white border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  isCrimson ? 'bg-red-650 hover:bg-red-600 border-red-500/20' : 'bg-blue-650 hover:bg-blue-600 border-blue-500/20'
                }`}
              >
                <Check className="w-4 h-4" />
                Done Editing
              </button>
            </div>
          ) : (
            
            // PROFILE SUMMARY DISPLAY VIEW
            <div className="p-4 md:p-6 rounded-3xl glass-card space-y-6">
              <h2 className="text-xs sm:text-sm font-bold text-white/70 uppercase tracking-widest border-b border-white/10 pb-3 flex items-center gap-2">
                <CircleUser className="w-4 h-4 text-white/45" /> Academic Credentials Folder
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-2">
                <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-xs text-white/85">
                  <span className="text-white/40 uppercase font-bold tracking-wider block mb-1">Email Credentials</span>
                  <div className="flex items-center gap-2 text-white font-semibold truncate">
                    <Mail className="w-3.5 h-3.5 text-white/50 flex-shrink-0" />
                    <span>{profile.email}</span>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-xs text-white/85">
                  <span className="text-white/40 uppercase font-bold tracking-wider block mb-1">Contact Phone</span>
                  <div className="flex items-center gap-2 text-white font-semibold">
                    <Phone className="w-3.5 h-3.5 text-white/50" />
                    <span>{profile.phoneNumber || "Not configured"}</span>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-xs text-white/85">
                  <span className="text-white/40 uppercase font-bold tracking-wider block mb-1">Affiliated School / College</span>
                  <div className="flex items-center gap-2 font-semibold truncate">
                    <Building2 className="w-3.5 h-3.5 text-white/50 flex-shrink-0" />
                    <span>{profile.schoolCollegeName || "Not configured"}</span>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-xs text-white/85">
                  <span className="text-white/40 uppercase font-bold tracking-wider block mb-1">Academic Calendar Year</span>
                  <div className="flex items-center gap-2 font-semibold">
                    <Calendar className="w-3.5 h-3.5 text-white/50" />
                    <span>{profile.academicYear || "Not configured"}</span>
                  </div>
                </div>
              </div>

              {/* AI IDENTITY CUSTOMIZER FOR MOTTO BANNER AND BIOS */}
              <div className="p-5 rounded-3xl bg-white/5 border border-white/10 space-y-4">
                <div className="flex justify-between items-center text-xs font-bold border-b border-white/10 pb-2">
                  <span className="text-white flex items-center gap-1"><Sparkles className={`w-3.5 h-3.5 ${isCrimson ? 'text-red-400' : 'text-blue-400'}`} /> AI Identity Customizer Slogans</span>
                  <span className="text-white/40 font-mono text-[9px]">LAUNCH AI ENGINE</span>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-white/50 uppercase tracking-widest block">Specify professional career targets or passions</label>
                    <input 
                      type="text"
                      value={careerPersona}
                      onChange={(e) => setCareerPersona(e.target.value)}
                      placeholder="e.g. TARGETING UPSC IAS EXAMS / target civil services, JEE Mains, corporate banking"
                      className="w-full glass-input text-xs sm:text-sm px-4 py-2.5 rounded-xl text-white placeholder-white/30 focus:outline-none"
                    />
                  </div>

                  <button
                    onClick={handleGenerateAIBio}
                    type="button"
                    disabled={loadingBio || !careerPersona.trim()}
                    className={`w-full py-2.5 rounded-xl text-xs font-bold text-white border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      isCrimson ? 'bg-red-650 hover:bg-red-600 border-red-500/20' : 'bg-blue-650 hover:bg-blue-600 border-blue-500/20'
                    }`}
                  >
                    {loadingBio ? <><Loader2 className="w-4 h-4 animate-spin" /> Auto-Generating slogan bio...</> : <><Sparkles className="w-4 h-4" /> Formulate Study Bio & Motto (+50 XP)</>}
                  </button>
                </div>
              </div>

            </div>
          )}

        </div>

        {/* GENERAL STATUS STATISTICS & THEME SELECTOR BUTTONS (RIGHT / 5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* THEME CONTROL MODE */}
          <div className="p-4 md:p-6 rounded-3xl glass-card space-y-4">
            <h2 className="text-xs sm:text-sm font-bold text-white/70 uppercase tracking-widest flex items-center gap-2">
              <Palette className={`w-4 h-4 ${isCrimson ? 'text-red-400' : 'text-blue-400'}`} /> Workspace Theme Mode
            </h2>

            <div className="grid grid-cols-2 gap-3 text-[10px] sm:text-xs font-bold">
              <button
                onClick={() => setTheme("NovaCrimson")}
                className={`py-3.5 px-3 border rounded-2xl cursor-pointer transition-all ${
                  isCrimson 
                    ? 'border-red-500 bg-red-550/20 text-red-405 shadow-[0_0_15px_rgba(239,68,68,0.2)]' 
                    : 'border-white/10 text-white/40 hover:text-white/75 bg-white/2'
                }`}
              >
                NOVA CRIMSON (RED)
              </button>

              <button
                onClick={() => setTheme("AuraIndigo")}
                className={`py-3.5 px-3 border rounded-2xl cursor-pointer transition-all ${
                  !isCrimson 
                    ? 'border-blue-500 bg-blue-550/20 text-blue-405 shadow-[0_0_15px_rgba(59,130,246,0.2)]' 
                    : 'border-white/10 text-white/40 hover:text-white/75 bg-white/2'
                }`}
              >
                AURA INDIGO (BLUE)
              </button>
            </div>
            
            <p className="text-[9px] text-white/40 text-center uppercase tracking-wider font-semibold">Toggles design layouts between mock references</p>
          </div>

          {/* ACADEMIC STUDY MILESTONE TRACKERS */}
          <div className="p-4 md:p-6 rounded-3xl glass-card space-y-4">
            <h2 className="text-xs sm:text-sm font-bold text-white/75 uppercase tracking-widest flex items-center gap-2">
              <Trophy className={`w-4 h-4 ${isCrimson ? "text-red-405" : "text-blue-405"}`} /> Scholar Analytics
            </h2>

            <div className="grid grid-cols-3 gap-3.5 text-center text-xs font-bold">
              <div className="p-3 bg-white/5 border border-white/10 rounded-2xl">
                <span className="text-white/40 uppercase text-[9px] block">Streak</span>
                <p className="text-xl text-orange-400 mt-1 flex items-center justify-center gap-1">
                  <Flame className="w-4 h-4 animate-bounce" /> {profile.streak} Days
                </p>
              </div>

              <div className="p-3 bg-white/5 border border-white/10 rounded-2xl">
                <span className="text-white/40 uppercase text-[9px] block">Tasks closed</span>
                <p className="text-xl text-white mt-1">{profile.completedTasks}</p>
              </div>

              <div className="p-3 bg-white/5 border border-white/10 rounded-2xl">
                <span className="text-white/40 uppercase text-[9px] block">Quizzes</span>
                <p className={`text-xl mt-1 ${isCrimson ? "text-red-400" : "text-blue-400"}`}>{profile.completedQuizzes}</p>
              </div>
            </div>
          </div>

          {/* BADGES METRICS SYSTEM */}
          <div className="p-4 md:p-6 rounded-3xl glass-card space-y-4">
            <h2 className="text-xs sm:text-sm font-bold text-white/75 uppercase tracking-widest flex items-center gap-2">
              <Award className={`w-4 h-4 ${isCrimson ? "text-red-400" : "text-blue-400"}`} /> Unlocked Merit Badges
            </h2>

            <div className="space-y-2.5">
              {badges.map(b => (
                <div key={b.id} className="p-3 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-3">
                  <div className={`p-2 rounded-xl border bg-[#121216] ${isCrimson ? 'text-red-405 border-red-500/10' : 'text-blue-400 border-blue-500/10'}`}>
                    <Trophy className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white/90">{b.name}</h4>
                    <p className="text-[10px] text-white/40 leading-tight mt-0.5">{b.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={handleSignOut}
            className={`w-full py-3.5 rounded-xl text-sm font-bold text-white border transition-all cursor-pointer flex items-center justify-center gap-2 ${
              isCrimson ? 'bg-red-650 hover:bg-red-600 border-red-500/20 shadow-red-900/20 shadow-lg' : 'bg-blue-650 hover:bg-blue-600 border-blue-500/20 shadow-blue-900/20 shadow-lg'
            }`}
          >
            Logout
          </button>

        </div>

      </div>

    </div>
  );
}
