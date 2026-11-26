const fs = require('fs');
const path = require('path');

const TARGET_DIRS = [
    path.resolve(__dirname, '../src/pages/App/Settings/components/ai'),
    path.resolve(__dirname, '../src/pages/App/Settings/components/fiscal'),
    path.resolve(__dirname, '../src/pages/App/Settings/components/integrations'),
    path.resolve(__dirname, '../src/pages/App/Settings/components/operations'),
    path.resolve(__dirname, '../src/pages/App/Settings/components/general'),
];

for (const dir of TARGET_DIRS) {
    if (!fs.existsSync(dir)) continue;
    const files = fs.readdirSync(dir).filter(f => /\.(tsx|ts)$/.test(f));
    for (const file of files) {
        const fullPath = path.join(dir, file);
        let content = fs.readFileSync(fullPath, 'utf-8');
        let modified = false;

        // Converter imports de services para @/services/
        if (/from\s+['"](\.\.\/)+services\/([^'"]+)['"]/g.test(content)) {
            content = content.replace(/from\s+['"](\.\.\/)+services\/([^'"]+)['"]/g, "from '@/services/$2'");
            modified = true;
        }

        if (modified) {
            fs.writeFileSync(fullPath, content, 'utf-8');
            console.log(`Normalizado services: ${file}`);
        }
    }
}
