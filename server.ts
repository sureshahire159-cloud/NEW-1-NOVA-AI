import express from "express";
import path from "path";
import dotenv from "dotenv";
import mammoth from "mammoth";
import cors from "cors";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: "50mb" })); 

const PORT = Number(process.env.PORT) || 3000;

function getNvidiaKey() {
  const key = process.env.NVIDIA_API_KEY;
  if (!key) {
    throw new Error("NVIDIA_API_KEY is missing from environment variables.");
  }
  return key;
}

// Robust fetch with retry, customized headers, and safer timeouts
async function fetchWithRetry(url: string, options: any, retries = 2, backoffMs = 1500) {
  for (let i = 0; i < retries; i++) {
    try {
      const controller = new AbortController();
      // Increase timeout to 50s for heavier LLM models to prevent premature timeout
      const id = setTimeout(() => controller.abort(), 50000); 
      const mergedHeaders = {
        "User-Agent": "Mozilla/5.0",
        "Content-Type": "application/json",
        ...(options.headers || {})
      };
      
      const response = await fetch(url, { 
        ...options, 
        headers: mergedHeaders, 
        signal: controller.signal 
      });
      clearTimeout(id);
      
      if (!response.ok) {
        let errText = "";
        try { errText = await response.text(); } catch (e) {}
        throw new Error(`API Error: ${response.status} ${response.statusText}. Details: ${errText}`);
      }
      return response;
    } catch (err: any) {
      console.warn(`[Backend] Fetch failed (Attempt ${i + 1}/${retries}): ${err.message}`);
      if (i === retries - 1) throw err;
      await new Promise(res => setTimeout(res, backoffMs));
      backoffMs *= 1.5; // Exponential backoff
    }
  }
  throw new Error("API request failed after retries.");
}

// Centralized Universal AI Helper connecting to NVIDIA NIM
async function runNvidiaAI(
  model: string, 
  messages: any[], 
  opts: { temperature?: number, maxTokens?: number, stream?: boolean } = {}
) {
  const NVIDIA_KEY = getNvidiaKey();
  const url = "https://integrate.api.nvidia.com/v1/chat/completions";
  
  const body: any = {
    model,
    messages,
    temperature: opts.temperature ?? 0.2,
    max_tokens: opts.maxTokens ?? 2048,
    stream: opts.stream ?? false
  };

  const response = await fetchWithRetry(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${NVIDIA_KEY}`
    },
    body: JSON.stringify(body)
  }, 2, 1000);

  if (opts.stream) {
    return response;
  }
  
  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}

function extractJSON(content: string) {
    try {
        let text = content.trim();
        text = text.replace(/^```((?:\w+)?)\n?/i, '').replace(/```$/i, '').trim();
        const firstBrace = text.indexOf('{');
        const lastBrace = text.lastIndexOf('}');
        const firstBracket = text.indexOf('[');
        const lastBracket = text.lastIndexOf(']');
        
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

CRITICAL: You must return the output STRICTLY as a JSON object, with no markdown wrappers. Do NOT output the text report, just output the JSON object that contains the data to generate the report.
The JSON must contain exactly:
{
  "dailyTimetable": [{ "timeSlot": "...", "activity": "...", "subject": "..." }],
  "weeklySchedule": [{ "day": "Monday", "slots": [{ "time": "...", "subject": "...", "topic": "..." }] }],
  "revisionPlan": [{ "subject": "...", "focusAreas": ["..."], "gapDays": 2 }],
  "mockTestSchedule": [{ "testDate": "...", "subject": "...", "format": "..." }],
  "examRoadmap": ["Phase 1: ...", "Phase 2: ...", "Phase 3: ...", "Phase 4: ...", "Phase 5: ..."]
}`;

    const text = await runNvidiaAI("meta/llama-3.3-70b-instruct", [
      { role: "user", content: prompt }
    ], { temperature: 0.2, maxTokens: 3000 });

    const output = extractJSON(text);
    res.json(output);
  } catch (error) {
    console.error("Error generating strategy:", error);
    res.status(500).json({ error: error instanceof Error ? error.message : "Strategy generation failed." });
  }
});

// 3. Doubt Solver Helper and Endpoint
app.post("/api/solve-doubt", async (req, res) => {
  try {
    const { query: rawQuery, subject, level, board, history = [], teachingMode = "Intermediate" } = req.body;
    
    let questionComplexity: "Simple" | "Medium" | "Advanced" = "Medium";
    if (rawQuery.trim().split(/\s+/).length < 10) questionComplexity = "Simple";

    const systemInstruction = `You are an advanced, empathetic, and highly intelligent AI Doubt Solver for a student study website. Provide accurate, real-time, and easy-to-understand explanations.

Response Length & Depth:
Keep all responses highly concise. Deeply detailed but strictly limited to 15 lines or fewer.

Adaptation to Complexity:
CRITICAL RULE FOR SIMPLE QUESTIONS: For basic factual questions or simple math (e.g., "2+2", "What is the capital of France?"), you MUST provide ONLY the direct answer without filler words.
Complex questions: Break concepts down into simple, easy-to-digest steps. Use markdown tables or logic text-flowcharts (A -> B).`;

    const messages = [
      { role: "system", content: systemInstruction },
      ...history.map((h: any) => ({ role: h.role === "assistant" ? "assistant" : "user", content: h.content })),
      { role: "user", content: rawQuery }
    ];

    console.log(`[Backend] Utilizing NVIDIA meta/llama-3.3-70b-instruct for doubt solving.`);
    const text = await runNvidiaAI("meta/llama-3.3-70b-instruct", messages, { 
       temperature: questionComplexity === "Simple" ? 0.1 : 0.3,
       maxTokens: questionComplexity === "Simple" ? 256 : 2048
    });

    res.json({ solution: text, metadata: null });
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

      const text = await runNvidiaAI("meta/llama-3.3-70b-instruct", [{ role: "user", content: prompt }], { temperature: 0.1, maxTokens: 30 });
      title = text.trim() || "New Doubt Chat";
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
    console.log(`[Backend Info] Environment configured with NVIDIA NIM Models (llama 3.3 70b and mixtral)`);

    const prompt = `You are "EduPulse AI"—an advanced AI Tutor analyzing a document: "${documentName}".
1. Do not just summarize. Extract critical definitions, core formulas, and concepts.
2. Automatically generate Workflow/Flowchart text diagrams (Step A -> Step B).
3. Provide 3 to 5 high-yield Flashcards.
4. Keep the ENTIRE output under 15-20 lines using tight Markdown formatting.`;

    let inlineText = textContent;
    if (fileBase64 && mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
      const buffer = Buffer.from(fileBase64, "base64");
      const result = await mammoth.extractRawText({ buffer });
      inlineText = (inlineText || "") + "\n" + result.value;
    }
    
    // Multimodal routing
    const isMultimodal = fileBase64 && mimeType && mimeType !== "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive"
    });

    const messages = [];

    if (isMultimodal) {
        console.log("[Backend] Utilizing NVIDIA meta/llama-3.2-90b-vision-instruct for multimodal synthesis.");
        messages.push({
            role: "user",
            content: [
               { type: "text", text: prompt },
               { type: "image_url", image_url: { url: `data:${mimeType};base64,${fileBase64}` } }
            ]
        });
    } else {
        console.log("[Backend] Utilizing NVIDIA meta/llama-3.3-70b-instruct for fast text synthesis.");
        const combinedText = `Document text:\n${inlineText}\n\n` + prompt;
        messages.push({ role: "user", content: combinedText });
    }

    const modelToUse = isMultimodal ? "meta/llama-3.2-90b-vision-instruct" : "meta/llama-3.3-70b-instruct";
    
    const nvidiaResponse: any = await runNvidiaAI(modelToUse, messages, {
         temperature: 0.2,
         maxTokens: 3000,
         stream: true
    });

    if (!nvidiaResponse.ok) {
       throw new Error(`NVIDIA API Stream Error: ${nvidiaResponse.statusText}`);
    }

    // Stream decoding
    const reader = nvidiaResponse.body?.getReader();
    const decoder = new TextDecoder("utf-8");
    
    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunkStr = decoder.decode(value, { stream: true });
        const lines = chunkStr.split("\n\n");
        for (const msg of lines) {
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
    
    const systemPrompt = `You are "EduPulse AI"—an advanced, highly intelligent AI Tutor.
- Actively reference and quote facts directly from the user's uploaded document to answer questions.
- If a question cannot be answered by the document alone, blend it with your general knowledge.
- Length Constraint: Keep all responses highly concise. Strictly limited to 15 lines or fewer using tight formatting.

DOCUMENT CONTEXT:
${documentContent}`;

    const messages = [
      { role: "system", content: systemPrompt },
      ...history.map((h: any) => ({ role: h.role, content: h.content })),
      { role: "user", content: query }
    ];

    const replyText = await runNvidiaAI("meta/llama-3.3-70b-instruct", messages, { temperature: 0.2, maxTokens: 1024 });
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
- "correctAnswer": a number (0, 1, 2, or 3 representing the index of the correct option)
- "explanation": a string explaining why that option is correct.

JUST JSON ARRAY:`;

    const text = await runNvidiaAI("mistralai/mixtral-8x7b-instruct-v0.1", [{ role: "user", content: prompt }], { temperature: 0.3, maxTokens: 3000 });
    const questionsList = extractJSON(text || "[]");
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
STRICT DESIGN RULE: You MUST retain ALL information and exact details/words provided by the user. Organize the data into the requested JSON schema.
Output strictly valid JSON only. Do not wrap in markdown. Format EXACTLY like this schema representation.

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

    const content = await runNvidiaAI("meta/llama-3.3-70b-instruct", [{ role: "user", content: prompt }], { temperature: 0.1, maxTokens: 3000 });
    
    let output = {};
    try {
        output = extractJSON(content);
    } catch(e) {
        console.error("Resume generator parsing failed", content);
    }
    res.json(output);
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
If a field is missing, leave it empty. Return ONLY valid JSON format.`;

    const isMultimodal = fileBase64 && mimeType && mimeType !== "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

    if (fileBase64 && mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
        const buffer = Buffer.from(fileBase64, "base64");
        const result = await mammoth.extractRawText({ buffer });
        inputData += "\n" + result.value;
    } 

    const messages = [];
    let modelToUse = "meta/llama-3.3-70b-instruct";

    if (isMultimodal) {
        modelToUse = "meta/llama-3.2-90b-vision-instruct";
        messages.push({
            role: "user",
            content: [
               { type: "text", text: prompt },
               { type: "image_url", image_url: { url: `data:${mimeType};base64,${fileBase64}` } }
            ]
        });
    } else {
        const finalPrompt = `${prompt}\n\nResume Text:\n${inputData}`;
        messages.push({ role: "user", content: finalPrompt });
    }

    const content = await runNvidiaAI(modelToUse, messages, { temperature: 0.1, maxTokens: 2500 });
    
    let output = {};
    try {
        output = extractJSON(content);
    } catch (e) {
        console.error("JSON parse failed, model returned:", content);
    }
    return res.json(output);
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
    const content = await runNvidiaAI("meta/llama-3.3-70b-instruct", [{ role: "user", content: prompt }], { temperature: 0.1, maxTokens: 1024 });

    let dataText = content;
    dataText = dataText.replace(/^```((?:\w+)?)\n?/i, '').replace(/```$/i, '').trim();
    res.json({ polished: dataText });
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
1. bio: A single-line witty, tech-inspired study slogan/description.
2. motivationQuote: Custom neural spark motivational wisdom message customized for them (no more than 30 words).
3. levelTitle: A custom fun title badge (e.g. "Board Champion", "Quantum Scholar", "Cognitive Voyager").`;

    const content = await runNvidiaAI("meta/llama-3.3-70b-instruct", [{ role: "user", content: prompt }], { temperature: 0.2, maxTokens: 500 });
    
    let output = {};
    try {
        output = extractJSON(content);
    } catch(e) {
        console.error("auto bio parsing failed", content);
    }
    res.json(output);
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
