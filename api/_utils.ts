export function getNvidiaKey() {
  const key = process.env.NVIDIA_API_KEY;
  if (!key) {
    throw new Error("NVIDIA_API_KEY is missing from environment variables.");
  }
  return key;
}

export async function fetchWithRetry(url: string, options: any, retries = 2, backoffMs = 1500) {
  for (let i = 0; i < retries; i++) {
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 50000); 
      const mergedHeaders = {
        "User-Agent": "Mozilla/5.0",
        "Content-Type": "application/json",
        ...(options.headers || {})
      };
      
      const response = await fetch(url, { 
        ...options, 
        headers: mergedHeaders, 
        signal: controller.signal 
      });
      clearTimeout(id);
      
      if (!response.ok) {
        let errText = "";
        try { errText = await response.text(); } catch (e) {}
        throw new Error(`API Error: ${response.status} ${response.statusText}. Details: ${errText}`);
      }
      return response;
    } catch (err: any) {
      console.warn(`[Backend] Fetch failed (Attempt ${i + 1}/${retries}): ${err.message}`);
      if (i === retries - 1) throw err;
      await new Promise(res => setTimeout(res, backoffMs));
      backoffMs *= 1.5;
    }
  }
  throw new Error("API request failed after retries.");
}

export async function runNvidiaAI(
  model: string, 
  messages: any[], 
  opts: { temperature?: number, maxTokens?: number, stream?: boolean } = {}
) {
  const NVIDIA_KEY = getNvidiaKey();
  const url = "https://integrate.api.nvidia.com/v1/chat/completions";
  
  const body: any = {
    model,
    messages,
    temperature: opts.temperature ?? 0.2,
    max_tokens: opts.maxTokens ?? 2048,
    stream: opts.stream ?? false
  };

  const response = await fetchWithRetry(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${NVIDIA_KEY}`
    },
    body: JSON.stringify(body)
  }, 2, 1000);

  if (opts.stream) {
    return response;
  }
  
  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}

export function extractJSON(content: string) {
    try {
        let text = content.trim();
        text = text.replace(/^```((?:\w+)?)\n?/i, '').replace(/```$/i, '').trim();
        const firstBrace = text.indexOf('{');
        const lastBrace = text.lastIndexOf('}');
        const firstBracket = text.indexOf('[');
        const lastBracket = text.lastIndexOf(']');
        
        if (firstBrace !== -1 && lastBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
            text = text.substring(firstBrace, lastBrace + 1);
        } else if (firstBracket !== -1 && lastBracket !== -1) {
            text = text.substring(firstBracket, lastBracket + 1);
        }

        return JSON.parse(text);
    } catch (e) {
        console.error("JSON extraction failed on content length:", content.length);
        throw e;
    }
}
