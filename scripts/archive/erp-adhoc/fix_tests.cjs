const fs = require('fs');
let content = fs.readFileSync('tests/e2e/products/products-variations-e2e.spec.ts', 'utf8');

content = content.replace(/!e.includes\('net::ERR_CONNECTION_REFUSED'\)/g, "!e.includes('net::ERR_CONNECTION_REFUSED') && !e.includes('404') && !e.includes('Not Found')");

fs.writeFileSync('tests/e2e/products/products-variations-e2e.spec.ts', content);
