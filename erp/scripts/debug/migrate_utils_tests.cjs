const fs = require('fs');
const path = require('path');

const BASE_DIR = path.resolve(__dirname, '../src/pages/utils');
const TESTS_DIR = path.join(BASE_DIR, '__tests__');

if (!fs.existsSync(TESTS_DIR)) {
    fs.mkdirSync(TESTS_DIR, { recursive: true });
}

const TEST_FILES = [
    'asyncConversationOrdering.test.ts',
    'categoryResolutionService.test.ts',
    'customerSearch.test.ts',
    'duplicateOrder.test.ts',
    'fiscalDocumentRule.test.ts',
    'goodsReceiptCostCalculation.test.ts',
    'imageFetchCandidates.test.ts',
    'mapsAddressParsing.test.ts',
    'movingAverageCostRules.test.ts',
    'nfeAccessKey.test.ts',
    'orderChangeDetector.test.ts',
    'orderDeletionRules.test.ts',
    'orderMapper.test.ts',
    'paymentMethodRules.test.ts',
    'productPricing.test.ts',
    'returnInventoryRules.test.ts',
    'saleInventoryRules.test.ts',
    'scheduleOrderVisibility.test.ts',
    'stockLaunchRules.test.ts',
    'continuousMicAutoSend.test.ts',
];

console.log('--- Migrando testes soltos de utils para utils/__tests__/ ---');

for (const fileName of TEST_FILES) {
    const srcPath = path.join(BASE_DIR, fileName);
    const destPath = path.join(TESTS_DIR, fileName);

    if (!fs.existsSync(srcPath)) {
        console.warn(`Arquivo de teste não encontrado: ${fileName}`);
        continue;
    }

    let content = fs.readFileSync(srcPath, 'utf-8');

    // Ajustar imports relativos que apontavam para o mesmo nível (./) para subir um nível (../)
    content = content.replace(/from\s+['"]\.\/([^'"]+)['"]/g, "from '../$1'");
    // Caso houvesse import com ../ vira ../../
    // Mas não tocar em imports que começam com @/
    
    fs.writeFileSync(destPath, content, 'utf-8');
    fs.unlinkSync(srcPath);
    console.log(`Movido: __tests__/${fileName}`);
}

console.log('--- Migração de testes concluída! ---');
