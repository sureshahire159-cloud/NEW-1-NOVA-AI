import type { Request, Response } from 'express';
import { runNvidiaAI } from './_utils';

export default async function handler(req: Request, res: Response) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { documentName, mimeType, fileBase64, targetType } = req.body;
    const messages = [{ role: "user", content: `Synthesize this document (Name: ${documentName}, Type: ${mimeType}). Format it as: ${targetType}. Document Base64 (or text representation): ${fileBase64.substring(0, 5000)}... (truncated for length). Extract the text and provide the synthesis.` }];
    
    const response = await runNvidiaAI(messages, { temperature: 0.3, maxTokens: 3000, stream: true });
    
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");

    while (true) {
      const { done, value } = await reader.read();
      if (done) { res.write("data: [DONE]\n\n"); res.end(); break; }
      
      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n').filter((line: string) => line.trim() !== '');
      for (const line of lines) {
        if (line === 'data: [DONE]') continue;
        if (line.startsWith('data: ')) {
          const data = JSON.parse(line.slice(6));
          if (data.choices && data.choices[0] && data.choices[0].delta.content) {
            res.write(`data: ${JSON.stringify({ text: data.choices[0].delta.content })}\n\n`);
          }
        }
      }
    }
  } catch (err: any) { res.status(500).json({ error: err.message }); }
}
