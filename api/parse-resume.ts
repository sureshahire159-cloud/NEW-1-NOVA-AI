import type { Request, Response } from 'express';
import { runNvidiaAI, extractJSON } from './_utils';

export default async function handler(req: Request, res: Response) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { fileBase64, mimeType } = req.body;
    const prompt = `Parse this resume text and extract fields into JSON matching this structure exactly (return only JSON).\nResume Base64 (or text representation): ${fileBase64.substring(0, 5000)}\n\nJSON Schema: { "name": "", "email": "", "phone": "", "location": "", "website": "", "objective": "", "experience": [{ "company": "", "role": "", "duration": "", "location": "", "responsibilities": [""] }], "education": [{ "institution": "", "degree": "", "duration": "", "location": "", "gpa": "", "coursework": [""] }], "projects": [{ "name": "", "techStack": [""], "link": "", "description": [""] }], "skills": { "languages": [""], "frameworks": [""], "tools": [""], "softSkills": [""] }, "certifications": [{ "name": "", "issuer": "", "date": "" }], "achievements": [""] }`;
    const content = await runNvidiaAI([{ role: "user", content: prompt }], { temperature: 0.1, maxTokens: 2500 });
    const jsonStr = extractJSON(content);
    res.json(JSON.parse(jsonStr));
  } catch (err: any) { res.status(500).json({ error: err.message }); }
}
