const http = require('https');

http.get('https://pub-389127050a434f568c29dc66bdce2567.r2.dev/1784942052774-1784942052774.jpg', (res) => {
  console.log('Status Code:', res.statusCode);
  console.log('Headers:', res.headers);
}).on('error', (e) => {
  console.error('Error:', e);
});
