import type { Request, Response } from 'express';
import { runGroqAI } from './_utils';

export default async function handler(req: Request, res: Response) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { text, targetRole, fieldType } = req.body;
    const prompt = `Polish this resume text. Field type: ${fieldType}. Target Role: ${targetRole}. Text: ${text}\nProvide ONLY the polished text.`;
    const content = await runGroqAI("llama-3.3-70b-versatile", [{ role: "user", content: prompt }], { temperature: 0.2, maxTokens: 1024 });
    res.json({ polished: content });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
}
