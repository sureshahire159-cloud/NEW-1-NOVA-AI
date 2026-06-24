import type { VercelRequest, VercelResponse } from '@vercel/node';
import { runNvidiaAI } from './_utils.ts';
import mammoth from 'mammoth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { documentName, fileBase64, mimeType, textContent } = req.body;
    console.log(`[Backend Info] Environment configured with NVIDIA NIM Models (llama 3.3 70b and mixtral)`);

    const prompt = `You are "EduPulse AI"—an advanced AI Tutor analyzing a document: "${documentName}".
1. Do not just summarize. Extract critical definitions, core formulas, and concepts.
2. Automatically generate Workflow/Flowchart text diagrams (Step A -> Step B).
3. Provide 3 to 5 high-yield Flashcards.
4. Keep the ENTIRE output under 15-20 lines using tight Markdown formatting.`;

    let inlineText = textContent;
    if (fileBase64 && mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
      const buffer = Buffer.from(fileBase64, "base64");
      const result = await mammoth.extractRawText({ buffer });
      inlineText = (inlineText || "") + "\n" + result.value;
    }
    
    // Multimodal routing
    const isMultimodal = fileBase64 && mimeType && mimeType !== "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const messages = [];

    if (isMultimodal) {
        console.log("[Backend] Utilizing NVIDIA meta/llama-3.2-90b-vision-instruct for multimodal synthesis.");
        messages.push({
            role: "user",
            content: [
               { type: "text", text: prompt },
               { type: "image_url", image_url: { url: `data:${mimeType};base64,${fileBase64}` } }
            ]
        });
    } else {
        console.log("[Backend] Utilizing NVIDIA meta/llama-3.3-70b-instruct for fast text synthesis.");
        const combinedText = `Document text:\n${inlineText}\n\n` + prompt;
        messages.push({ role: "user", content: combinedText });
    }

    const modelToUse = isMultimodal ? "meta/llama-3.2-90b-vision-instruct" : "meta/llama-3.3-70b-instruct";
    
    const nvidiaResponse: any = await runNvidiaAI(modelToUse, messages, {
         temperature: 0.2,
         maxTokens: 3000,
         stream: true
    });

    if (!nvidiaResponse.ok) {
       throw new Error(`NVIDIA API Stream Error: ${nvidiaResponse.statusText}`);
    }

    // Stream decoding
    const reader = nvidiaResponse.body?.getReader();
    const decoder = new TextDecoder("utf-8");
    
    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunkStr = decoder.decode(value, { stream: true });
        const lines = chunkStr.split("\n\n");
        for (const msg of lines) {
          if (msg.startsWith("data: ") && msg !== "data: [DONE]") {
            try {
              const parsed = JSON.parse(msg.substring(6));
              const delta = parsed.choices[0]?.delta?.content;
              if (delta) {
                res.write(`data: ${JSON.stringify({ text: delta })}\n\n`);
              }
            } catch (e) {}
          }
        }
      }
    }
    return res.end();
  } catch (error) {
    console.error("Synthesizer error:", error);
    res.write(`data: ${JSON.stringify({ error: error instanceof Error ? error.message : "Analysis failed." })}\n\n`);
    return res.end();
  }
}
