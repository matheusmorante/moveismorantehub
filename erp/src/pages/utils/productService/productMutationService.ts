import { supabase } from '@/pages/utils/supabaseConfig';
import Product from '../../types/product.type';
import { saveInventoryMove } from '../inventoryService';
import { ensureDefaultVariation } from '../productVariationDefaults';
import { validateProductImageLimits } from './productImageHelpers';
import { getLocalProducts, saveLocalProducts, notifySubscribers } from './productLocalCache';
import { TABLE_NAME, generateUniqueCode, checkSkusUniquenessBatch } from './productSkuService';
import { mapToDB, mapFromDB } from './productMapper';
import { ensureUuidFormat, syncProductToSupabase } from './productPersistenceService';

export const checkProductLinkedToSales = async (id: string | number): Promise<string | null> => {
    return null;
};

export const saveProduct = async (product: Product, forceInsert = false): Promise<string> => {
    validateProductImageLimits(product);
    Object.assign(product, ensureDefaultVariation(product));
    const legacyId = !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(product.id || '') ? product.id : undefined;
    const resolvedId = ensureUuidFormat(product);

    if (!product.code || product.code === '000000') {
        product.code = generateUniqueCode(resolvedId);
    }

    const skusToValidate: string[] = [];
    if (product.code) skusToValidate.push(product.code);
    if (product.variations?.length) {
        product.variations.forEach(v => { if (v.sku) skusToValidate.push(v.sku); });
    }

    if (skusToValidate.length > 0) {
        const duplicates = await checkSkusUniquenessBatch(skusToValidate, resolvedId, legacyId);
        const duplicateSkus = Object.keys(duplicates);
        if (duplicateSkus.length > 0) {
            // Auto-corrige: gera um código único para substituir o SKU duplicado
            if (product.code && duplicateSkus.includes(product.code)) {
                product.code = generateUniqueCode(resolvedId);
                console.warn(`[ProductService] SKU duplicado detectado. Novo código gerado automaticamente: ${product.code}`);
            }
            if (product.variations?.length) {
                product.variations.forEach(v => {
                    if (v.sku && duplicateSkus.includes(v.sku)) {
                        v.sku = generateUniqueCode(resolvedId);
                        console.warn(`[ProductService] SKU de variação duplicado. Novo SKU gerado: ${v.sku}`);
                    }
                });
            }
        }
    }

    const products = getLocalProducts();

    if (resolvedId && !forceInsert && products.some(item => String(item.id) === String(resolvedId))) {
        await updateProduct(resolvedId, product);
        return String(resolvedId);
    }

    const newProduct: Product = {
        ...product,
        id: resolvedId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    products.push(newProduct);
    saveLocalProducts(products);
    notifySubscribers();
    
    // Sincronizar com Supabase e aguardar conclusão
    await syncProductToSupabase(newProduct);

    if (product.launchInitialStock && Number(product.stock) > 0) {
        saveInventoryMove({
            productId: resolvedId,
            variationId: product.variations?.[0]?.id,
            productDescription: product.description || "Estoque Inicial",
            type: 'entry',
            quantity: Number(product.stock),
            unitCost: product.finalPurchasePrice || product.costPrice || 0,
            date: new Date().toISOString(),
            label: 'ESTOQUE INICIAL',
            observation: 'Lançamento automático de estoque inicial no cadastro do produto.'
        }, 0).catch(console.error);
    }

    if (product.initialStockEntries?.length) {
        for (const entry of product.initialStockEntries) {
            if (entry.quantity > 0) {
                saveInventoryMove({
                    productId: resolvedId,
                    variationId: product.variations?.[0]?.id,
                    productDescription: product.description || "Estoque Inicial",
                    type: 'entry',
                    quantity: entry.quantity,
                    unitCost: entry.finalUnitCost || entry.unitCost,
                    date: new Date().toISOString(),
                    label: 'ESTOQUE INICIAL',
                    observation: 'Lançamento automático de estoque inicial no cadastro do produto (lote múltiplo).'
                }, 0).catch(console.error);
            }
        }
    }

    if (product.variations?.length) {
        for (const v of product.variations) {
            if (v.launchInitialStock && Number(v.initialStock) > 0) {
                saveInventoryMove({
                    productId: resolvedId,
                    variationId: v.id,
                    productDescription: `${product.description} (${v.name})`,
                    type: 'entry',
                    quantity: Number(v.initialStock),
                    unitCost: v.finalPurchasePrice || v.initialCost || v.costPrice || 0,
                    date: new Date().toISOString(),
                    label: 'ESTOQUE INICIAL',
                    observation: `Lançamento automático de estoque inicial no cadastro da variação: ${v.name}.`
                }, 0).catch(console.error);
            }
        }
    }

    return resolvedId;
};

export const updateProduct = async (id: string, productToUpdate: Partial<Product>): Promise<void> => {
    validateProductImageLimits(productToUpdate);
    if (productToUpdate.id && String(productToUpdate.id) !== String(id)) {
        throw new Error('Não é permitido alterar o ID de um produto existente.');
    }
    const legacyId = undefined;
    const dummyProduct = { ...productToUpdate, id };
    const resolvedId = ensureUuidFormat(dummyProduct);
    if (productToUpdate.id) productToUpdate.id = resolvedId;

    const skusToValidate: string[] = [];
    if (productToUpdate.code) skusToValidate.push(productToUpdate.code);
    if (productToUpdate.variations?.length) {
        productToUpdate.variations.forEach(v => { if (v.sku) skusToValidate.push(v.sku); });
    }

    if (skusToValidate.length > 0) {
        const duplicates = await checkSkusUniquenessBatch(skusToValidate, resolvedId, legacyId);
        const duplicateSkus = Object.keys(duplicates);
        if (duplicateSkus.length > 0) {
            throw new Error(`SKU já utilizado: ${duplicateSkus.join(', ')}. Escolha o código comercial desejado; ele não será alterado automaticamente.`);
        }
    }

    const products = getLocalProducts();
    const index = products.findIndex(p => String(p.id) === String(resolvedId));
    if (index === -1) {
        const dbUpdate = mapToDB({ ...productToUpdate, id: resolvedId });
        delete dbUpdate.id;
        delete dbUpdate.variations;
        delete dbUpdate.brand;
        delete dbUpdate.category;
        delete dbUpdate.ecommerce_description;
        delete dbUpdate.whatsapp_description;
        delete dbUpdate.whatsapp_template;
        delete dbUpdate.ecommerce_template;
        delete dbUpdate.initial_stock_entries;
        delete dbUpdate.meta_title;
        delete dbUpdate.meta_description;
        delete dbUpdate.seo_description;

        const { data, error } = await supabase.from(TABLE_NAME).update(dbUpdate).eq('id', resolvedId).select('*').single();
        if (error) throw error;

        if (Array.isArray(productToUpdate.variations) && productToUpdate.variations.length > 0) {
            for (const v of productToUpdate.variations) {
                if (v.id && v.stock !== undefined) {
                    await supabase.from("product_variations").update({
                        stock: parseInt(String(v.stock), 10)
                    }).eq("id", v.id);
                }
            }
        }
        const fullProduct = mapFromDB(data) as Product;
        const currentProducts = getLocalProducts();
        currentProducts.push(fullProduct);
        saveLocalProducts(currentProducts);
        notifySubscribers();
        return;
    }

    const currentItem = products[index];

    const updatedProduct = {
        ...currentItem,
        ...productToUpdate,
        id: resolvedId,
        updatedAt: new Date().toISOString()
    };

    products[index] = updatedProduct;
    saveLocalProducts(products);
    notifySubscribers();

    // Sincronizar com Supabase e aguardar conclusão
    await syncProductToSupabase(updatedProduct);
};

export const checkProductHasMoves = async (productId: string, variationId?: string): Promise<boolean> => {
    try {
        const realId = String(productId).split('_')[0];
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(realId);
        if (!isUUID) return false;

        let query = supabase
            .from('inventory_moves')
            .select('id')
            .eq('product_id', realId)
            .limit(1);

        if (variationId) {
            query = query.eq('variation_id', variationId);
        }

        const { data: movesData, error: movesErr } = await query;
        if (!movesErr && movesData && movesData.length > 0) {
            return true;
        }

        const { data: ordersData, error: ordersErr } = await supabase
            .from('orders')
            .select('id')
            .filter('order_data', 'cs', `"{\\"items\\": [{\\"productId\\": \\"${realId}\\"}]}"`)
            .limit(1);

        if (!ordersErr && ordersData && ordersData.length > 0) {
            return true;
        }

        return false;
    } catch (error) {
        console.error("Erro ao verificar movimentações do produto:", error);
        return true;
    }
};

export const deactivateProduct = async (id: string): Promise<void> => {
    await updateProduct(id, { active: false, deleted: false });
};

export const activateProduct = async (id: string): Promise<void> => {
    await updateProduct(id, { active: true, deleted: false });
};

export const moveToTrash = async (id: string): Promise<void> => {
    await deactivateProduct(id);
};

export const restoreProduct = async (id: string): Promise<void> => {
    await activateProduct(id);
};

export const deleteProduct = async (id: string): Promise<{ success: boolean; message?: string }> => {
    try {
        const realId = String(id).split('_')[0];
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(realId);
        
        if (isUUID) {
            await deactivateProduct(realId);
        }

        return { 
            success: true, 
            message: "Produto desativado com sucesso. Deleções físicas não são permitidas para preservar o histórico do sistema."
        };
    } catch (error: any) {
        console.error("Erro ao desativar produto:", error);
        return {
            success: false,
            message: error.message || "Erro ao desativar o produto."
        };
    }
};

export const bulkMoveToTrash = async (ids: string[]): Promise<{ successCount: number, errorCount: number, errors: string[], deactivatedIds: string[] }> => {
    try {
        const idsWithOrders = new Set<string>();
        const orderConflicts: string[] = [];

        await Promise.all(ids.map(async (id) => {
            const linkedOrderId = await checkProductLinkedToSales(id);
            if (linkedOrderId) {
                idsWithOrders.add(id);
                orderConflicts.push(`Produto ID ${id} possui pedido vinculado (Ex: #${linkedOrderId})`);
            }
        }));

        const idsToUpdate = ids.filter(id => !idsWithOrders.has(id));
        
        let errors: string[] = [];
        if (idsWithOrders.size > 0) {
            errors.push(`${idsWithOrders.size} produto(s) possuem pedidos de venda/assistência vinculados e não puderam ser movidos para a lixeira.`);
            orderConflicts.forEach(oc => errors.push(oc));
        }

        if (idsToUpdate.length > 0) {
            await Promise.all(idsToUpdate.map(id => deactivateProduct(id)));
        }

        return {
            successCount: idsToUpdate.length,
            errorCount: ids.length - idsToUpdate.length,
            errors,
            deactivatedIds: idsToUpdate,
        };
    } catch (error) {
        console.error("Erro no bulkMoveToTrash:", error);
        throw error;
    }
};

export const bulkRestoreProducts = async (ids: string[]): Promise<void> => {
    try {
        const products = getLocalProducts();
        ids.forEach(id => {
            const idx = products.findIndex(p => String(p.id) === String(id));
            if (idx !== -1) {
                products[idx].deleted = false;
                products[idx].active = true;
                products[idx].updatedAt = new Date().toISOString();
            }
        });
        saveLocalProducts(products);
        notifySubscribers();
    } catch (error) {
        console.error("Erro no bulkRestoreProducts:", error);
        throw error;
    }
};

export const bulkPermanentDeleteProducts = async (ids: string[]): Promise<{ successCount: number, errorCount: number, errors: string[] }> => {
    try {
        const { data: moves } = await supabase
            .from('inventory_moves')
            .select('product_id')
            .in('product_id', ids);
            
        const idsWithMoves = new Set(moves?.map((m: any) => String(m.product_id)));
        const idsToProcess = ids.filter(id => !idsWithMoves.has(id));
        const idsWithOrders = new Set<string>();
        
        for (const id of idsToProcess) {
             const linkedOrderId = await checkProductLinkedToSales(id);
             if (linkedOrderId) idsWithOrders.add(id);
        }

        const idsToDelete = idsToProcess.filter(id => !idsWithOrders.has(id));
        
        let errors: string[] = [];
        if (idsWithMoves.size > 0) errors.push(`${idsWithMoves.size} produto(s) possuem movimentações de estoque (entradas/saídas).`);
        if (idsWithOrders.size > 0) errors.push(`${idsWithOrders.size} produto(s) possuem pedidos de venda ou assistência vinculados.`);

        if (idsToDelete.length > 0) {
            let products = getLocalProducts();
            products = products.filter(p => !idsToDelete.includes(String(p.id)));
            saveLocalProducts(products);
            notifySubscribers();
        }

        return {
            successCount: idsToDelete.length,
            errorCount: ids.length - idsToDelete.length,
            errors
        };
    } catch (error) {
        console.error("Erro no bulkPermanentDeleteProducts:", error);
        throw error;
    }
};
