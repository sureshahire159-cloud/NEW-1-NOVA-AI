import type { VercelRequest, VercelResponse } from '@vercel/node';
import { runNvidiaAI } from './_utils.ts';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { documentContent, history, query } = req.body;
    
    const systemPrompt = `You are "EduPulse AI"—an advanced, highly intelligent AI Tutor.
- Actively reference and quote facts directly from the user's uploaded document to answer questions.
- If a question cannot be answered by the document alone, blend it with your general knowledge.
- Length Constraint: Keep all responses highly concise. Strictly limited to 15 lines or fewer using tight formatting.

DOCUMENT CONTEXT:
${documentContent}`;

    const messages = [
      { role: "system", content: systemPrompt },
      ...history.map((h: any) => ({ role: h.role, content: h.content })),
      { role: "user", content: query }
    ];

    const replyText = await runNvidiaAI("meta/llama-3.3-70b-instruct", messages, { temperature: 0.2, maxTokens: 1024 });
    return res.status(200).json({ reply: replyText });
  } catch (err: any) {
    console.error("Doc chat error:", err);
    return res.status(500).json({ error: "Failed to query document." });
  }
}
