import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://wzpdfmihnwcrgkyagwkd.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6cGRmbWlobndjcmdreWFnd2tkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5Nzg0NTQsImV4cCI6MjA4ODU1NDQ1NH0.Mb4kqKeDYILblAD83z9PYOywQ_V0MZ31LI0AlA_1GwY';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run() {
    console.log('--- UPDATING ORDER FOR KALINE ESTEVÃO WITH BALCÃO GRECIA ---');

    // 1. Identify previous order draft
    // The previous order we created likely has ID 1548
    const { data: previousOrders } = await supabase.from('orders').select('id, order_data')
        .or('id.eq.1548'); // Direct hit based on our previous success log

    if (!previousOrders || previousOrders.length === 0) {
        console.error('Previous order not found!');
        return;
    }

    const orderId = previousOrders[0].id;
    const orderData = previousOrders[0].order_data;

    // 2. Add Balcão Grécia (ID 408)
    // Values:
    // California: 2199
    // Jully: 999
    // Pia Marmorite: 229
    // Balcão Grécia: 379
    // Items Total: 3806
    // Final Grand Total fixed at 3951
    // Adjusted Freight: 3951 - 3806 = 145

    const items = [
        { productId: 24, description: 'GUARDA ROUPA CALIFORNIA COR:FREIJO/BAUNILHA', quantity: 1, unitPrice: 2199, costPrice: 0, condition: 'novo' },
        { productId: 413, description: 'COZINHA COMPACTA JULLY COR:FREIJO/BAUNILHA', quantity: 1, unitPrice: 999, costPrice: 0, condition: 'novo' },
        { productId: 320, description: 'PIA DE MARMORITE 1,20 COR:PRETA', quantity: 1, unitPrice: 229, costPrice: 0, condition: 'novo' },
        { productId: 408, description: 'BALCÃO PARA PIA GRECIA COR:FREIJO/BAUNILHA', quantity: 1, unitPrice: 379, costPrice: 0, condition: 'novo' }
    ];

    const freightValue = 145;
    const totalOrderValue = 3951;

    const updatedOrderData = {
        ...orderData,
        items: items,
        itemsSummary: {
            totalQuantity: 4,
            itemsSubtotal: 3806,
            itemsTotalValue: 3806
        },
        shipping: {
            ...orderData.shipping,
            value: freightValue
        },
        payments: [
            { method: 'Cartão de Crédito', value: 3806, label: 'Produtos', status: 'pending' },
            { method: 'PIX', value: 145, label: 'Frete', status: 'pending' }
        ],
        paymentsSummary: {
            totalPaid: 0,
            totalPending: totalOrderValue,
            totalValue: totalOrderValue
        },
        updated_at: new Date().toISOString()
    };

    const { error } = await supabase.from('orders').update({
        order_data: updatedOrderData,
        updated_at: new Date().toISOString()
    }).eq('id', orderId);

    if (error) {
        console.error('Error updating order:', error);
    } else {
        console.log(`Order ${orderId} successfully updated with Balcão Grécia!`);
    }
}

run();
