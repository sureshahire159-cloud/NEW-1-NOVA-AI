import type { Request, Response } from 'express';
import { runNvidiaAI, extractJSON } from './_utils';

export default async function handler(req: Request, res: Response) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { fullName, email, phone, location, linkedin, education, skills, experience, targetRole, certifications, languages } = req.body;
    const resumeData = { fullName, email, phone, location, linkedin, education, skills, experience, targetRole, certifications, languages };
    const prompt = `Generate a resume score and feedback for this resume. Return JSON: { "resumeScore": 85, "feedback": ["string"], "suggestedKeywords": ["string"], "tailoredObjective": "string", "generatedHtml": "string (optional html/markdown version)" }\nResume data: ${JSON.stringify(resumeData)}`;
    const content = await runNvidiaAI([{ role: "user", content: prompt }], { temperature: 0.2, maxTokens: 2500 });
    const jsonStr = extractJSON(content);
    res.json(JSON.parse(jsonStr));
  } catch (err: any) { res.status(500).json({ error: err.message }); }
}
