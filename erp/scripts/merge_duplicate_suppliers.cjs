const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read .env manually
const envPath = path.join(__dirname, '../.env');
if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
        const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
        if (match) {
            const key = match[1];
            let value = match[2] || '';
            if (value.length > 0 && value.startsWith('"') && value.endsWith('"')) {
                value = value.substring(1, value.length - 1);
            }
            process.env[key] = value.trim();
        }
    });
}

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Environment variables missing");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function mergeDuplicateSuppliers() {
    console.log("=== INICIANDO MESCLAGEM DE FORNECEDORES DUPLICADOS ===");

    // 1. Buscar todos os fornecedores
    const { data: suppliers, error: sErr } = await supabase
        .from('people')
        .select('*')
        .or('person_type.ilike.suppliers,person_type.ilike.supplier');

    if (sErr || !suppliers) {
        console.error("Erro ao buscar fornecedores:", sErr);
        return;
    }

    console.log(`Total de fornecedores encontrados: ${suppliers.length}`);

    // Group suppliers by normalized name
    const grouped = new Map();

    for (const sup of suppliers) {
        const rawName = sup.full_name || sup.nickname || sup.social_name || '';
        const normName = rawName.trim().toLowerCase();
        if (!normName) continue;

        if (!grouped.has(normName)) {
            grouped.set(normName, []);
        }
        grouped.get(normName).push(sup);
    }

    for (const [normName, list] of grouped.entries()) {
        if (list.length > 1) {
            console.log(`\n----------------------------------------`);
            console.log(`Encontrado ${list.length} fornecedores duplicados para o nome: "${list[0].full_name || normName}"`);

            // Pick primary supplier (the one with lowest id or oldest created_at or most fields)
            list.sort((a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime());
            const primary = list[0];
            const duplicates = list.slice(1);

            console.log(`-> Mantendo Fornecedor Principal: ID=${primary.id}, Nome="${primary.full_name}"`);
            const duplicateIds = duplicates.map(d => String(d.id));
            console.log(`-> Fornecedores duplicados a remover: IDs=[${duplicateIds.join(', ')}]`);

            // Fetch all products
            const { data: products, error: pErr } = await supabase
                .from('products')
                .select('id, name, description, main_supplier_id, supplier_id, supplier_ids');

            if (pErr) {
                console.error("Erro ao buscar produtos para atualização:", pErr);
                continue;
            }

            let updatedProductsCount = 0;

            for (const prod of (products || [])) {
                let needsUpdate = false;
                let newMainSupplierId = prod.main_supplier_id;
                let newSupplierId = prod.supplier_id;
                let newSupplierIds = Array.isArray(prod.supplier_ids) ? [...prod.supplier_ids] : [];

                if (duplicateIds.includes(String(prod.main_supplier_id))) {
                    newMainSupplierId = primary.id;
                    needsUpdate = true;
                }
                if (duplicateIds.includes(String(prod.supplier_id))) {
                    newSupplierId = primary.id;
                    needsUpdate = true;
                }
                if (newSupplierIds.some(id => duplicateIds.includes(String(id)))) {
                    newSupplierIds = newSupplierIds.map(id => duplicateIds.includes(String(id)) ? primary.id : id);
                    // Deduplicate
                    newSupplierIds = Array.from(new Set(newSupplierIds));
                    needsUpdate = true;
                }

                if (needsUpdate) {
                    console.log(`   Atualizando produto ID ${prod.id} ("${prod.name || prod.description}") -> apontando para fornecedor principal ID ${primary.id}`);
                    const { error: uErr } = await supabase
                        .from('products')
                        .update({
                            main_supplier_id: newMainSupplierId,
                            supplier_id: newSupplierId,
                            supplier_ids: newSupplierIds
                        })
                        .eq('id', prod.id);

                    if (uErr) {
                        console.error(`   Erro ao atualizar produto ${prod.id}:`, uErr);
                    } else {
                        updatedProductsCount++;
                    }
                }
            }

            console.log(`   Total de produtos re-apontados para "${primary.full_name}": ${updatedProductsCount}`);

            // Remove duplicate supplier records
            for (const dup of duplicates) {
                console.log(`   Deletando fornecedor duplicado ID ${dup.id} (${dup.full_name})...`);
                const { error: dErr } = await supabase
                    .from('people')
                    .delete()
                    .eq('id', dup.id);

                if (dErr) {
                    console.error(`   Erro ao deletar fornecedor ${dup.id}:`, dErr);
                } else {
                    console.log(`   Fornecedor duplicado ID ${dup.id} deletado com sucesso.`);
                }
            }
        }
    }

    console.log("\n=== MESCLAGEM CONCLUÍDA COM SUCESSO ===");
}

mergeDuplicateSuppliers().catch(err => {
    console.error("Exceção não tratada:", err);
    process.exit(1);
});
