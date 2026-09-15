const fs = require('fs');
const path = require('path');

const BASE_DIR = path.resolve(__dirname, '../src/pages/App/SalesOrder');
const MODALS_DIR = path.join(BASE_DIR, 'modals');

if (!fs.existsSync(MODALS_DIR)) {
    fs.mkdirSync(MODALS_DIR, { recursive: true });
}

const MODAL_FILES = [
    'CustomerSearchModal.tsx',
    'SellerSearchModal.tsx',
    'EmployeeSearchModal.tsx',
    'ProductSearchModal.tsx',
    'AssistanceOrderModal.tsx',
    'OrderEditModal.tsx',
    'OrderSelectionModal.tsx',
    'ItemMovementChangeConfirmModal.tsx',
    'UnlinkedReturnOrderModal.tsx',
];

console.log('--- Iniciando migração segura de modais de SalesOrder ---');

for (const fileName of MODAL_FILES) {
    const srcPath = path.join(BASE_DIR, fileName);
    const destPath = path.join(MODALS_DIR, fileName);

    if (!fs.existsSync(srcPath)) {
        console.warn(`Arquivo fonte não encontrado: ${fileName}`);
        continue;
    }

    let content = fs.readFileSync(srcPath, 'utf-8');

    // Ajustar imports relativos que apontavam para o mesmo nível (./) para subir um nível (../)
    // Ex.: from './components/...' -> from '../components/...'
    // Ex.: from './AssistanceOrderModalComponents/...' -> from '../AssistanceOrderModalComponents/...'
    // Mas não alterar imports que usam alias como @/
    content = content.replace(/from\s+['"]\.\/([^'"]+)['"]/g, (match, p1) => {
        return `from '../${p1}'`;
    });

    fs.writeFileSync(destPath, content, 'utf-8');
    console.log(`Copiado e ajustado: modals/${fileName}`);

    // Criar barrel proxy no caminho original para retrocompatibilidade total
    const baseName = fileName.replace(/\.tsx$/, '');
    const proxyContent = `// Re-export para retrocompatibilidade arquitetural (Skill: organizacao-arquivos-diretorios)
export * from './modals/${baseName}';
export { default } from './modals/${baseName}';
`;
    fs.writeFileSync(srcPath, proxyContent, 'utf-8');
    console.log(`Barrel proxy criado: ${fileName}`);
}

console.log('--- Migração de modais concluída com sucesso! ---');
