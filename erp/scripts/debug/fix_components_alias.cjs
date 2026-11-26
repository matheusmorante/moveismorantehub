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

        // Converter qualquer cadeia de ../ para components da raiz em @/components/
        // Atenção: se o import for '../components/...' dentro de SalesOrder/components, isso é referência circular!
        // Dentro de SalesOrder/components, para importar outro componente de SalesOrder, é './<Nome>'!
        if (dir.endsWith('components')) {
            content = content.replace(/from\s+['"]\.\.\/components\/([^'"]+)['"]/g, (match, p1) => {
                modified = true;
                return `from './${p1}'`;
            });
        }

        // Se importar componente global da raiz src/components
        // Ex.: from '../../../components/ProductAutocomplete'
        content = content.replace(/from\s+['"](\.\.\/){3,}components\/([^'"]+)['"]/g, (match, p1, p2) => {
            modified = true;
            return `from '@/components/${p2}'`;
        });

        if (modified) {
            fs.writeFileSync(fullPath, content, 'utf-8');
            console.log(`Normalizado root components: ${file}`);
        }
    }
}
