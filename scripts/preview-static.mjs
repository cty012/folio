import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve('out');
if (!fs.existsSync(path.join(root, 'index.html'))) throw new Error('Run npm run build:static first.');
const types = { '.html':'text/html; charset=utf-8', '.js':'text/javascript', '.css':'text/css', '.json':'application/json', '.txt':'text/plain', '.png':'image/png', '.ico':'image/x-icon', '.woff2':'font/woff2' };
http.createServer((req, res) => {
  try {
    let file = path.resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname));
    if (file !== root && !file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
      res.writeHead(404, { 'Content-Type':'text/html; charset=utf-8' });
      res.end(fs.readFileSync(path.join(root, '404.html'))); return;
    }
    res.writeHead(200, { 'Content-Type':types[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  } catch { res.writeHead(400).end('Invalid request'); }
}).listen(Number(process.env.PORT || 4173), '127.0.0.1', () => {
  console.log(`Static reader: http://127.0.0.1:${process.env.PORT || 4173}`);
});
