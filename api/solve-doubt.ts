import type { Request, Response } from 'express';
import { runGroqAI, extractJSON } from './_utils';

export default async function handler(req: Request, res: Response) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { subject, doubt, mode, conversation } = req.body;
    const messages = conversation ? conversation : [{ role: "user", content: `Subject: ${subject}\nDoubt: ${doubt}\nMode: ${mode}\nProvide solution and metadata in JSON format: { "solution": "string", "metadata": { "subject": "string", "topic": "string", "difficulty": "string", "suggestedRelatedTopics": ["string"] } }` }];
    const content = await runGroqAI("llama-3.3-70b-versatile", messages, { temperature: 0.3, maxTokens: 1500 });
    const jsonStr = extractJSON(content);
    res.json(JSON.parse(jsonStr));
  } catch (err: any) { res.status(500).json({ error: err.message }); }
}
