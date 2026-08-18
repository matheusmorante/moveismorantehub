const { Client } = require('pg');

const client = new Client({
    connectionString: 'postgresql://postgres:Morantenho%4012345@db.hkoxhourxwlddgsfdgws.supabase.co:5432/postgres'
});

const testProduct = {
    id: "36027999-c241-4350-af7b-7b62d0c1b924",
    name: "PRODUTO TESTE COMPLETO",
    description: "Teste",
    price: 150.00,
    unit_price: 150.00,
    cost_price: 80.00,
    active: true,
    is_draft: false,
    status: 'draft',
    code: 'TEST0001',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    // Colunas extras do ERP
    freight_type: 'fixed',
    freight_cost: 0,
    ipi_percent: 0,
    final_purchase_price: 0,
    initial_stock: 0,
    stock: 0,
    min_stock: 0,
    unit: 'UN',
    deleted: false,
    item_type: 'product',
    fiscal: JSON.stringify({}),
    notification_config: JSON.stringify({}),
    is_combo: false,
    combo_items: JSON.stringify([]),
    initial_stock_entries: JSON.stringify([]),
    whatsapp_sync: false,
    ecommerce_sync: false,
    whatsapp_auto_sync: false,
    pkg_width: 0,
    pkg_height: 0,
    pkg_depth: 0,
    extra_dimensions: JSON.stringify([]),
    line: '',
    main_differential: '',
    colors: '',
    not_included: '',
    supplier_ref: '',
    observations: '',
    is_variation: false,
    no_width: false,
    no_height: false,
    no_depth: false,
    no_brand: false,
    no_colors: false,
    has_no_line: false,
    product_type_name: '',
    environment: '',
    include_environment: true,
    include_line: true,
    include_brand: true,
    include_type: true,
    include_supplier_ref: false,
    title_complement: '',
    include_complement: true,
    title_order: JSON.stringify([]),
    brand: '',
    category: '',
    has_variations: false
};

async function run() {
    await client.connect();

    console.log('Inserindo produto completo no Postgres...');
    
    // Gerar query dinâmica de insert
    const keys = Object.keys(testProduct);
    const values = Object.values(testProduct);
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
    const columns = keys.map(k => `"${k}"`).join(', ');

    try {
        const res = await client.query(`
            INSERT INTO public.products (${columns}) 
            VALUES (${placeholders}) 
            RETURNING id
        `, values);
        console.log('SUCESSO! Produto inserido com ID:', res.rows[0].id);
        
        // Limpeza
        await client.query('DELETE FROM public.products WHERE id = $1', [testProduct.id]);
        console.log('Limpeza concluída.');
    } catch (err) {
        console.error('ERRO DETALHADO DO POSTGRES:', err);
    }

    await client.end();
}

run().catch(console.error);
