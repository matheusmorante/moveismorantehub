const http = require('http');

async function testWithCurrentNsu() {
  const MASTER_TOKEN = 'morante_mcp_master_8b4e2a9d6c1f3e5a7b0d2c4e';
  const PORT = 3336;

  const distDfeModule = await import('../api/nfe/dist-dfe.ts');
  const distDfeHandler = distDfeModule.default;

  const testServer = http.createServer(async (req, res) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      const mockReq = { method: req.method, headers: req.headers, body: body ? JSON.parse(body) : {} };
      const mockRes = {
        setHeader: (k, v) => res.setHeader(k, v),
        status: (code) => { res.statusCode = code; return mockRes; },
        json: (data) => {
          res.writeHead(res.statusCode || 200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(data));
        },
        end: () => res.end(),
      };
      await distDfeHandler(mockReq, mockRes);
    });
  });

  await new Promise((r) => testServer.listen(PORT, '127.0.0.1', r));

  try {
    const res = await fetch(`http://127.0.0.1:${PORT}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MASTER_TOKEN}`,
      },
      body: JSON.stringify({
        cleanCnpj: '44512248000107',
        ultNsu: '000000000000050',
        tpAmb: '1',
      }),
    });

    const data = await res.json();
    console.log('STATUS:', res.status);
    console.log('SEFAZ XML:');
    console.log(data.responseXml);
  } finally {
    testServer.close();
  }
}

testWithCurrentNsu().catch(console.error);
