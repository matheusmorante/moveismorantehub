const http = require('node:http');
const path = require('node:path');
const fs = require('node:fs');
const dotenv = require('dotenv');

const projectRoot = path.resolve(__dirname, '..');
const erpEnvPath = path.join(projectRoot, 'erp/.env.local');
if (fs.existsSync(erpEnvPath)) {
  const env = dotenv.parse(fs.readFileSync(erpEnvPath));
  for (const [k, v] of Object.entries(env)) {
    if (!process.env[k]) process.env[k] = v;
  }
}

const serverNfeDir = path.join(projectRoot, 'erp/server/nfe');
const handlers = new Map();

function getHandler(routeName) {
  if (!/^[a-z][a-z0-9-]*$/.test(routeName)) return null;
  const filePath = routeName === 'test-artifact-operator'
    ? path.join(projectRoot, 'erp/server/testing/test-artifact-operator.cjs')
    : path.join(serverNfeDir, `${routeName}.cjs`);
  if (fs.existsSync(filePath)) {
    try {
      delete require.cache[require.resolve(filePath)];
      const mod = require(filePath);
      return mod.default || mod;
    } catch (err) {
      console.error(`[local-fiscal-dev-server] Erro ao carregar handler ${routeName}:`, err);
      return null;
    }
  }
  return null;
}

const PORT = Number(process.env.PORT || 3000);

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url || '/', `http://${req.headers.host || '127.0.0.1:3000'}`);
  const pathname = url.pathname;

  if (pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', time: new Date().toISOString() }));
    return;
  }

  let routeName = null;
  if (pathname === '/api/testing/test-artifact-operator') {
    routeName = 'test-artifact-operator';
  } else if (pathname.startsWith('/api/nfe/')) {
    const rawRoute = pathname.slice('/api/nfe/'.length);
    if (rawRoute === 'operations' || rawRoute === 'auxiliary') {
      routeName = url.searchParams.get('operation');
    } else {
      routeName = rawRoute;
    }
  }

  const handler = routeName ? getHandler(routeName) : null;
  if (!handler) {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: false, error: `Rota não encontrada: ${pathname}` }));
    return;
  }

  let rawBody = '';
  req.on('data', (chunk) => {
    rawBody += chunk;
  });

  req.on('end', async () => {
    let parsedBody = {};
    if (rawBody.trim()) {
      try {
        parsedBody = JSON.parse(rawBody);
      } catch {
        parsedBody = rawBody;
      }
    }

    const query = Object.fromEntries(url.searchParams.entries());
    const vercelReq = Object.assign(req, {
      url: req.url,
      method: req.method,
      headers: req.headers,
      query,
      body: parsedBody,
      cookies: {},
    });

    const vercelRes = Object.assign(res, {
      status(code) {
        res.statusCode = code;
        return vercelRes;
      },
      json(data) {
        if (!res.headersSent) {
          res.setHeader('Content-Type', 'application/json');
          res.writeHead(res.statusCode || 200);
        }
        res.end(JSON.stringify(data));
        return vercelRes;
      },
      send(data) {
        if (!res.headersSent) {
          res.writeHead(res.statusCode || 200);
        }
        res.end(data);
        return vercelRes;
      },
    });

    try {
      console.log(`[local-fiscal-dev-server] ${req.method} ${pathname}`);
      await handler(vercelReq, vercelRes);
      console.log(`[local-fiscal-dev-server] ${req.method} ${pathname} -> ${res.statusCode || 200}`);
    } catch (err) {
      console.error(`[local-fiscal-dev-server] ERROR on ${pathname}:`, err);
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    }
  });
});

function start(port = PORT) {
  return new Promise((resolve) => {
    server.listen(port, '127.0.0.1', () => {
      console.log(`[local-fiscal-dev-server] Servidor fiscal local ativo em http://127.0.0.1:${port}`);
      resolve(server);
    });
  });
}

if (require.main === module) {
  start();
}

module.exports = { server, start };
