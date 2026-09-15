const { Client } = require('pg');

const client = new Client({
    connectionString: 'postgresql://postgres:Morantenho%4012345@db.hkoxhourxwlddgsfdgws.supabase.co:5432/postgres'
});

async function run() {
    await client.connect();
    console.log('Conectado ao PostgreSQL. Aplicando colunas para Devolução...');

    // Colunas em orders
    await client.query(`
        ALTER TABLE orders 
        ADD COLUMN IF NOT EXISTS returned_total_amount NUMERIC(12,2) DEFAULT NULL,
        ADD COLUMN IF NOT EXISTS original_sold_total NUMERIC(12,2) DEFAULT NULL,
        ADD COLUMN IF NOT EXISTS return_kind TEXT DEFAULT NULL;
    `);
    console.log('✓ Colunas adicionadas na tabela orders.');

    // Colunas em order_items
    await client.query(`
        ALTER TABLE order_items 
        ADD COLUMN IF NOT EXISTS returned_quantity NUMERIC(12,3) DEFAULT NULL,
        ADD COLUMN IF NOT EXISTS returned_unit_price NUMERIC(12,2) DEFAULT NULL,
        ADD COLUMN IF NOT EXISTS returned_total_value NUMERIC(12,2) DEFAULT NULL,
        ADD COLUMN IF NOT EXISTS original_unit_price NUMERIC(12,2) DEFAULT NULL,
        ADD COLUMN IF NOT EXISTS original_total_value NUMERIC(12,2) DEFAULT NULL;
    `);
    console.log('✓ Colunas adicionadas na tabela order_items.');

    // Verificar colunas
    const ordersCols = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name IN ('returned_total_amount', 'original_sold_total', 'return_kind');
    `);
    console.log('Colunas verificadas em orders:', ordersCols.rows);

    const itemsCols = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'order_items' AND column_name IN ('returned_quantity', 'returned_unit_price', 'returned_total_value', 'original_unit_price', 'original_total_value');
    `);
    console.log('Colunas verificadas em order_items:', itemsCols.rows);

    await client.end();
}

run().catch((err) => {
    console.error('Erro ao aplicar migração:', err);
    process.exit(1);
});
