import http from 'node:http';
import handler from './dist-dfe.js';

const PORT = Number(process.env.SEFAZ_BRIDGE_PORT || process.env.MCP_PORT || 3334);

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS,GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

  if (url.pathname === '/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', service: 'sefaz-node-bridge' }));
    return;
  }

  if (req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
    });
    req.on('end', async () => {
      try {
        const parsedBody = body ? JSON.parse(body) : {};
        const mockReq: any = {
          method: 'POST',
          headers: req.headers,
          body: parsedBody,
        };
        const mockRes: any = {
          setHeader: (k: string, v: string) => res.setHeader(k, v),
          status: (code: number) => {
            res.statusCode = code;
            return mockRes;
          },
          json: (data: any) => {
            res.writeHead(res.statusCode || 200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(data));
          },
          end: () => res.end(),
        };

        await handler(mockReq, mockRes);
      } catch (err: any) {
        if (!res.headersSent) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'INTERNAL_ERROR', message: err.message }));
        }
      }
    });
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'NOT_FOUND' }));
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[SEFAZ Bridge] Serviço Node.js mTLS rodando na porta ${PORT}`);
});

export default server;
