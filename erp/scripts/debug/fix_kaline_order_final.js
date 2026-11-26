import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://wzpdfmihnwcrgkyagwkd.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6cGRmbWlobndjcmdreWFnd2tkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5Nzg0NTQsImV4cCI6MjA4ODU1NDQ1NH0.Mb4kqKeDYILblAD83z9PYOywQ_V0MZ31LI0AlA_1GwY';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run() {
    console.log('--- FIXING KALINE ESTEVÃO ORDER (ID 1548) ---');
    
    const { data: order, error: fetchError } = await supabase.from('orders').select('*').eq('id', 1548).single();
    
    if (fetchError || !order) {
        console.error('Order not found:', fetchError);
        return;
    }

    const rawData = order.order_data;

    // 1. Fix Items
    const fixedItems = (rawData.items || []).map(item => ({
        ...item,
        productId: String(item.productId),
        unitDiscount: item.unitDiscount || 0,
        discountType: item.discountType || 'fixed',
        handlingType: item.handlingType || 'Entrega com montagem no local',
        condition: item.condition || 'novo'
    }));

    // 2. Fix Payments
    const fixedPayments = (rawData.payments || []).map(p => ({
        method: p.method || 'PIX',
        amount: p.amount || p.value || 0, // Restore amount from legacy 'value'
        fee: p.fee || 0,
        feeType: p.feeType || 'fixed',
        status: p.status || 'pending'
    }));

    // 3. Fix Summaries
    const shippingValue = rawData.shipping?.value || 0;
    
    // Recalculate based on fixed data
    const itemsTotalValue = fixedItems.reduce((acc, item) => {
        const discount = item.discountType === 'fixed' ? item.unitDiscount : (item.unitPrice * item.unitDiscount / 100);
        return acc + ((item.unitPrice - discount) * item.quantity);
    }, 0);
    
    const totalOrderValue = itemsTotalValue + shippingValue;
    const totalPaid = fixedPayments.reduce((acc, p) => acc + p.amount, 0); // Note: Simplified, ignoring fees for this fix

    const fixedItemsSummary = {
        totalQuantity: fixedItems.reduce((acc, i) => acc + i.quantity, 0),
        itemsSubtotal: fixedItems.reduce((acc, i) => acc + (i.unitPrice * i.quantity), 0),
        totalFixedDiscount: fixedItems.reduce((acc, i) => acc + (i.unitDiscount * i.quantity), 0),
        itemsTotalValue: itemsTotalValue,
        totalItemsCost: fixedItems.reduce((acc, i) => acc + (i.costPrice || 0) * i.quantity, 0)
    };

    const fixedPaymentsSummary = {
        totalPaymentsFee: 0,
        totalOrderValue: totalOrderValue,
        totalAmountPaid: totalPaid,
        amountRemaining: totalOrderValue - totalPaid
    };

    const updatedOrderData = {
        ...rawData,
        items: fixedItems,
        itemsSummary: fixedItemsSummary,
        payments: fixedPayments,
        paymentsSummary: fixedPaymentsSummary,
        updated_at: new Date().toISOString()
    };

    const { error: updateError } = await supabase
        .from('orders')
        .update({
            order_data: updatedOrderData,
            updated_at: new Date().toISOString()
        })
        .eq('id', 1548);

    if (updateError) {
        console.error('Error updating order:', updateError);
    } else {
        console.log(`Order 1548 successfully healed! Total Value: ${totalOrderValue}`);
        console.log('Fixed Payments:', JSON.stringify(fixedPayments, null, 2));
    }
}

run();
