import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://wzpdfmihnwcrgkyagwkd.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6cGRmbWlobndjcmdreWFnd2tkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5Nzg0NTQsImV4cCI6MjA4ODU1NDQ1NH0.Mb4kqKeDYILblAD83z9PYOywQ_V0MZ31LI0AlA_1GwY';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run() {
    console.log('--- REGISTERING ORDER FOR KALINE ESTEVÃO ---');

    // 1. Ensure Customer
    const customerName = 'Kaline Estevão';
    const customerPhone = '(41) 99173-2336';
    const address = {
        street: 'Rua Ricardo Jacomasso',
        number: '165',
        neighborhood: 'Conj. Hab. Moradias Iguaçu',
        city: 'Balsa Nova',
        state: 'PR',
        cep: '83650-000',
        complement: 'Casa'
    };

    let customerId;
    const { data: existing } = await supabase.from('people').select('id').ilike('full_name', customerName).limit(1);
    
    if (existing && existing.length > 0) {
        customerId = existing[0].id;
        console.log(`Customer located: ID ${customerId}`);
    } else {
        const { data: created, error } = await supabase.from('people').insert([{
            full_name: customerName,
            phone: customerPhone,
            address: address, // Saving as object if DB supports JSONB, or string if needed
            person_type: 'customers',
            active: true
        }]).select();
        if (error) console.error('Error creating customer:', error);
        customerId = created?.[0]?.id;
        console.log(`New customer created: ID ${customerId}`);
    }

    // 2. Prepare Order Data
    // Prices as per user request:
    // California: 2199
    // Jully: 999
    // Pia: 229
    // Items Total: 3427
    // Grand Total: 3951
    // Freight Calculation: 3951 - 3427 = 524
    
    const items = [
        { productId: 24, description: 'Guarda-roupa Califórnia (1.75m)', quantity: 1, unitPrice: 2199, costPrice: 0, condition: 'novo' },
        { productId: 413, description: 'Cozinha Compacta Jully', quantity: 1, unitPrice: 999, costPrice: 0, condition: 'novo' },
        { productId: 320, description: 'Pia de Marmorite Preta (1.20m)', quantity: 1, unitPrice: 229, costPrice: 0, condition: 'novo' }
    ];

    const freightValue = 524;
    const totalOrderValue = 3951;

    const orderData = {
        orderType: 'sale',
        status: 'Draft',
        date: new Date().toISOString(),
        customerData: {
            fullName: customerName,
            phone: customerPhone,
            fullAddress: address
        },
        items: items,
        itemsSummary: {
            totalQuantity: 3,
            itemsSubtotal: 3427,
            itemsTotalValue: 3427
        },
        shipping: {
            value: freightValue,
            method: 'delivery',
            address: address
        },
        payments: [
            { method: 'Cartão de Crédito', value: 3427, label: 'Produtos', status: 'pending' },
            { method: 'PIX', value: 524, label: 'Frete', status: 'pending' }
        ],
        paymentsSummary: {
            totalPaid: 0,
            totalPending: totalOrderValue,
            totalValue: totalOrderValue
        },
        updated_at: new Date().toISOString()
    };

    const { data: order, error: orderErr } = await supabase.from('orders').insert([{
        order_data: orderData,
        updated_at: new Date().toISOString()
    }]).select();

    if (orderErr) {
        console.error('Error saving order:', orderErr);
    } else {
        console.log(`Order successfully saved as Draft! ID: ${order[0].id}`);
    }
}

run();
