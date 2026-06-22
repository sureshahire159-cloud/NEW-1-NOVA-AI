import type { VercelRequest, VercelResponse } from '@vercel/node';
import { runNvidiaAI } from './utils';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { fullName, academicLevel, board, schoolCollegeName, careerPersona } = req.body;
    const prompt = `Create a custom, high-octane motivational academic bio & study persona statement for an Indian student.
Student Details:
- Name: ${fullName}
- Level: ${academicLevel}
- Board System: ${board}
- School or Institute: ${schoolCollegeName || "Indian Scholar Center"}
- Future Passion / Career context described: ${careerPersona || "Academic excellence"}

Return a JSON containing:
1. bio: A single-line witty, tech-inspired study slogan/description.
2. motivationQuote: Custom neural spark motivational wisdom message customized for them (no more than 30 words).
3. levelTitle: A custom fun title badge (e.g. "Board Champion", "Quantum Scholar", "Cognitive Voyager").`;

    const content = await runNvidiaAI("meta/llama-3.3-70b-instruct", [{ role: "user", content: prompt }], { temperature: 0.2, maxTokens: 500 });
    
    let output = {};
    try {
        output = extractJSON(content);
    } catch(e) {
        console.error("auto bio parsing failed", content);
    }
    return res.status(200).json(output);
  } catch (error) {
    console.error("Bio generator error:", error);
    return res.status(500).json({ error: error instanceof Error ? error.message : "Bio generation failed." });
  }
}
