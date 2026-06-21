import { app } from "../server";

console.log("Vercel backend initialized.");
if (!process.env.NVIDIA_API_KEY) {
    console.error("NVIDIA_API_KEY is missing in Vercel environment variables. AI integrations will fail.");
}

export const maxDuration = 60; // Set max duration for Vercel
export default app;
