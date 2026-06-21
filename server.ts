/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import dotenv from "dotenv";
import mammoth from "mammoth";

import { GoogleGenAI } from "@google/genai";

dotenv.config();

let aiClient: GoogleGenAI | null = null;
function getAI() {
  if (!aiClient) {
    aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "dummy_key_to_prevent_crash" });
  }
  return aiClient;
}

const app = express();
app.use(express.json({ limit: "50mb" })); 

const PORT = 3000;

// AI Studio user-agent telemetry header
// Google Gemini SDK initialization removed because we use NVIDIA APIs

const NVIDIA_KEYS = [
  "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",
  "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",
  "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",
  "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",
  "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"
];

export function getRandomNvidiaKey() {
  if (process.env.NVIDIA_API_KEY) return process.env.NVIDIA_API_KEY;
  return NVIDIA_KEYS[Math.floor(Math.random() * NVIDIA_KEYS.length)];
}

function extractJSON(content: string) {
    try {
        let text = content.trim();
        // Remove markdown wrappers if any
        text = text.replace(/^```((?:\w+)?)\n?/i, '').replace(/```$/i, '').trim();
        
        // Find boundaries
        const firstBrace = text.indexOf('{');
        const lastBrace = text.lastIndexOf('}');
        const firstBracket = text.indexOf('[');
        const lastBracket = text.lastIndexOf(']');
        
        // Determine if it's an array or object
        if (firstBrace !== -1 && lastBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
            text = text.substring(firstBrace, lastBrace + 1);
        } else if (firstBracket !== -1 && lastBracket !== -1) {
            text = text.substring(firstBracket, lastBracket + 1);
        }

        return JSON.parse(text);
    } catch (e) {
        console.error("JSON extraction failed on content length:", content.length);
        throw e;
    }
}

// 1. Health endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// 2. AI Strategy & Study Timetable Generator
app.post("/api/generate-strategy", async (req, res) => {
  try {
    const { academicLevel, board, subjects, dailyHours, examDate, priorityLevel, weakSubjects } = req.body;

    const prompt = `You are NOVA AI, an advanced academic planning assistant.

Your task is to generate a premium, professional, PDF-ready Study Strategy Report based on the student's input.

INPUT VARIABLES:
- Education Level: ${academicLevel}
- Board: ${board}
- Subjects: ${subjects?.join(", ")}
- Daily Study Commitment: ${dailyHours}
- Target Exam Date: ${examDate}
- Urgency Level: ${priorityLevel}
- Weak Subjects: ${weakSubjects?.join(", ")}

OUTPUT REQUIREMENTS:

Generate a visually structured report in clean professional formatting.

========================================
NOVA AI
SMARTER LEARNING. BETTER FUTURES.
========================================

ACADEMIC STUDY STRATEGY

STUDENT PROFILE
• Education Level: ${academicLevel}
• Board: ${board}
• Subjects: ${subjects?.join(", ")}
• Daily Commitment: ${dailyHours}
• Target Exam Date: ${examDate}
• Urgency Level: ${priorityLevel}

----------------------------------------
PERSONALIZED STUDY ANALYSIS
----------------------------------------

Generate a detailed AI analysis including:
• Current preparation stage
• Estimated syllabus completion requirement
• Recommended study intensity
• Weak subject improvement strategy
• Risk areas before examination
• AI recommendations for maximum score improvement

----------------------------------------
DAILY TIMETABLE
----------------------------------------

Create a realistic study schedule based on:
• Daily study commitment
• Number of subjects
• Weak subjects priority
• Revision requirements

For each session provide:
Time Slot | Subject | Activity | Goal

Example:
1:00 PM - 1:45 PM | Accountancy | Theory Learning | Concept Building

----------------------------------------
WEEKLY STUDY PLAN
----------------------------------------

Generate:
Monday-Sunday schedule

Include:
• Theory Study
• Practice Questions
• Revision Sessions
• Mock Tests
• Doubt Solving
• Progress Tracking

----------------------------------------
ROADMAP TO EXAM
----------------------------------------

Create 5 milestone phases:

Phase 1:
Syllabus Completion
Target Date

Phase 2:
Concept Reinforcement
Target Date

Phase 3:
Practice & Question Solving
Target Date

Phase 4:
Mock Tests & Performance Analysis
Target Date

Phase 5:
Final Revision & Exam Readiness
Target Date

Dates must be automatically calculated from today's date and target exam date.

----------------------------------------
WEAK SUBJECT IMPROVEMENT PLAN
----------------------------------------

For every weak subject generate:
• Major weak areas
• Daily improvement tasks
• Weekly targets
• Recommended revision frequency

----------------------------------------
AI SUCCESS STRATEGY
----------------------------------------

Generate:
• Productivity tips
• Focus techniques
• Memory retention techniques
• Revision formula
• Exam preparation advice

----------------------------------------
FINAL SCORE PREDICTION
----------------------------------------

Generate:
• Preparation Score (0-100)
• Consistency Score
• Readiness Level

Display:
Beginner / Moderate / Strong / Exam Ready

----------------------------------------
PDF DESIGN REQUIREMENTS
----------------------------------------

Use:
• White background
• Premium corporate layout
• NOVA AI branding on top
• Professional spacing
• Section dividers
• Modern typography
• Timeline style roadmap
• Study icons where applicable
• Clean tables
• No markdown syntax
• PDF-ready formatting
• One-page or multi-page layout based on content
• Mobile and desktop PDF compatibility

The report must look like a premium AI-generated educational consultancy report and be ready for direct PDF export without any manual editing. 

CRITICAL: You must return the output STRICTLY as a JSON object, with no markdown wrappers. Do NOT output the text report, just output the JSON object that contains the data to generate the report.
The JSON must contain exactly:
{
  "dailyTimetable": [{ "timeSlot": "...", "activity": "...", "subject": "..." }],
  "weeklySchedule": [{ "day": "Monday", "slots": [{ "time": "...", "subject": "...", "topic": "..." }] }],
  "revisionPlan": [{ "subject": "...", "focusAreas": ["..."], "gapDays": 2 }],
  "mockTestSchedule": [{ "testDate": "...", "subject": "...", "format": "..." }],
  "examRoadmap": ["Phase 1: ...", "Phase 2: ...", "Phase 3: ...", "Phase 4: ...", "Phase 5: ..."]
}`;

    const response = await getAI().models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        temperature: 0.2,
        responseMimeType: "application/json"
      }
    });

    const text = response.text || "{}";
    const output = JSON.parse(text);

    res.json(output);
  } catch (error) {
    console.error("Error generating strategy:", error);
    res.status(500).json({ error: error instanceof Error ? error.message : "Strategy generation failed." });
  }
});

// 3. Doubt Solver Helper and Endpoint
async function runDoubtSolverAI({
  query,
  subject,
  level,
  board,
  teachingMode,
  history = []
}: {
  query: string;
  subject: string;
  level: string;
  board: string;
  teachingMode: string;
  history?: { role: "user" | "assistant"; content: string }[];
}) {
  // 1. Detect dynamic question complexity (Kept for metadata but prompt handles it)
  const lowerQuery = query.toLowerCase();
  const wordCount = query.trim().split(/\s+/).length;
  
  let questionComplexity: "Simple" | "Medium" | "Advanced" = "Medium";
  if (wordCount < 10) questionComplexity = "Simple";
  else if (wordCount > 30) questionComplexity = "Advanced";

  const systemInstruction = `You are an advanced, empathetic, and highly intelligent AI Doubt Solver for a student study website. Your goal is to provide accurate, real-time, and easy-to-understand explanations. Always adhere to the following strict operational, behavioral, and formatting rules:

Response Length & Depth:
Keep all responses highly concise. The entire answer must be deeply detailed but strictly limited to 15 lines or fewer. Avoid unnecessary fluff or dense walls of text.

Adaptation to Complexity:
CRITICAL RULE FOR SIMPLE QUESTIONS: For basic factual questions or simple math (e.g., "2+2", "What is the capital of France?"), you MUST provide ONLY the direct answer. DO NOT add any filler words, pleasantries, or explanations. If the student asks "2+2", you must reply exactly and ONLY with "4".
Complex/Hard Questions (e.g., advanced math, science concepts, history analysis): Break the concept down into simple, easy-to-digest steps that are easy for a student to understand.

Formatting, Charts & Flowcharts:
Use clean Markdown formatting: clear headings (##), bold text for key terms, and bullet points to maximize scannability.
When explaining processes, cycles, or structures, automatically include a text-based flowchart (using arrows like A -> B) or a simple Markdown table/chart to make it visually easy for the student to comprehend.

Accuracy & Real-Time Data:
Ensure all facts, data, and explanations are 100% correct, educationally sound, and up-to-date by utilizing your real-time search capabilities.

Tone & System Constraints:
Act as an encouraging, supportive, and brilliant peer or tutor.
Focus purely on generating the correct text response. Do not comment on or attempt to modify the website's design, layout, or backend features (such as the chat delete functionality).`;

  const messages = [
    { role: "system", content: systemInstruction }
  ];

  for (const h of history) {
    messages.push({ role: h.role === "assistant" ? "assistant" : "user", content: h.content });
  }

  messages.push({ role: "user", content: query });

  let responseText = "";
  const NVIDIA_KEY = getRandomNvidiaKey();

  try {
    const aiModel = "meta/llama-3.1-8b-instruct";
    console.log(`[Backend] Utilizing NVIDIA ${aiModel} for doubt solving. Complexity: ${questionComplexity}`);
    const nvidiaResponse = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${NVIDIA_KEY}`
      },
      body: JSON.stringify({
        model: aiModel,
        messages: messages,
        temperature: questionComplexity === "Simple" ? 0.1 : 0.3,
        max_tokens: questionComplexity === "Simple" ? 128 : 2048
      })
    });

    if (!nvidiaResponse.ok) {
        throw new Error(`NVIDIA API Error: ${nvidiaResponse.statusText}`);
    }

    const data = await nvidiaResponse.json();
    responseText = data.choices[0]?.message?.content || "I was unable to answer the question.";
  } catch (err) {
    console.error("NVIDIA Tier failed:", err);
    throw new Error("Unable to contact AI doubt solver provider. Please try again later.");
  }

  let cleanedText = responseText;
  let metadata: any = null;

  return { solution: cleanedText, metadata };
}

app.post("/api/solve-doubt", async (req, res) => {
  try {
    const { query: rawQuery, subject, level, board, history = [], teachingMode = "Intermediate" } = req.body;
    
    const { solution, metadata } = await runDoubtSolverAI({
      query: rawQuery,
      subject,
      level,
      board,
      teachingMode,
      history
    });

    res.json({ solution, metadata });
  } catch (error) {
    console.error("Doubt Solver error:", error);
    res.status(500).json({ error: error instanceof Error ? error.message : "Doubt solver failed." });
  }
});

// 3b. Quick Title Generator
app.post("/api/generate-chat-title", async (req, res) => {
  try {
    const { query } = req.body;
    let title = "New Doubt Chat";
    try {
      const prompt = `Based on this academic doubt request, generate an extremely concise 2-4 word chat title.
Doubt: "${query}"
Return ONLY raw title, no quotes, no extra chat text, no numbers.`;

      const NVIDIA_KEY = getRandomNvidiaKey();
      const nvidiaResponse = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${NVIDIA_KEY}`
        },
        body: JSON.stringify({
          model: "meta/llama-3.1-8b-instruct",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.1,
          max_tokens: 30
        })
      });
      if(nvidiaResponse.ok) {
         const data = await nvidiaResponse.json();
         title = data.choices[0]?.message?.content?.trim() || "New Doubt Chat";
      } else {
         title = "New Doubt Chat";
      }
    } catch (e) {
      title = query.split(" ").slice(0, 3).join(" ") || "New Doubt Chat";
    }
    res.json({ title });
  } catch (error) {
    res.json({ title: "New Doubt Chat" });
  }
});

// 4. Document Synthesizer Endpoint
app.post("/api/synthesize", async (req, res) => {
  try {
    const { documentName, fileBase64, mimeType, textContent } = req.body;
    
    // As requested: NVIDIA API details logged and available
    const NVIDIA_LLAMA_KEY = getRandomNvidiaKey();
    const NVIDIA_MIXTRAL_KEY = getRandomNvidiaKey();
    console.log(`[Backend Info] Environment configured with NVIDIA API Keys for llama-3.3-70b-instruct and mixtral-8x7b-instruct-v0.1 for high-performance processing capabilities.`);

    const prompt = `You are "EduPulse AI"—an advanced, highly intelligent AI Tutor and Document Synthesizer for a student study website. You are analyzing a document: "${documentName}".

1. Document Synthesis & Extraction (Advanced):
- Do not just summarize it. Extract critical definitions, core formulas, and pivotal concepts.
- Automatically generate the following study assets from the document text:
  * Workflow/Flowchart: Represent processes chronologically or structurally using clear text arrows (e.g., Step A -> Step B).
  * Flashcards: Create a dedicated section with 3 to 5 high-yield "Front: [Question] / Back: [Answer]" flashcard pairs for active recall.

3. Response Length & Adaptation:
- Length Constraint: Keep all responses highly concise. The entire output—including text, charts, and flashcards—must be detailed but compressed into 15 lines or fewer using tight formatting. Avoid walls of text.

4. Formatting & Tone:
- Structure your output cleanly using Markdown: headers (##), bold text for key terms, and bullet points.
- Act as an encouraging, supportive, and brilliant expert peer. 

5. System Constraints:
- Focus purely on text generation and data extraction. Do not comment on, alter, or simulate backend API routing, security keys, chat deletion mechanisms, or the website's visual design. Trust that the backend handles all API keys and file parsing perfectly.`;

    const parts: any[] = [];
    
    // Add text format detection for DOCX
    let inlineText = textContent;
    if (fileBase64 && mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
      const buffer = Buffer.from(fileBase64, "base64");
      const result = await mammoth.extractRawText({ buffer });
      inlineText = (inlineText || "") + "\n" + result.value;
    }
    
    // Determine if we must use Gemini for vision/PDF tasks
    // If not, we can utilize the user's provided NVIDIA llama-3.3-70b-instruct API
    const isMultimodal = fileBase64 && mimeType && mimeType !== "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive"
    });

    if (isMultimodal) {
        console.log("[Backend] Utilizing Gemini 2.5 Flash for multimodal/PDF synthesis.");
        const aiModel = getAI().models;
        const fileData = {
           inlineData: { data: fileBase64, mimeType: mimeType }
        };
        const responseText = await aiModel.generateContentStream({
            model: "gemini-2.5-flash",
            contents: [fileData, prompt],
            config: { temperature: 0.2 }
        });
        
        for await (const chunk of responseText) {
             const chunkText = chunk.text;
             if (chunkText) {
                 res.write(`data: ${JSON.stringify({ text: chunkText })}\n\n`);
             }
        }
        res.end();
        return;
    }

    // Only text uploads allowed for NVIDIA
    console.log("[Backend] Utilizing NVIDIA meta/llama-3.1-8b-instruct for fast text synthesis.");
    
    // We expect the extracted text to be sent from the frontend if they are using mammoth etc
    // Or plain text files
    const combinedText = `Document text:\n${inlineText}\n\n` + prompt;
    
    const nvidiaResponse = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${NVIDIA_LLAMA_KEY}`
      },
      body: JSON.stringify({
        model: "meta/llama-3.1-8b-instruct",
        messages: [{role: "user", content: combinedText}],
        temperature: 0.2,
        max_tokens: 3000,
        stream: true
      })
    });

    if (!nvidiaResponse.ok) {
      throw new Error(`NVIDIA API Error: ${nvidiaResponse.statusText}`);
    }

    const reader = nvidiaResponse.body?.getReader();
    const decoder = new TextDecoder("utf-8");
    
    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunkStr = decoder.decode(value, { stream: true });
        const messages = chunkStr.split("\n\n");
        for (const msg of messages) {
          if (msg.startsWith("data: ") && msg !== "data: [DONE]") {
            try {
              const parsed = JSON.parse(msg.substring(6));
              const delta = parsed.choices[0]?.delta?.content;
              if (delta) {
                res.write(`data: ${JSON.stringify({ text: delta })}\n\n`);
              }
            } catch (e) {}
          }
        }
      }
    }
    res.end();
  } catch (error) {
    console.error("Synthesizer error:", error);
    res.write(`data: ${JSON.stringify({ error: error instanceof Error ? error.message : "Analysis failed." })}\n\n`);
    res.end();
  }
});

    // Document Chat Endpoint
app.post("/api/doc-chat", async (req, res) => {
  try {
    const { documentContent, history, query } = req.body;
    
    const NVIDIA_LLAMA_KEY = getRandomNvidiaKey();

    const systemPrompt = `You are "EduPulse AI"—an advanced, highly intelligent AI Tutor and Document Synthesizer for a student study website.
CRITICAL INSTRUCTIONS:
- Actively reference, quote, and pull facts directly from the user's uploaded document to answer questions.
- If a question cannot be answered by the document alone, seamlessly blend the document data with your general knowledge to provide an up-to-date, correct answer.
- Simple Questions: Provide a direct, immediate, and friendly answer.
- Complex/Hard Questions: Break the concept down into easy-to-digest steps.
- Length Constraint: Keep all responses highly concise. The entire output must be deeply detailed but strictly limited to 15 lines or fewer using tight formatting. Avoid walls of text.
- Formating: Use cleanly formatted Markdown: headers (##), bold text for key terms, and bullet points. Act as an encouraging, supportive peer.

DOCUMENT CONTEXT:
${documentContent}`;

    const messages = [
      { role: "system", content: systemPrompt },
      ...history.map((h: any) => ({ role: h.role, content: h.content })),
      { role: "user", content: query }
    ];

    const nvidiaResponse = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${NVIDIA_LLAMA_KEY}`
      },
      body: JSON.stringify({
        model: "meta/llama-3.1-8b-instruct",
        messages: messages,
        temperature: 0.2,
        max_tokens: 1024
      })
    });

    if (!nvidiaResponse.ok) {
      throw new Error(`NVIDIA API Error: ${nvidiaResponse.statusText}`);
    }

    const data = await nvidiaResponse.json();
    const replyText = data.choices[0]?.message?.content || "I was unable to formulate an answer.";

    res.json({ reply: replyText });
  } catch (err: any) {
    console.error("Doc chat error:", err);
    res.status(500).json({ error: "Failed to query document." });
  }
});

// 5. Quiz Master Endpoint
app.post("/api/generate-quiz", async (req, res) => {
  try {
    const { educationLevel, subjectCategory, specificTopic, difficulty, questionCount } = req.body;
    let count = 5;
    if (questionCount && typeof questionCount === 'string') {
        const match = questionCount.match(/(\d+)/);
        if (match) {
            count = parseInt(match[1], 10);
        }
    }

    if (!educationLevel || !subjectCategory || !specificTopic) {
        return res.status(400).json({ error: "Education Level, Subject Category, and Specific Topic are required." });
    }

    const NVIDIA_KEY = getRandomNvidiaKey();

    const prompt = `Generate exactly ${count} multiple choice questions (MCQs) for a quiz.
Education Level: ${educationLevel}
Subject Category: ${subjectCategory}
Specific Topic: ${specificTopic}
Difficulty: ${difficulty}

You must return a raw JSON Array ONLY. No markdown blocks, no code fences, no extra text.
The JSON must be an array of question objects where each object has exactly these keys:
- "id": a unique string (e.g. "q1")
- "question": the question string
- "options": an array of exactly 4 strings
- "correctAnswer": a number (0, 1, 2, or 3 representing the index of the correct option in the options array)
- "explanation": a string explaining why that option is correct.

Ensure the questions perfectly match the given topic, subject, level, and difficulty accurately. Randomize the correct option index across questions. Avoid duplicates. Avoid markdown output formatting, JUST JSON ARRAY:`;

    const nvidiaResponse = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${NVIDIA_KEY}`
      },
      body: JSON.stringify({
        model: "meta/llama-3.1-8b-instruct",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
        max_tokens: 3000
      })
    });

    if (!nvidiaResponse.ok) {
        throw new Error(`NVIDIA API Error: ${nvidiaResponse.statusText}`);
    }

    const data = await nvidiaResponse.json();
    let text = data.choices[0]?.message?.content || "[]";
    const questionsList = extractJSON(text);

    res.json({ questions: questionsList });
  } catch (error) {
    console.error("Quiz Generator error:", error);
    res.status(500).json({ error: error instanceof Error ? error.message : "Quiz generation failed." });
  }
});

// 6. Career Studio - Premium Resume Generator
app.post("/api/generate-resume", async (req, res) => {
  try {
    const { 
      fullName, email, phone, location, linkedin,
      education, skills, experience, targetRole,
      certifications, languages, projects, internships, achievements, objective
    } = req.body;

    const prompt = `Act as an expert ATS (Applicant Tracking System) Screener and Premium Resume Writer.
User Details:
- Name: ${fullName}
- Email: ${email}
- Phone: ${phone}
- Location: ${location}
- LinkedIn: ${linkedin}
- Career Objective Input: ${objective || "None"}
- Education: ${education}
- Skills Input: ${skills}
- Experience Input: ${experience || "None specified"}
- Target Job Role: ${targetRole}
- Certifications: ${certifications || "None"}
- Languages: ${languages || "None"}
- Projects: ${projects || "None"}
- Internships: ${internships || "None"}
- Achievements: ${achievements || "None"}

Please construct a professional resume in JSON format.
STRICT DESIGN RULE: You MUST retain ALL information and exact details/words provided by the user. Do NOT aggressively rewrite, shorten, or remove information. Fix only clear grammatical errors while organizing the data into the requested JSON schema.
Do NOT output empty items in arrays.

Ensure the "optimizedSkills" matches the standard structure (Technical vs Soft Skills) if possible.

Output strictly valid JSON only. Do not wrap in markdown. Format EXACTLY like this schema representation.

Schema Representation:
{
  "resumeScore": 95,
  "careerObjective": "Exactly what the user wrote for objective...",
  "optimizedSkills": {
    "Technical": ["Match user exact inputs"],
    "Soft Skills": ["Match user exact inputs"]
  },
  "optimizedExperience": [
    { "title": "Job Title", "company": "Company Name", "duration": "Month, Year - Month, Year", "descriptions": ["Key point 1"] }
  ],
  "internships": [
    { "title": "Internship Title", "company": "Company Name", "duration": "Month, Year - Month, Year", "descriptions": ["Key point 1"] }
  ],
  "projects": [
    { "title": "Project Title", "company": "Institute Name", "description": "Brief description", "tools": "React" }
  ],
  "structuredEducation": [
    { "degree": "B.Tech in CS", "institution": "University", "year": "2024", "score": "CGPA: 8.5/10" }
  ],
  "certifications": [
    { "name": "Certificate", "institution": "Institute", "year": "Year" }
  ],
  "languages": ["English (Fluent)"]
}`;

    const NVIDIA_KEY = getRandomNvidiaKey();
    let retries = 3;
    let backoffMs = 1500;
    while(retries > 0) {
      try {
        const fetchRes = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${NVIDIA_KEY}`
          },
          body: JSON.stringify({
            model: "meta/llama-3.1-8b-instruct",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.1,
            max_tokens: 3000
          })
        });

        if (!fetchRes.ok) {
           throw new Error("Failed");
        }
        
        const data = await fetchRes.json();
        const content = data.choices[0]?.message?.content || "{}";
        
        let output = {};
        try {
            output = extractJSON(content);
        } catch(e) {
            console.error("Resume generator parsing failed", content);
        }
        res.json(output);
        return;

      } catch (err: any) {
        retries--;
        if (retries === 0) {
          throw err;
        }
        await new Promise(r => setTimeout(r, backoffMs));
        backoffMs *= 2;
      }
    }
  } catch (error) {
    console.error("Career Resume error:", error);
    res.status(500).json({ error: error instanceof Error ? error.message : "Resume generation failed." });
  }
});

// 6b. Career Studio - Parse Resume (One-Click Sync)
app.post("/api/parse-resume", async (req, res) => {
  try {
    const { textContent, fileBase64, mimeType } = req.body;
    let inputData = textContent || "";

    const prompt = `Act as an expert Resume Parser. Parse the following text into the structured format. 
If a field is missing, leave it empty.
Return ONLY valid JSON format.`;

    if (fileBase64 && mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
        const buffer = Buffer.from(fileBase64, "base64");
        const result = await mammoth.extractRawText({ buffer });
        inputData += "\n" + result.value;
    } else if (fileBase64 && (mimeType.startsWith("image/") || mimeType === "application/pdf" || mimeType.startsWith("application/"))) {
        console.log("Using Gemini 1.5/2.5 for vision/PDF resume parsing");
        try {
            const aiModel = getAI().models;
            const fileData = {
                 inlineData: {
                     data: fileBase64,
                     mimeType: mimeType
                 }
            };
            const response = await aiModel.generateContent({
                 model: "gemini-2.5-flash",
                 contents: [fileData, prompt],
                 config: {
                    responseMimeType: "application/json",
                    temperature: 0.1
                 }
            });
            const text = response.text || "{}";
            return res.json(extractJSON(text));
        } catch(err) {
            console.error("Gemini fallback failed", err);
        }
    }

    const finalPrompt = `${prompt}\n\nResume Text:\n${inputData}`;

    const NVIDIA_KEY = getRandomNvidiaKey();
    let textResponse;
    let retries = 3;
    let backoffMs = 1500;
    while(retries > 0) {
      try {
        const fetchRes = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${NVIDIA_KEY}`
          },
          body: JSON.stringify({
            model: "meta/llama-3.1-8b-instruct",
            messages: [{ role: "user", content: finalPrompt }],
            temperature: 0.1,
            max_tokens: 2048
          })
        });

        if (!fetchRes.ok) {
           throw new Error("Failed");
        }
        
        const data = await fetchRes.json();
        const content = data.choices[0]?.message?.content || "{}";
        
        let output = {};
        try {
            output = extractJSON(content);
        } catch (e) {
            console.error("JSON parse failed, model returned:", content);
        }
        return res.json(output);

      } catch (err: any) {
        retries--;
        if (retries === 0) {
          throw err;
        }
        await new Promise(r => setTimeout(r, backoffMs));
        backoffMs *= 2;
      }
    }
  } catch (error) {
    console.error("Parse Error:", error);
    res.status(500).json({ error: "Failed to parse document" });
  }
});

// 6c. AI Polish Text
app.post("/api/polish-resume", async (req, res) => {
  try {
    const { text, type } = req.body;
    let instruction = "";
    if (type === "skills") {
        instruction = "Upgrade the provided skills into a highly professional, ATS-optimized, and impactful comma-separated list. Keep it very concise, outputting exactly 2 to 3 short lines. Clean them up, group logically, and use prestigious terminology. Output ONLY the improved list. Strictly NO markdown formatting or backticks.";
    } else {
        instruction = "Rewrite and dramatically polish the provided experience into high-impact, prestigious resume achievements using strong action verbs. Limit the output to exactly 2 to 3 concise, extremely professional bullet points. Output ONLY the improved text exactly. Strictly NO markdown formatting or backticks.";
    }

    const prompt = `${instruction}\n\nInput Text:\n${text}`;

    const NVIDIA_KEY = getRandomNvidiaKey();
    let retries = 3;
    let backoffMs = 1500;
    while(retries > 0) {
      try {
        const fetchRes = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${NVIDIA_KEY}`
          },
          body: JSON.stringify({
            model: "meta/llama-3.1-8b-instruct",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.1,
            max_tokens: 1024
          })
        });

        if (!fetchRes.ok) {
           throw new Error("Failed");
        }
        const data = await fetchRes.json();
        const content = data.choices[0]?.message?.content || "";
        
        let dataText = content;
        dataText = dataText.replace(/^```((?:\w+)?)\n?/i, '').replace(/```$/i, '').trim();
        res.json({ polished: dataText });
        return;

      } catch (err: any) {
        retries--;
        if (retries === 0) {
          throw err;
        }
        await new Promise(r => setTimeout(r, backoffMs));
        backoffMs *= 2;
      }
    }
  } catch (error) {
    console.error("Resume Polish error:", error);
    res.status(500).json({ error: error instanceof Error ? error.message : "Polish failed." });
  }
});

// 10. Auto Generate Academic Identity
app.post("/api/auto-bio", async (req, res) => {
  try {
    const { fullName, academicLevel, board, schoolCollegeName, careerPersona } = req.body;

    const prompt = `Create a custom, high-octane motivational academic bio & study persona statement for an Indian student.
Student Details:
- Name: ${fullName}
- Level: ${academicLevel}
- Board System: ${board}
- School or Institute: ${schoolCollegeName || "Indian Scholar Center"}
- Future Passion / Career context described: ${careerPersona || "Academic excellence"}

Return a JSON containing:
1. bio: A single-line witty, tech-inspired study slogan/description ("e.g. Class 12 Maverick targeting UPSC...").
2. motivationQuote: Custom neural spark motivational wisdom message customized for them (no more than 30 words).
3. levelTitle: A custom fun title badge (e.g. "Board Champion", "Quantum Scholar", "Cognitive Voyager").`;

    const NVIDIA_KEY = getRandomNvidiaKey();
    let retries = 3;
    let backoffMs = 1500;
    while(retries > 0) {
      try {
        const fetchRes = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${NVIDIA_KEY}`
          },
          body: JSON.stringify({
            model: "meta/llama-3.1-8b-instruct",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.2,
            max_tokens: 500
          })
        });

        if (!fetchRes.ok) {
           throw new Error("Failed");
        }
        
        const data = await fetchRes.json();
        const content = data.choices[0]?.message?.content || "{}";
        
        let output = {};
        try {
            output = extractJSON(content);
        } catch(e) {
            console.error("auto bio parsing failed", content);
        }
        res.json(output);
        return;

      } catch (err: any) {
        retries--;
        if (retries === 0) {
          throw err;
        }
        await new Promise(r => setTimeout(r, backoffMs));
        backoffMs *= 2;
      }
    }
  } catch (error) {
    console.error("Bio generator error:", error);
    res.status(500).json({ error: error instanceof Error ? error.message : "Bio generation failed." });
  }
});

// 11. Vite development / production handler integration
export { app };

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    console.log("Integrating Vite Dev Middleware...");
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Serving static production files from dist...");
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Only listen if not running in a serverless environment
  if (!process.env.LAMBDA_TASK_ROOT && !process.env.NETLIFY && !process.env.VERCEL) {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Nova Scholar Workspace server listening on port ${PORT}`);
      console.log(`Local test server link: http://localhost:${PORT}`);
    });
  }
}

if (!process.env.LAMBDA_TASK_ROOT && !process.env.NETLIFY && !process.env.VERCEL) {
  startServer();
}
