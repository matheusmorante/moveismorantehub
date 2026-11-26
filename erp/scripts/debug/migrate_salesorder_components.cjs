const fs = require('fs');
const path = require('path');

const BASE_DIR = path.resolve(__dirname, '../src/pages/App/SalesOrder');
const COMPONENTS_DIR = path.join(BASE_DIR, 'components');

if (!fs.existsSync(COMPONENTS_DIR)) {
    fs.mkdirSync(COMPONENTS_DIR, { recursive: true });
}

const COMPONENT_FILES = [
    'AddressVerificationMap.tsx',
    'OrderRouteMap.tsx',
    'CustomerData.tsx',
    'ShippingData.tsx',
    'Seller.tsx',
    'OrderStatusTimeline.tsx',
    'OrderStepper.tsx',
    'PaymentSimulator.tsx',
    'ReturnItemsTable.tsx',
    'ReturnFormTabs.tsx',
    'ProductReconciliationItems.tsx',
    'BudgetDropdown.tsx',
    'NewOrderDropdown.tsx',
    'ToggleValueTypeBtn.tsx',
    'PdvTabs.tsx',
    'FormHeader.tsx',
    'FormFooter.tsx',
    'SalesOrderFormSection.tsx',
    'OrderFilters.tsx',
];

console.log('--- Iniciando migração segura de componentes de SalesOrder para components/ ---');

for (const fileName of COMPONENT_FILES) {
    const srcPath = path.join(BASE_DIR, fileName);
    const destPath = path.join(COMPONENTS_DIR, fileName);

    if (!fs.existsSync(srcPath)) {
        console.warn(`Arquivo fonte não encontrado: ${fileName}`);
        continue;
    }

    let content = fs.readFileSync(srcPath, 'utf-8');

    // Ajustar imports relativos que apontavam para o mesmo nível (./) para subir um nível (../)
    // Atenção: se o import já apontava para './components/X', de dentro de components/ agora ele aponta para './X'
    content = content.replace(/from\s+['"]\.\/components\/([^'"]+)['"]/g, (match, p1) => {
        return `from './${p1}'`;
    });

    content = content.replace(/from\s+['"]\.\/([^'"]+)['"]/g, (match, p1) => {
        return `from '../${p1}'`;
    });

    fs.writeFileSync(destPath, content, 'utf-8');
    console.log(`Copiado e ajustado: components/${fileName}`);

    // Criar barrel proxy no caminho original para retrocompatibilidade total
    const baseName = fileName.replace(/\.tsx$/, '');
    const proxyContent = `// Re-export para retrocompatibilidade arquitetural (Skill: organizacao-arquivos-diretorios)
export * from './components/${baseName}';
export { default } from './components/${baseName}';
`;
    fs.writeFileSync(srcPath, proxyContent, 'utf-8');
    console.log(`Barrel proxy criado: ${fileName}`);
}

console.log('--- Migração de componentes concluída com sucesso! ---');
