import type { Request, Response } from 'express';
import { runGroqAI, extractJSON } from './_utils';

export default async function handler(req: Request, res: Response) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { text, targetRole } = req.body;
    const prompt = `Parse this resume text and extract fields into JSON matching this structure exactly (return only JSON). Target role: ${targetRole}\nResume: ${text}\n\nJSON Schema: { "name": "", "email": "", "phone": "", "location": "", "website": "", "objective": "", "experience": [{ "company": "", "role": "", "duration": "", "location": "", "responsibilities": [""] }], "education": [{ "institution": "", "degree": "", "duration": "", "location": "", "gpa": "", "coursework": [""] }], "projects": [{ "name": "", "techStack": [""], "link": "", "description": [""] }], "skills": { "languages": [""], "frameworks": [""], "tools": [""], "softSkills": [""] }, "certifications": [{ "name": "", "issuer": "", "date": "" }], "achievements": [""] }`;
    const content = await runGroqAI("llama-3.3-70b-versatile", [{ role: "user", content: prompt }], { temperature: 0.1, maxTokens: 2500 });
    const jsonStr = extractJSON(content);
    res.json(JSON.parse(jsonStr));
  } catch (err: any) { res.status(500).json({ error: err.message }); }
}
