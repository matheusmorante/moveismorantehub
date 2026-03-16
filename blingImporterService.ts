import { supabase } from '@/pages/utils/supabaseConfig';
import Product from "../types/product.type";
import Person from "../types/person.type";
import { ImportConfig } from './importMappingTypes';
import { getSettings } from './settingsService';

export interface BlingImportResult {
    totalRead: number;
    productsInserted: number;
    suppliersCreated: number;
    errors: string[];
}

export interface BlingPeopleImportResult {
    totalRead: number;
    peopleCreated: number;
    peopleUpdated: number;
    errors: string[];
}

function parseCSVLine(line: string) {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ';' && !inQuotes) {
            result.push(current.trim().replace(/^"|"$/g, ''));
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current.trim().replace(/^"|"$/g, ''));
    return result;
}

export const importBlingCSV = async (csvContent: string, customConfig?: ImportConfig): Promise<BlingImportResult> => {
    const settings = getSettings();
    const config = customConfig || settings.importMappings.find(m => m.id === 'bling-products') || settings.importMappings[0];

    const lines = csvContent.split('\n');
    if (lines.length < 2) throw new Error("Arquivo CSV vazio ou inválido.");

    const header = parseCSVLine(lines[0]);
    
    // Header helper using the mapping config
    const getMapping = (field: string) => config.mappings.find(m => m.erpField === field);
    
    const h = (field: string) => {
        const m = getMapping(field);
        if (!m) return -1;
        
        const idx = header.indexOf(m.csvHeader);
        if (idx === -1) {
            // Fuzzy search as fallback
            return header.findIndex(col => col.toLowerCase().includes(m.csvHeader.toLowerCase()));
        }
        return idx;
    };

    const idx = {
        code: h('code'),
        desc: h('description'),
        unit: h('unit'),
        price: h('unitPrice'),
        cost: h('costPrice'),
        stock: h('stock'),
        minStock: h('minStock'),
        parent: h('parentCode'),
        brand: h('brand'),
        cat: h('category'),
        situation: h('situation'), // Not in config yet, adding default
        supplier: h('supplier'),   // Not in config yet, adding default
    };

    // Special fallback for non-mapped fields or situations
    const situationIdx = idx.situation === -1 ? header.indexOf('Situação') : idx.situation;
    const supplierIdx = idx.supplier === -1 ? header.indexOf('Fornecedor') : idx.supplier;
    const conditionIdx = header.indexOf('Condição');

    const rawProducts: any[] = [];
    const uniqueSuppliers = new Set<string>();

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const cols = parseCSVLine(line);
        if (cols.length < 5) continue;

        const getVal = (colIdx: number) => (colIdx !== -1 && cols[colIdx]) ? cols[colIdx].trim() : '';

        const supplierName = getVal(supplierIdx);
        if (supplierName) uniqueSuppliers.add(supplierName);

        rawProducts.push({
            code: getVal(idx.code),
            description: getVal(idx.desc),
            unit: getVal(idx.unit) || getMapping('unit')?.defaultValue || 'un',
            price: parseFloat(getVal(idx.price).replace('.', '').replace(',', '.')) || 0,
            cost: parseFloat(getVal(idx.cost).replace('.', '').replace(',', '.')) || 0,
            stock: parseFloat(getVal(idx.stock).replace('.', '').replace(',', '.')) || 0,
            minStock: parseFloat(getVal(idx.minStock).replace('.', '').replace(',', '.')) || 0,
            parentCode: getVal(idx.parent),
            brand: getVal(idx.brand) || getMapping('brand')?.defaultValue || '',
            category: getVal(idx.cat),
            active: getVal(situationIdx).toLowerCase() === 'ativo',
            supplierName: supplierName,
            condition: getVal(conditionIdx).toLowerCase()
        });
    }

    // 1. Process Suppliers
    const supplierMap = new Map<string, string>();
    let suppliersCreated = 0;

    if (uniqueSuppliers.size > 0) {
        // Fetch existing suppliers to avoid duplicates
        const { data: existingSuppliers } = await supabase
            .from('people')
            .select('id, full_name')
            .eq('person_type', 'suppliers');

        const existingMap = new Map((existingSuppliers || []).map(s => [s.full_name.toLowerCase(), s.id]));

        const suppliersToInsert = Array.from(uniqueSuppliers)
            .filter(name => !existingMap.has(name.toLowerCase()))
            .map(name => ({
                person_type: 'suppliers',
                full_name: name,
                active: true,
                updated_at: new Date().toISOString()
            }));

        if (suppliersToInsert.length > 0) {
            const { data: inserted, error: supplierError } = await supabase
                .from('people')
                .insert(suppliersToInsert)
                .select();

            if (supplierError) console.error("Erro ao inserir fornecedores:", supplierError);
            
            if (inserted) {
                inserted.forEach(s => supplierMap.set(s.full_name.toLowerCase(), s.id));
                suppliersCreated = inserted.length;
            }
        }

        // Add existing ones to the map too
        existingMap.forEach((id, name) => supplierMap.set(name, id));
    }

    // 2. Group Variations
    const finalProductsMap = new Map();

    // First pass: Parents or simple products
    rawProducts.forEach(p => {
        if (!p.parentCode) {
            finalProductsMap.set(p.code, {
                ...p,
                has_variations: false,
                variations: []
            });
        }
    });

    // Second pass: Variations
    rawProducts.forEach(p => {
        if (p.parentCode) {
            const parent = finalProductsMap.get(p.parentCode);
            if (parent) {
                parent.has_variations = true;
                parent.variations.push({
                    sku: p.code,
                    name: p.description,
                    stock: p.stock,
                    unitPrice: p.price,
                    costPrice: p.cost,
                    active: p.active,
                    attributes: []
                });
            } else {
                // Orphan variation becomes simple product
                finalProductsMap.set(p.code, {
                    ...p,
                    has_variations: false,
                    variations: []
                });
            }
        }
    });

    // 3. Prepare items for insertion
    const productsToInsert = Array.from(finalProductsMap.values()).map(p => ({
        code: p.code,
        description: p.description,
        brand: p.brand,
        category: p.category,
        unit_price: p.price,
        cost_price: p.cost,
        stock: p.stock,
        min_stock: p.minStock,
        unit: p.unit || 'un',
        active: p.active,
        has_variations: p.has_variations,
        variations: p.variations,
        item_type: 'product',
        supplier_id: p.supplierName ? supplierMap.get(p.supplierName.toLowerCase()) : null,
        condition: ['novo', 'usado', 'salvado'].includes(p.condition) ? p.condition : (p.description.toLowerCase().includes('salvado') ? 'salvado' : (p.description.toLowerCase().includes('usado') ? 'usado' : 'novo')),
        updated_at: new Date().toISOString()
    }));

    // 4. Batch Insert
    let productsInserted = 0;
    const errors: string[] = [];
    const chunkSize = 50;

    for (let i = 0; i < productsToInsert.length; i += chunkSize) {
        const chunk = productsToInsert.slice(i, i + chunkSize);
        const { error } = await supabase.from('products').upsert(chunk, { onConflict: 'code' });
        
        if (error) {
            errors.push(`Erro no lote ${Math.floor(i / chunkSize) + 1}: ${error.message}`);
        } else {
            productsInserted += chunk.length;
        }
    }

    return {
        totalRead: rawProducts.length,
        productsInserted,
        suppliersCreated,
        errors
    };
};

export const importBlingPeopleCSV = async (csvContent: string, type: 'suppliers' | 'customers' = 'suppliers', customConfig?: ImportConfig): Promise<BlingPeopleImportResult> => {
    const settings = getSettings();
    const config = customConfig || settings.importMappings.find(m => m.id === 'bling-people') || settings.importMappings[1];

    const lines = csvContent.split('\n');
    if (lines.length < 2) throw new Error("Arquivo CSV vazio ou inválido.");

    const header = parseCSVLine(lines[0]);
    
    const getMapping = (field: string) => config.mappings.find(m => m.erpField === field);

    const h = (field: string) => {
        const m = getMapping(field);
        if (!m) return -1;
        const idx = header.indexOf(m.csvHeader);
        if (idx === -1) {
            return header.findIndex(col => col.toLowerCase().includes(m.csvHeader.toLowerCase()));
        }
        return idx;
    };

    const idx = {
        code: h('code'),
        name: h('fullName'),
        fantasy: h('fantasy'),
        cpfCnpj: h('cpfCnpj'),
        address: h('address'),
        number: h('number'),
        neighborhood: h('neighborhood'),
        cep: h('cep'),
        city: h('city'),
        uf: h('uf'),
        phone: h('phone'),
        cellphone: h('cellphone'),
        email: h('email')
    };

    const peopleToProcess: any[] = [];

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const cols = parseCSVLine(line);
        if (cols.length < 2) continue;

        const getVal = (colIdx: number) => (colIdx !== -1 && cols[colIdx]) ? cols[colIdx].trim() : '';

        const name = getVal(idx.name) || getVal(idx.fantasy);
        if (!name) continue;

        peopleToProcess.push({
            code: getVal(idx.code),
            fullName: name,
            cpfCnpj: getVal(idx.cpfCnpj),
            email: getVal(idx.email),
            phone: getVal(idx.cellphone) || getVal(idx.phone),
            address: `${getVal(idx.address)}, ${getVal(idx.number)} - ${getVal(idx.neighborhood)} - ${getVal(idx.city)}/${getVal(idx.uf)} - CEP: ${getVal(idx.cep)}`,
            person_type: type,
            active: true,
            updated_at: new Date().toISOString()
        });
    }

    let peopleCreated = 0;
    const errors: string[] = [];
    
    // 1. Fetch existing people of this type to avoid duplicates
    const { data: existingPeople } = await supabase
        .from('people')
        .select('full_name')
        .eq('person_type', type);
    
    const existingNames = new Set((existingPeople || []).map(p => p.full_name.toLowerCase()));

    const toInsert = peopleToProcess
        .filter(p => !existingNames.has(p.fullName.toLowerCase()))
        .map(p => ({
            full_name: p.fullName,
            cpf_cnpj: p.cpfCnpj,
            email: p.email,
            phone: p.phone,
            address: p.address,
            person_type: type,
            active: true,
            updated_at: new Date().toISOString()
        }));

    if (toInsert.length > 0) {
        const chunkSize = 50;
        for (let i = 0; i < toInsert.length; i += chunkSize) {
            const chunk = toInsert.slice(i, i + chunkSize);
            const { error } = await supabase
                .from('people')
                .insert(chunk);
            
            if (error) {
                errors.push(`Erro no lote ${Math.floor(i / chunkSize) + 1}: ${error.message}`);
            } else {
                peopleCreated += chunk.length;
            }
        }
    }

    return {
        totalRead: peopleToProcess.length,
        peopleCreated,
        peopleUpdated: 0,
        errors
    };
};

export const importBlingOrdersCSV = async (csvContent: string, customConfig?: ImportConfig): Promise<any> => {
    const settings = getSettings();
    const config = customConfig || settings.importMappings.find(m => m.entityType === 'order');

    if (!config) throw new Error("Configuração de importação de pedidos não encontrada.");

    const lines = csvContent.split('\n');
    if (lines.length < 2) throw new Error("Arquivo CSV vazio ou inválido.");

    const header = parseCSVLine(lines[0]);
    const getVal = (cols: string[], hIdx: number) => (hIdx !== -1 && cols[hIdx]) ? cols[hIdx].trim() : '';
    
    const h = (field: string) => {
        const m = config.mappings.find(m => m.erpField === field);
        if (!m) return -1;
        
        let idx = header.indexOf(m.csvHeader);
        if (idx === -1) {
            // Fallback for case-insensitive or partial
            idx = header.findIndex(col => col.toLowerCase().includes(m.csvHeader.toLowerCase()));
        }
        return idx;
    };

    const idx = {
        number: h('orderNumber'),
        date: h('date'),
        customer: h('customerName'),
        total: h('total'),
        status: h('status'),
        payment: h('paymentMethod')
    };

    const ordersToInsert: any[] = [];
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        const cols = parseCSVLine(line);
        if (cols.length < 3) continue;

        const totalValue = parseFloat(getVal(cols, idx.total).replace('.', '').replace(',', '.')) || 0;
        const customerName = getVal(cols, idx.customer);
        const orderDate = getVal(cols, idx.date);
        
        // Wrap in order_data to match ERP structure
        ordersToInsert.push({
            order_data: {
                orderNumber: getVal(cols, idx.number),
                date: orderDate,
                customerData: { fullName: customerName },
                itemsSummary: { itemsTotalValue: totalValue },
                paymentsSummary: { totalAmount: totalValue },
                status: getVal(cols, idx.status).toLowerCase().includes('atendido') ? 'fulfilled' : 'scheduled',
                items: [], // Importing orders usually doesn't include items in the same line in Bling simple CSV
                orderType: 'sale'
            },
            updated_at: new Date().toISOString()
        });
    }

    if (ordersToInsert.length > 0) {
        const { error } = await supabase.from('orders').insert(ordersToInsert);
        if (error) throw error;
    }

    return { totalRead: ordersToInsert.length, inserted: ordersToInsert.length };
};

export const importBlingReceivablesCSV = async (csvContent: string, customConfig?: ImportConfig): Promise<any> => {
    const settings = getSettings();
    const config = customConfig || settings.importMappings.find(m => m.entityType === 'receivable');

    if (!config) throw new Error("Configuração de importação de contas a receber não encontrada.");

    const lines = csvContent.split('\n');
    if (lines.length < 2) throw new Error("Arquivo CSV vazio ou inválido.");

    const header = parseCSVLine(lines[0]);
    const getVal = (cols: string[], hIdx: number) => (hIdx !== -1 && cols[hIdx]) ? cols[hIdx].trim() : '';
    
    const h = (field: string) => {
        const m = config.mappings.find(m => m.erpField === field);
        if (!m) return -1;
        
        let idx = header.indexOf(m.csvHeader);
        if (idx === -1) {
            idx = header.findIndex(col => col.toLowerCase().includes(m.csvHeader.toLowerCase()));
        }
        return idx;
    };

    const idx = {
        desc: h('description'),
        val: h('value'),
        due: h('dueDate'),
        customer: h('customerName'),
        cat: h('category'),
        status: h('status')
    };

    const recToInsert: any[] = [];
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const cols = parseCSVLine(line);
        if (cols.length < 3) continue;

        recToInsert.push({
            description: getVal(cols, idx.desc),
            amount: parseFloat(getVal(cols, idx.val).replace('.', '').replace(',', '.')) || 0,
            due_date: getVal(cols, idx.due),
            customer_name: getVal(cols, idx.customer),
            status: getVal(cols, idx.status).toLowerCase().includes('pago') ? 'paid' : 'pending',
            updated_at: new Date().toISOString()
        });
    }

    if (recToInsert.length > 0) {
        const { error } = await supabase.from('accounts_receivable').insert(recToInsert);
        if (error) throw error;
    }

    return { totalRead: recToInsert.length, inserted: recToInsert.length };
};


