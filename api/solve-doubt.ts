import type { Request, Response } from 'express';
import { runNvidiaAI, extractJSON } from './_utils';

export default async function handler(req: Request, res: Response) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { query, subject, level, board, teachingMode, history } = req.body;
    const messages = history ? history : [{ role: "user", content: `Subject: ${subject}\nDoubt: ${query}\nLevel: ${level}\nBoard: ${board}\nMode: ${teachingMode}\nProvide solution and metadata in JSON format: { "solution": "string", "metadata": { "subject": "string", "topic": "string", "difficulty": "string", "suggestedRelatedTopics": ["string"] } }` }];
    if (history && history.length > 0 && history[0].role !== "system") {
      messages.unshift({ role: "system", content: `You are an AI tutor. Provide solution and metadata in JSON format: { "solution": "string", "metadata": { "subject": "string", "topic": "string", "difficulty": "string", "suggestedRelatedTopics": ["string"] } }` });
    }
    const content = await runNvidiaAI(messages, { temperature: 0.3, maxTokens: 1500 });
    const jsonStr = extractJSON(content);
    res.json(JSON.parse(jsonStr));
  } catch (err: any) { res.status(500).json({ error: err.message }); }
}
