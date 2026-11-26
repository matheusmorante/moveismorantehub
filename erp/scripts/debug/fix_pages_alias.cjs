const fs = require('fs');
const path = require('path');

const TARGET_DIRS = [
    path.resolve(__dirname, '../src/pages/App/SalesOrder/modals'),
    path.resolve(__dirname, '../src/pages/App/SalesOrder/components'),
    path.resolve(__dirname, '../src/pages/App/SalesOrder/pages'),
    path.resolve(__dirname, '../src/pages/App/SalesOrder/hooks'),
];

for (const dir of TARGET_DIRS) {
    if (!fs.existsSync(dir)) continue;
    const files = fs.readdirSync(dir).filter(f => /\.(tsx|ts)$/.test(f));
    for (const file of files) {
        const fullPath = path.join(dir, file);
        let content = fs.readFileSync(fullPath, 'utf-8');
        let modified = false;

        if (/from\s+['"](\.\.\/)+pages\/([^'"]+)['"]/g.test(content)) {
            content = content.replace(/from\s+['"](\.\.\/)+pages\/([^'"]+)['"]/g, "from '@/pages/$2'");
            modified = true;
        }

        if (modified) {
            fs.writeFileSync(fullPath, content, 'utf-8');
            console.log(`Normalizado alias @/pages: ${file}`);
        }
    }
}
