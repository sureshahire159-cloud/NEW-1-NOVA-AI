import type { VercelRequest, VercelResponse } from '@vercel/node';
import { runNvidiaAI, extractJSON } from './_utils';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { 
      fullName, email, phone, location, linkedin,
      education, skills, experience, targetRole,
      certifications, languages, projects, internships, achievements, objective
    } = req.body;

    const prompt = `Act as an expert ATS (Applicant Tracking System) Screener and Premium Resume Writer.
User Details:
- Name: ${fullName}
- Email: ${email}
- Phone: ${phone}
- Location: ${location}
- LinkedIn: ${linkedin}
- Career Objective Input: ${objective || "None"}
- Education: ${education}
- Skills Input: ${skills}
- Experience Input: ${experience || "None specified"}
- Target Job Role: ${targetRole}
- Certifications: ${certifications || "None"}
- Languages: ${languages || "None"}
- Projects: ${projects || "None"}
- Internships: ${internships || "None"}
- Achievements: ${achievements || "None"}

Please construct a professional resume in JSON format.
STRICT DESIGN RULE: You MUST retain ALL information and exact details/words provided by the user. Organize the data into the requested JSON schema.
Output strictly valid JSON only. Do not wrap in markdown. Format EXACTLY like this schema representation.

{
  "resumeScore": 95,
  "careerObjective": "Exactly what the user wrote for objective...",
  "optimizedSkills": {
    "Technical": ["Match user exact inputs"],
    "Soft Skills": ["Match user exact inputs"]
  },
  "optimizedExperience": [
    { "title": "Job Title", "company": "Company Name", "duration": "Month, Year - Month, Year", "descriptions": ["Key point 1"] }
  ],
  "internships": [
    { "title": "Internship Title", "company": "Company Name", "duration": "Month, Year - Month, Year", "descriptions": ["Key point 1"] }
  ],
  "projects": [
    { "title": "Project Title", "company": "Institute Name", "description": "Brief description", "tools": "React" }
  ],
  "structuredEducation": [
    { "degree": "B.Tech in CS", "institution": "University", "year": "2024", "score": "CGPA: 8.5/10" }
  ],
  "certifications": [
    { "name": "Certificate", "institution": "Institute", "year": "Year" }
  ],
  "languages": ["English (Fluent)"]
}`;

    const content = await runNvidiaAI("meta/llama-3.3-70b-instruct", [{ role: "user", content: prompt }], { temperature: 0.1, maxTokens: 3000 });
    
    let output = {};
    try {
        output = extractJSON(content);
    } catch(e) {
        console.error("Resume generator parsing failed", content);
    }
    return res.status(200).json(output);
  } catch (error) {
    console.error("Career Resume error:", error);
    return res.status(500).json({ error: error instanceof Error ? error.message : "Resume generation failed." });
  }
}
