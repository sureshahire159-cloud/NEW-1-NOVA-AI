import express from "express";
import path from "path";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: "50mb" })); 

const PORT = Number(process.env.PORT) || 3000;

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// APIs have been migrated to the /api folder as Vercel Serverless Functions.
// For local testing in environments that don't run `vercel dev`, you will need to
// use `vercel dev` or map the endpoints.

// Vite development / production handler integration
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    console.log("Integrating Vite Dev Middleware...");
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Serving static production files from dist...");
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  if (!process.env.LAMBDA_TASK_ROOT && !process.env.NETLIFY && !process.env.VERCEL) {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Nova Scholar Workspace server listening on port ${PORT}`);
      console.log(`Note: API endpoints are now Vercel Serverless Functions in the /api directory.`);
    });
  }
}

if (!process.env.LAMBDA_TASK_ROOT && !process.env.NETLIFY && !process.env.VERCEL) {
  startServer();
}
