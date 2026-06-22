import type { VercelRequest, VercelResponse } from '@vercel/node';
import { runNvidiaAI } from './utils';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { query: rawQuery, subject, level, board, history = [], teachingMode = "Intermediate" } = req.body;
    
    let questionComplexity: "Simple" | "Medium" | "Advanced" = "Medium";
    if (rawQuery.trim().split(/\s+/).length < 10) questionComplexity = "Simple";

    const systemInstruction = `You are an advanced, empathetic, and highly intelligent AI Doubt Solver for a student study website. Provide accurate, real-time, and easy-to-understand explanations.

Response Length & Depth:
Keep all responses highly concise. Deeply detailed but strictly limited to 15 lines or fewer.

Adaptation to Complexity:
CRITICAL RULE FOR SIMPLE QUESTIONS: For basic factual questions or simple math (e.g., "2+2", "What is the capital of France?"), you MUST provide ONLY the direct answer without filler words.
Complex questions: Break concepts down into simple, easy-to-digest steps. Use markdown tables or logic text-flowcharts (A -> B).`;

    const messages = [
      { role: "system", content: systemInstruction },
      ...history.map((h: any) => ({ role: h.role === "assistant" ? "assistant" : "user", content: h.content })),
      { role: "user", content: rawQuery }
    ];

    console.log(`[Backend] Utilizing NVIDIA meta/llama-3.3-70b-instruct for doubt solving.`);
    const text = await runNvidiaAI("meta/llama-3.3-70b-instruct", messages, { 
       temperature: questionComplexity === "Simple" ? 0.1 : 0.3,
       maxTokens: questionComplexity === "Simple" ? 256 : 2048
    });

    return res.status(200).json({ solution: text, metadata: null });
  } catch (error) {
    console.error("Doubt Solver error:", error);
    return res.status(500).json({ error: error instanceof Error ? error.message : "Doubt solver failed." });
  }
}
