import type { VercelRequest, VercelResponse } from '@vercel/node';
import { runNvidiaAI, extractJSON } from './_utils.ts';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { educationLevel, subjectCategory, specificTopic, difficulty, questionCount } = req.body;
    let count = 5;
    if (questionCount && typeof questionCount === 'string') {
        const match = questionCount.match(/(\d+)/);
        if (match) {
            count = parseInt(match[1], 10);
        }
    }

    if (!educationLevel || !subjectCategory || !specificTopic) {
        return res.status(400).json({ error: "Education Level, Subject Category, and Specific Topic are required." });
    }

    const prompt = `Generate exactly ${count} multiple choice questions (MCQs) for a quiz.
Education Level: ${educationLevel}
Subject Category: ${subjectCategory}
Specific Topic: ${specificTopic}
Difficulty: ${difficulty}

You must return a raw JSON Array ONLY. No markdown blocks, no code fences, no extra text.
The JSON must be an array of question objects where each object has exactly these keys:
- "id": a unique string (e.g. "q1")
- "question": the question string
- "options": an array of exactly 4 strings
- "correctAnswer": a number (0, 1, 2, or 3 representing the index of the correct option)
- "explanation": a string explaining why that option is correct.

JUST JSON ARRAY:`;

    const text = await runNvidiaAI("mistralai/mixtral-8x7b-instruct-v0.1", [{ role: "user", content: prompt }], { temperature: 0.3, maxTokens: 3000 });
    const questionsList = extractJSON(text || "[]");
    return res.status(200).json({ questions: questionsList });
  } catch (error) {
    console.error("Quiz Generator error:", error);
    return res.status(500).json({ error: error instanceof Error ? error.message : "Quiz generation failed." });
  }
}
