import type { Request, Response } from 'express';

export function getGroqKey() {
  const key = process.env.GROQ_API_KEY;
  if (!key) {
    throw new Error("GROQ_API_KEY is missing from environment variables.");
  }
  return key;
}

export async function runGroqAI(model: string, messages: any[], options: any = {}) {
  const apiKey = getGroqKey();
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: model || "llama-3.3-70b-versatile",
      messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 1024,
      stream: options.stream ?? false
    })
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Groq API Error: ${err}`);
  }
  
  if (options.stream) return response;

  const data = await response.json();
  return data.choices[0].message.content;
}

export function extractJSON(text: string) {
   const match = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
   if (match) return match[1];
   return text.trim();
}
