import type { VercelRequest, VercelResponse } from '@vercel/node';
import { runNvidiaAI } from './utils';
import mammoth from 'mammoth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Increase body size limit for Vercel
  // This needs to be configured in vercel.json or next.config.js, 
  // but we can parse here if it's already configured.

  try {
    const { textContent, fileBase64, mimeType } = req.body;
    let inputData = textContent || "";

    const prompt = `Act as an expert Resume Parser. Parse the following text into the structured format. 
If a field is missing, leave it empty. Return ONLY valid JSON format.`;

    const isMultimodal = fileBase64 && mimeType && mimeType !== "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

    if (fileBase64 && mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
        const buffer = Buffer.from(fileBase64, "base64");
        const result = await mammoth.extractRawText({ buffer });
        inputData += "\n" + result.value;
    } 

    const messages = [];
    let modelToUse = "meta/llama-3.3-70b-instruct";

    if (isMultimodal) {
        modelToUse = "meta/llama-3.2-90b-vision-instruct";
        messages.push({
            role: "user",
            content: [
               { type: "text", text: prompt },
               { type: "image_url", image_url: { url: `data:${mimeType};base64,${fileBase64}` } }
            ]
        });
    } else {
        const finalPrompt = `${prompt}\n\nResume Text:\n${inputData}`;
        messages.push({ role: "user", content: finalPrompt });
    }

    const content = await runNvidiaAI(modelToUse, messages, { temperature: 0.1, maxTokens: 2500 });
    
    let output = {};
    try {
        output = extractJSON(content);
    } catch (e) {
        console.error("JSON parse failed, model returned:", content);
    }
    return res.status(200).json(output);
  } catch (error) {
    console.error("Parse Error:", error);
    return res.status(500).json({ error: "Failed to parse document" });
  }
}
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};
