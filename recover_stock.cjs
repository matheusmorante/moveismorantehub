const fs = require('fs');
const path = require('path');

const basePath = path.join(__dirname, 'mobile', 'src', 'features', 'stock');

// Create domain directories
const domains = ['overview', 'inventory', 'invoices', 'moves', 'purchases', 'receipts', 'suppliers'];
domains.forEach(d => {
    const dir = path.join(basePath, d);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Recover misnamed files in screens/
const recoverScreens = {
    'inventory': 'InventoryScreen.tsx',
    'invoices': 'InvoicesScreen.tsx',
    'moves': 'StockMovesScreen.tsx',
    'overview': 'NativeStockScreen.tsx',
    'purchases': 'PurchasesScreen.tsx',
    'receipts': 'ReceiptsScreen.tsx',
    'suppliers': 'SuppliersScreen.tsx',
    'InventoryScannerScreen.tsx': 'InventoryScannerScreen.tsx' // Intact
};

const screensPath = path.join(basePath, 'screens');
if (fs.existsSync(screensPath)) {
    const files = fs.readdirSync(screensPath);
    files.forEach(f => {
        if (recoverScreens[f]) {
            const destDomain = f === 'InventoryScannerScreen.tsx' ? 'inventory' : (f === 'overview' ? 'overview' : (f === 'suppliers' ? 'suppliers' : f));
            const realName = recoverScreens[f];
            fs.renameSync(path.join(screensPath, f), path.join(basePath, destDomain, realName));
        }
    });
}

// Recover misnamed files in basePath
const recoverRoot = {
    'inventory': { name: 'InventoryCountScreen.tsx', domain: 'inventory' },
    'invoices': { name: 'InvoiceCard.tsx', domain: 'invoices' },
    'moves': { name: 'StockMoveCard.tsx', domain: 'moves' },
    'overview': { name: 'StockSummaryScreen.tsx', domain: 'overview' },
    'purchases': { name: 'PurchaseOrderCard.tsx', domain: 'purchases' },
    'receipts': { name: 'ReceiptCheckScreen.tsx', domain: 'receipts' }
};

const rootFiles = fs.readdirSync(basePath);
rootFiles.forEach(f => {
    if (recoverRoot[f]) {
        const info = recoverRoot[f];
        // Ensure we are dealing with a file, not the newly created directory (which we created above)
        // Wait! We created directories above. If 'inventory' directory exists, it would have conflicted with 'inventory' file?
        // Actually, mkdirSync would fail if 'inventory' file exists. Let's handle this carefully.
    }
});
