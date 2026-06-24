import type { Request, Response } from 'express';
import { runGroqAI, extractJSON } from './_utils';

export default async function handler(req: Request, res: Response) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { resumeData, theme, format } = req.body;
    const prompt = `Generate a resume score and feedback for this resume. Return JSON: { "resumeScore": 85, "feedback": ["string"], "suggestedKeywords": ["string"], "tailoredObjective": "string", "generatedHtml": "string (optional html/markdown version)" }\nResume data: ${JSON.stringify(resumeData)}`;
    const content = await runGroqAI("llama-3.3-70b-versatile", [{ role: "user", content: prompt }], { temperature: 0.2, maxTokens: 2500 });
    const jsonStr = extractJSON(content);
    res.json(JSON.parse(jsonStr));
  } catch (err: any) { res.status(500).json({ error: err.message }); }
}
