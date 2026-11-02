// Run Ingeniare in any browser: node scripts/serve.js  ->  http://localhost:5173
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, normalize, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png' };
const PORT = +process.env.PORT || 5173;
http.createServer(async (req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p === '/') { res.writeHead(302, { location: '/src/index.html' }); return res.end(); }
  const file = normalize(join(ROOT, p));
  if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
  try { const body = await readFile(file); res.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream' }); res.end(body); }
  catch { res.writeHead(404); res.end('not found'); }
}).listen(PORT, () => console.log(`Ingeniare running at http://localhost:${PORT}`));
