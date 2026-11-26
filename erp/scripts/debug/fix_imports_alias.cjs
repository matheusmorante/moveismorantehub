const fs = require('fs');
const path = require('path');

const TARGET_DIRS = [
    path.resolve(__dirname, '../src/pages/App/SalesOrder/modals'),
    path.resolve(__dirname, '../src/pages/App/SalesOrder/components'),
    path.resolve(__dirname, '../src/pages/App/SalesOrder/pages'),
    path.resolve(__dirname, '../src/pages/App/SalesOrder/hooks'),
    path.resolve(__dirname, '../src/pages/App/Settings/components/fiscal'),
    path.resolve(__dirname, '../src/pages/App/Settings/components/integrations'),
    path.resolve(__dirname, '../src/pages/App/Settings/components/ai'),
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

        // Converter qualquer cadeia de ../ para utils em @/pages/utils/
        if (/from\s+['"](\.\.\/)+utils\/([^'"]+)['"]/g.test(content)) {
            content = content.replace(/from\s+['"](\.\.\/)+utils\/([^'"]+)['"]/g, "from '@/pages/utils/$2'");
            modified = true;
        }

        // Converter qualquer cadeia de ../ para types em @/pages/types/
        if (/from\s+['"](\.\.\/)+types\/([^'"]+)['"]/g.test(content)) {
            content = content.replace(/from\s+['"](\.\.\/)+types\/([^'"]+)['"]/g, "from '@/pages/types/$2'");
            modified = true;
        }

        // Se importar SettingsSidebar ou SettingsSection de dentro de subpasta de Settings
        if (/from\s+['"]\.\.\/SettingsSidebar['"]/g.test(content)) {
            content = content.replace(/from\s+['"]\.\.\/SettingsSidebar['"]/g, "from '../SettingsSidebar'");
        }
        if (/from\s+['"]\.\.\/SettingsSection['"]/g.test(content)) {
            content = content.replace(/from\s+['"]\.\.\/SettingsSection['"]/g, "from '../SettingsSection'");
        }
        if (/from\s+['"]\.\.\/SaveButton['"]/g.test(content)) {
            content = content.replace(/from\s+['"]\.\.\/SaveButton['"]/g, "from '../SaveButton'");
        }

        if (modified) {
            fs.writeFileSync(fullPath, content, 'utf-8');
            console.log(`Globalmente normalizado: ${file}`);
        }
    }
}
console.log('--- Concluído fix global de utils e types ---');
