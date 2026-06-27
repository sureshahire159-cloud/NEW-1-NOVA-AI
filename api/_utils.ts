import type { Request, Response } from 'express';

export function getNvidiaKey() {
  const key = process.env.NVIDIA_API_KEY;
  if (!key) {
    throw new Error("NVIDIA_API_KEY is missing from environment variables.");
  }
  return key;
}

export async function runNvidiaAI(messages: any[], options: any = {}) {
  const apiKey = getNvidiaKey();
  const response = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "nvidia/nemotron-3-ultra-550b-a55b",
      messages,
      temperature: options.temperature ?? 1,
      top_p: options.top_p ?? 0.95,
      max_tokens: options.maxTokens ?? 4096,
      stream: options.stream ?? false
    })
  });

  if (!response.ok) {
    const err = await response.text();
    console.error("NVIDIA API Error response:", err);
    
    let errorMsg = "An error occurred with the AI service.";
    if (response.status === 401 || response.status === 403) {
      errorMsg = "API Key is invalid or expired.";
    } else if (response.status === 429) {
      errorMsg = "Rate limit exceeded. Please try again later.";
    } else if (response.status >= 500) {
      errorMsg = "AI service is currently down or experiencing issues.";
    }
    
    throw new Error(errorMsg);
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
