import type { VercelRequest, VercelResponse } from '@vercel/node';
import { runNvidiaAI } from './_utils.ts';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { text, type } = req.body;
    let instruction = "";
    if (type === "skills") {
        instruction = "Upgrade the provided skills into a highly professional, ATS-optimized, and impactful comma-separated list. Keep it very concise, outputting exactly 2 to 3 short lines. Clean them up, group logically, and use prestigious terminology. Output ONLY the improved list. Strictly NO markdown formatting or backticks.";
    } else {
        instruction = "Rewrite and dramatically polish the provided experience into high-impact, prestigious resume achievements using strong action verbs. Limit the output to exactly 2 to 3 concise, extremely professional bullet points. Output ONLY the improved text exactly. Strictly NO markdown formatting or backticks.";
    }

    const prompt = `${instruction}\n\nInput Text:\n${text}`;
    const content = await runNvidiaAI("meta/llama-3.3-70b-instruct", [{ role: "user", content: prompt }], { temperature: 0.1, maxTokens: 1024 });

    let dataText = content;
    dataText = dataText.replace(/^```((?:\w+)?)\n?/i, '').replace(/```$/i, '').trim();
    return res.status(200).json({ polished: dataText });
  } catch (error) {
    console.error("Resume Polish error:", error);
    return res.status(500).json({ error: error instanceof Error ? error.message : "Polish failed." });
  }
}
