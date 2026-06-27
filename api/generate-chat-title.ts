import type { Request, Response } from 'express';
import { runNvidiaAI } from './_utils';

export default async function handler(req: Request, res: Response) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { query } = req.body;
    const prompt = `Generate a very short title (max 5 words) for this chat about: ${query}`;
    const content = await runNvidiaAI([{ role: "user", content: prompt }], { temperature: 0.1, maxTokens: 20 });
    res.json({ title: content.replace(/["']/g, '') });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
}
