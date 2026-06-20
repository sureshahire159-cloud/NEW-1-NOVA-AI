/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { 
  Zap, 
  HelpCircle, 
  FileText, 
  BookOpen, 
  Trophy, 
  GraduationCap, 
  Sparkles, 
  ArrowLeft, 
  Upload, 
  Copy, 
  Check, 
  Loader2, 
  Cpu, 
  FileSpreadsheet, 
  Bookmark, 
  TrendingUp, 
  Eye, 
  RefreshCw,
  Search,
  BookMarked,
  Send,
  Trash2,
  Paperclip,
  Pin,
  PinOff,
  Volume2,
  VolumeX,
  Share2,
  Download,
  Edit2,
  Plus,
  Clock,
  ArrowUpRight,
  Award,
  Mic,
  MicOff,
  User,
  Activity,
  Maximize2,
  CloudUpload,
  XCircle,
  AlertTriangle,
  CheckCircle,
  DownloadCloud
} from "lucide-react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from "docx";
import { saveAs } from "file-saver";
import { awardXP } from "../lib/xpSystem";
import { UserAcademicProfile, WorkspaceTheme, Flashcard } from "../types";

const EDUCATION_LEVEL_SUBJECT_MAP = {
  "Primary School (Class 1–5)": [
    "English", "Mathematics", "Science", "Environmental Studies", "Hindi", "General Knowledge"
  ],
  "Middle School (Class 6–8)": [
    "English", "Mathematics", "Science", "Environmental Studies", "Hindi", "General Knowledge"
  ],
  "Secondary School (Class 9–10)": [
    "Mathematics", "Science", "English", "Social Science", "Hindi", "Computer Science"
  ],
  "Higher Secondary Science (Class 11–12)": [
    "Physics", "Chemistry", "Mathematics", "Biology", "Computer Science", "English"
  ],
  "Higher Secondary Commerce (Class 11–12)": [
    "Accountancy", "Business Studies", "Economics", "Mathematics", "English"
  ],
  "Higher Secondary Arts/Humanities (Class 11–12)": [
    "History", "Geography", "Political Science", "Sociology", "Psychology", "Economics", "English"
  ],
  "Undergraduate/Graduate Education": [
    "Engineering", "Computer Science", "AI & Data Science", "Commerce", "Management", "Economics", "Law", "Medical Sciences", "Arts & Humanities", "Science"
  ]
};

interface ArsenalTabProps {
  profile: UserAcademicProfile;
  setProfile: React.Dispatch<React.SetStateAction<UserAcademicProfile>>;
  theme: WorkspaceTheme;
  firebaseUser?: any;
}

type ActiveTool = 
  | null
  | "doubt_solver"
  | "doc_synthesizer"
  | "quiz_master"
  | "career_studio";

export default function ArsenalTab({ profile, setProfile, theme, firebaseUser }: ArsenalTabProps) {
  const [activeTool, setActiveTool] = useState<ActiveTool>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const isCrimson = theme === "NovaCrimson";

  // Shared Copy text helper
  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // TOOL 1: Doubt Solver Conversational States
  const [conversations, setConversations] = useState<any[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [teachingMode, setTeachingMode] = useState<"Beginner" | "Intermediate" | "Advanced">("Intermediate");
  const [doubtText, setDoubtText] = useState("");
  const [doubtSubject, setDoubtSubject] = useState("Mathematics");
  const [doubtImageBase64, setDoubtImageBase64] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingConvId, setEditingConvId] = useState<string | null>(null);
  const [editingTitleText, setEditingTitleText] = useState("");
  const [activeSpeechText, setActiveSpeechText] = useState<string | null>(null);
  const [isVoiceRecording, setIsVoiceRecording] = useState(false);
  const [activeMetadata, setActiveMetadata] = useState<any>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isDraggingDoc, setIsDraggingDoc] = useState(false);

  // Chat Auto-scroll Ref
  const chatMessagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll logic
  const scrollToBottom = () => {
    chatMessagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages, loading]);

  // Local Storage conversations loader
  useEffect(() => {
    if (activeTool !== "doubt_solver") return;
    try {
      const stored = localStorage.getItem("nova_conversations");
      if (stored) {
        setConversations(JSON.parse(stored));
      }
    } catch(e) {}
  }, [activeTool]);

  // Local Storage document history loader
  useEffect(() => {
    if (activeTool !== "doc_synthesizer") return;
    try {
      const storedLocal = localStorage.getItem("nova_doc_history");
      if (storedLocal) {
        setDocHistory(JSON.parse(storedLocal));
      }
    } catch(e) {}
  }, [activeTool]);

  // Local Storage quiz history loader
  useEffect(() => {
    if (activeTool !== "quiz_master") return;
    try {
      const storedQuiz = localStorage.getItem("nova_quiz_history");
      if (storedQuiz) {
        setQuizHistory(JSON.parse(storedQuiz));
      }
    } catch(e) {}
  }, [activeTool]);

  // Local Storage career history loader
  useEffect(() => {
    if (activeTool !== "career_studio") return;
    try {
      const storedCareer = localStorage.getItem("nova_career_history");
      if (storedCareer) {
        setCareerHistory(JSON.parse(storedCareer));
      }
    } catch(e) {}
  }, [activeTool]);

  // Local Storage messages loader
  useEffect(() => {
    if (activeTool !== "doubt_solver" || !activeConvId) {
      setMessages([]);
      setActiveMetadata(null);
      return;
    }
    
    try {
      const stored = localStorage.getItem(`nova_messages_${activeConvId}`);
      if (stored) {
        const list = JSON.parse(stored);
        setMessages(list);

        // Inspect last AI message suggestion fields
        const aiMsgs = list.filter((m: any) => m.sender === "ai");
        if (aiMsgs.length > 0) {
          const lastAi = aiMsgs[aiMsgs.length - 1];
          if (lastAi.suggestions || lastAi.subject) {
            setActiveMetadata({
              subject: lastAi.subject,
              topic: lastAi.topic,
              difficulty: lastAi.difficulty,
              suggestedRelatedTopics: lastAi.suggestions?.suggestedRelatedTopics || lastAi.suggestedRelatedTopics || [],
              suggestedRevisionMaterials: lastAi.suggestions?.suggestedRevisionMaterials || [],
              suggestedPracticeQuestions: lastAi.suggestions?.suggestedPracticeQuestions || [],
              suggestedQuizzes: lastAi.suggestions?.suggestedQuizzes || []
            });
          }
        }
      }
    } catch(e) {}
  }, [activeTool, activeConvId]);

  // Speak Response text helper
  const handleSpeakText = (text: string) => {
    if (activeSpeechText === text) {
      window.speechSynthesis?.cancel();
      setActiveSpeechText(null);
    } else {
      window.speechSynthesis?.cancel();
      const cleanVoiceText = text
        .replace(/\*\*/g, "")
        .replace(/###/g, "")
        .replace(/-\s/g, "")
        .replace(/`[^`]+`/g, "");
      const utterance = new SpeechSynthesisUtterance(cleanVoiceText);
      utterance.onend = () => setActiveSpeechText(null);
      utterance.onerror = () => setActiveSpeechText(null);
      setActiveSpeechText(text);
      window.speechSynthesis?.speak(utterance);
    }
  };

  // Toggle web speech mic input
  const handleToggleVoiceInput = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser. Try Google Chrome or Safari!");
      return;
    }

    if (isVoiceRecording) {
      setIsVoiceRecording(false);
    } else {
      setIsVoiceRecording(true);
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = "en-IN"; // Set to Indian English pronunciation context

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setDoubtText(prev => prev ? prev + " " + transcript : transcript);
        setIsVoiceRecording(false);
      };

      recognition.onerror = () => {
        setIsVoiceRecording(false);
      };

      recognition.onend = () => {
        setIsVoiceRecording(false);
      };

      recognition.start();
    }
  };

  // Base64 helper
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setDoubtImageBase64(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Dispatch message handling
  const handleSolveDoubt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!doubtText.trim() && !doubtImageBase64) return;
    
    const queryToSend = doubtText.trim() || "[Attached Equation whiteboard snap]";
    const currentUid = "guest_scholar_user";
    let targetConvId = activeConvId;

    setDoubtText("");
    setDoubtImageBase64(null);
    setLoading(true);

    try {
      if (!targetConvId) {
        targetConvId = "conv_" + Date.now();
        const newConv = {
          id: targetConvId,
          userId: currentUid,
          title: "Solving: " + queryToSend.substring(0, 30) + "...",
          subject: doubtSubject,
          teachingMode: teachingMode,
          pinned: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        const currentConvs = [...conversations, newConv];
        localStorage.setItem("nova_conversations", JSON.stringify(currentConvs));
        setConversations(currentConvs.sort((a,b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()));
        setActiveConvId(targetConvId);
      } else {
        const currentConvs = [...conversations];
        const idx = currentConvs.findIndex(c => c.id === targetConvId);
        if (idx !== -1) {
          currentConvs[idx].updatedAt = new Date().toISOString();
        }
        localStorage.setItem("nova_conversations", JSON.stringify(currentConvs));
        setConversations(currentConvs.sort((a,b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()));
      }

      // Save user message
      const userMsg = {
        id: "msg_" + Date.now(),
        sender: "user",
        text: queryToSend,
        createdAt: new Date().toISOString(),
        imageB64: doubtImageBase64 || null
      };

      let currentMsgs = [];
      try {
        const m = localStorage.getItem(`nova_messages_${targetConvId}`);
        if(m) currentMsgs = JSON.parse(m);
      } catch(e) {}
      
      currentMsgs.push(userMsg);
      localStorage.setItem(`nova_messages_${targetConvId}`, JSON.stringify(currentMsgs));
      setMessages([...currentMsgs]);

      // Extract current memory history
      const historyPayload = currentMsgs.map((m: any) => ({
        role: m.sender === "user" ? "user" : "assistant",
        content: m.text
      }));

      // Call dynamic server-side solver API
      const res = await fetch("/api/solve-doubt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: queryToSend,
          subject: doubtSubject,
          level: profile.academicLevel,
          board: profile.board,
          teachingMode: teachingMode,
          history: historyPayload
        })
      });

      const data = await res.json();
      const aiResponseText = data.solution || "Formulation error from educational server provider.";
      const aiMetadata = data.metadata || {};

      // Save AI message
      const aiMsg = {
        id: "msg_" + Date.now() + 1,
        sender: "ai",
        text: aiResponseText,
        createdAt: new Date().toISOString(),
        subject: aiMetadata.subject || doubtSubject,
        topic: aiMetadata.topic || "Academic Solution",
        difficulty: aiMetadata.difficulty || "Medium",
        suggestions: {
          suggestedRelatedTopics: aiMetadata.suggestedRelatedTopics || [],
          suggestedRevisionMaterials: aiMetadata.suggestedRevisionMaterials || [],
          suggestedPracticeQuestions: aiMetadata.suggestedPracticeQuestions || [],
          suggestedQuizzes: aiMetadata.suggestedQuizzes || []
        }
      };
      
      currentMsgs.push(aiMsg);
      localStorage.setItem(`nova_messages_${targetConvId}`, JSON.stringify(currentMsgs));
      setMessages([...currentMsgs]);

      // Dynamic auto naming for new chat context
      if (!activeConvId) {
        try {
          const titleRes = await fetch("/api/generate-chat-title", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query: queryToSend })
          });
          const titleData = await titleRes.json();
          if (titleData.title) {
            const currentConvs2 = [...conversations];
            const idx = currentConvs2.findIndex(c => c.id === targetConvId);
            if (idx !== -1) {
              currentConvs2[idx].title = titleData.title;
              currentConvs2[idx].updatedAt = new Date().toISOString();
            }
            localStorage.setItem("nova_conversations", JSON.stringify(currentConvs2));
            setConversations(currentConvs2.sort((a,b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()));
          }
        } catch (titleErr) {
          console.warn("Title creation warning:", titleErr);
        }
        awardXP(firebaseUser?.uid, "ASK_QUESTION");
      } else {
        awardXP(firebaseUser?.uid, "FOLLOW_UP_QUESTION");
      }
    } catch (err) {
      // console.error("Doubt processing error:", err);
      alert("Error contacting Scholar API / database. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Pin toggle
  const handleTogglePinConv = async (cId: string, currentPinned: boolean) => {
    try {
      const currentConvs = [...conversations];
      const idx = currentConvs.findIndex(c => c.id === cId);
      if (idx !== -1) {
        currentConvs[idx].pinned = !currentPinned;
        currentConvs[idx].updatedAt = new Date().toISOString();
      }
      localStorage.setItem("nova_conversations", JSON.stringify(currentConvs));
      setConversations(currentConvs.sort((a,b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()));
    } catch (err) {
      // console.error("Pin failed:", err);
    }
  };

  // Rename thread
  const handleRenameConv = async (cId: string, newTitle: string) => {
    if (!newTitle.trim()) return;
    try {
      const currentConvs = [...conversations];
      const idx = currentConvs.findIndex(c => c.id === cId);
      if (idx !== -1) {
        currentConvs[idx].title = newTitle.trim();
        currentConvs[idx].updatedAt = new Date().toISOString();
      }
      localStorage.setItem("nova_conversations", JSON.stringify(currentConvs));
      setConversations(currentConvs.sort((a,b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()));
      setEditingConvId(null);
    } catch (err) {
      // console.error("Rename failed:", err);
    }
  };

  // Delete thread
  const handleDeleteConv = async (cId: string) => {
    try {
      if (activeConvId === cId) {
        setActiveConvId(null);
      }
      const currentConvs = conversations.filter(c => c.id !== cId);
      localStorage.setItem("nova_conversations", JSON.stringify(currentConvs));
      setConversations(currentConvs);
      localStorage.removeItem(`nova_messages_${cId}`);
    } catch (err) {
      // console.error("Deletion failed:", err);
    }
  };

  // Export thread
  const handleExportChat = (format: "markdown" | "json", passedId?: string) => {
    const cId = passedId && typeof passedId === 'string' ? passedId : activeConvId;
    if (!cId) return;
    const activeTitle = conversations.find(c => c.id === cId)?.title || "Doubt Thread";
    
    let exportMessages = messages;
    if (cId !== activeConvId) {
       const stored = localStorage.getItem(`nova_messages_${cId}`);
       if (stored) exportMessages = JSON.parse(stored);
    }
    
    let content = "";
    if (format === "markdown") {
      content = `# Nova AI Doubt Thread: ${activeTitle}\n\n`;
      exportMessages.forEach(m => {
        content += `### ${m.sender === "user" ? "YOU" : "NOVA SCHOLAR AI"} (${new Date(m.createdAt).toLocaleTimeString()})\n${m.text}\n\n`;
      });
    } else {
      content = JSON.stringify(exportMessages, null, 2);
    }

    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Scholar_Doubt_${cId}.${format === "markdown" ? "md" : "json"}`;
    link.click();
  };

  // Share thread link summary
  const handleShareChat = (passedId?: string) => {
    const cId = passedId && typeof passedId === 'string' ? passedId : activeConvId;
    if (!cId) return;
    const activeTitle = conversations.find(c => c.id === cId)?.title || "Scholar Solution";
    
    let shareMessages = messages;
    if (cId !== activeConvId) {
       const stored = localStorage.getItem(`nova_messages_${cId}`);
       if (stored) shareMessages = JSON.parse(stored);
    }
    
    if (shareMessages.length === 0) return;
    const lastMsgText = shareMessages[shareMessages.length - 1]?.text || "";
    const shareText = `📚 *Nova AI Academic Solution: ${activeTitle}*\n\n${lastMsgText.substring(0, 400)}...\n\n_Instant ChatGPT-level doubts tutor on Nova Scholar!_`;
    navigator.clipboard.writeText(shareText);
  };

  // Helper to render chat history items
  const renderHistoryItem = (conv: any) => {
    const isActive = activeConvId === conv.id;
    return (
      <div
        key={conv.id}
        onClick={() => {
          setActiveConvId(conv.id);
          setDoubtSubject(conv.subject);
          setTeachingMode(conv.teachingMode || "Intermediate");
          setDoubtText("");
          setDoubtImageBase64(null);
        }}
        className={`group flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer select-none ${
          isActive 
            ? (isCrimson ? "bg-red-950/20 text-white border-red-500/30" : "bg-violet-950/20 text-white border-violet-500/30") 
            : "bg-transparent hover:bg-white/5 text-zinc-400 hover:text-white border-transparent"
        }`}
      >
        <div className="flex items-center gap-2 overflow-hidden flex-1">
          <HelpCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
          {editingConvId === conv.id ? (
            <input
              type="text"
              value={editingTitleText}
              onChange={(e) => setEditingTitleText(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              onBlur={() => handleRenameConv(conv.id, editingTitleText)}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === "Enter") handleRenameConv(conv.id, editingTitleText);
              }}
              autoFocus
              className="bg-zinc-950 text-[11px] px-1.5 py-0.5 rounded border border-zinc-850 text-white focus:outline-none w-28"
            />
          ) : (
            <div className="overflow-hidden flex flex-col items-start leading-tight">
              <span className="text-[11px] font-semibold truncate block w-full">{conv.title}</span>
              <span className="text-[8px] text-zinc-500 block truncate">{conv.subject}</span>
            </div>
          )}
        </div>

        <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1.5 ml-2 transition-opacity shrink-0" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => handleTogglePinConv(conv.id, conv.pinned)}
            className="text-zinc-500 hover:text-rose-300 transition-colors cursor-pointer"
            title={conv.pinned ? "Unpin" : "Pin thread"}
          >
            <Pin className={`w-3.5 h-3.5 ${conv.pinned ? "fill-rose-400 text-rose-400" : ""}`} />
          </button>
          
          <button
            onClick={() => handleShareChat(conv.id)}
            className="text-zinc-500 hover:text-white transition-colors cursor-pointer"
            title="Share transcript"
          >
            <Share2 className="w-3 h-3" />
          </button>
          
          <button
            onClick={() => handleExportChat("markdown", conv.id)}
            className="text-zinc-500 hover:text-white transition-colors cursor-pointer"
            title="Download transcript"
          >
            <Download className="w-3 h-3" />
          </button>

          <button
            onClick={() => {
              setEditingConvId(conv.id);
              setEditingTitleText(conv.title);
            }}
            className="text-zinc-500 hover:text-white transition-colors cursor-pointer"
            title="Rename"
          >
            <Edit2 className="w-3 h-3" />
          </button>
          <button
            onClick={() => {
              handleDeleteConv(conv.id);
            }}
            className="text-zinc-500 hover:text-red-400 transition-colors cursor-pointer"
            title="Delete permanently"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>
    );
  };

  // TOOL 2: Document Synthesizer States
  const [docText, setDocText] = useState("");
  const [docFormat, setDocFormat] = useState("Detailed Summary");
  const [synthesizedOutput, setSynthesizedOutput] = useState("");
  const [docAnalysisStatus, setDocAnalysisStatus] = useState("");
  const [docError, setDocError] = useState("");
  const [docFileName, setDocFileName] = useState("");
  
  const [docHistory, setDocHistory] = useState<any[]>([]);
  const [isDocHistoryOpen, setIsDocHistoryOpen] = useState(false);
  const [activeDocHistoryId, setActiveDocHistoryId] = useState<string | null>(null);
  const [docChatText, setDocChatText] = useState("");
  const [docChatHistory, setDocChatHistory] = useState<{role: "user" | "assistant", content: string}[]>([]);

  const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

  const handleSynthesizeStream = async (file: File) => {
    if (loading) return; // Prevent duplicate requests
    // Check if we have this file in history already
    const existingDoc = docHistory.find(d => d.fileName === file.name && d.synthesis.length > 0);
    if (existingDoc) {
       setActiveDocHistoryId(existingDoc.id);
       setSynthesizedOutput(existingDoc.synthesis);
       setDocFileName(file.name);
       setDocAnalysisStatus("Loaded from cache");
       setTimeout(() => setDocAnalysisStatus(""), 2000);
       return;
    }

    setLoading(true);
    setSynthesizedOutput("");
    setDocError("");
    setDocFileName(file.name);
    setDocAnalysisStatus("Uploading...");

    try {
      const allowedExtensions = ["pdf", "docx", "txt", "md", "png", "jpg", "jpeg", "webp"];
      const rawExt = file.name.split('.').pop()?.toLowerCase();
      const isAllowed = rawExt && allowedExtensions.includes(rawExt);
      if (!isAllowed) {
        throw new Error("Unsupported file format. Please upload PDF, DOCX, TXT, MD or Images (PNG, JPG, WEBP).");
      }
      if (file.size === 0) {
        throw new Error("File is empty.");
      }
      if (file.size > MAX_FILE_SIZE) {
        throw new Error("File exceeds strict 2MB limit. Please compress.");
      }

      setDocAnalysisStatus("Extracting Content...");
      
      const toBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
      });
      
      const dataUrl = await toBase64(file);
      let mimeType = dataUrl.split(';')[0].split(':')[1];
      const base64Data = dataUrl.split(',')[1];
      
      if (!mimeType && file.name.toLowerCase().endsWith('.docx')) {
        mimeType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
      } else if (!mimeType && file.name.toLowerCase().endsWith('.pdf')) {
        mimeType = "application/pdf";
      }
      
      const isImage = mimeType.startsWith("image/");
      const isPdf = mimeType === "application/pdf";
      
      if (isImage || isPdf) {
        setDocAnalysisStatus("OCR Processing...");
      } else {
        setDocAnalysisStatus("Analyzing...");
      }

      let res: Response | null = null;
      let attempt = 0;
      const MAX_RETRIES = 3;
      
      while (attempt < MAX_RETRIES) {
        try {
          res = await fetch("/api/synthesize", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              documentName: file.name,
              mimeType: mimeType,
              fileBase64: base64Data,
              targetType: docFormat
            })
          });
          if (res.ok && res.body) break;
        } catch (fetchErr) {
          // Ignore error and retry if attempt < MAX_RETRIES
        }
        attempt++;
        if (attempt >= MAX_RETRIES) {
          throw new Error("Analysis failed after multiple attempts. Please verify connection and try again.");
        }
        await new Promise(r => setTimeout(r, 1000 * attempt)); // Exponentional backoff
        setDocAnalysisStatus(`Retrying (${attempt}/${MAX_RETRIES})...`);
      }

      if (!res || !res.ok || !res.body) throw new Error("Network issue during analysis.");

      const reader = res.body.getReader();
      const decoder = new TextDecoder("utf-8");
      
      setDocAnalysisStatus("Generating Summary...");
      let finalOutput = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunkStr = decoder.decode(value, { stream: true });
        
        const events = chunkStr.split("\n\n");
        for (const ev of events) {
          if (ev.startsWith("data: ")) {
            const dataStr = ev.substring("data: ".length);
            try {
              const data = JSON.parse(dataStr);
              if (data.error) {
                throw new Error(data.error);
              }
              if (data.text) {
                finalOutput += data.text;
                setSynthesizedOutput(finalOutput);
              }
            } catch (err) {
              // Ignore partial JSON parsing errors
            }
          }
        }
      }
      
      setDocAnalysisStatus("Analysis Complete");
      const docId = Date.now().toString();
      setActiveDocHistoryId(docId);
      setDocHistory(prev => {
        const newHistory = [{
          id: docId,
          fileName: file.name,
          synthesis: finalOutput,
          timestamp: new Date().toISOString()
        }, ...prev];
        localStorage.setItem("nova_doc_history", JSON.stringify(newHistory));
        return newHistory;
      });
      
      setTimeout(() => {
        setDocAnalysisStatus("");
      }, 2000);
      awardXP(firebaseUser?.uid, "GENERATE_SUMMARY");
    } catch (err: any) {
      setDocError(err.message || "Extraction failed. Please check your document.");
      setDocAnalysisStatus("");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadDocChat = () => {
    if (docChatHistory.length === 0) return;
    
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 20;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("EduPulse AI - Document Chat", pageWidth / 2, y, { align: "center" });
    y += 10;
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Document: ${docFileName || "Synthesized Output"}`, 14, y);
    y += 10;

    doc.setLineWidth(0.5);
    doc.line(14, y, pageWidth - 14, y);
    y += 10;

    docChatHistory.forEach((msg) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      
      const roleText = msg.role === "user" ? "You" : "EduPulse AI";
      doc.setFont("helvetica", "bold");
      doc.text(`${roleText}:`, 14, y);
      y += 6;
      
      doc.setFont("helvetica", "normal");
      
      const splitText = doc.splitTextToSize(msg.content, pageWidth - 28);
      
      for (let i = 0; i < splitText.length; i++) {
        if (y > 280) {
          doc.addPage();
          y = 20;
        }
        doc.text(splitText[i], 14, y);
        y += 6;
      }
      y += 4;
    });

    doc.save(`EduPulse_Doc_Chat_${docFileName || "Export"}.pdf`);
  };

  const handleDocChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docChatText.trim() || loading) return;

    const userMessage = docChatText.trim();
    setDocChatText("");
    
    // Add User Message
    setDocChatHistory(prev => {
        const newHistory = [...prev, { role: "user" as const, content: userMessage }];
        setDocHistory(docs => docs.map(d => d.id === activeDocHistoryId ? { ...d, chatHistory: newHistory } : d));
        return newHistory;
    });
    
    setLoading(true);

    try {
      const res = await fetch("/api/doc-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentContent: synthesizedOutput,
          history: docChatHistory,
          query: userMessage
        })
      });

      if (!res.ok) throw new Error("Chat request failed.");

      const data = await res.json();
      setDocChatHistory(prev => {
        const newHistory = [...prev, { role: "assistant" as const, content: data.reply }];
        // Sync with docHistory
        setDocHistory(docs => {
          const updatedDocs = docs.map(d => d.id === activeDocHistoryId ? { ...d, chatHistory: newHistory } : d);
          localStorage.setItem("nova_doc_history", JSON.stringify(updatedDocs));
          return updatedDocs;
        });
        return newHistory;
      });
    } catch (err) {
      setDocChatHistory(prev => {
        const newHistory = [...prev, { role: "assistant" as const, content: "Sorry, I could not process your question at the moment. Please ensure backend is running." }];
        setDocHistory(docs => {
          const updatedDocs = docs.map(d => d.id === activeDocHistoryId ? { ...d, chatHistory: newHistory } : d);
          localStorage.setItem("nova_doc_history", JSON.stringify(updatedDocs));
          return updatedDocs;
        });
        return newHistory;
      });
    } finally {
      setLoading(false);
    }
  };

  const processDocFileContent = (file: File) => {
    handleSynthesizeStream(file);
  };

  const handleDocDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingDoc(true);
  };
  const handleDocDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingDoc(false);
  };
  const handleDocDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingDoc(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processDocFileContent(e.dataTransfer.files[0]);
    }
  };
  const handleDocFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processDocFileContent(e.target.files[0]);
    }
    // reset target value so same file can trigger change again
    e.target.value = "";
  };

  // TOOL 3: Quiz Master States
  const [quizEducationLevel, setQuizEducationLevel] = useState("Secondary School (Class 9–10)");
  const [quizSubjectCategory, setQuizSubjectCategory] = useState("Science");
  const [quizSpecificTopic, setQuizSpecificTopic] = useState("Laws of Motion");
  const [quizDifficulty, setQuizDifficulty] = useState("Intermediate");
  const [quizQuestionsCount, setQuizQuestionsCount] = useState("5 Questions");

  const [quizQuestions, setQuizQuestions] = useState<any[]>([]);
  const [currentQuizIdx, setCurrentQuizIdx] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<{ [key: number]: number }>({});
  const [quizFinished, setQuizFinished] = useState(false);

  const [quizStartTime, setQuizStartTime] = useState<number | null>(null);
  const [quizEndTime, setQuizEndTime] = useState<number | null>(null);
  const [quizHistory, setQuizHistory] = useState<any[]>([]);
  const [isQuizHistoryOpen, setIsQuizHistoryOpen] = useState(false);

  const handleGenerateQuiz = async () => {

    setLoading(true);
    setQuizQuestions([]);
    setCurrentQuizIdx(0);
    setSelectedAnswers({});
    setQuizFinished(false);
    try {
      const res = await fetch("/api/generate-quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          educationLevel: quizEducationLevel,
          subjectCategory: quizSubjectCategory,
          specificTopic: quizSpecificTopic,
          difficulty: quizDifficulty,
          questionCount: quizQuestionsCount
        })
      });
      const data = await res.json();
      setQuizQuestions(data.questions || []);
      setQuizStartTime(Date.now());
      setQuizEndTime(null);
    } catch (err) {
      alert("Quiz formulation failed.");
    } finally {
      setLoading(false);
    }
  };

  const scoreQuiz = () => {
    let score = 0;
    quizQuestions.forEach((q, idx) => {
      if (selectedAnswers[idx] === q.correctAnswer) {
        score++;
      }
    });
    setQuizFinished(true);
    setQuizEndTime(Date.now());
    // Reward XP!
    const award = score * 30; // 30 XP per correct MCQ
    awardXP(firebaseUser?.uid, "COMPLETE_QUIZ");
    
    setQuizHistory(prev => {
      const newHistory = [{
        id: Date.now().toString(),
        topic: quizSpecificTopic,
        difficulty: quizDifficulty,
        score: score,
        total: quizQuestions.length,
        timeTaken: Date.now() - (quizStartTime || Date.now()),
        timestamp: new Date().toISOString()
      }, ...prev];
      localStorage.setItem("nova_quiz_history", JSON.stringify(newHistory));
      return newHistory;
    });
  };

  // TOOL 4: Career Studio States
  const [careerName, setCareerName] = useState("");
  const [careerEmail, setCareerEmail] = useState("");
  const [careerPhone, setCareerPhone] = useState("");
  const [careerEducation, setCareerEducation] = useState("");
  const [careerSkills, setCareerSkills] = useState("");
  const [careerExperience, setCareerExperience] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [careerPhoto, setCareerPhoto] = useState<string | null>(null);
  const [careerLocation, setCareerLocation] = useState("");
  const [careerLinkedin, setCareerLinkedin] = useState("");
  const [careerCertifications, setCareerCertifications] = useState("");
  const [careerLanguages, setCareerLanguages] = useState("");
  const [careerProjects, setCareerProjects] = useState("");
  const [careerInternships, setCareerInternships] = useState("");
  const [careerAchievements, setCareerAchievements] = useState("");
  const [careerObjective, setCareerObjective] = useState("");
  
  const [resumeData, setResumeData] = useState<any | null>(null);

  const [careerHistory, setCareerHistory] = useState<any[]>([]);
  const [isCareerHistoryOpen, setIsCareerHistoryOpen] = useState(false);
  const [activeCareerHistoryId, setActiveCareerHistoryId] = useState<string | null>(null);
  const [isPolishing, setIsPolishing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleParsingFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleParsingFile(e.target.files[0]);
    }
  };

  const handleParsingFile = (file: File) => {
      setLoading(true);
      try {
        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const base64Data = (event.target?.result as string).split(',')[1];
                
                if (file.type.startsWith('image/')) {
                  setCareerPhoto(`data:${file.type};base64,${base64Data}`);
                }

                const response = await fetch("/api/parse-resume", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        fileBase64: base64Data,
                        mimeType: file.type
                    })
                });
                if (response.ok) {
                    const data = await response.json();
                    if (data.name) setCareerName(String(data.name));
                    if (data.email) setCareerEmail(String(data.email));
                    if (data.phone) setCareerPhone(String(data.phone));
                    if (data.education) setCareerEducation(typeof data.education === 'string' ? data.education : JSON.stringify(data.education));
                    if (data.skills) setCareerSkills(typeof data.skills === 'string' ? data.skills : Array.isArray(data.skills) ? data.skills.join(", ") : JSON.stringify(data.skills));
                    if (data.experience) setCareerExperience(typeof data.experience === 'string' ? data.experience : JSON.stringify(data.experience));
                    if (data.targetRole) setTargetRole(String(data.targetRole));
                } else {
                    // console.error("Parse failed", await response.text());
                }
            } catch (err) {
                // console.error("Parse request error:", err);
            } finally {
                setLoading(false);
            }
        };
        reader.readAsDataURL(file);
      } catch (err) {
        setLoading(false);
        // console.error(err);
      }
  };

  const handleAIPolish = async () => {
    if (!careerExperience) return;
    setIsPolishing(true);
    try {
        const res = await fetch("/api/polish-resume", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: careerExperience, type: "experience" })
        });
        if (res.ok) {
            const data = await res.json();
            if (data.polished) setCareerExperience(data.polished);
        } else {
            // console.error("Polish failed", await res.text());
            alert("Failed to polish. Please try again.");
        }
    } catch (e) {
        // console.error(e);
        alert("Failed to polish. Please try again.");
    } finally {
        setIsPolishing(false);
    }
  };

  const handleAIPolishSkills = async () => {
    if (!careerSkills) return;
    setIsPolishing(true);
    try {
        const res = await fetch("/api/polish-resume", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: careerSkills, type: "skills" })
        });
        if (res.ok) {
            const data = await res.json();
            if (data.polished) setCareerSkills(data.polished);
        } else {
            // console.error("Polish failed", await res.text());
            alert("Failed to polish. Please try again.");
        }
    } catch (e) {
        // console.error(e);
        alert("Failed to polish. Please try again.");
    } finally {
        setIsPolishing(false);
    }
  };

  const calculateResumeScore = () => {
    let score = 0;
    if (String(careerName || "")?.trim().length > 2) score += 10;
    if (String(careerEmail || "")?.trim().length > 5) score += 10;
    if (String(careerPhone || "")?.trim().length > 5) score += 10;
    if (String(careerEducation || "")?.trim().length > 5) score += 15;
    if (String(careerSkills || "")?.trim().length > 5) score += 20;
    if (String(careerExperience || "")?.trim().length > 10) score += 25;
    if (String(targetRole || "")?.trim().length > 3) score += 10;
    
    return Math.min(100, Math.max(score, resumeData?.resumeScore || 0));
  };

  const handleGenerateResume = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!careerName.trim() || !targetRole.trim()) return;
    setLoading(true);
    setResumeData(null);
    try {
      const res = await fetch("/api/generate-resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: careerName,
          email: careerEmail,
          phone: careerPhone,
          location: careerLocation,
          linkedin: careerLinkedin,
          education: careerEducation,
          skills: careerSkills,
          experience: careerExperience,
          targetRole,
          certifications: careerCertifications,
          languages: careerLanguages,
          projects: careerProjects,
          internships: careerInternships,
          achievements: careerAchievements,
          objective: careerObjective
        })
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Failed to generate resume");
      }
      setResumeData(data);
      awardXP(firebaseUser?.uid, "RESUME_CREATED");
      
      const newHistoryItem = {
        id: Date.now().toString(),
        name: careerName,
        targetRole,
        score: data.resumeScore || 0,
        timestamp: new Date().toISOString(),
        resumeData: data,
        inputs: {
          careerName,
          careerEmail,
          careerPhone,
          careerLocation,
          careerLinkedin,
          careerEducation,
          careerSkills,
          careerExperience,
          targetRole,
          careerPhoto,
          careerCertifications,
          careerLanguages,
          careerProjects,
          careerInternships,
          careerAchievements,
          careerObjective
        }
      };
      
      setCareerHistory(prev => {
        const updated = [newHistoryItem, ...prev];
        localStorage.setItem("nova_career_history", JSON.stringify(updated));
        return updated;
      });
      setActiveCareerHistoryId(newHistoryItem.id);
      
      setTimeout(() => {
        window.scrollTo({
          top: document.body.scrollHeight,
          behavior: 'smooth'
        });
      }, 100);
    } catch (err) {
      alert("Error generating resume.");
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = async () => {
    if (!resumeData) return;
    setIsExporting(true);
    try {
      await new Promise(r => setTimeout(r, 100)); // allow UI update
      const element = document.getElementById("resume-render-container");
      if (!element) throw new Error("Resume container not found");
      
      const canvas = await html2canvas(element, { 
        scale: 2, 
        useCORS: true, 
        backgroundColor: "#ffffff",
        windowWidth: element.scrollWidth,
        windowHeight: element.scrollHeight,
        x: 0,
        y: 0,
        scrollX: 0,
        scrollY: 0
      });
      const imgData = canvas.toDataURL('image/png');
      
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${careerName.replace(/\s+/g, '_')}_Resume.pdf`);
    } catch (e) {
      // console.error(e);
      alert("Error generating PDF.");
    } finally {
      setIsExporting(false);
    }
  };

  // Tools 5-10 states removed

  // All 10 registered Tools Meta List
  const toolsMeta = [
    {
      id: "doubt_solver",
      title: "Doubt Solver",
      desc: "Instant step-by-step solutions for Math, Science, Commerce, Coding equations.",
      tags: ["Step Derivations", "OCR Image Upload"],
      icon: HelpCircle,
      color: "from-red-500/20 to-rose-600/20 border-red-500/30 text-rose-400"
    },
    {
      id: "doc_synthesizer",
      title: "Document Synthesizer",
      desc: "Compile raw notes snippets into executive board summaries structure.",
      tags: ["Summaries", "Mind Map Outline"],
      icon: FileSpreadsheet,
      color: "from-amber-500/20 to-yellow-600/20 border-yellow-500/30 text-amber-400"
    },
    {
      id: "quiz_master",
      title: "Quiz Master",
      desc: "Generate active target MCQs based on subjects and earn real dashboard XP.",
      tags: ["MCQ Generators", "Real XP rewards"],
      icon: Trophy,
      color: "from-emerald-500/20 to-teal-600/20 border-emerald-500/30 text-emerald-400"
    },
    {
      id: "career_studio",
      title: "Career Studio",
      desc: "Unlock ATS resume evaluators and explore tailored Indian internship brackets.",
      tags: ["Resume Optimizer", "ATS Scores"],
      icon: GraduationCap,
      color: "from-blue-500/20 to-purple-600/20 border-blue-500/30 text-blue-400"
    }
  ];

  return (
    <div className="space-y-8 pb-32 animate-[fadeIn_0.4s_ease-out]">
      
      {/* 1. Header Hero Panel when no item is selected */}
      {!activeTool && (
        <div className="text-center py-8 max-w-2xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-mono tracking-widest text-white/60 backdrop-blur-md">
            <Zap className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            NOVA AI SCHOLAR RESEARCH ARSENAL
          </div>
          <h1 className="text-2xl sm:text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Advanced Research Arsenal</h1>
          <p className="text-xs sm:text-sm text-white/50 leading-relaxed">
            High-yield analytical study systems mapped and tuned explicitly for the CBSE National and Provincial Board Examinations. Select a dynamic model below:
          </p>
        </div>
      )}

      {/* 2. GRID OF TOOLS (Null state) */}
      {!activeTool && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {toolsMeta.map((tool) => {
            const Icon = tool.icon;
            return (
              <button
                key={tool.id}
                onClick={() => setActiveTool(tool.id as any)}
                className={`p-6 rounded-3xl glass-card text-left hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between h-56 group cursor-pointer border border-transparent ${
                  isCrimson 
                    ? 'hover:border-red-500/30 hover:shadow-[0_8px_30px_rgba(225,29,72,0.15)] hover:bg-red-950/20' 
                    : 'hover:border-blue-500/30 hover:shadow-[0_8px_30px_rgba(59,130,246,0.15)] hover:bg-blue-950/20'
                }`}
              >
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between">
                    <div className={`p-2.5 rounded-2xl border transition-colors ${
                      isCrimson 
                        ? 'bg-red-500/10 border-red-500/20 text-red-400 group-hover:bg-red-500/20 group-hover:border-red-500/30' 
                        : 'bg-blue-500/10 border-blue-500/20 text-blue-400 group-hover:bg-blue-500/20 group-hover:border-blue-500/30'
                    }`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <Sparkles className={`w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity ${isCrimson ? 'text-red-400' : 'text-blue-400'}`} />
                  </div>
                  <div>
                    <h3 className={`text-base font-bold tracking-tight transition-colors ${isCrimson ? 'group-hover:text-red-100 text-white' : 'group-hover:text-blue-100 text-white'}`}>{tool.title}</h3>
                    <p className="text-xs text-white/60 mt-1.5 leading-relaxed truncate-2-lines line-clamp-2 h-8">{tool.desc}</p>
                  </div>
                </div>

                <div className="flex gap-1.5 mt-2 flex-wrap">
                  {tool.tags.map(t => (
                    <span key={t} className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border transition-colors ${
                      isCrimson 
                        ? 'bg-white/5 border-white/10 text-white/70 group-hover:border-red-500/30 group-hover:text-red-300 group-hover:bg-red-500/10' 
                        : 'bg-white/5 border-white/10 text-white/70 group-hover:border-blue-500/30 group-hover:text-blue-300 group-hover:bg-blue-500/10'
                    }`}>
                      {t}
                    </span>
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* ======================= DETAILED INTEGRATED TOOLS VIEW ======================= */}
      {activeTool && (
        <div className="space-y-6">
          {/* Back Trigger */}
          {activeTool !== "doubt_solver" && (
            <button
              onClick={() => {
                setActiveTool(null);
                setActiveConvId(null);
                setMessages([]);
                setActiveMetadata(null);
                setSynthesizedOutput("");
                setResumeData(null);
                setQuizQuestions([]);
              }}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-white/70 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-2 rounded-xl transition-colors cursor-pointer backdrop-blur-sm"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Research Arsenal
            </button>
          )}

          {/* ————————————————— Tool 1: Advanced Conversational Doubt Solver ————————————————— */}
          {activeTool === "doubt_solver" && (
            <div className={`flex flex-col h-[500px] sm:h-[600px] lg:h-[680px] border rounded-3xl overflow-hidden shadow-2xl relative font-sans ${isCrimson ? "bg-[#0A0404] border-[#231212]" : "bg-[#02040A] border-[#121423]"}`}>
              
              {/* Unified Header */}
              <div className={`flex items-center justify-between px-6 py-4 border-b shrink-0 ${isCrimson ? "border-[#1E0F10] bg-[#0A0404]" : "border-[#0F141E] bg-[#02040A]"}`}>
                <div className="flex items-center gap-4 py-1">
                  {/* Back Arrow Button */}
                  <button
                    onClick={() => {
                      setActiveTool(null);
                      setActiveConvId(null);
                      setMessages([]);
                      setActiveMetadata(null);
                      setSynthesizedOutput("");
                      setResumeData(null);
                      setQuizQuestions([]);
                    }}
                    className={`p-1 hover:text-white rounded-full transition-all cursor-pointer ${isCrimson ? "text-red-200/50" : "text-blue-200/50"}`}
                    title="Back to Research Arsenal"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>

                  {/* Icon */}
                  <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${isCrimson ? "border-red-900/50 bg-red-950/20" : "border-blue-900/50 bg-blue-950/20"}`}>
                    <Sparkles className={`w-5 h-5 ${isCrimson ? "text-red-500/80" : "text-blue-500/80"}`} />
                  </div>

                  {/* Title and Subtitle */}
                  <div className="flex flex-col leading-tight gap-0.5">
                    <h2 className="text-base font-extrabold text-white tracking-tight flex items-center">
                      Doubt Solver
                    </h2>
                    <span className={`text-[9px] font-black tracking-widest uppercase select-none ${isCrimson ? "text-red-500/50" : "text-blue-500/50"}`}>
                      PREMIUM AI ASSISTANT
                    </span>
                  </div>
                </div>

                {/* Right Side Actions */}
                <div className="flex items-center gap-3">
                  {activeConvId && (
                    <button
                      onClick={() => {
                        setActiveConvId(null);
                        setDoubtText("");
                      }}
                      className={`text-[10px] font-bold px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1 shrink-0 ${
                        isCrimson 
                          ? 'bg-red-950/40 hover:bg-red-900/40 border border-red-900/30 text-red-400' 
                          : 'bg-blue-950/40 hover:bg-blue-900/40 border border-blue-900/30 text-blue-400'
                      }`}
                    >
                      <Plus className="w-3 h-3" /> New Ask
                    </button>
                  )}

                  {/* History Toggle Button */}
                  <button
                    onClick={() => setIsHistoryOpen(!isHistoryOpen)}
                    className={`px-4 py-1.5 rounded-xl border text-[11px] font-semibold tracking-wide cursor-pointer shrink-0 transition-all ${
                      isCrimson
                        ? 'bg-[#0D0505] hover:bg-[#150508] border-red-950 text-red-200/50 hover:text-red-100'
                        : 'bg-[#060812] hover:bg-[#0A0D1C] border-blue-950 text-blue-200/50 hover:text-blue-100'
                    }`}
                  >
                    History
                  </button>
                </div>
              </div>

              {/* Main Content Area */}
              <div className={`flex flex-1 overflow-hidden relative justify-center ${isCrimson ? "bg-[#0A0404]" : "bg-[#02040A]"}`}>
                
                {/* Left Column: Chat History Sidebar (conditional on isHistoryOpen) */}
                {isHistoryOpen && (
                  <div className={`absolute left-0 top-0 bottom-0 w-72 border-r backdrop-blur-md p-4 flex flex-col justify-between z-40 animate-fade-in shadow-2xl ${isCrimson ? 'border-[#231212] bg-[#0C0606]/95' : 'border-[#121423] bg-[#02040A]/95'}`}>
                    <div className="space-y-4 overflow-hidden flex flex-col h-full font-sans">
                      <div className={`flex items-center justify-between border-b pb-2 ${isCrimson ? 'border-red-900/40' : 'border-blue-900/40'}`}>
                        <div className="flex items-center gap-1.5">
                          <Clock className={`w-3.5 h-3.5 ${isCrimson ? 'text-red-400' : 'text-blue-400'}`} />
                          <h3 className={`text-[10px] font-extrabold uppercase tracking-widest ${isCrimson ? 'text-red-600' : 'text-blue-600'}`}>Doubt Archives</h3>
                        </div>
                        {!activeConvId && (
                          <button
                            onClick={() => {
                              setActiveConvId(null);
                              setDoubtText("");
                            }}
                            className={`text-[9px] font-bold px-2 py-0.5 rounded transition-all cursor-pointer ${
                              isCrimson ? 'bg-red-500/10 hover:bg-red-500/20 text-red-300' : 'bg-blue-500/10 hover:bg-blue-500/20 text-blue-300'
                            }`}
                          >
                            Reset
                          </button>
                        )}
                        <button onClick={() => setIsHistoryOpen(false)} className={`lg:hidden transition-colors ${isCrimson ? 'text-red-500/50 hover:text-red-300' : 'text-blue-500/50 hover:text-blue-300'}`}>
                           <XCircle className="w-4 h-4"/>
                        </button>
                      </div>

                      {/* Search bar */}
                      <div className="relative">
                        <Search className={`w-3 h-3 absolute left-3 top-2.5 ${isCrimson ? 'text-red-500/50' : 'text-blue-500/50'}`} />
                        <input
                          type="text"
                          placeholder="Search doubts..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className={`w-full border rounded-xl py-1.5 pl-8 pr-3 text-[10px] focus:outline-none transition-all ${
                            isCrimson 
                              ? 'bg-red-950/20 border-red-900/30 text-white placeholder-red-500/40 focus:border-red-500/50' 
                              : 'bg-blue-950/20 border-blue-900/30 text-white placeholder-blue-500/40 focus:border-blue-500/50'
                          }`}
                        />
                      </div>

                      {/* Archives List */}
                      <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 scrollbar-thin">
                        {/* Pinned Section */}
                        {conversations.filter(c => c.pinned && c.title.toLowerCase().includes(searchQuery.toLowerCase())).length > 0 && (
                          <div className="space-y-1">
                            <div className="text-[8px] font-black tracking-widest text-zinc-500 uppercase px-1">Pinned 📌</div>
                            {conversations
                              .filter(c => c.pinned && c.title.toLowerCase().includes(searchQuery.toLowerCase()))
                              .map((conv) => renderHistoryItem(conv))}
                          </div>
                        )}

                        {/* Recent Section */}
                        <div className="space-y-1 pt-1">
                          <div className="text-[8px] font-black tracking-widest text-[#B91C1C] uppercase px-1">Recent Chats</div>
                          {conversations.filter(c => !c.pinned && c.title.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && 
                           conversations.filter(c => c.pinned && c.title.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 ? (
                            <p className="text-[9px] text-zinc-650 text-center py-4">No recent doubt archives.</p>
                          ) : (
                            conversations
                              .filter(c => !c.pinned && c.title.toLowerCase().includes(searchQuery.toLowerCase()))
                              .map((conv) => renderHistoryItem(conv))
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

              {/* Center Column: Interactive Chat Hub */}
              <div className="flex flex-col flex-1 h-full relative w-full items-center justify-center lg:px-4 py-4 max-w-4xl mx-auto">
                
                {/* Main Message Window */}
                <div className={`${activeConvId ? "w-full max-w-4xl mx-auto bg-[#080202] border border-[#231212] rounded-3xl" : "w-full max-w-4xl mx-auto bg-transparent"} flex flex-col justify-between overflow-hidden relative shadow-inner flex-1`}>
                  
                  {/* Active Chat Header */}
                  {activeConvId ? (
                    <div className="flex items-center justify-between px-5 py-3.5 bg-[#0C0606] border-b border-[#231212] shrink-0">
                      <div className="flex items-center gap-2.5 overflow-hidden flex-1">
                        <HelpCircle className="w-5 h-5 text-rose-500 shrink-0" />
                        {editingConvId === activeConvId ? (
                          <input
                            type="text"
                            value={editingTitleText}
                            onChange={(e) => setEditingTitleText(e.target.value)}
                            onBlur={() => handleRenameConv(activeConvId, editingTitleText)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleRenameConv(activeConvId, editingTitleText);
                            }}
                            autoFocus
                            className="bg-zinc-950 text-xs px-2 py-1 rounded border border-zinc-805 text-white focus:outline-none w-44"
                          />
                        ) : (
                          <div className="truncate flex items-center gap-1.5 max-w-[80%]">
                            <h2 
                              onDoubleClick={() => {
                                 setEditingConvId(activeConvId);
                                 setEditingTitleText(conversations.find(c => c.id === activeConvId)?.title || "");
                              }}
                              className="text-xs font-extrabold text-white truncate cursor-pointer hover:text-rose-300 transition-colors"
                              title="Double click to rename thread"
                            >
                              {conversations.find(c => c.id === activeConvId)?.title || "Doubt Chat"}
                            </h2>
                            <button
                              onClick={() => {
                                 setEditingConvId(activeConvId);
                                 setEditingTitleText(conversations.find(c => c.id === activeConvId)?.title || "");
                              }}
                              className="text-zinc-500 hover:text-white transition-colors cursor-pointer"
                            >
                              <Edit2 className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        )}
                        <span className="text-[9px] bg-red-955/40 text-rose-300 border border-red-900/40 px-2 py-0.5 rounded-full uppercase tracking-wider scale-90 shrink-0 select-none">
                          {conversations.find(c => c.id === activeConvId)?.subject}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2.5 px-5 py-3.5 bg-[#0C0606] border-b border-[#231212] shrink-0">
                      <Sparkles className="w-5 h-5 text-red-500 animate-pulse" />
                      <div>
                        <h2 className="text-xs font-black text-rose-400 uppercase tracking-wider">Nova Ask Doubt Hub</h2>
                        <p className="text-[10px] text-zinc-400 font-medium">Ask questions from Class 1 to Graduation.</p>
                      </div>
                    </div>
                  )}

                  {/* Chat Messages Section */}
                  {activeConvId ? (
                    <div className="flex-1 p-4 overflow-y-auto space-y-4 scrollbar-thin">
                      {messages.map((msg) => (
                        <div
                          key={msg.id}
                          className={`flex gap-3 max-w-[85%] ${msg.sender === "user" ? "ml-auto flex-row-reverse" : "mr-auto"}`}
                        >
                          {/* Avatar representation */}
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 border select-none text-[10px] font-black ${
                            msg.sender === "user" 
                              ? "bg-zinc-900 border-zinc-800 text-zinc-300"
                              : (isCrimson ? "bg-red-500/20 border-red-500/20 text-red-300" : "bg-violet-500/20 border-violet-500/20 text-violet-300")
                          }`}>
                            {msg.sender === "user" ? "U" : "S"}
                          </div>

                          <div className="space-y-1.5">
                            <div className={`p-3.5 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap ${
                              msg.sender === "user"
                                ? (isCrimson ? "bg-red-950/40 border border-red-800/30 text-white" : "bg-violet-950/40 border border-violet-800/30 text-white")
                                : "bg-zinc-950/80 border border-zinc-900 text-zinc-200"
                            }`}>
                              {/* Attached image indicators */}
                              {msg.imageB64 && (
                                <div className="mb-2 rounded-xl overflow-hidden border border-zinc-800">
                                  <img 
                                    src={msg.imageB64} 
                                    alt="Whiteboard Query Snap" 
                                    className="max-h-36 object-contain w-full bg-black/40" 
                                    referrerPolicy="no-referrer"
                                  />
                                </div>
                              )}
                              
                              {msg.text}
                            </div>
                            
                            {/* Speech utility box for AI Messages */}
                            {msg.sender === "ai" && (
                              <div className="flex items-center gap-3 text-[10px] text-zinc-500 pl-1 select-none">
                                <button
                                  onClick={() => handleCopy(msg.text)}
                                  className="hover:text-zinc-300 flex items-center gap-1 font-bold cursor-pointer"
                                >
                                  {copied ? "Copied!" : "Copy"}
                                </button>
                                <span>•</span>
                                <button
                                  onClick={() => handleSpeakText(msg.text)}
                                  className="hover:text-zinc-300 flex items-center gap-1 font-bold cursor-pointer transition-colors text-zinc-400"
                                >
                                  {activeSpeechText === msg.text ? (
                                    <>
                                      <VolumeX className="w-3 h-3 text-red-400" /> Stop Speaking
                                    </>
                                  ) : (
                                    <>
                                      <Volume2 className="w-3 h-3" /> Read Aloud
                                    </>
                                  )}
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}

                      {/* Loading Typing Indicator */}
                      {loading && (
                        <div className="flex gap-4 max-w-[80%] mr-auto items-start">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border select-none ${
                            isCrimson ? "bg-red-500/10 border-red-500/20 text-red-400" : "bg-violet-500/10 border-violet-500/20 text-violet-400"
                          }`}>
                            <Activity className="w-4 h-4 animate-pulse opacity-80" />
                          </div>
                          <div className="flex items-center gap-2 px-1 py-1 h-8">
                            <div className="flex gap-1.5 items-center">
                              <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                              <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                              <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                            <span className="text-sm font-medium text-zinc-400/80 animate-pulse tracking-wide ml-1">Thinking...</span>
                          </div>
                        </div>
                      )}

                      <div ref={chatMessagesEndRef} />
                    </div>
                  ) : (
                    /* Ask New Doubt Screen (Centered Welcome Screen matching mockup) */
                    <div className="flex-1 flex flex-col items-center justify-center text-center px-6 py-12 space-y-6 overflow-y-auto scrollbar-thin">
                      
                      {/* Logo Ring Effect */}
                      <div className="relative flex items-center justify-center animate-fade-in">
                        <div className="w-[72px] h-[72px] rounded-full border border-[#2A0C10] bg-[#150508] flex items-center justify-center">
                          <Sparkles className="w-6 h-6 text-[#B91C1C] select-none" />
                        </div>
                      </div>

                      {/* Header and Subtext */}
                      <div className="space-y-4 max-w-lg mx-auto mt-2">
                        <h2 className="text-white font-bold text-[28px] tracking-tight leading-snug">
                          How can I assist you today?
                        </h2>
                        <p className={`text-base max-w-[340px] mx-auto leading-relaxed ${isCrimson ? "text-red-200/80" : "text-blue-200/80"}`}>
                          Ask any complex questions, explore research, or analyze code with the Doubt Solver.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Message Bottom Input Bar */}
                  <div className={`p-4 shrink-0 w-full font-sans ${activeConvId ? "bg-[#080202] border-t border-[#1E0F10]" : "bg-transparent pb-8"}`}>
                    <form onSubmit={handleSolveDoubt} className="w-full max-w-4xl mx-auto flex flex-col gap-2 relative">
                      
                      {/* Floating attached preview indicator */}
                      {doubtImageBase64 && (
                        <div className="absolute bottom-20 left-4 p-2 rounded-2xl bg-[#090404] border border-[#231212] flex items-center gap-3 max-w-[240px] select-none z-25 animate-fade-in shadow-xl">
                          <div className="w-10 h-10 rounded-xl overflow-hidden bg-zinc-900 border border-zinc-800 shrink-0">
                            <img src={doubtImageBase64} alt="attached whiteboard upload" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          </div>
                          <div className="flex flex-col min-w-0 flex-1 leading-none gap-1">
                            <span className="text-[10px] text-zinc-400 truncate font-semibold">whiteboard_scan.png</span>
                            <span className="text-[8px] text-[#B91C1C] uppercase tracking-widest font-black">OCR Ready</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setDoubtImageBase64(null)}
                            className="text-[10px] text-red-500 font-extrabold hover:text-red-405 cursor-pointer pr-1"
                          >
                            Remove
                          </button>
                        </div>
                      )}

                      {/* Compact unified input entry pill */}
                      <div className={`w-full border rounded-[24px] p-2 flex items-center gap-2 sm:gap-3 transition-all shadow-lg ${isCrimson ? "bg-[#0D0505] border-[#2A0C10] focus-within:border-red-500/40 focus-within:ring-1 focus-within:ring-red-500/10" : "bg-[#020512] border-[#0A122A] focus-within:border-blue-500/40 focus-within:ring-1 focus-within:ring-blue-500/10"}`}>
                        
                        {/* Paperclip file uploader (always visible) */}
                        <label className={`p-2 hover:bg-white/5 rounded-full transition-all cursor-pointer shrink-0 ${isCrimson ? "text-[#888888] hover:text-[#B91C1C]" : "text-[#888888] hover:text-[#1C4DB9]"}`}>
                          <input 
                            type="file" 
                            accept="image/*" 
                            className="hidden" 
                            onChange={handleImageFileChange} 
                          />
                          <Paperclip className="w-4 h-4" />
                        </label>

                        {/* Input textarea */}
                        <div className="flex-1 min-w-0">
                          <textarea
                            value={doubtText}
                            onChange={(e) => setDoubtText(e.target.value)}
                            placeholder="Message Doubt Solver..."
                            rows={1}
                            className="w-full bg-transparent border-none text-[15px] focus:outline-none resize-none max-h-24 scrollbar-none py-1.5 focus:ring-0 leading-relaxed text-white placeholder-white/40"
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                handleSolveDoubt(e);
                              }
                            }}
                          />
                        </div>

                        {/* Send button matching mockup design */}
                        <button
                          type="submit"
                          disabled={loading || (!doubtText.trim() && !doubtImageBase64)}
                          className={`w-10 h-10 rounded-xl flex items-center justify-center text-white transition-all cursor-pointer shrink-0 ${
                            loading || (!doubtText.trim() && !doubtImageBase64)
                                  ? isCrimson ? "bg-red-950/40 text-red-900/60 opacity-60 cursor-not-allowed" : "bg-blue-950/40 text-blue-900/60 opacity-60 cursor-not-allowed"
                                  : isCrimson ? "bg-red-700 hover:bg-red-600 text-red-100 shadow-md shadow-red-900/30 object-contain" : "bg-blue-700 hover:bg-blue-600 text-blue-100 shadow-md shadow-blue-900/30 object-contain"
                          }`}
                        >
                          <Send className="w-4 h-4 ml-0.5" />
                        </button>
                      </div>

                      {/* Footnote instruction comment */}
                      <div className="text-center text-xs mt-1 select-none leading-none font-medium text-white/50">
                        Doubt Solver can make mistakes. Verify important information.
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

          {/* ————————————————— Tool 2: Document Synthesizer ————————————————— */}
          {activeTool === "doc_synthesizer" && (
            <div className="flex flex-col items-center justify-center p-8 mt-4 w-full max-w-[900px] mx-auto transition-all relative">
              
              {/* History Toggle Button */}
              <div className="absolute top-0 right-0 z-10 flex gap-2">
                {activeDocHistoryId && (
                  <button
                    onClick={() => {
                        setDocHistory(prev => {
                          const updated = prev.filter(d => d.id !== activeDocHistoryId);
                          localStorage.setItem("nova_doc_history", JSON.stringify(updated));
                          return updated;
                        });
                        setSynthesizedOutput("");
                        setDocAnalysisStatus("");
                        setDocFileName("");
                        setDocChatHistory([]);
                        setActiveDocHistoryId(null);
                    }}
                    className="px-4 py-2 rounded-xl border border-[#2A1515] bg-[#0A0404] text-red-500 hover:bg-red-500/20 hover:text-red-400 font-bold text-xs tracking-wide transition-colors flex items-center gap-2 shadow-xl"
                    title="Delete current document"
                  >
                    <Trash2 className="w-4 h-4" /> Delete
                  </button>
                )}
                <button
                  onClick={() => setIsDocHistoryOpen(!isDocHistoryOpen)}
                  className="px-4 py-2 rounded-xl border border-[#2A1515] bg-[#0A0404] text-[#888888] hover:text-white font-bold text-xs tracking-wide transition-colors flex items-center gap-2 shadow-xl"
                >
                  <Clock className="w-4 h-4" />
                  {isDocHistoryOpen ? "Close History" : "View History"}
                </button>
              </div>

              {/* History Sidebar/Dropdown Overlay */}
              {isDocHistoryOpen && (
                <div className="absolute top-[48px] right-0 w-[300px] bg-[#0A0404] border border-[#2A1515] rounded-2xl shadow-2xl z-20 flex flex-col overflow-hidden animate-fade-in">
                  <div className="px-4 py-3 border-b border-[#1E0F10] flex justify-between items-center bg-[#080202]">
                    <span className="text-sm font-bold text-white flex items-center gap-2"><Clock className="w-4 h-4" /> Saved Documents</span>
                    <div className="flex items-center gap-2">
                       {docHistory.length > 0 && (
                         <button
                           onClick={() => {
                               setDocHistory([]);
                               localStorage.removeItem("nova_doc_history");
                               setSynthesizedOutput("");
                               setDocAnalysisStatus("");
                               setDocFileName("");
                               setDocChatHistory([]);
                               setActiveDocHistoryId(null);
                           }}
                           className="text-[10px] uppercase font-bold text-zinc-500 hover:text-red-400 tracking-wider flex items-center gap-1 transition-colors"
                           title="Clear All History"
                         >
                           <Trash2 className="w-3 h-3" /> All
                         </button>
                       )}
                      <button 
                        onClick={() => {
                          setSynthesizedOutput("");
                          setDocAnalysisStatus("");
                          setDocFileName("");
                          setDocChatHistory([]);
                          setActiveDocHistoryId(null);
                          setIsDocHistoryOpen(false);
                        }}
                        className="text-[10px] uppercase font-bold text-rose-500 hover:text-rose-400 tracking-wider flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" /> New
                      </button>
                    </div>
                  </div>
                  <div className="max-h-[400px] overflow-y-auto flex flex-col">
                    {docHistory.length === 0 ? (
                      <div className="p-[24px] text-center text-[#888888] text-xs font-medium">No history yet.</div>
                    ) : (
                      docHistory.map((doc) => (
                        <div key={doc.id} className={`p-4 border-b border-[#1E0F10] hover:bg-[#130608] cursor-pointer transition-colors relative group ${activeDocHistoryId === doc.id ? 'bg-[#150508]' : ''}`}>
                          <div 
                            onClick={() => {
                              setSynthesizedOutput(doc.synthesis);
                              setDocFileName(doc.fileName);
                              setDocAnalysisStatus("Analysis Complete");
                              setDocChatHistory(doc.chatHistory || []);
                              setActiveDocHistoryId(doc.id);
                              setIsDocHistoryOpen(false);
                            }}
                          >
                            <h4 className="text-sm font-bold text-white truncate pr-6">{doc.fileName}</h4>
                            <p className="text-[10px] text-[#555555] mt-1">{new Date(doc.timestamp).toLocaleString()}</p>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                                setDocHistory(prev => {
                                  const updated = prev.filter(d => d.id !== doc.id);
                                  localStorage.setItem("nova_doc_history", JSON.stringify(updated));
                                  return updated;
                                });
                                if (activeDocHistoryId === doc.id) {
                                  setSynthesizedOutput("");
                                  setDocAnalysisStatus("");
                                  setDocFileName("");
                                  setDocChatHistory([]);
                                  setActiveDocHistoryId(null);
                                }
                            }}
                            className="absolute top-4 right-4 text-[#888888] hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Validation & Error Messaging */}
              {docError && (
                <div className="w-full max-w-[420px] bg-red-955/20 border border-red-900/50 rounded-2xl p-4 mb-6 flex items-center gap-3 animate-fade-in shadow-xl">
                  <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
                  <p className="text-red-200 text-sm font-medium leading-snug">{docError}</p>
                  <button onClick={() => setDocError("")} className="ml-auto text-red-400 hover:text-red-300">
                    <XCircle className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Upload View (When not analyzing and no results) */}
              {!docAnalysisStatus && !synthesizedOutput && (
                <div 
                  className={`w-full max-w-[420px] h-[360px] rounded-[32px] border border-dashed flex flex-col items-center justify-center p-8 transition-colors duration-300 relative ${
                    isDraggingDoc ? "border-red-500 bg-red-955/5" : "border-[#2A1515] hover:border-[#3A141D] bg-[#0A0404]"
                  }`}
                  onDragOver={handleDocDragOver}
                  onDragLeave={handleDocDragLeave}
                  onDrop={handleDocDrop}
                >
                  <div className="w-[72px] h-[72px] rounded-3xl bg-[#130608] border border-[#2A0C10] flex items-center justify-center mb-5">
                    <CloudUpload className="w-8 h-8 text-[#B91C1C]" strokeWidth={2} />
                  </div>
                  
                  <h3 className="text-white font-bold text-xl mb-1.5 tracking-tight">Upload Document</h3>
                  
                  <p className="text-[#888888] text-[13px] text-center max-w-[200px] leading-relaxed mb-6 font-medium">
                    Drag and drop or click to browse. Max file size: 2MB.
                  </p>
                  
                  <div className="flex flex-wrap items-center justify-center gap-2 max-w-[250px]">
                    {["PDF", "DOCX", "TXT", "MD", "PNG", "JPG", "WEBP"].map(ext => (
                      <span key={ext} className="px-2.5 py-1 rounded bg-[#0D0505] border border-[#1E0F10] text-[#888888] font-bold text-[10px]">{ext}</span>
                    ))}
                  </div>
                  
                  <input 
                    type="file" 
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    accept=".pdf,.docx,.txt,.md,.png,.jpg,.jpeg,.webp"
                    onChange={handleDocFileSelect}
                  />
                </div>
              )}

              {/* Progress State View */}
              {docAnalysisStatus && !synthesizedOutput && (
                <div className="w-full max-w-[420px] h-[360px] rounded-[32px] border border-[#2A1515] bg-[#0A0404] flex flex-col items-center justify-center p-8 animate-fade-in shadow-2xl relative overflow-hidden">
                  <div className="absolute inset-0 opacity-10 blur-3xl rounded-full bg-gradient-to-tr from-red-600 to-transparent pointer-events-none animate-pulse" />
                  <div className="w-20 h-20 rounded-3xl bg-[#130608] border border-[#2A0C10] flex items-center justify-center mb-6 relative z-10 shadow-inner">
                    <Activity className="w-8 h-8 text-rose-500 animate-pulse" strokeWidth={2} />
                  </div>
                  <h3 className="text-white font-bold text-xl mb-2 tracking-tight relative z-10">{docAnalysisStatus}</h3>
                  <p className="text-[#888888] text-[13px] text-center max-w-[240px] leading-relaxed font-medium relative z-10 break-words line-clamp-1">
                    {docFileName}
                  </p>
                  
                  <div className="w-48 h-1.5 bg-[#150508] rounded-full mt-6 relative overflow-hidden">
                    <div className="absolute top-0 left-0 h-full bg-red-600 rounded-full w-24 animate-pulse duration-1000" />
                  </div>
                </div>
              )}

              {/* Streaming Output / Results View */}
              {synthesizedOutput && (
                <div className="w-full bg-[#0A0404] border border-[#2A1515] rounded-[32px] flex flex-col shadow-2xl overflow-hidden animate-fade-in">
                  <div className="flex items-center justify-between px-6 py-4 border-b border-[#1E0F10] bg-[#080202]">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-[#130608] border border-[#2A0C10] flex items-center justify-center shrink-0">
                        <FileText className="w-4 h-4 text-red-500" />
                      </div>
                      <div className="flex flex-col">
                        <h3 className="text-white font-bold text-sm tracking-wide">Analysis Results</h3>
                        <p className="text-[#888888] text-[10px] uppercase tracking-widest font-black truncate max-w-[200px]">{docFileName}</p>
                      </div>
                    </div>
                    {docAnalysisStatus === "Analysis Complete" ? (
                      <span className="text-[10px] font-black text-green-400 uppercase tracking-widest flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Complete</span>
                    ) : (
                       <span className="text-[10px] font-black text-amber-500/80 uppercase tracking-widest flex items-center gap-1 animate-pulse"><Loader2 className="w-3 h-3 animate-spin" /> Generating...</span>
                    )}
                  </div>
                  <div className="p-5 md:p-8 prose prose-invert max-w-none prose-p:leading-relaxed prose-pre:bg-[#130608] prose-pre:border prose-pre:border-[#2A1515] overflow-y-auto max-h-[500px] scrollbar-thin scrollbar-thumb-[#2A1515] scrollbar-track-transparent">
                    <Markdown remarkPlugins={[remarkGfm]}>{synthesizedOutput}</Markdown>
                  </div>
                  
                  {/* Doc Chat Section */}
                  {synthesizedOutput && (
                    <div className="border-t border-[#1E0F10] bg-[#0A0404] p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-sm font-bold text-white flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-rose-500" />
                          Chat About Document
                        </h4>
                        {docChatHistory.length > 0 && (
                          <button
                            onClick={handleDownloadDocChat}
                            title="Download Chat as PDF"
                            className="p-1.5 hover:bg-white/5 text-zinc-400 hover:text-white rounded-lg transition-colors flex items-center gap-1.5 text-xs font-medium"
                          >
                            <Download className="w-4 h-4" /> Export PDF
                          </button>
                        )}
                      </div>
                    {docChatHistory.length > 0 && (
                      <div className="flex flex-col gap-3 max-h-[200px] overflow-y-auto mb-4 p-2 custom-scrollbar">
                        {docChatHistory.map((msg, idx) => (
                          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`px-4 py-2 rounded-2xl max-w-[90%] text-sm leading-relaxed ${msg.role === 'user' ? 'bg-[#2A0C10] text-[#FFD0D0] border border-[#3A141D]' : 'bg-[#150508] text-[#cccccc] border border-[#2A1515]'}`}>
                              <Markdown remarkPlugins={[remarkGfm]}>{msg.content}</Markdown>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    <form onSubmit={handleDocChatSubmit} className="relative">
                      <input
                        type="text"
                        value={docChatText}
                        onChange={(e) => setDocChatText(e.target.value)}
                        placeholder="Ask Ai Bot anything..."
                        disabled={loading}
                        className="w-full bg-[#130608] border border-[#2A1515] text-white text-sm rounded-xl pl-4 pr-12 py-3 focus:outline-none focus:border-[#4A1D23] focus:ring-1 focus:ring-[#4A1D23]/50 transition-all placeholder:text-[#555] disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                      <button
                        type="submit"
                        disabled={!docChatText.trim() || loading}
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center bg-[#2A0C10] hover:bg-[#3A141D] text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-[#3A141D]"
                      >
                        {loading && !docChatText ? <Loader2 className="w-4 h-4 animate-spin text-rose-500" /> : <Send className="w-4 h-4 text-rose-400" />}
                      </button>
                    </form>
                  </div>
                  )}

                  <div className="p-4 border-t border-[#1E0F10] bg-[#080202] flex justify-end">
                    <button
                      onClick={() => {
                        setSynthesizedOutput("");
                        setDocAnalysisStatus("");
                        setDocFileName("");
                        setDocChatHistory([]);
                        setActiveDocHistoryId(null);
                      }}
                       className="px-6 py-2.5 rounded-xl border border-[#2A1515] bg-[#0D0505] text-[#888888] hover:text-white hover:bg-[#130608] transition-colors font-bold tracking-wide text-xs"
                    >
                      Process Another Document
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ————————————————— Tool 3: Quiz Master ————————————————— */}
          {activeTool === "quiz_master" && (
            <div className="flex flex-col items-center justify-center p-8 mt-4 w-full relative max-w-[800px] mx-auto">
              {/* History Toggle Button */}
              <div className="absolute top-0 right-8 z-10 flex gap-2">
                {quizHistory.length > 0 && (
                  <button
                    onClick={() => {
                      setQuizHistory([]);
                      localStorage.removeItem("nova_quiz_history");
                    }}
                    className="px-4 py-2 rounded-xl border border-[#2A1515] bg-[#0A0404] text-red-500 hover:bg-red-500/20 hover:text-red-400 font-bold text-xs tracking-wide transition-colors flex items-center gap-2 shadow-xl"
                    title="Clear All History"
                  >
                    <Trash2 className="w-4 h-4" />
                    Clear History
                  </button>
                )}
                <button
                  onClick={() => setIsQuizHistoryOpen(!isQuizHistoryOpen)}
                  className="px-4 py-2 rounded-xl border border-[#2A1515] bg-[#0A0404] text-[#888888] hover:text-white font-bold text-xs tracking-wide transition-colors flex items-center gap-2 shadow-xl"
                >
                  <Clock className="w-4 h-4" />
                  {isQuizHistoryOpen ? "Close History" : "View History"}
                </button>
              </div>

              {/* History Sidebar/Dropdown Overlay */}
              {isQuizHistoryOpen && (
                <div className="absolute top-[48px] right-8 w-[320px] bg-[#0A0404] border border-[#2A1515] rounded-2xl shadow-2xl z-20 flex flex-col overflow-hidden animate-fade-in">
                  <div className="px-4 py-3 border-b border-[#1E0F10] flex justify-between items-center bg-[#080202]">
                    <span className="text-sm font-bold text-white flex items-center gap-2"><Clock className="w-4 h-4" /> Past Quizzes</span>
                    {quizHistory.length > 0 && (
                      <button
                        onClick={() => {
                          setQuizHistory([]);
                          localStorage.removeItem("nova_quiz_history");
                        }}
                        className="text-[10px] uppercase font-bold text-zinc-500 hover:text-red-400 tracking-wider flex items-center gap-1 transition-colors"
                        title="Clear All History"
                      >
                        <Trash2 className="w-3 h-3" /> All
                      </button>
                    )}
                  </div>
                  <div className="max-h-[400px] overflow-y-auto flex flex-col custom-scrollbar">
                    {quizHistory.length === 0 ? (
                      <div className="p-[24px] text-center text-[#888888] text-xs font-medium">No quiz history yet.</div>
                    ) : (
                      quizHistory.map((q) => {
                        const scorePerc = Math.round((q.score / q.total) * 100);
                        return (
                          <div key={q.id} className="p-4 border-b border-[#1E0F10] hover:bg-[#130608] relative group">
                            <h4 className="text-sm font-bold text-white truncate pr-6">{q.topic}</h4>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[10px] bg-[#1a0a0c] border border-red-900/30 text-rose-400 px-1.5 py-0.5 rounded uppercase font-bold">{q.difficulty}</span>
                              <span className={`text-[10px] font-bold ${scorePerc >= 70 ? 'text-emerald-400' : 'text-amber-500'}`}>{scorePerc}% Score</span>
                            </div>
                            <p className="text-[10px] text-[#555555] mt-1.5">{new Date(q.timestamp).toLocaleString()} • {Math.floor(q.timeTaken / 1000)}s taken</p>
                            <button
                              onClick={() => {
                                setQuizHistory(prev => {
                                  const updated = prev.filter(item => item.id !== q.id);
                                  localStorage.setItem("nova_quiz_history", JSON.stringify(updated));
                                  return updated;
                                });
                              }}
                              className="absolute top-4 right-4 text-[#888888] hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Delete quiz record"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                      )})
                    )}
                  </div>
                </div>
              )}

              {quizQuestions.length === 0 ? (
                <div className="p-[24px] rounded-[32px] bg-[#0A0404] border border-[#2A1515] flex flex-col gap-4 md:gap-6 w-full max-w-[500px] mx-auto shadow-2xl relative">
                  <div className="flex items-center gap-3 border-b border-[#1E0F10] pb-4">
                    <Sparkles className={`w-6 h-6 ${isCrimson ? "text-rose-500" : "text-violet-500"}`} />
                    <h2 className="text-[22px] font-bold text-white tracking-tight">Quiz Configuration</h2>
                  </div>

                  <div className="space-y-5">
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold text-[#888888] uppercase tracking-wider">Education Level</label>
                      <select
                        value={quizEducationLevel}
                        onChange={(e) => {
                          const val = e.target.value;
                          setQuizEducationLevel(val);
                          const subjects = EDUCATION_LEVEL_SUBJECT_MAP[val as keyof typeof EDUCATION_LEVEL_SUBJECT_MAP] || [];
                          if (subjects.length > 0) {
                            setQuizSubjectCategory(subjects[0]);
                          }
                        }}
                        className={`w-full bg-[#0A0404] text-white text-sm px-4 py-3 rounded-xl border border-[#2A1515] focus:ring-1 transition-all outline-none ${isCrimson ? 'focus:border-rose-500/50 focus:ring-rose-500/20' : 'focus:border-violet-500/50 focus:ring-violet-500/20'}`}
                      >
                        {Object.keys(EDUCATION_LEVEL_SUBJECT_MAP).map(lvl => (
                          <option key={lvl} value={lvl}>{lvl}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[11px] font-bold text-[#888888] uppercase tracking-wider">Subject Category</label>
                      <select
                        value={quizSubjectCategory}
                        onChange={(e) => setQuizSubjectCategory(e.target.value)}
                        className={`w-full bg-[#0A0404] text-white text-sm px-4 py-3 rounded-xl border border-[#2A1515] focus:ring-1 transition-all outline-none ${isCrimson ? 'focus:border-rose-500/50 focus:ring-rose-500/20' : 'focus:border-violet-500/50 focus:ring-violet-500/20'}`}
                      >
                        {(EDUCATION_LEVEL_SUBJECT_MAP[quizEducationLevel as keyof typeof EDUCATION_LEVEL_SUBJECT_MAP] || []).map(subject => (
                          <option key={subject} value={subject}>{subject}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[11px] font-bold text-[#888888] uppercase tracking-wider">Specific Topic</label>
                      <input
                        type="text"
                        value={quizSpecificTopic}
                        onChange={(e) => setQuizSpecificTopic(e.target.value)}
                        placeholder="E.g., Newton's Laws, Ecosystems, Data Structures..."
                        className={`w-full bg-[#0A0404] text-white text-sm px-4 py-3 rounded-xl border border-[#2A1515] focus:ring-1 transition-all outline-none ${isCrimson ? 'focus:border-rose-500/50 focus:ring-rose-500/20' : 'focus:border-violet-500/50 focus:ring-violet-500/20'}`}
                      />
                      <div className="flex flex-wrap gap-2 pt-2">
                        {(() => {
                            let suggestions = ["Data Structures", "Core Sorting Algorithms", "Database B+ Tree Indexing", "AI Neural Networks"];
                            if (quizSubjectCategory === "Science") suggestions = ["Laws of Motion", "Cell Biology", "Periodic Table"];
                            if (quizSubjectCategory === "Mathematics") suggestions = ["Trigonometry", "Algebra", "Calculus"];
                            if (quizSubjectCategory === "English") suggestions = ["Grammar", "Reading Comprehension", "Vocabulary"];
                            if (quizSubjectCategory === "Physics") suggestions = ["Electromagnetism", "Thermodynamics", "Quantum Mechanics"];
                            if (quizSubjectCategory === "Biology") suggestions = ["Genetics", "Human Anatomy", "Ecology"];
                            if (quizSubjectCategory === "History") suggestions = ["World War II", "Cold War", "Ancient Civilizations"];
                            
                            return suggestions.map(topic => (
                              <button
                                key={topic}
                                onClick={() => setQuizSpecificTopic(topic)}
                                className={`px-3 py-1.5 rounded-full text-[11px] font-medium transition-colors border ${
                                  quizSpecificTopic === topic 
                                    ? (isCrimson ? "bg-rose-950/40 border-rose-900/50 text-white" : "bg-violet-950/40 border-violet-900/50 text-white")
                                    : "bg-[#130608] border-[#2A1515] text-[#888888] hover:text-white hover:border-[#3A1E1E]"
                                }`}
                              >
                                {topic}
                              </button>
                            ));
                        })()}
                      </div>
                    </div>

                    <div className="flex space-x-4">
                      <div className="space-y-2 flex-1">
                        <label className="text-[11px] font-bold text-[#888888] uppercase tracking-wider">Difficulty</label>
                        <select
                          value={quizDifficulty}
                          onChange={(e) => setQuizDifficulty(e.target.value)}
                          className={`w-full bg-[#0A0404] text-white text-sm px-4 py-3 rounded-xl border border-[#2A1515] focus:ring-1 transition-all outline-none ${isCrimson ? 'focus:border-rose-500/50 focus:ring-rose-500/20' : 'focus:border-violet-500/50 focus:ring-violet-500/20'}`}
                        >
                          <option value="Beginner">Beginner</option>
                          <option value="Intermediate">Intermediate</option>
                          <option value="Advanced">Advanced</option>
                        </select>
                      </div>
                      <div className="space-y-2 flex-1">
                        <label className="text-[11px] font-bold text-[#888888] uppercase tracking-wider">Questions</label>
                        <select
                          value={quizQuestionsCount}
                          onChange={(e) => setQuizQuestionsCount(e.target.value)}
                          className={`w-full bg-[#0A0404] text-white text-sm px-4 py-3 rounded-xl border border-[#2A1515] focus:ring-1 transition-all outline-none ${isCrimson ? 'focus:border-rose-500/50 focus:ring-rose-500/20' : 'focus:border-violet-500/50 focus:ring-violet-500/20'}`}
                        >
                          <option value="3 Questions">3 Questions</option>
                          <option value="5 Questions">5 Questions</option>
                          <option value="10 Questions">10 Questions</option>
                        </select>
                      </div>
                    </div>

                    <button
                      onClick={handleGenerateQuiz}
                      disabled={loading || !quizSpecificTopic}
                      className={`w-full p-4 rounded-xl text-white font-bold tracking-wide mt-4 transition-colors disabled:opacity-50 flex justify-center items-center gap-2 shadow-lg ${isCrimson ? "bg-rose-600 hover:bg-rose-500 shadow-[0_4px_14px_rgba(225,29,72,0.3)] hover:shadow-[0_6px_20px_rgba(225,29,72,0.4)]" : "bg-violet-600 hover:bg-violet-500 shadow-[0_4px_14px_rgba(139,92,246,0.3)] hover:shadow-[0_6px_20px_rgba(139,92,246,0.4)]"}`}
                    >
                      {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                      {loading ? "Generating Quiz..." : "Generate AI Quiz"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-5 md:p-8 rounded-[32px] bg-[#121214] border border-[rgba(255,255,255,0.08)] shadow-2xl space-y-8 w-full max-w-3xl mx-auto relative overflow-hidden">
                  {/* Current Board progress indicator */}
                  <div className="space-y-3 relative z-10">
                    <div className="flex justify-between items-end text-xs font-extrabold text-zinc-400 tracking-wide">
                      <span className={`uppercase ${isCrimson ? 'text-rose-400' : 'text-violet-400'}`}>{quizSpecificTopic}</span>
                      <span>{currentQuizIdx + 1} / {quizQuestions.length}</span>
                    </div>
                    <div className="w-full h-1.5 bg-[#222227] rounded-full overflow-hidden border border-white/5">
                      <div 
                        className={`h-full transition-all duration-500 ease-out rounded-full ${isCrimson ? 'bg-gradient-to-r from-rose-600 to-pink-500 shadow-[0_0_10px_rgba(225,29,72,0.6)]' : 'bg-gradient-to-r from-violet-600 to-fuchsia-500 shadow-[0_0_10px_rgba(139,92,246,0.6)]'}`} 
                        style={{ width: `${((currentQuizIdx + 1) / quizQuestions.length) * 100}%` }}
                      />
                    </div>
                  </div>

                  {!quizFinished ? (
                    <div className="space-y-8 relative z-10">
                      {/* Question label */}
                      <p className="text-base sm:text-lg font-semibold text-white leading-relaxed tracking-tight">
                        {currentQuizIdx + 1}. {quizQuestions[currentQuizIdx].question}
                      </p>

                      {/* Options */}
                      <div className="space-y-3">
                        {quizQuestions[currentQuizIdx].options.map((opt: string, optId: number) => {
                          const isSelected = selectedAnswers[currentQuizIdx] === optId;
                          return (
                            <button
                              key={optId}
                              onClick={() => {
                                setSelectedAnswers(prev => ({ ...prev, [currentQuizIdx]: optId }));
                              }}
                              className={`w-full p-4 text-sm font-medium text-left rounded-xl border transition-all duration-200 ease-out cursor-pointer group hover:-translate-y-0.5 hover:translate-x-0.5 ${
                                isSelected 
                                  ? (isCrimson ? 'bg-rose-500/15 border-rose-500 text-rose-100 shadow-[0_0_20px_rgba(225,29,72,0.15)]' : 'bg-violet-500/15 border-violet-500 text-violet-100 shadow-[0_0_20px_rgba(139,92,246,0.15)]')
                                  : (isCrimson ? 'bg-[#1a1a1e] border-[rgba(255,255,255,0.05)] text-zinc-300 hover:border-rose-500/50 hover:shadow-[0_0_15px_rgba(225,29,72,0.1)]' : 'bg-[#1a1a1e] border-[rgba(255,255,255,0.05)] text-zinc-300 hover:border-violet-500/50 hover:shadow-[0_0_15px_rgba(139,92,246,0.1)]')
                              }`}
                            >
                              <div className="flex items-center gap-4">
                                <div className={`flex items-center justify-center w-7 h-7 rounded-lg border text-xs transition-colors shrink-0 ${isSelected ? (isCrimson ? 'bg-rose-600 border-rose-500 text-white shadow-inner' : 'bg-violet-600 border-violet-500 text-white shadow-inner') : (isCrimson ? 'bg-[#121214] border-[rgba(255,255,255,0.08)] text-zinc-500 group-hover:border-rose-500/50 group-hover:text-rose-300' : 'bg-[#121214] border-[rgba(255,255,255,0.08)] text-zinc-500 group-hover:border-violet-500/50 group-hover:text-violet-300')}`}>
                                  {String.fromCharCode(65 + optId)}
                                </div>
                                <span className="leading-snug">{opt}</span>
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      {/* Quiz controls footer */}
                      <div className="flex justify-between items-center pt-6 border-t border-[rgba(255,255,255,0.05)]">
                        <button
                          onClick={() => setCurrentQuizIdx(prev => Math.max(0, prev - 1))}
                          className="px-5 py-2.5 bg-transparent border border-[rgba(255,255,255,0.1)] hover:bg-[#1a1a1e] text-xs font-semibold text-zinc-400 hover:text-white rounded-xl transition-all cursor-pointer disabled:opacity-30 disabled:pointer-events-none"
                          disabled={currentQuizIdx === 0}
                        >
                          Previous
                        </button>

                        {currentQuizIdx < quizQuestions.length - 1 ? (
                          <button
                            onClick={() => {
                              if (selectedAnswers[currentQuizIdx] === undefined) {
                                alert("Please select an answer option to proceed!");
                                return;
                              }
                              setCurrentQuizIdx(prev => prev + 1);
                            }}
                            className={`px-6 py-2.5 text-xs font-bold text-white rounded-xl transition-all cursor-pointer hover:-translate-y-0.5 ${isCrimson ? 'bg-rose-600 hover:bg-rose-500 shadow-[0_4px_14px_rgba(225,29,72,0.3)] hover:shadow-[0_6px_20px_rgba(225,29,72,0.4)]' : 'bg-violet-600 hover:bg-violet-500 shadow-[0_4px_14px_rgba(139,92,246,0.3)] hover:shadow-[0_6px_20px_rgba(139,92,246,0.4)]'}`}
                          >
                            Next Question
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              if (selectedAnswers[currentQuizIdx] === undefined) {
                                alert("Please select an answer option to submit!");
                                return;
                              }
                              scoreQuiz();
                            }}
                            className={`px-6 py-2.5 text-xs font-bold text-white rounded-xl transition-all cursor-pointer hover:-translate-y-0.5 ${isCrimson ? 'bg-rose-600 hover:bg-rose-500 shadow-[0_4px_14px_rgba(225,29,72,0.3)] hover:shadow-[0_6px_20px_rgba(225,29,72,0.4)]' : 'bg-violet-600 hover:bg-violet-500 shadow-[0_4px_14px_rgba(139,92,246,0.3)] hover:shadow-[0_6px_20px_rgba(139,92,246,0.4)]'}`}
                          >
                            Submit Quiz
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    // Quiz End Scores results summary
                    <div className="p-[24px] rounded-2xl bg-zinc-900 border border-zinc-850 space-y-4">
                      
                      {(() => {
                        let scoreCount = 0;
                        quizQuestions.forEach((q, ix) => {
                          if (selectedAnswers[ix] === q.correctAnswer) scoreCount++;
                        });
                        
                        const totalQs = quizQuestions.length;
                        const wrongQs = totalQs - scoreCount;
                        const scorePerc = Math.round((scoreCount / totalQs) * 100);
                        const timeTakenSec = quizStartTime && quizEndTime ? Math.floor((quizEndTime - quizStartTime) / 1000) : 0;
                        const min = Math.floor(timeTakenSec / 60);
                        const sec = timeTakenSec % 60;
                        const timeTakenStr = `${min}m ${sec}s`;
                        
                        let rating = "Needs Practice";
                        let improvement = "Review the explanations and try again.";
                        if (scorePerc >= 90) { rating = "Outstanding"; improvement = "Perfect! Ready for advanced topics."; }
                        else if (scorePerc >= 70) { rating = "Good Job"; improvement = "Solid grasp. Review the ones you missed."; }

                        return (
                          <div className="space-y-6">
                            <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-4">
                              <div className="flex-1 text-center sm:text-left">
                                <div className="inline-flex p-3 rounded-full bg-emerald-950/40 border border-emerald-500/20 text-emerald-400 mb-2">
                                  <Trophy className="w-6 h-6" />
                                </div>
                                <h3 className="text-xl font-bold text-white">Quiz Evaluation</h3>
                                <p className="text-xs text-zinc-400 mt-1">Topic: <span className="font-bold text-zinc-300">{quizSpecificTopic}</span> ({quizQuestions.length} Questions)</p>
                              </div>
                              <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 min-w-[140px] text-center">
                                <p className="text-3xl md:text-4xl font-extrabold text-emerald-400">{scorePerc}%</p>
                                <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mt-1">Score</p>
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                              <div className="bg-zinc-950 border border-zinc-800 p-3 rounded-xl text-center">
                                <p className="text-xs text-zinc-500 font-bold mb-1">Answered</p>
                                <p className="text-lg font-bold text-white">{totalQs}</p>
                              </div>
                              <div className="bg-zinc-950 border border-zinc-800 p-3 rounded-xl text-center">
                                <p className="text-xs text-zinc-500 font-bold mb-1">Correct</p>
                                <p className="text-lg font-bold text-emerald-400">{scoreCount}</p>
                              </div>
                              <div className="bg-zinc-950 border border-zinc-800 p-3 rounded-xl text-center">
                                <p className="text-xs text-zinc-500 font-bold mb-1">Wrong</p>
                                <p className="text-lg font-bold text-red-400">{wrongQs}</p>
                              </div>
                              <div className="bg-zinc-950 border border-zinc-800 p-3 rounded-xl text-center">
                                <p className="text-xs text-zinc-500 font-bold mb-1">Time</p>
                                <p className="text-lg font-bold text-zinc-300">{timeTakenStr}</p>
                              </div>
                            </div>

                            <div className={`p-4 rounded-xl border ${isCrimson ? 'bg-rose-950/20 border-rose-900/30' : 'bg-violet-950/20 border-violet-900/30'}`}>
                              <h4 className="text-sm font-bold text-white mb-1">{rating}</h4>
                              <p className="text-xs text-zinc-400 leading-relaxed bg-transparent">{improvement}</p>
                              <p className="text-xs text-zinc-500 mt-3 pt-3 border-t border-zinc-800/50">You earned <span className="font-bold text-emerald-400">+{scoreCount * 30} XP</span> for correct answers.</p>
                            </div>
                            
                            {/* Explanations List */}
                            <div className="text-left space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                              <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2 sticky top-0 bg-zinc-900 py-2 z-10 border-b border-zinc-800">Detailed Review</h4>
                              {quizQuestions.map((q, ix) => {
                                const isCorrect = selectedAnswers[ix] === q.correctAnswer;
                                const selectedOpt = q.options[selectedAnswers[ix]];
                                return (
                                  <div key={ix} className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-300 space-y-2">
                                    <div className="flex items-start gap-3">
                                      <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded mt-0.5 shrink-0 ${isCorrect ? 'bg-emerald-950/50 text-emerald-400 border border-emerald-500/20' : 'bg-red-950/50 text-red-400 border border-red-500/20'}`}>
                                        {isCorrect ? "Correct" : "Wrong"}
                                      </span>
                                      <p className="font-semibold text-white text-sm leading-relaxed">{ix + 1}. {q.question}</p>
                                    </div>
                                    <div className="pl-[72px] space-y-1.5">
                                      {!isCorrect && <p className="line-through text-red-500/80">Your Answer: {selectedOpt}</p>}
                                      <p className="font-medium text-emerald-400">Correct Answer: {q.options[q.correctAnswer]}</p>
                                      <div className="mt-3 pt-3 border-t border-zinc-900">
                                        <p className="text-zinc-400 leading-relaxed"><span className="text-zinc-500 font-bold uppercase text-[10px] mr-1">Explanation:</span> {q.explanation}</p>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })()}

                      <div className="pt-4 flex justify-center">
                        <button
                          onClick={() => {
                            setQuizQuestions([]);
                            setCurrentQuizIdx(0);
                            setQuizFinished(false);
                            setSelectedAnswers({});
                            setQuizStartTime(null);
                            setQuizEndTime(null);
                          }}
                          className={`mt-4 px-8 py-3 bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-sm font-bold text-white rounded-xl transition-all cursor-pointer shadow-lg`}
                        >
                          Generate New Quiz
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ————————————————— Tool 4: Career Studio ————————————————— */}
          {activeTool === "career_studio" && (
            <div className="flex flex-col items-center justify-center p-4 lg:p-8 mt-4 w-full relative max-w-[1200px] mx-auto">
              
              {/* History Toggle Button */}
              <div className="absolute top-0 right-0 z-10 flex gap-2">
                <button
                  onClick={() => {
                    setResumeData(null);
                    setCareerName("");
                    setCareerEmail("");
                    setCareerPhone("");
                    setTargetRole("");
                    setCareerExperience("");
                    setCareerEducation("");
                    setCareerSkills("");
                    setActiveCareerHistoryId(null);
                    setIsCareerHistoryOpen(false);
                  }}
                  className={`px-4 py-2 rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#121214] font-bold text-xs tracking-wide transition-colors flex items-center gap-2 shadow-xl ${isCrimson ? 'text-rose-400 hover:text-rose-300' : 'text-violet-400 hover:text-violet-300'}`}
                  title="Start New Resume"
                >
                  <Plus className="w-4 h-4" />
                  New Resume
                </button>
                {careerHistory.length > 0 && (
                  <button
                    onClick={() => {
                      setCareerHistory([]);
                      localStorage.removeItem("nova_career_history");
                      setResumeData(null);
                      setActiveCareerHistoryId(null);
                    }}
                    className="px-4 py-2 rounded-xl border border-[#2A1515] bg-[#0A0404] text-red-500 hover:bg-red-500/20 hover:text-red-400 font-bold text-xs tracking-wide transition-colors flex items-center gap-2 shadow-xl"
                    title="Clear All History"
                  >
                    <Trash2 className="w-4 h-4" />
                    Clear History
                  </button>
                )}
                <button
                  onClick={() => setIsCareerHistoryOpen(!isCareerHistoryOpen)}
                  className="px-4 py-2 rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#121214] text-zinc-400 hover:text-white font-bold text-xs tracking-wide transition-colors flex items-center gap-2 shadow-xl"
                >
                  <Clock className="w-4 h-4" />
                  {isCareerHistoryOpen ? "Close History" : "View History"}
                </button>
              </div>

              {/* History Dropdown Overlay */}
              {isCareerHistoryOpen && (
                <div className="absolute top-[48px] right-0 w-[320px] bg-[#121214] border border-[rgba(255,255,255,0.08)] rounded-2xl shadow-2xl z-20 flex flex-col overflow-hidden animate-fade-in backdrop-blur-md">
                  <div className="px-4 py-3 border-b border-[rgba(255,255,255,0.05)] flex justify-between items-center bg-black/20">
                    <span className="text-sm font-bold text-white flex items-center gap-2"><Clock className="w-4 h-4" /> Past Resumes</span>
                    <button 
                      onClick={() => {
                        setResumeData(null);
                        setCareerName("");
                        setCareerEmail("");
                        setCareerPhone("");
                        setTargetRole("");
                        setCareerExperience("");
                        setCareerEducation("");
                        setCareerSkills("");
                        setCareerLocation("");
                        setCareerLinkedin("");
                        setCareerCertifications("");
                        setCareerLanguages("");
                        setCareerProjects("");
                        setCareerInternships("");
                        setCareerAchievements("");
                        setCareerObjective("");
                        setCareerPhoto(null);
                        setActiveCareerHistoryId(null);
                        setIsCareerHistoryOpen(false);
                      }}
                      className={`text-[10px] uppercase font-bold tracking-wider flex items-center gap-1 ${isCrimson ? 'text-rose-500 hover:text-rose-400' : 'text-violet-500 hover:text-violet-400'}`}
                    >
                      <Plus className="w-3 h-3" /> New
                    </button>
                  </div>
                  <div className="max-h-[400px] overflow-y-auto flex flex-col custom-scrollbar">
                    {careerHistory.length === 0 ? (
                      <div className="p-[24px] text-center text-zinc-500 text-xs font-medium">No resume history yet.</div>
                    ) : (
                      careerHistory.map((item) => (
                        <div key={item.id} className="p-4 border-b border-[rgba(255,255,255,0.05)] hover:bg-white/5 relative group cursor-pointer transition-colors" onClick={() => {
                          setActiveCareerHistoryId(item.id);
                          if (item.inputs) {
                            setCareerName(typeof item.inputs.careerName === 'string' ? item.inputs.careerName : "");
                            setCareerEmail(typeof item.inputs.careerEmail === 'string' ? item.inputs.careerEmail : "");
                            setCareerPhone(typeof item.inputs.careerPhone === 'string' ? item.inputs.careerPhone : "");
                            setCareerEducation(typeof item.inputs.careerEducation === 'string' ? item.inputs.careerEducation : Array.isArray(item.inputs.careerEducation) ? item.inputs.careerEducation.map(x => JSON.stringify(x)).join(', ') : typeof item.inputs.careerEducation === 'object' ? JSON.stringify(item.inputs.careerEducation) : "");
                            setCareerSkills(typeof item.inputs.careerSkills === 'string' ? item.inputs.careerSkills : Array.isArray(item.inputs.careerSkills) ? item.inputs.careerSkills.join(", ") : typeof item.inputs.careerSkills === 'object' ? JSON.stringify(item.inputs.careerSkills) : "");
                            setCareerExperience(typeof item.inputs.careerExperience === 'string' ? item.inputs.careerExperience : Array.isArray(item.inputs.careerExperience) ? item.inputs.careerExperience.map(x => JSON.stringify(x)).join('\n') : typeof item.inputs.careerExperience === 'object' ? JSON.stringify(item.inputs.careerExperience) : "");
                            setTargetRole(typeof item.inputs.targetRole === 'string' ? item.inputs.targetRole : "");
                            setCareerLocation(item.inputs.careerLocation || "");
                            setCareerLinkedin(item.inputs.careerLinkedin || "");
                            setCareerCertifications(item.inputs.careerCertifications || "");
                            setCareerLanguages(item.inputs.careerLanguages || "");
                            setCareerProjects(item.inputs.careerProjects || "");
                            setCareerInternships(item.inputs.careerInternships || "");
                            setCareerAchievements(item.inputs.careerAchievements || "");
                            setCareerObjective(item.inputs.careerObjective || "");
                            setCareerPhoto(item.inputs.careerPhoto || null);
                          } else {
                            setCareerName(item.name || "");
                            setTargetRole(item.targetRole || "");
                          }
                          setResumeData(item.resumeData || null);
                          setIsCareerHistoryOpen(false);
                          if (item.resumeData) {
                            setTimeout(() => {
                              window.scrollTo({
                                top: document.body.scrollHeight,
                                behavior: 'smooth'
                              });
                            }, 100);
                          }
                        }}>
                          <h4 className="text-sm font-bold text-white truncate pr-6">{item.name || "Untitled"}</h4>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-zinc-400 truncate max-w-[150px]">{item.targetRole}</span>
                            <span className="px-1.5 py-0.5 rounded-md bg-white/10 text-white text-[10px] font-bold">{item.score}% ATS</span>
                          </div>
                          <p className="text-[10px] text-zinc-500 mt-1.5">{new Date(item.timestamp).toLocaleString()}</p>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setCareerHistory(prev => {
                                const updated = prev.filter(c => c.id !== item.id);
                                localStorage.setItem("nova_career_history", JSON.stringify(updated));
                                return updated;
                              });
                            }}
                            className="absolute top-4 right-4 text-zinc-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Delete record"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-5 md:gap-8 items-start justify-start mt-8 w-full max-w-[1000px] mx-auto pb-12">
              
              {/* One-Click Document Sync Hub */}
              <div className="w-full relative cursor-pointer">
                <input 
                  type="file" 
                  accept=".pdf,image/*" 
                  onChange={handleFileInput}
                  className="absolute inset-0 w-full h-full opacity-0 z-10 cursor-pointer"
                  title="Upload Resume or Photo"
                />
                <div 
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  className="w-full p-8 rounded-[32px] bg-[#121214] border border-[rgba(255,255,255,0.08)] flex flex-col items-center justify-center gap-4 shadow-2xl relative transition-all group hover:border-[rgba(255,255,255,0.2)]"
                >
                  <div className={`w-16 h-16 rounded-full border border-[rgba(255,255,255,0.05)] flex items-center justify-center bg-black/50 shadow-inner group-hover:scale-110 transition-transform flex-shrink-0 origin-center ${isCrimson ? 'group-hover:border-rose-500/50' : 'group-hover:border-violet-500/50'}`}>
                    {careerPhoto ? (
                      <img src={careerPhoto} alt="Profile" className="w-full h-full object-cover rounded-full" />
                    ) : (
                      <CloudUpload className={`w-8 h-8 ${isCrimson ? 'text-rose-500' : 'text-violet-500'}`} />
                    )}
                  </div>
                  <div className="text-center relative z-0 pointer-events-none">
                    <h3 className="text-white font-bold text-lg tracking-tight">One-Click Document Sync</h3>
                    <p className="text-zinc-500 text-sm mt-1">Drag & Drop or click to upload photo, resume, or LinkedIn PDF automatically</p>
                  </div>
                </div>
              </div>

              {/* Real-Time ATS Optimization Header */}
              <div className="w-full p-8 rounded-[32px] bg-[#121214] border border-[rgba(255,255,255,0.08)] shadow-2xl flex flex-col gap-4 md:gap-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                      <Trophy className={`w-5 h-5 ${isCrimson ? 'text-rose-500' : 'text-violet-500'}`} />
                      Real-Time ATS Optimization
                    </h2>
                    <p className="text-sm text-zinc-500 mt-1">Live alignment score targeted at: <span className="text-white font-medium">{targetRole || "Your Target Role"}</span></p>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-white tracking-tighter">
                      {calculateResumeScore()}%
                    </div>
                  </div>
                </div>
                
                {/* Progress Bar */}
                <div className="w-full h-3 bg-black/50 rounded-full overflow-hidden shadow-inner border border-[rgba(255,255,255,0.05)]">
                  <div 
                    className={`h-full rounded-full transition-all duration-700 ease-out ${
                      calculateResumeScore() < 50 
                      ? 'bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)]' 
                      : calculateResumeScore() < 80 
                      ? 'bg-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.5)]' 
                      : 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]'
                    }`}
                    style={{ width: `${calculateResumeScore()}%` }}
                  />
                </div>
              </div>

              {/* Unified Intelligent Input Dashboard */}
              <form onSubmit={handleGenerateResume} className="w-full flex flex-col gap-4 md:gap-6">

                {/* Section: Basic Info */}
                <div className="w-full p-8 rounded-[32px] bg-[#121214] border border-[rgba(255,255,255,0.08)] shadow-2xl relative group">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-30 cursor-grab hover:!opacity-100 transition-opacity">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white"><circle cx="9" cy="12" r="1"/><circle cx="9" cy="5" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="19" r="1"/></svg>
                  </div>
                  <div className="pl-6">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-500 mb-6 border-b border-[rgba(255,255,255,0.05)] pb-3">Personal Details</h3>
                    <div className="grid grid-cols-2 gap-4 md:gap-6">
                      <div className="space-y-2">
                        <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest block pl-1">Full Name</label>
                        <input 
                          type="text" required
                          value={careerName} onChange={e => setCareerName(e.target.value)}
                          placeholder="John Doe"
                          className={`w-full bg-[#0A0404] text-white text-sm px-5 py-4 rounded-xl border border-[rgba(255,255,255,0.08)] focus:ring-1 outline-none transition-all placeholder:text-zinc-700 shadow-inner ${isCrimson ? 'focus:border-rose-500 focus:ring-rose-500/20' : 'focus:border-violet-500 focus:ring-violet-500/20'}`}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest block pl-1">Target Job Role</label>
                        <input 
                          type="text" required
                          value={targetRole} onChange={e => setTargetRole(e.target.value)}
                          placeholder="e.g. Machine Learning Engineer"
                          className={`w-full bg-[#0A0404] text-white text-sm px-5 py-4 rounded-xl border border-[rgba(255,255,255,0.08)] focus:ring-1 outline-none transition-all placeholder:text-zinc-700 shadow-inner ${isCrimson ? 'focus:border-rose-500 focus:ring-rose-500/20' : 'focus:border-violet-500 focus:ring-violet-500/20'}`}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest block pl-1">Email Address</label>
                        <input 
                          type="email" required
                          value={careerEmail} onChange={e => setCareerEmail(e.target.value)}
                          placeholder="john@example.com"
                          className={`w-full bg-[#0A0404] text-white text-sm px-5 py-4 rounded-xl border border-[rgba(255,255,255,0.08)] focus:ring-1 outline-none transition-all placeholder:text-zinc-700 shadow-inner ${isCrimson ? 'focus:border-rose-500 focus:ring-rose-500/20' : 'focus:border-violet-500 focus:ring-violet-500/20'}`}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest block pl-1">Phone</label>
                        <input 
                          type="text" 
                          value={careerPhone} onChange={e => setCareerPhone(e.target.value)}
                          placeholder="+1 234 567 890"
                          className={`w-full bg-[#0A0404] text-white text-sm px-5 py-4 rounded-xl border border-[rgba(255,255,255,0.08)] focus:ring-1 outline-none transition-all placeholder:text-zinc-700 shadow-inner ${isCrimson ? 'focus:border-rose-500 focus:ring-rose-500/20' : 'focus:border-violet-500 focus:ring-violet-500/20'}`}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest block pl-1">Location</label>
                        <input 
                          type="text" 
                          value={careerLocation} onChange={e => setCareerLocation(e.target.value)}
                          placeholder="City, State"
                          className={`w-full bg-[#0A0404] text-white text-sm px-5 py-4 rounded-xl border border-[rgba(255,255,255,0.08)] focus:ring-1 outline-none transition-all placeholder:text-zinc-700 shadow-inner ${isCrimson ? 'focus:border-rose-500 focus:ring-rose-500/20' : 'focus:border-violet-500 focus:ring-violet-500/20'}`}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest block pl-1">LinkedIn Profile</label>
                        <input 
                          type="text" 
                          value={careerLinkedin} onChange={e => setCareerLinkedin(e.target.value)}
                          placeholder="linkedin.com/in/johndoe"
                          className={`w-full bg-[#0A0404] text-white text-sm px-5 py-4 rounded-xl border border-[rgba(255,255,255,0.08)] focus:ring-1 outline-none transition-all placeholder:text-zinc-700 shadow-inner ${isCrimson ? 'focus:border-rose-500 focus:ring-rose-500/20' : 'focus:border-violet-500 focus:ring-violet-500/20'}`}
                        />
                      </div>
                      <div className="space-y-2 col-span-2">
                        <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest block pl-1">Career Objective</label>
                        <textarea 
                          value={careerObjective} onChange={e => setCareerObjective(e.target.value)}
                          placeholder="Motivated professional seeking..."
                          className={`w-full bg-[#0A0404] text-white text-sm px-5 py-4 rounded-xl border border-[rgba(255,255,255,0.08)] focus:ring-1 outline-none transition-all placeholder:text-zinc-700 shadow-inner ${isCrimson ? 'focus:border-rose-500 focus:ring-rose-500/20' : 'focus:border-violet-500 focus:ring-violet-500/20'}`}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section: Education & Skills */}
                <div className="w-full p-8 rounded-[32px] bg-[#121214] border border-[rgba(255,255,255,0.08)] shadow-2xl relative group">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-30 cursor-grab hover:!opacity-100 transition-opacity">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white"><circle cx="9" cy="12" r="1"/><circle cx="9" cy="5" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="19" r="1"/></svg>
                  </div>
                  <div className="pl-6">
                    <div className="flex items-center justify-between mb-6 border-b border-[rgba(255,255,255,0.05)] pb-3">
                      <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-500">Education & Technical Skills</h3>
                      {careerSkills && (
                      <button 
                        type="button" 
                        onClick={(e) => { e.preventDefault(); handleAIPolishSkills(); }}
                        disabled={isPolishing}
                        className={`px-3 py-1.5 rounded-full border bg-black/50 text-[10px] uppercase font-bold flex items-center gap-1.5 transition-all shadow-lg hover:-translate-y-0.5 ${isCrimson ? 'text-rose-400 border-rose-500/30 hover:border-rose-400/50 hover:shadow-[0_4px_15px_rgba(225,29,72,0.2)]' : 'text-violet-400 border-violet-500/30 hover:border-violet-400/50 hover:shadow-[0_4px_15px_rgba(139,92,246,0.2)]'}`}
                      >
                         {isPolishing ? <Loader2 className="w-3 h-3 animate-spin"/> : <Sparkles className="w-3 h-3" />}
                         AI Polish Skills
                      </button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 gap-4 md:gap-6">
                      <div className="space-y-2">
                        <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest block pl-1">Education</label>
                        <input 
                          type="text" required
                          value={careerEducation} onChange={e => setCareerEducation(e.target.value)}
                          placeholder="e.g. B.Tech Computer Science, Stanford 2025"
                          className={`w-full bg-[#0A0404] text-white text-sm px-5 py-4 rounded-xl border border-[rgba(255,255,255,0.08)] focus:ring-1 outline-none transition-all placeholder:text-zinc-700 shadow-inner ${isCrimson ? 'focus:border-rose-500 focus:ring-rose-500/20' : 'focus:border-violet-500 focus:ring-violet-500/20'}`}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest block pl-1">Skills (Comma Separated)</label>
                        <textarea 
                          required
                          value={careerSkills} onChange={e => setCareerSkills(e.target.value)}
                          placeholder="React, TypeScript, Python, Node.js"
                          rows={2}
                          className={`w-full bg-[#0A0404] text-white text-sm px-5 py-4 rounded-xl border border-[rgba(255,255,255,0.08)] focus:ring-1 outline-none transition-all placeholder:text-zinc-700 resize-none shadow-inner ${isCrimson ? 'focus:border-rose-500 focus:ring-rose-500/20' : 'focus:border-violet-500 focus:ring-violet-500/20'}`}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section: Experience & Impact */}
                <div className="w-full p-8 rounded-[32px] bg-[#121214] border border-[rgba(255,255,255,0.08)] shadow-2xl relative group">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-30 cursor-grab hover:!opacity-100 transition-opacity">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white"><circle cx="9" cy="12" r="1"/><circle cx="9" cy="5" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="19" r="1"/></svg>
                  </div>
                  <div className="pl-6">
                    <div className="flex items-center justify-between mb-6 border-b border-[rgba(255,255,255,0.05)] pb-3">
                      <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-500">Professional Experience & Impact</h3>
                      {careerExperience && (
                        <button
                          type="button"
                          onClick={(e) => { e.preventDefault(); handleAIPolish(); }}
                          disabled={isPolishing}
                          className={`px-3 py-1.5 rounded-full border bg-black/50 text-[10px] uppercase font-bold flex items-center gap-1.5 transition-all shadow-lg hover:-translate-y-0.5 ${isCrimson ? 'text-rose-400 border-rose-500/30 hover:border-rose-400/50 hover:shadow-[0_4px_15px_rgba(225,29,72,0.2)]' : 'text-violet-400 border-violet-500/30 hover:border-violet-400/50 hover:shadow-[0_4px_15px_rgba(139,92,246,0.2)]'}`}
                        >
                          {isPolishing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                          AI Polish Impact Metrics
                        </button>
                      )}
                    </div>
                    <div className="space-y-4">
                       <div className="space-y-2">
                        <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest block pl-1">Professional Experience</label>
                        <textarea 
                          value={careerExperience} onChange={e => setCareerExperience(e.target.value)}
                          placeholder="Briefly describe past roles or projects..."
                          rows={4}
                          className={`w-full bg-[#0A0404] text-white text-sm px-5 py-4 rounded-xl border border-[rgba(255,255,255,0.08)] focus:ring-1 outline-none transition-all placeholder:text-zinc-700 resize-none shadow-inner ${isCrimson ? 'focus:border-rose-500 focus:ring-rose-500/20' : 'focus:border-violet-500 focus:ring-violet-500/20'}`}
                        />
                       </div>
                       
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div className="space-y-2">
                          <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest block pl-1">Projects</label>
                          <textarea 
                            value={careerProjects} onChange={e => setCareerProjects(e.target.value)}
                            placeholder="Key projects, tech stack..."
                            rows={3}
                            className={`w-full bg-[#0A0404] text-white text-sm px-5 py-4 rounded-xl border border-[rgba(255,255,255,0.08)] focus:ring-1 outline-none transition-all placeholder:text-zinc-700 resize-none shadow-inner ${isCrimson ? 'focus:border-rose-500 focus:ring-rose-500/20' : 'focus:border-violet-500 focus:ring-violet-500/20'}`}
                          />
                         </div>
                         <div className="space-y-2">
                          <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest block pl-1">Internships</label>
                          <textarea 
                            value={careerInternships} onChange={e => setCareerInternships(e.target.value)}
                            placeholder="Internship roles, companies..."
                            rows={3}
                            className={`w-full bg-[#0A0404] text-white text-sm px-5 py-4 rounded-xl border border-[rgba(255,255,255,0.08)] focus:ring-1 outline-none transition-all placeholder:text-zinc-700 resize-none shadow-inner ${isCrimson ? 'focus:border-rose-500 focus:ring-rose-500/20' : 'focus:border-violet-500 focus:ring-violet-500/20'}`}
                          />
                         </div>
                         <div className="space-y-2">
                          <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest block pl-1">Certifications & Languages</label>
                          <textarea 
                            value={careerCertifications} onChange={e => setCareerCertifications(e.target.value)}
                            placeholder="AWS Certified, English, Spanish..."
                            rows={3}
                            className={`w-full bg-[#0A0404] text-white text-sm px-5 py-4 rounded-xl border border-[rgba(255,255,255,0.08)] focus:ring-1 outline-none transition-all placeholder:text-zinc-700 resize-none shadow-inner ${isCrimson ? 'focus:border-rose-500 focus:ring-rose-500/20' : 'focus:border-violet-500 focus:ring-violet-500/20'}`}
                          />
                         </div>
                         <div className="space-y-2">
                          <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest block pl-1">Achievements & Awards</label>
                          <textarea 
                            value={careerAchievements} onChange={e => setCareerAchievements(e.target.value)}
                            placeholder="Hackathon Winner, Best Employee..."
                            rows={3}
                            className={`w-full bg-[#0A0404] text-white text-sm px-5 py-4 rounded-xl border border-[rgba(255,255,255,0.08)] focus:ring-1 outline-none transition-all placeholder:text-zinc-700 resize-none shadow-inner ${isCrimson ? 'focus:border-rose-500 focus:ring-rose-500/20' : 'focus:border-violet-500 focus:ring-violet-500/20'}`}
                          />
                         </div>
                       </div>
                    </div>
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="flex items-center justify-end gap-4 mt-4 mb-24">
                  <button 
                    type="button"
                    disabled={!resumeData || isExporting}
                    onClick={handleExportPDF}
                    className={`px-8 py-4 rounded-xl bg-[#121214] border border-[rgba(255,255,255,0.08)] font-bold text-sm transition-all disabled:opacity-50 shadow-xl hover:-translate-y-0.5 flex items-center gap-2 ${isCrimson ? 'hover:bg-rose-950/30 text-rose-400 border-rose-900/30 hover:border-rose-500/50' : 'hover:bg-violet-950/30 text-violet-400 border-violet-900/30 hover:border-violet-500/50'}`}
                  >
                    {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <DownloadCloud className="w-4 h-4" />} 
                    {isExporting ? "Exporting..." : "Export PDF"}
                  </button>
                  <button
                    type="submit"
                    disabled={loading || !careerName || !targetRole}
                    className={`px-8 py-4 rounded-xl text-white font-bold text-sm tracking-wide transition-all disabled:opacity-50 flex justify-center items-center gap-2 shadow-lg hover:-translate-y-0.5 ${isCrimson ? 'bg-rose-600 hover:bg-rose-500 shadow-[0_4px_14px_rgba(225,29,72,0.3)] hover:shadow-[0_6px_20px_rgba(225,29,72,0.4)]' : 'bg-violet-600 hover:bg-violet-500 shadow-[0_4px_14px_rgba(139,92,246,0.3)] hover:shadow-[0_6px_20px_rgba(139,92,246,0.4)]'}`}
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    {loading ? "Generating Output..." : "Generate Professional Resume"}
                  </button>
                </div>
              </form>

              {/* Generated Resume Render */}
              {resumeData && (
                <div className="w-full mt-12 bg-[#F8F9FA] rounded-[32px] p-8 md:p-[48px] shadow-2xl animate-fade-in text-black mb-24 overflow-x-auto border border-zinc-200">
                  <div id="resume-render-container" className="min-w-[800px] max-w-[850px] mx-auto bg-[#ffca28] p-[15px] shadow-sm font-sans relative text-[#000000]">
                    
                    {/* Inner Paper Resume Container */}
                    <div className="bg-[#ffffff] w-full h-full flex flex-col relative overflow-hidden">
                      
                      {/* TOP NAVY HEADER */}
                      <div className="w-full min-h-[120px] py-10 bg-[#323b4c] flex items-center justify-center relative z-10">
                        <h1 className="text-3xl sm:text-3xl md:text-4xl font-bold tracking-widest text-[#e2e4e6] uppercase text-center ml-[220px] px-4">
                          {careerName}
                        </h1>
                      </div>

                      <div className="flex flex-1 w-full relative z-20">
                        
                        {/* LEFT SIDEBAR (Light Gray) */}
                        <div className="w-[35%] bg-[#e2e4e6] flex flex-col pb-10">
                          
                          {/* Photo overlaps header */}
                          <div className="w-44 h-44 rounded-full bg-[#f4f5f6] mx-auto -mt-24 shadow-sm border-[6px] border-[#e2e4e6] overflow-hidden flex items-center justify-center relative z-20 shrink-0">
                            {careerPhoto ? (
                              <img src={careerPhoto} alt="Profile" className="w-full h-full object-cover rounded-full" style={{ borderRadius: '50%' }} />
                            ) : (
                              <div className="w-full h-full bg-[#6d798a] flex flex-col items-center justify-center pt-4" style={{ borderRadius: '50%' }}>
                                <div className="w-16 h-16 rounded-full bg-[#465166] mb-1"></div>
                                <div className="w-24 h-12 rounded-t-[40px] bg-[#465166]"></div>
                              </div>
                            )}
                          </div>

                          <div className="px-6 pt-10 flex flex-col gap-5 md:gap-8 break-words">
                            {/* Contact Section */}
                            <div>
                              <h2 className="text-[13px] font-black tracking-widest text-[#2c3545] uppercase mb-4 border-b-2 border-[#2c3545] pb-1">Contact</h2>
                              <div className="flex flex-col gap-3 text-[11px] text-[#2c3545] font-semibold font-sans">
                                {careerPhone && (
                                  <div className="flex items-center gap-2">
                                    <span>📞 Phone:</span>
                                    <span>{careerPhone}</span>
                                  </div>
                                )}
                                {careerEmail && (
                                  <div className="flex items-center gap-2">
                                    <span>✉️ Email:</span>
                                    <span className="break-all">{careerEmail}</span>
                                  </div>
                                )}
                                {careerLocation && (
                                  <div className="flex items-center gap-2">
                                    <span>📍 Location:</span>
                                    <span>{careerLocation}</span>
                                  </div>
                                )}
                                {careerLinkedin && (
                                  <div className="flex items-center gap-2">
                                    <span>in LinkedIn:</span>
                                    <span className="break-all">{careerLinkedin}</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Certifications Section */}
                            {resumeData.certifications && resumeData.certifications.length > 0 && (
                              <div>
                                <h2 className="text-[13px] font-black tracking-widest text-[#2c3545] uppercase mb-4 border-b-2 border-[#2c3545] pb-1">Certifications</h2>
                                <div className="flex flex-col gap-3 text-[11px] text-[#2c3545]">
                                  {resumeData.certifications.map((cert: any, i: number) => (
                                    <div key={i}>
                                      <div className="font-bold">{cert.name}</div>
                                      <ul className="list-disc pl-4 mt-0.5 font-medium">
                                        <li>{cert.institution}{cert.year ? `, ${cert.year}` : ''}</li>
                                      </ul>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Languages Section */}
                            {resumeData.languages && resumeData.languages.length > 0 && (
                              <div>
                                <h2 className="text-[13px] font-black tracking-widest text-[#2c3545] uppercase mb-4 border-b-2 border-[#2c3545] pb-1">Languages</h2>
                                <ul className="list-disc pl-4 flex flex-col gap-1 text-[11px] text-[#2c3545] font-semibold">
                                  {resumeData.languages.map((lang: string, i: number) => (
                                    <li key={i}>{lang}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* RIGHT MAIN CONTENT */}
                        <div className="w-[65%] bg-[#ffffff] p-8 pl-10 pr-12 pb-16 flex flex-col gap-5 md:gap-8 relative break-words">
                          
                          {/* Objective */}
                          {resumeData.careerObjective && (
                            <div className="relative pl-6">
                              <div className="absolute left-0 top-1 w-4 h-4 rounded-full bg-[#323b4c] text-[#ffffff] flex items-center justify-center text-[10px] pb-0.5 z-10">👤</div>
                              <div className="absolute left-[7px] top-6 bottom-0 border-l border-[#323b4c]"></div>
                              <h2 className="text-[14px] font-black tracking-widest text-[#2c3545] uppercase mb-3 text-justify">Career Objective</h2>
                              <p className="text-[12px] text-[#27272a] leading-relaxed font-semibold">
                                {resumeData.careerObjective}
                              </p>
                            </div>
                          )}

                          {/* Skills */}
                          {resumeData.optimizedSkills && (Object.keys(resumeData.optimizedSkills).length > 0) && (
                            <div className="relative pl-6">
                              <div className="absolute left-0 top-1 w-4 h-4 rounded-full bg-[#323b4c] text-[#ffffff] flex items-center justify-center text-[10px] pb-0.5 z-10">💼</div>
                              <div className="absolute left-[7px] top-6 bottom-0 border-l border-[#323b4c]"></div>
                              <h2 className="text-[14px] font-black tracking-widest text-[#2c3545] uppercase mb-3 border-b-2 border-[#e2e4e6] pb-1">Key Skills</h2>
                              <ul className="list-disc pl-4 text-[12px] text-[#27272a] leading-relaxed font-semibold space-y-2">
                                {Object.entries(resumeData.optimizedSkills).map(([cat, skills]: [string, any]) => {
                                  if (Array.isArray(skills) && skills.length > 0) {
                                    return (
                                      <li key={cat}>
                                        <span className="font-bold">{cat}:</span> {skills.join(", ")}
                                      </li>
                                    );
                                  }
                                  return null;
                                })}
                              </ul>
                            </div>
                          )}

                          {/* Experience */}
                          {resumeData.optimizedExperience && resumeData.optimizedExperience.length > 0 && (
                            <div className="relative pl-6">
                              <div className="absolute left-0 top-1 w-4 h-4 rounded-full bg-[#323b4c] text-[#ffffff] flex items-center justify-center text-[10px] pb-0.5 z-10">🎓</div>
                              <div className="absolute left-[7px] top-6 bottom-0 border-l border-[#323b4c]"></div>
                              <h2 className="text-[14px] font-black tracking-widest text-[#2c3545] uppercase mb-4 border-b-2 border-[#e2e4e6] pb-1">Experience {careerExperience ? '' : '(Skip if Fresher)'}</h2>
                              <div className="flex flex-col gap-5">
                                {resumeData.optimizedExperience.map((exp: any, i: number) => (
                                  <div key={i}>
                                    <h3 className="text-[12px] font-black text-[#2c3545] mb-1.5">
                                      {exp.title} - {exp.company && `[${exp.company}] `}{exp.duration && `${exp.duration}`}
                                    </h3>
                                    <ul className="list-disc pl-4 space-y-1 text-[11px] text-[#27272a] font-semibold">
                                      {exp.descriptions && exp.descriptions.map((desc: string, j: number) => (
                                        <li key={j}>{desc}</li>
                                      ))}
                                    </ul>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Education */}
                          {resumeData.structuredEducation && resumeData.structuredEducation.length > 0 && (
                            <div className="relative pl-6">
                              <div className="absolute left-0 top-1 w-4 h-4 rounded-full bg-[#323b4c] text-[#ffffff] flex items-center justify-center text-[10px] pb-0.5 z-10">🎓</div>
                              <div className="absolute left-[7px] top-6 bottom-0 border-l border-[#323b4c]"></div>
                              <h2 className="text-[14px] font-black tracking-widest text-[#2c3545] uppercase mb-4 border-b-2 border-[#e2e4e6] pb-1">Education</h2>
                              <div className="flex flex-col gap-4">
                                {resumeData.structuredEducation.map((edu: any, i: number) => (
                                  <ul key={i} className="list-disc pl-4 space-y-1 text-[11px] text-[#27272a] font-semibold">
                                    <li>{edu.degree} | {edu.institution} | {edu.year}</li>
                                    {edu.score && <li>{edu.score}</li>}
                                  </ul>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Projects / Internships */}
                          {( (resumeData.projects && resumeData.projects.length > 0) || (resumeData.internships && resumeData.internships.length > 0) ) && (
                            <div className="relative pl-6">
                              <div className="absolute left-0 top-1 w-4 h-4 rounded-full bg-[#323b4c] text-[#ffffff] flex items-center justify-center text-[10px] pb-0.5 z-10">🎓</div>
                              <div className="absolute left-[7px] top-6 bottom-1 border-l border-[#323b4c] mix-blend-multiply"></div>
                              <h2 className="text-[14px] font-black tracking-widest text-[#2c3545] uppercase mb-4 border-b-2 border-[#e2e4e6] pb-1">Projects / Internships (For Freshers)</h2>
                              
                              <div className="flex flex-col gap-5 text-justify">
                                {resumeData.internships && resumeData.internships.map((int: any, i: number) => (
                                  <div key={`int-${i}`}>
                                    <h3 className="text-[12px] font-black text-[#2c3545] mb-1.5">{int.title} - [{int.company}]</h3>
                                    <p className="text-[11px] text-[#27272a] font-semibold">{int.descriptions?.join(" ")}</p>
                                  </div>
                                ))}

                                {resumeData.projects && resumeData.projects.map((proj: any, i: number) => (
                                  <div key={`proj-${i}`}>
                                    <h3 className="text-[12px] font-black text-[#2c3545] mb-1.5">{proj.title} - [{proj.company}]</h3>
                                    <p className="text-[11px] text-[#27272a] font-semibold mb-1">{proj.description}</p>
                                    {proj.tools && <p className="text-[11px] text-[#52525b] font-semibold">Tools/technologies used: {proj.tools}</p>}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          <div className="absolute bottom-4 right-8 text-[9px] font-bold text-[#a1a1aa]">&copy; Nova AI Resume Studio</div>
                        </div>

                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            </div>
          )}

          {/* ————————————————— Tool 5: Flashcards ————————————————— */}
        </div>
      )}

    </div>
  );
}
