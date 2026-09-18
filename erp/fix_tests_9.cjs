econst fs = require('fs');
let content = fs.readFileSync('tests/e2e/products/products-variations-e2e.spec.ts', 'utf8');

const oldL = `await expect(tableRows).toHaveCount(1);`;
const newL = `console.log(await page.evaluate(() => document.body.innerHTML.substring(0, 3000)));
        await expect(tableRows).toHaveCount(1);`;

content = content.replace(oldL, newL);
fs.writeFileSync('tests/e2e/products/products-variations-e2e.spec.ts', content);
