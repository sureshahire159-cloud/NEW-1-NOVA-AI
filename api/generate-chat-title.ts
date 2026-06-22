import type { VercelRequest, VercelResponse } from '@vercel/node';
import { runNvidiaAI } from './utils';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { query } = req.body;
    let title = "New Doubt Chat";
    try {
      const prompt = `Based on this academic doubt request, generate an extremely concise 2-4 word chat title.
Doubt: "${query}"
Return ONLY raw title, no quotes, no extra chat text, no numbers.`;

      const text = await runNvidiaAI("meta/llama-3.3-70b-instruct", [{ role: "user", content: prompt }], { temperature: 0.1, maxTokens: 30 });
      title = text.trim() || "New Doubt Chat";
    } catch (e) {
      title = query.split(" ").slice(0, 3).join(" ") || "New Doubt Chat";
    }
    return res.status(200).json({ title });
  } catch (error) {
    return res.status(200).json({ title: "New Doubt Chat" });
  }
}
