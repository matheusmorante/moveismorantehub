const https = require('https');

https.get('https://www.moveismorante.com.br/api/mcp', (res) => {
  console.log('status:', res.statusCode);
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log('body:', data.substring(0, 200)));
}).on('error', (e) => console.log('error:', e.message));
