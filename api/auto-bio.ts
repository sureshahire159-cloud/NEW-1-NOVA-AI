import type { Request, Response } from 'express';
import { runGroqAI, extractJSON } from './_utils';

export default async function handler(req: Request, res: Response) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { currentBio, targetRole, yearsOfExperience, keySkills, tone } = req.body;
    const prompt = `Write a professional bio. Target Role: ${targetRole}, Experience: ${yearsOfExperience} years, Skills: ${keySkills}, Tone: ${tone}. Current bio: ${currentBio}`;
    const content = await runGroqAI("llama-3.3-70b-versatile", [{ role: "user", content: prompt }], { temperature: 0.2, maxTokens: 500 });
    res.json({ bio: content });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
}
