import type { Request, Response } from 'express';
import { runGroqAI, extractJSON } from './_utils';

export default async function handler(req: Request, res: Response) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { topic, difficulty, count } = req.body;
    const prompt = `Generate a multiple choice quiz about ${topic} at ${difficulty} difficulty with ${count} questions. Return JSON: { "questions": [ { "question": "string", "options": ["string", "string", "string", "string"], "correctAnswer": 0, "explanation": "string" } ] }`;
    const content = await runGroqAI("llama-3.3-70b-versatile", [{ role: "user", content: prompt }], { temperature: 0.3, maxTokens: 2500 });
    const jsonStr = extractJSON(content);
    res.json(JSON.parse(jsonStr));
  } catch (err: any) { res.status(500).json({ error: err.message }); }
}
