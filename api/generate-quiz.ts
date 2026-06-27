import type { Request, Response } from 'express';
import { runNvidiaAI, extractJSON } from './_utils';

export default async function handler(req: Request, res: Response) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { educationLevel, subjectCategory, specificTopic, difficulty, questionCount } = req.body;
    const prompt = `Generate a multiple choice quiz about ${subjectCategory} - ${specificTopic} at ${educationLevel} level (${difficulty} difficulty) with ${questionCount} questions. Return JSON: { "questions": [ { "question": "string", "options": ["string", "string", "string", "string"], "correctAnswer": 0, "explanation": "string" } ] }`;
    const content = await runNvidiaAI([{ role: "user", content: prompt }], { temperature: 0.3, maxTokens: 2500 });
    const jsonStr = extractJSON(content);
    res.json(JSON.parse(jsonStr));
  } catch (err: any) { res.status(500).json({ error: err.message }); }
}
