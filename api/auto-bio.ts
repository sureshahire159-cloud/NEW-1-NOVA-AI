import type { Request, Response } from 'express';
import { runNvidiaAI } from './_utils';

export default async function handler(req: Request, res: Response) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { fullName, academicLevel, board, schoolCollegeName, careerPersona } = req.body;
    const prompt = `Write a short, engaging bio or study slogan for a student. Name: ${fullName}, Level: ${academicLevel}, Board: ${board}, School/College: ${schoolCollegeName}, Persona: ${careerPersona}.`;
    const content = await runNvidiaAI([{ role: "user", content: prompt }], { temperature: 0.2, maxTokens: 500 });
    res.json({ bio: content });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
}
