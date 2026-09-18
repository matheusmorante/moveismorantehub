const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing SUPABASE credentials in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const TEST_PATTERNS = ['TEST_AUT', 'TESTE_HUB', 'TESTE_AUT', '[TESTE'];

async function fetchAll(table) {
    let allData = [];
    let from = 0;
    const size = 1000;
    while (true) {
        const { data, error } = await supabase.from(table).select('*').range(from, from + size - 1);
        if (error) {
            console.error(`Error fetching ${table}:`, error.message);
            break;
        }
        allData = allData.concat(data || []);
        if (!data || data.length < size) break;
        from += size;
    }
    return allData;
}

function isTestRecord(row) {
    const stringified = JSON.stringify(row);
    return TEST_PATTERNS.some(pattern => stringified.includes(pattern));
}

async function bulkDelete(table, ids) {
    if (ids.length === 0) return;
    
    // Chunking deletions due to URL length limits in REST api
    const chunkSize = 100;
    for (let i = 0; i < ids.length; i += chunkSize) {
        const chunk = ids.slice(i, i + chunkSize);
        const { error } = await supabase.from(table).delete().in('id', chunk);
        if (error) {
            console.error(`Error deleting from ${table}:`, error.message);
        } else {
            console.log(`Deleted ${chunk.length} rows from ${table}`);
        }
    }
}

async function run() {
    console.log("Starting test data cleanup...");
    
    // 1. Fetch all data
    const people = await fetchAll('people');
    const products = await fetchAll('products');
    const productVariations = await fetchAll('product_variations');
    const orders = await fetchAll('orders');
    const purchases = await fetchAll('purchases');
    const goodsReceipts = await fetchAll('goods_receipts');
    const inboundInvoices = await fetchAll('inbound_invoices');
    const financialTransactions = await fetchAll('financial_transactions');
    
    // Relationships (need to fetch items to delete them if their parent is a test)
    const orderItems = await fetchAll('order_items');
    const orderPayments = await fetchAll('order_payments');
    const purchaseItems = await fetchAll('purchase_items');
    const receiptItems = await fetchAll('goods_receipt_items');
    const invoiceItems = await fetchAll('inbound_invoice_items');

    // 2. Identify Test Entities
    const testPeopleIds = people.filter(isTestRecord).map(r => r.id);
    const testProductIds = products.filter(isTestRecord).map(r => r.id);
    const testOrderIds = orders.filter(isTestRecord).map(r => r.id);
    const testPurchaseIds = purchases.filter(isTestRecord).map(r => r.id);
    const testReceiptIds = goodsReceipts.filter(isTestRecord).map(r => r.id);
    const testInvoiceIds = inboundInvoices.filter(isTestRecord).map(r => r.id);
    const testTransactionIds = financialTransactions.filter(isTestRecord).map(r => r.id);
    
    // Variations: explicitly marked OR belong to a test product
    const testVariationIds = productVariations.filter(v => isTestRecord(v) || testProductIds.includes(v.product_id)).map(r => r.id);
    
    // 3. Find auxiliary items belonging to test parents
    const testOrderItemsIds = orderItems.filter(i => testOrderIds.includes(i.order_id) || isTestRecord(i)).map(r => r.id);
    const testOrderPaymentsIds = orderPayments.filter(p => testOrderIds.includes(p.order_id) || isTestRecord(p)).map(r => r.id);
    const testPurchaseItemsIds = purchaseItems.filter(i => testPurchaseIds.includes(i.purchase_id) || isTestRecord(i)).map(r => r.id);
    const testReceiptItemsIds = receiptItems.filter(i => testReceiptIds.includes(i.receipt_id) || isTestRecord(i)).map(r => r.id);
    const testInvoiceItemsIds = invoiceItems.filter(i => testInvoiceIds.includes(i.invoice_id) || isTestRecord(i)).map(r => r.id);

    console.log(`Found Test Entities to delete:`);
    console.log(`People: ${testPeopleIds.length}`);
    console.log(`Products: ${testProductIds.length}`);
    console.log(`Variations: ${testVariationIds.length}`);
    console.log(`Orders: ${testOrderIds.length}`);
    console.log(`Order Items: ${testOrderItemsIds.length}`);
    console.log(`Order Payments: ${testOrderPaymentsIds.length}`);
    console.log(`Purchases: ${testPurchaseIds.length}`);
    console.log(`Purchase Items: ${testPurchaseItemsIds.length}`);
    console.log(`Goods Receipts: ${testReceiptIds.length}`);
    console.log(`Receipt Items: ${testReceiptItemsIds.length}`);
    console.log(`Inbound Invoices: ${testInvoiceIds.length}`);
    console.log(`Invoice Items: ${testInvoiceItemsIds.length}`);
    console.log(`Financial Transactions: ${testTransactionIds.length}`);

    // 4. DELETE IN CASCADE ORDER
    console.log("\nExecuting deletions...");
    
    // Level 1: Leaf Nodes
    await bulkDelete('order_items', testOrderItemsIds);
    await bulkDelete('order_payments', testOrderPaymentsIds);
    await bulkDelete('purchase_items', testPurchaseItemsIds);
    await bulkDelete('goods_receipt_items', testReceiptItemsIds);
    await bulkDelete('inbound_invoice_items', testInvoiceItemsIds);
    await bulkDelete('financial_transactions', testTransactionIds);

    // Level 2: Documents
    await bulkDelete('orders', testOrderIds);
    await bulkDelete('purchases', testPurchaseIds);
    await bulkDelete('goods_receipts', testReceiptIds);
    await bulkDelete('inbound_invoices', testInvoiceIds);
    
    // Level 3: Catalog
    await bulkDelete('product_variations', testVariationIds);
    await bulkDelete('products', testProductIds);
    
    // Level 4: People (must be last because orders, products, etc refer to people like suppliers/users)
    await bulkDelete('people', testPeopleIds);

    console.log("Cleanup complete!");
}

run();
