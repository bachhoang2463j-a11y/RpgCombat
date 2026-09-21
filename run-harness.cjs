const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const PORT = 8124;
const PROJECT_ROOT = path.resolve(__dirname, '..');
const HARNESS_URL = `http://127.0.0.1:${PORT}/RpgCombat/integration-test/harness.html`;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.cjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm'
};

function checkServerAlive(port) {
  return new Promise((resolve) => {
    const req = http.get(`http://127.0.0.1:${port}/`, (res) => {
      resolve(true);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(800, () => {
      req.destroy();
      resolve(false);
    });
  });
}

function startStaticServer() {
  const server = http.createServer((req, res) => {
    let reqPath = decodeURIComponent(req.url.split('?')[0]);
    let safePath = path.normalize(path.join(PROJECT_ROOT, reqPath));
    if (!safePath.startsWith(PROJECT_ROOT)) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }
    if (fs.existsSync(safePath) && fs.statSync(safePath).isDirectory()) {
      safePath = path.join(safePath, 'index.html');
    }
    if (!fs.existsSync(safePath) || !fs.statSync(safePath).isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not Found');
      return;
    }
    const ext = path.extname(safePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, {
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*'
    });
    fs.createReadStream(safePath).pipe(res);
  });

  server.listen(PORT, '127.0.0.1', () => {
    console.log(`[静态服务] 已在后台启动服务: http://127.0.0.1:${PORT}`);
    openBrowser();
  });
}

function openBrowser() {
  console.log(`[浏览器] 正在打开集成测试页面: ${HARNESS_URL}`);
  const cmd = process.platform === 'win32' ? `start "" "${HARNESS_URL}"` : `open "${HARNESS_URL}"`;
  exec(cmd);
}

async function main() {
  const isAlive = await checkServerAlive(PORT);
  if (isAlive) {
    console.log(`[静态服务] 检测到本地 ${PORT} 端口服务已在运行`);
    openBrowser();
  } else {
    console.log(`[静态服务] 正在启动本地测试服务器 (端口 ${PORT})...`);
    startStaticServer();
  }
}

main();
