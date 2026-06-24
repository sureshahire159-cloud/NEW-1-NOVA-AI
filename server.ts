import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import cors from 'cors';

import autoBioHandler from './api/auto-bio';
import docChatHandler from './api/doc-chat';
import generateChatTitleHandler from './api/generate-chat-title';
import generateQuizHandler from './api/generate-quiz';
import generateResumeHandler from './api/generate-resume';
import generateStrategyHandler from './api/generate-strategy';
import logHandler from './api/log';
import parseResumeHandler from './api/parse-resume';
import polishResumeHandler from './api/polish-resume';
import solveDoubtHandler from './api/solve-doubt';
import synthesizeHandler from './api/synthesize';

const PORT = Number(process.env.PORT) || 3000;

async function startServer() {
  const app = express();
  
  app.use(cors());
  app.use(express.json({ limit: '50mb' }));

  // Map routes manually for better esbuild bundling
  app.all('/api/auto-bio', autoBioHandler);
  app.all('/api/doc-chat', docChatHandler);
  app.all('/api/generate-chat-title', generateChatTitleHandler);
  app.all('/api/generate-quiz', generateQuizHandler);
  app.all('/api/generate-resume', generateResumeHandler);
  app.all('/api/generate-strategy', generateStrategyHandler);
  app.all('/api/log', logHandler);
  app.all('/api/parse-resume', parseResumeHandler);
  app.all('/api/polish-resume', polishResumeHandler);
  app.all('/api/solve-doubt', solveDoubtHandler);
  app.all('/api/synthesize', synthesizeHandler);

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
