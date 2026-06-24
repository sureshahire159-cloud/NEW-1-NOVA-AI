import type { VercelRequest, VercelResponse } from '@vercel/node';
import { runNvidiaAI, extractJSON } from './_utils.ts';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { academicLevel, board, subjects, dailyHours, examDate, priorityLevel, weakSubjects } = req.body;
    const prompt = `You are NOVA AI, an advanced academic planning assistant.

Your task is to generate a premium, professional, PDF-ready Study Strategy Report based on the student's input.

INPUT VARIABLES:
- Education Level: ${academicLevel}
- Board: ${board}
- Subjects: ${subjects?.join(", ")}
- Daily Study Commitment: ${dailyHours}
- Target Exam Date: ${examDate}
- Urgency Level: ${priorityLevel}
- Weak Subjects: ${weakSubjects?.join(", ")}

CRITICAL: You must return the output STRICTLY as a JSON object, with no markdown wrappers. Do NOT output the text report, just output the JSON object that contains the data to generate the report.
The JSON must contain exactly:
{
  "dailyTimetable": [{ "timeSlot": "...", "activity": "...", "subject": "..." }],
  "weeklySchedule": [{ "day": "Monday", "slots": [{ "time": "...", "subject": "...", "topic": "..." }] }],
  "revisionPlan": [{ "subject": "...", "focusAreas": ["..."], "gapDays": 2 }],
  "mockTestSchedule": [{ "testDate": "...", "subject": "...", "format": "..." }],
  "examRoadmap": ["Phase 1: ...", "Phase 2: ...", "Phase 3: ...", "Phase 4: ...", "Phase 5: ..."]
}`;

    const text = await runNvidiaAI("meta/llama-3.3-70b-instruct", [
      { role: "user", content: prompt }
    ], { temperature: 0.2, maxTokens: 3000 });

    const output = extractJSON(text);
    return res.status(200).json(output);
  } catch (error) {
    console.error("Error generating strategy:", error);
    return res.status(500).json({ error: error instanceof Error ? error.message : "Strategy generation failed." });
  }
}
