import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';

const files = new Map([
  ['/tactics/p00-probe/probe.html', new URL('probe.html', import.meta.url)],
  ['/integration-test/tactics-p00-harness.html', new URL('../../integration-test/tactics-p00-harness.html', import.meta.url)],
]);
const port = Number(process.argv[2] ?? 8123);
const server = createServer(async (request, response) => {
  const file = files.get(request.url);
  const status = request.method === 'GET' && file ? 200 : 404;
  response.writeHead(status, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
  response.end(status === 200 ? await readFile(file) : 'Not found');
  console.log(`${new Date().toISOString()} ${request.method} ${JSON.stringify(request.url)} ${status}`);
});
server.listen(port, '127.0.0.1', () => console.log(`P00 listening on http://127.0.0.1:${server.address().port}`));
