import type { Request, Response } from 'express';
import { runNvidiaAI } from './_utils';

export default async function handler(req: Request, res: Response) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { documentContent, history, query } = req.body;
    const systemPrompt = `Use this context to answer the user: ${documentContent}`;
    const fullMessages = [{ role: "system", content: systemPrompt }, ...(history || []), { role: "user", content: query }];
    const content = await runNvidiaAI(fullMessages, { temperature: 0.2, maxTokens: 1024 });
    res.json({ reply: content });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
}
