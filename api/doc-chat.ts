import type { Request, Response } from 'express';
import { runGroqAI } from './_utils';

export default async function handler(req: Request, res: Response) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { messages, context } = req.body;
    const systemPrompt = `Use this context to answer the user: ${context}`;
    const fullMessages = [{ role: "system", content: systemPrompt }, ...messages];
    const content = await runGroqAI("llama-3.3-70b-versatile", fullMessages, { temperature: 0.2, maxTokens: 1024 });
    res.json({ reply: content });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
}
