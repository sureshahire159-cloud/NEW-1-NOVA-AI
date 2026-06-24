import type { Request, Response } from 'express';
import { runGroqAI, extractJSON } from './_utils';

export default async function handler(req: Request, res: Response) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { subjects, startDate, endDate, hoursPerDay, focusMode } = req.body;
    const prompt = `Create a study strategy. Subjects: ${subjects.map((s:any)=>s.name).join(',')}. Dates: ${startDate} to ${endDate}. Hours: ${hoursPerDay}. Mode: ${focusMode}. Return JSON: { "strategy": "string", "timeAllocation": [{ "subject": "string", "hours": 0 }], "dailyRoutine": ["string"], "tips": ["string"] }`;
    const content = await runGroqAI("llama-3.3-70b-versatile", [{ role: "user", content: prompt }], { temperature: 0.2, maxTokens: 2000 });
    const jsonStr = extractJSON(content);
    res.json(JSON.parse(jsonStr));
  } catch (err: any) { res.status(500).json({ error: err.message }); }
}
