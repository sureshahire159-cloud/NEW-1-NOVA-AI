import type { Request, Response } from 'express';
import { runNvidiaAI, extractJSON } from './_utils';

export default async function handler(req: Request, res: Response) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { academicLevel, board, subjects, dailyHours, examDate, priorityLevel, weakSubjects } = req.body;
    const prompt = `Create a study strategy. Academic Level: ${academicLevel}, Board: ${board}. Subjects: ${subjects.map((s:any)=>s.name).join(', ')}. Exam Date: ${examDate}. Hours per day: ${dailyHours}. Priority: ${priorityLevel}. Weak Subjects: ${weakSubjects}. Return JSON: { "strategy": "string", "timeAllocation": [{ "subject": "string", "hours": 0 }], "dailyRoutine": ["string"], "tips": ["string"] }`;
    const content = await runNvidiaAI([{ role: "user", content: prompt }], { temperature: 0.2, maxTokens: 2000 });
    const jsonStr = extractJSON(content);
    res.json(JSON.parse(jsonStr));
  } catch (err: any) { res.status(500).json({ error: err.message }); }
}
