import type { VercelRequest, VercelResponse } from '@vercel/node';
import fs from 'fs';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'POST') {
    try {
      const data = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      fs.writeFileSync('/tmp/react-error.log', JSON.stringify(data, null, 2));
      console.log("REACT ERROR LOGGED:", data);
      res.status(200).json({ ok: true });
    } catch(e) {
      res.status(500).json({ error: String(e) });
    }
  } else {
    res.status(405).json({ error: "Method not allowed" });
  }
}
