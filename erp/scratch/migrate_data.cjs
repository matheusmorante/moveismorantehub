const { createClient } = require('@supabase/supabase-js');

const OLD_URL = 'https://wzpdfmihnwcrgkyagwkd.supabase.co';
const OLD_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6cGRmbWlobndjcmdreWFnd2tkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5Nzg0NTQsImV4cCI6MjA4ODU1NDQ1NH0.Mb4kqKeDYILblAD83z9PYOywQ_V0MZ31LI0AlA_1GwY';
const oldSupabase = createClient(OLD_URL, OLD_KEY);

const NEW_URL = 'https://hkoxhourxwlddgsfdgws.supabase.co';
const NEW_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhrb3hob3VyeHdsZGRnc2ZkZ3dzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxNTg5MzgsImV4cCI6MjA5MzczNDkzOH0.vCNJeoR4wDl1BqESiyNhKpgviwxcx0cim8Dbl6MvdJI';
const newSupabase = createClient(NEW_URL, NEW_KEY);

// Função para buscar todos os registros de uma tabela paginando de 1000 em 1000
async function fetchAll(client, tableName) {
    let allData = [];
    let start = 0;
    let limit = 999;
    let hasMore = true;

    while (hasMore) {
        const { data, error } = await client
            .from(tableName)
            .select('*')
            .range(start, start + limit);

        if (error) {
            console.error(`Erro ao buscar dados de ${tableName}:`, error);
            throw error;
        }

        if (data && data.length > 0) {
            allData = allData.concat(data);
            start += data.length;
            if (data.length < limit + 1) {
                hasMore = false;
            }
        } else {
            hasMore = false;
        }
    }
    return allData;
}

async function migrate() {
    console.log("=== INICIANDO MIGRAÇÃO DE DADOS ===");

    // 1. MIGRAR CATEGORIES
    console.log("\n--- 1. Migrando Categorias ---");
    const oldCategories = await fetchAll(oldSupabase, 'categories');
    const newCategories = await fetchAll(newSupabase, 'categories');
    const newCatIds = new Set(newCategories.map(c => String(c.id)));
    const newCatNames = new Set(newCategories.map(c => String(c.name).trim().toLowerCase()));

    const categoriesToInsert = oldCategories.filter(c => 
        !newCatIds.has(String(c.id)) && 
        !newCatNames.has(String(c.name).trim().toLowerCase())
    );

    console.log(`Categorias no antigo: ${oldCategories.length}. No novo: ${newCategories.length}. Para migrar: ${categoriesToInsert.length}`);

    if (categoriesToInsert.length > 0) {
        const { error: catErr } = await newSupabase.from('categories').insert(categoriesToInsert);
        if (catErr) {
            console.error("Erro ao inserir categorias:", catErr);
        } else {
            console.log(`Sucesso: ${categoriesToInsert.length} categorias migradas.`);
        }
    } else {
        console.log("Nenhuma nova categoria para migrar.");
    }

    // 2. MIGRAR PEOPLE (CLIENTES, FORNECEDORES ETC)
    console.log("\n--- 2. Migrando Pessoas (Clientes/Fornecedores) ---");
    const oldPeople = await fetchAll(oldSupabase, 'people');
    const newPeople = await fetchAll(newSupabase, 'people');
    const newPeopleIds = new Set(newPeople.map(p => String(p.id)));

    const peopleToInsert = oldPeople.filter(p => !newPeopleIds.has(String(p.id)));
    console.log(`Pessoas no antigo: ${oldPeople.length}. No novo: ${newPeople.length}. Para migrar: ${peopleToInsert.length}`);

    if (peopleToInsert.length > 0) {
        // Inserir em blocos de 100 para evitar sobrecarga ou erros de payload
        const chunkSize = 100;
        let successCount = 0;
        for (let i = 0; i < peopleToInsert.length; i += chunkSize) {
            const chunk = peopleToInsert.slice(i, i + chunkSize);
            const { error: peopleErr } = await newSupabase.from('people').insert(chunk);
            if (peopleErr) {
                console.error(`Erro ao inserir lote de pessoas ${i}-${i + chunk.length}:`, peopleErr);
            } else {
                successCount += chunk.length;
            }
        }
        console.log(`Sucesso: ${successCount} de ${peopleToInsert.length} pessoas migradas.`);
    } else {
        console.log("Nenhuma nova pessoa para migrar.");
    }

    // 3. MIGRAR ORDERS (PEDIDOS DE VENDA)
    console.log("\n--- 3. Migrando Pedidos de Venda (Orders) ---");
    const oldOrders = await fetchAll(oldSupabase, 'orders');
    const newOrders = await fetchAll(newSupabase, 'orders');
    const newOrderIds = new Set(newOrders.map(o => String(o.id)));

    const ordersToInsert = oldOrders.filter(o => !newOrderIds.has(String(o.id)));
    console.log(`Pedidos no antigo: ${oldOrders.length}. No novo: ${newOrders.length}. Para migrar: ${ordersToInsert.length}`);

    if (ordersToInsert.length > 0) {
        // Inserir de forma segura em blocos de 50
        const chunkSize = 50;
        let successCount = 0;
        for (let i = 0; i < ordersToInsert.length; i += chunkSize) {
            const chunk = ordersToInsert.slice(i, i + chunkSize);
            const { error: orderErr } = await newSupabase.from('orders').insert(chunk);
            if (orderErr) {
                console.error(`Erro ao inserir lote de pedidos ${i}-${i + chunk.length}:`, orderErr);
            } else {
                successCount += chunk.length;
            }
        }
        console.log(`Sucesso: ${successCount} de ${ordersToInsert.length} pedidos migrados.`);
    } else {
        console.log("Nenhum novo pedido para migrar.");
    }

    console.log("\n=== MIGRAÇÃO CONCLUÍDA COM SUCESSO! ===");
}

migrate();
