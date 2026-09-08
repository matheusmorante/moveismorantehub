const https = require('https');

https.get('https://moveismorante.com.br/api/mcp', (res) => {
  console.log('status:', res.statusCode);
  console.log('location:', res.headers.location);
});
