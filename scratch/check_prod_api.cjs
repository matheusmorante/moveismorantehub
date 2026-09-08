const https = require('https');

function check(url) {
  return new Promise((resolve) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({ url, status: res.statusCode, body: data.substring(0, 100) });
      });
    }).on('error', (err) => {
      resolve({ url, error: err.message });
    });
  });
}

async function run() {
  const r1 = await check('https://moveismorante.com.br/api/mcp');
  console.log('r1:', r1);
  const r2 = await check('https://moveismorante.com.br/health');
  console.log('r2:', r2);
}

run();
