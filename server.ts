import express from 'express';
import path from 'path';
import fs from 'fs';
import cors from 'cors';

const PORT = 3000;

async function startServer() {
  const app = express();
  
  app.use(cors());
  app.use(express.json({ limit: '50mb' }));

  // Read all API routes
  const apiDir = path.join(process.cwd(), 'api');
  if (fs.existsSync(apiDir)) {
    const files = fs.readdirSync(apiDir);
    for (const file of files) {
      if (file.endsWith('.ts') && !file.startsWith('_')) {
        const routeName = file.replace('.ts', '');
        console.log(`Mapping /api/${routeName}`);
        app.all(`/api/${routeName}`, async (req, res) => {
          try {
            // dynamically import
            const modulePath = path.join(apiDir, file);
            // using tsx, we can import .ts files natively? Yes! Or .js if compiled.
            // But we can just import the path! Wait, in ESM, dynamic import might need file:// 
            const mod = await import(`file://${modulePath}`);
            const handler = mod.default;
            if (handler) {
               await handler(req, res);
            } else {
               res.status(500).json({ error: "No default export" });
            }
          } catch (e: any) {
            console.error(`Error in /api/${routeName}:`, e);
            res.status(500).json({ error: e.message });
          }
        });
      }
    }
  }

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import('vite');
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
