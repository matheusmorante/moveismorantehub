const fs = require('fs');
const path = require('path');

const BASE_DIR = path.resolve(__dirname, '../src/pages/App/SalesOrder');
const HOOKS_DIR = path.join(BASE_DIR, 'hooks');
const PAGES_DIR = path.join(BASE_DIR, 'pages');
const TESTS_DIR = path.join(BASE_DIR, '__tests__');

if (!fs.existsSync(PAGES_DIR)) fs.mkdirSync(PAGES_DIR, { recursive: true });
if (!fs.existsSync(TESTS_DIR)) fs.mkdirSync(TESTS_DIR, { recursive: true });

// 1. useSalesOrderForm.ts -> hooks/
const hookSrc = path.join(BASE_DIR, 'useSalesOrderForm.ts');
const hookDest = path.join(HOOKS_DIR, 'useSalesOrderForm.ts');
if (fs.existsSync(hookSrc)) {
    let hookContent = fs.readFileSync(hookSrc, 'utf-8');
    // Ajustar caminhos relativos
    hookContent = hookContent.replace(/from\s+['"]\.\/hooks\/([^'"]+)['"]/g, "from './$1'");
    hookContent = hookContent.replace(/from\s+['"]\.\/components\/([^'"]+)['"]/g, "from '../components/$1'");
    hookContent = hookContent.replace(/from\s+['"]\.\/modals\/([^'"]+)['"]/g, "from '../modals/$1'");
    hookContent = hookContent.replace(/from\s+['"]\.\/([^'"]+)['"]/g, "from '../$1'");
    fs.writeFileSync(hookDest, hookContent, 'utf-8');
    fs.writeFileSync(hookSrc, `// Re-export para retrocompatibilidade arquitetural (Skill: organizacao-arquivos-diretorios)\nexport * from './hooks/useSalesOrderForm';\nexport { default } from './hooks/useSalesOrderForm';\n`, 'utf-8');
    console.log('Migrado: hooks/useSalesOrderForm.ts');
}

// 2. FiscalDocumentsPage.tsx e NewSaleOrder.tsx -> pages/
for (const pageName of ['FiscalDocumentsPage.tsx', 'NewSaleOrder.tsx']) {
    const pSrc = path.join(BASE_DIR, pageName);
    const pDest = path.join(PAGES_DIR, pageName);
    if (fs.existsSync(pSrc)) {
        let pContent = fs.readFileSync(pSrc, 'utf-8');
        pContent = pContent.replace(/from\s+['"]\.\/([^'"]+)['"]/g, "from '../$1'");
        fs.writeFileSync(pDest, pContent, 'utf-8');
        const baseName = pageName.replace(/\.tsx$/, '');
        fs.writeFileSync(pSrc, `// Re-export para retrocompatibilidade arquitetural (Skill: organizacao-arquivos-diretorios)\nexport * from './pages/${baseName}';\nexport { default } from './pages/${baseName}';\n`, 'utf-8');
        console.log(`Migrado: pages/${pageName}`);
    }
}

// 3. salesOrderHandlingPersistence.test.ts -> __tests__/
const testSrc = path.join(BASE_DIR, 'salesOrderHandlingPersistence.test.ts');
const testDest = path.join(TESTS_DIR, 'salesOrderHandlingPersistence.test.ts');
if (fs.existsSync(testSrc)) {
    let tContent = fs.readFileSync(testSrc, 'utf-8');
    tContent = tContent.replace(/from\s+['"]\.\/([^'"]+)['"]/g, "from '../$1'");
    fs.writeFileSync(testDest, tContent, 'utf-8');
    fs.unlinkSync(testSrc);
    console.log('Migrado: __tests__/salesOrderHandlingPersistence.test.ts');
}

console.log('--- Migração de hooks, pages e tests de SalesOrder concluída! ---');
