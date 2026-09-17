import fs from 'fs';
import path from 'path';

const SRC_DIR = 'c:/Users/mathe/OneDrive/Área de Trabalho/projetos/morantehub/erp/src';

const replacements = [
    {
        file: 'pages/utils/orderSyncQueries.ts',
        replacements: [
            { from: 'pageSize: number = 30,', to: 'pageSize: number = 15,' }
        ]
    },
    {
        file: 'pages/utils/inboundNfe/services/inboundQueriesService.ts',
        replacements: [
            { from: 'const pageSize = options?.pageSize ?? 30;', to: 'const pageSize = options?.pageSize ?? 15;' }
        ]
    },
    {
        file: 'pages/utils/inboundNfe/services/inboundInvoicesQueryService.ts',
        replacements: [
            { from: 'const pageSize = options?.pageSize ?? 30;', to: 'const pageSize = options?.pageSize ?? 15;' }
        ]
    },
    {
        file: 'pages/utils/goodsReceiptService/goodsReceiptQueryService.ts',
        replacements: [
            { from: 'const pageSize = options?.pageSize ?? 30;', to: 'const pageSize = options?.pageSize ?? 15;' }
        ]
    },
    {
        file: 'pages/App/SalesOrder/OrderHistoryList/useOrderHistory.ts',
        replacements: [
            { from: 'const PAGE_SIZE = 30;', to: 'const PAGE_SIZE = 15;' }
        ]
    },
    {
        file: 'pages/App/Stock/InboundInvoices/components/InboundInvoicesPagination.tsx',
        replacements: [
            { from: 'itemsPerPage = 30,', to: 'itemsPerPage = 15,' }
        ]
    },
    {
        file: 'pages/App/SalesOrder/OrderHistoryList/OrderPagination.tsx',
        replacements: [
            { from: 'itemsPerPage = 30,', to: 'itemsPerPage = 15,' }
        ]
    },
    {
        file: 'pages/App/Stock/InboundInvoices/Index.tsx',
        replacements: [
            { from: 'pageSize: 30,', to: 'pageSize: 15,' }
        ]
    },
    {
        file: 'pages/App/Stock/LabelPrinting/Index.tsx',
        replacements: [
            { from: 'const ITEMS_PER_PAGE = 50;', to: 'const ITEMS_PER_PAGE = 15;' }
        ]
    },
    {
        file: 'pages/App/Products/ProductList/hooks/useProducts.ts',
        replacements: [
            { from: 'const [itemsPerPage, setItemsPerPage] = useState(30);', to: 'const [itemsPerPage, setItemsPerPage] = useState(15);' }
        ]
    },
    {
        file: 'pages/App/Registrations/shared/usePeople.ts',
        replacements: [
            { from: 'const [itemsPerPage, setItemsPerPage] = useState(10);', to: 'const [itemsPerPage, setItemsPerPage] = useState(15);' }
        ]
    },
    {
        file: 'pages/App/Stock/Receipts/modals/PurchaseReceiptPickerModal.tsx',
        replacements: [
            { from: 'const ITEMS_PER_PAGE = 10;', to: 'const ITEMS_PER_PAGE = 15;' }
        ]
    },
    {
        file: 'pages/App/Products/ProductList/index.tsx',
        replacements: [
            { 
                from: '{(isServerPagination ? [10, 20, 30, 50, 100] : [10, 25, 50, 100, 300, 500, 1000]).map(size => <option key={size} value={size}>{size} por página</option>)}', 
                to: '{(isServerPagination ? [10, 15] : [10, 15]).map(size => <option key={size} value={size}>{size} por página</option>)}' 
            }
        ]
    }
];

function runReplacements() {
    for (const r of replacements) {
        const fullPath = path.join(SRC_DIR, r.file);
        if (!fs.existsSync(fullPath)) {
            console.error(`File not found: ${fullPath}`);
            continue;
        }

        let content = fs.readFileSync(fullPath, 'utf-8');
        let modified = false;

        for (const repl of r.replacements) {
            if (content.includes(repl.from)) {
                content = content.replace(repl.from, repl.to);
                modified = true;
            } else {
                console.warn(`Could not find "${repl.from}" in ${r.file}`);
            }
        }

        if (modified) {
            fs.writeFileSync(fullPath, content, 'utf-8');
            console.log(`Updated ${r.file}`);
        }
    }
}

runReplacements();
