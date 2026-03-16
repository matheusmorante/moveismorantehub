import { supabase } from '@/pages/utils/supabaseConfig';
import Product, { Variation } from "../types/product.type";
import { crmIntelligenceService } from "./crmIntelligenceService";
import { saveInventoryMove } from "./inventoryService";

const TABLE_NAME = "products";

const mapToDB = (product: Partial<Product>) => {
    const data: any = {
        updated_at: new Date().toISOString()
    };

    if (product.code !== undefined) data.code = product.code;
    if (product.description !== undefined) data.description = product.description;
    if (product.brand !== undefined) data.brand = product.brand;
    if (product.category !== undefined) data.category = product.category;
    if (product.condition !== undefined) data.condition = product.condition;
    if (product.unitPrice !== undefined) data.unit_price = product.unitPrice;
    if (product.costPrice !== undefined) data.cost_price = product.costPrice;
    if (product.freightType !== undefined) data.freight_type = product.freightType;
    if (product.freightCost !== undefined) data.freight_cost = product.freightCost;
    if (product.ipiPercent !== undefined) data.ipi_percent = product.ipiPercent;
    if (product.ipiType !== undefined) data.ipi_type = product.ipiType;
    if (product.finalPurchasePrice !== undefined) data.final_purchase_price = product.finalPurchasePrice;
    if (product.initialStock !== undefined) data.initial_stock = product.initialStock;
    if (product.stock !== undefined) data.stock = product.stock;
    if (product.minStock !== undefined) data.min_stock = product.minStock;
    if (product.unit !== undefined) data.unit = product.unit;
    if (product.active !== undefined) data.active = product.active;
    if (product.isDraft !== undefined) data.is_draft = product.isDraft;
    if (product.deleted !== undefined) data.deleted = product.deleted;
    if (product.supplierId !== undefined) data.supplier_id = product.supplierId;
    if (product.images !== undefined) data.images = product.images;
    if (product.ecommerceDescription !== undefined) data.ecommerce_description = product.ecommerceDescription;
    if (product.whatsappDescription !== undefined) data.whatsapp_description = product.whatsappDescription;
    if (product.whatsappTemplate !== undefined) data.whatsapp_template = product.whatsappTemplate;
    if (product.ecommerceTemplate !== undefined) data.ecommerce_template = product.ecommerceTemplate;
    if (product.hasVariations !== undefined) data.has_variations = product.hasVariations;
    if (product.variations !== undefined) data.variations = product.variations;
    if (product.itemType !== undefined) data.item_type = product.itemType;
    if (product.fiscal !== undefined) data.fiscal = product.fiscal;
    if (product.notificationConfig !== undefined) data.notification_config = product.notificationConfig;
    if (product.isCombo !== undefined) data.is_combo = product.isCombo;
    if (product.comboItems !== undefined) data.combo_items = product.comboItems;
    
    // Dimensions & Details
    if (product.width !== undefined) data.width = product.width;
    if (product.height !== undefined) data.height = product.height;
    if (product.depth !== undefined) data.depth = product.depth;
    if (product.weight !== undefined) data.weight = product.weight;
    if (product.pkgWidth !== undefined) data.pkg_width = product.pkgWidth;
    if (product.pkgHeight !== undefined) data.pkg_height = product.pkgHeight;
    if (product.pkgDepth !== undefined) data.pkg_depth = product.pkgDepth;
    if (product.extraDimensions !== undefined) data.extra_dimensions = product.extraDimensions;
    if (product.line !== undefined) data.line = product.line;
    if (product.mainDifferential !== undefined) data.main_differential = product.mainDifferential;
    if (product.material !== undefined) data.material = product.material;
    if (product.colors !== undefined) data.colors = product.colors;
    if (product.notIncluded !== undefined) data.not_included = product.notIncluded;
    if (product.mainSupplierId !== undefined) data.main_supplier_id = product.mainSupplierId;
    if (product.supplierRef !== undefined) data.supplier_ref = product.supplierRef;
    if (product.observations !== undefined) data.observations = product.observations;
    if (product.parentId !== undefined) data.parent_id = product.parentId;
    if (product.isVariation !== undefined) data.is_variation = product.isVariation;

    // Intelligence Fields
    if (product.leadTime !== undefined) data.lead_time = product.leadTime;
    if (product.avgMonthlySales !== undefined) data.avg_monthly_sales = product.avgMonthlySales;
    if (product.classification !== undefined) data.classification = product.classification;

    return data;
};

const mapFromDB = (data: any): Product => {
    return {
        id: String(data.id),
        code: data.code,
        description: data.description,
        brand: data.brand,
        category: data.category,
        condition: data.condition || '',
        unitPrice: Number(data.unit_price),
        costPrice: Number(data.cost_price),
        freightType: data.freight_type || 'fixed',
        freightCost: Number(data.freight_cost),
        ipiPercent: Number(data.ipi_percent),
        ipiType: data.ipi_type || 'percentage',
        finalPurchasePrice: Number(data.final_purchase_price),
        initialStock: Number(data.initial_stock),
        stock: Number(data.stock),
        minStock: Number(data.min_stock),
        unit: data.unit,
        active: data.active,
        isDraft: data.is_draft,
        deleted: data.deleted,
        supplierId: data.supplier_id,
        images: data.images,
        ecommerceDescription: data.ecommerce_description,
        whatsappDescription: data.whatsapp_description,
        whatsappTemplate: data.whatsapp_template,
        ecommerceTemplate: data.ecommerce_template,
        hasVariations: data.has_variations,
        variations: data.variations,
        itemType: data.item_type || 'product',
        fiscal: data.fiscal,
        notificationConfig: data.notification_config,
        isCombo: data.is_combo || false,
        comboItems: data.combo_items || [],
        categoryIds: data.product_categories?.map((pc: any) => pc.category_id) || [],
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        
        // Dimensions & Details
        width: data.width,
        height: data.height,
        depth: data.depth,
        weight: data.weight,
        pkgWidth: data.pkg_width,
        pkgHeight: data.pkg_height,
        pkgDepth: data.pkg_depth,
        extraDimensions: data.extra_dimensions || [],
        line: data.line,
        mainDifferential: data.main_differential,
        material: data.material,
        colors: data.colors,
        notIncluded: data.not_included,
        mainSupplierId: data.main_supplier_id,
        supplierRef: data.supplier_ref,
        observations: data.observations,
        parentId: data.parent_id,
        isVariation: data.is_variation,

        // Intelligence Fields
        leadTime: data.lead_time,
        avgMonthlySales: data.avg_monthly_sales,
        classification: data.classification
    };
};

const LIGHT_COLUMNS = "id, code, description, brand, category, condition, unit_price, cost_price, freight_type, freight_cost, ipi_percent, ipi_type, final_purchase_price, initial_stock, stock, min_stock, unit, active, is_draft, deleted, supplier_id, images, has_variations, variations, item_type, created_at, updated_at, product_categories(category_id)";

export const subscribeToProducts = (callback: (products: Product[]) => void) => {
    let currentProducts: Product[] = [];

    const fetchInitial = async () => {
        try {
            // Try light fetch first
            let { data, error } = await supabase.from(TABLE_NAME)
                .select(LIGHT_COLUMNS)
                .order('description', { ascending: true });

            if (error && error.message?.includes("column")) {
                console.warn("Colunas leves não encontradas no cache (ex: product_categories etc), tentando fallback...");
                // Fallback to basic fetch
                const res = await supabase.from(TABLE_NAME)
                    .select('id, code, description, brand, category, unit_price, cost_price, stock, item_type, created_at, active, deleted, images, variations')
                    .order('description', { ascending: true });
                data = res.data;
                error = res.error;
            }

            if (!error && data) {
                currentProducts = data.map(mapFromDB);
                callback(currentProducts);
            } else {
                console.error("Erro fatal também no fallback ao buscar produtos iniciais:", error);
                callback([]);
            }
        } catch (err) {
            console.error("Erro critico de exceção ao buscar produtos:", err);
            callback([]);
        }
    };

    fetchInitial();

    const channel = supabase.channel('products_changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: TABLE_NAME }, (payload: any) => {
            if (payload.eventType === 'INSERT') {
                const newProduct = mapFromDB(payload.new);
                currentProducts = [...currentProducts, newProduct].sort((a, b) => a.description.localeCompare(b.description));
                callback(currentProducts);
            } else if (payload.eventType === 'UPDATE') {
                const updatedProduct = mapFromDB(payload.new);
                currentProducts = currentProducts.map(p => p.id === updatedProduct.id ? { ...p, ...updatedProduct } : p);
                callback(currentProducts);
            } else if (payload.eventType === 'DELETE') {
                currentProducts = currentProducts.filter(p => p.id !== String(payload.old.id));
                callback(currentProducts);
            }
        })
        .subscribe();

    return () => {
        supabase.removeChannel(channel);
    };
};

/**
 * Busca um produto completo com todos os campos (para edição)
 */
export const getFullProduct = async (id: string): Promise<Product | null> => {
    try {
        const { data, error } = await supabase
            .from(TABLE_NAME)
            .select('*, product_categories(category_id)')
            .eq('id', id)
            .single();

        if (error) throw error;
        return data ? mapFromDB(data) : null;
    } catch (error) {
        console.error("Erro ao buscar produto completo:", error);
        return null;
    }
};

/**
 * Verifica se um SKU/Código já existe no sistema (em produtos ou variações)
 */
export const checkSkuUniqueness = async (sku: string, excludeProductId?: string): Promise<{ exists: boolean, productDescription?: string }> => {
    if (!sku) return { exists: false };

    // 1. Verificar em produtos (campo code)
    let productQuery = supabase.from(TABLE_NAME)
        .select('id, description, code')
        .eq('code', sku)
        .eq('deleted', false);
    
    if (excludeProductId) {
        productQuery = productQuery.neq('id', excludeProductId);
    }

    const { data: productMatch } = await productQuery.maybeSingle();
    if (productMatch) {
        return { exists: true, productDescription: productMatch.description };
    }

    // 2. Verificar em variações (field JSON)
    // Usamos o operador @> para buscar no array de variações
    const { data: variationMatch } = await supabase.from(TABLE_NAME)
        .select('id, description, variations')
        .eq('deleted', false)
        .filter('variations', 'cs', `[{"sku": "${sku}"}]`);

    if (variationMatch && variationMatch.length > 0) {
        // Filtrar o próprio produto se necessário (já que a query cs não aceita neq facilmente combinada)
        const realMatch = excludeProductId 
            ? variationMatch.filter((v: any) => String(v.id) !== String(excludeProductId))
            : variationMatch;
            
        if (realMatch.length > 0) {
            return { exists: true, productDescription: realMatch[0].description };
        }
    }

    return { exists: false };
};

export const saveProduct = async (product: Product): Promise<string> => {
    // Validação de SKU Global antes de salvar
    if (product.code) {
        const { exists, productDescription } = await checkSkuUniqueness(product.code, product.id);
        if (exists) {
            throw new Error(`O código (SKU) "${product.code}" já está em uso no produto: ${productDescription}`);
        }
    }

    // Validar SKUs das variações
    if (product.variations && product.variations.length > 0) {
        for (const v of product.variations) {
            if (v.sku) {
                const { exists, productDescription } = await checkSkuUniqueness(v.sku, product.id);
                if (exists) {
                    throw new Error(`A variação "${v.name}" usa o SKU "${v.sku}" que já pertence ao produto: ${productDescription}`);
                }
            }
        }
    }

    if (product.id) {
        await updateProduct(product.id, product);
        return product.id;
    }

    try {
        const dbProduct = mapToDB(product);
        // Supabase serial ID will handle the auto-increment
        const { data, error } = await supabase
            .from(TABLE_NAME)
            .insert([dbProduct])
            .select();

        if (error) throw error;

        if (data && data[0]) {
            const newId = String(data[0].id);
            if (product.categoryIds && product.categoryIds.length > 0) {
                const links = product.categoryIds.map(cid => ({ product_id: newId, category_id: cid }));
                await supabase.from('product_categories').insert(links);
            }

            // Lógica de CRM: Se o produto for 'salvado' ou 'usado', busca interessados
            const condition = product.condition?.toLowerCase();
            if (condition === 'salvado' || condition === 'usado') {
                try {
                    const matches = await crmIntelligenceService.findMatchingDesires(product.description);
                    for (const match of matches) {
                        if (match.id) {
                            await crmIntelligenceService.registerMatch(match.id, newId);
                        }
                    }
                } catch (crmError) {
                    console.error("Erro ao processar inteligência de CRM no build do produto:", crmError);
                }
            }

            /* 
            // Se houver estoque inicial, registra como uma 'entrada' FIFO
            // Removido conforme solicitação: usuário prefere fazer inventário manual
            const initialQuantity = Number(product.stock || product.initialStock || 0);
            if (initialQuantity > 0) {
                try {
                    await saveInventoryMove({
                        productId: newId,
                        productDescription: product.description || "Estoque Inicial",
                        type: 'entry',
                        quantity: initialQuantity,
                        date: product.createdAt || new Date().toISOString(),
                        label: 'Inventário de Saldo Inicial',
                        unitCost: product.costPrice || 0,
                        observation: 'Estoque Inicial (Saldo inicial no cadastro)'
                    }, 0); // initial stock assumes 0 previous stock
                } catch (stockError) {
                    console.error("Erro ao registrar estoque inicial:", stockError);
                }
            }
            */

            return newId;
        }
        return "";
    } catch (error: any) {
        console.error("Erro ao salvar o produto:", error.message || error);
        if (error.details) console.error("Detalhes do erro:", error.details);
        if (error.hint) console.error("Dica:", error.hint);
        throw error;
    }
};

export const updateProduct = async (id: string, productToUpdate: Partial<Product>): Promise<void> => {
    // Validação de SKU Global antes de atualizar
    if (productToUpdate.code) {
        const { exists, productDescription } = await checkSkuUniqueness(productToUpdate.code, id);
        if (exists) {
            throw new Error(`O código (SKU) "${productToUpdate.code}" já está em uso no produto: ${productDescription}`);
        }
    }

    // Validar SKUs das variações se estiverem sendo atualizadas
    if (productToUpdate.variations && productToUpdate.variations.length > 0) {
        for (const v of productToUpdate.variations) {
            if (v.sku) {
                const { exists, productDescription } = await checkSkuUniqueness(v.sku, id);
                if (exists) {
                    throw new Error(`A variação "${v.name}" usa o SKU "${v.sku}" que já pertence ao produto: ${productDescription}`);
                }
            }
        }
    }

    try {
        // Fetch current product for history log
        const { data: currentItem, error: fetchError } = await supabase
            .from(TABLE_NAME)
            .select('*')
            .eq('id', id)
            .single();

        if (fetchError) throw fetchError;

        const dbProduct = mapToDB(productToUpdate);
        let { error } = await supabase
            .from(TABLE_NAME)
            .update(dbProduct)
            .eq('id', id);

        // Fail-safe: If update fails due to missing columns (common after schema changes),
        // try to update without the newer dimension/detail columns.
        if (error && (error.message?.includes("column") || error.message?.includes("schema cache"))) {
            console.warn("[ProductService] Schema cache issue detected. Retrying without extended details...", error.message);
            
            // Lista de colunas que podem não existir no schema cache ainda
            const legacyFields = [
                'extra_dimensions', 'line', 'main_differential', 'material', 'colors', 
                'not_included', 'main_supplier_id', 'supplier_ref', 'observations', 'parent_id', 'is_variation'
            ];
            
            const safeDBProduct = { ...dbProduct };
            legacyFields.forEach(field => delete (safeDBProduct as any)[field]);
            
            const { error: retryError } = await supabase
                .from(TABLE_NAME)
                .update(safeDBProduct)
                .eq('id', id);
            
            error = retryError;
            // Nota: reload de schema via RPC removido (função não existe no projeto).
        }

        if (error) throw error;

        // Price History Logic
        const oldUnitPrice = Number(currentItem.unit_price);
        const newUnitPrice = productToUpdate.unitPrice !== undefined ? Number(productToUpdate.unitPrice) : oldUnitPrice;
        const oldCostPrice = Number(currentItem.cost_price);
        const newCostPrice = productToUpdate.costPrice !== undefined ? Number(productToUpdate.costPrice) : oldCostPrice;

        if (oldUnitPrice !== newUnitPrice || oldCostPrice !== newCostPrice) {
            let changeType = 'both';
            if (oldUnitPrice !== newUnitPrice && oldCostPrice === newCostPrice) changeType = 'unit_price';
            else if (oldUnitPrice === newUnitPrice && oldCostPrice !== newCostPrice) changeType = 'cost_price';

            await supabase.from('product_price_history').insert([{
                product_id: id,
                old_unit_price: oldUnitPrice,
                new_unit_price: newUnitPrice,
                old_cost_price: oldCostPrice,
                new_cost_price: newCostPrice,
                change_type: changeType
            }]);
        }

        if (productToUpdate.categoryIds !== undefined) {
            await supabase.from('product_categories').delete().eq('product_id', id);
            if (productToUpdate.categoryIds.length > 0) {
                const links = productToUpdate.categoryIds.map(cid => ({ product_id: id, category_id: cid }));
                await supabase.from('product_categories').insert(links);
            }
        }

        // --- Code Sync Logic ---
        // If code changed or variations changed, update linked orders
        const oldCode = currentItem.code;
        const newCode = dbProduct.code;
        const variationsChanged = productToUpdate.variations !== undefined;

        if ((newCode && oldCode !== newCode) || variationsChanged) {
            syncCodesInOrders(id, newCode || oldCode, productToUpdate.variations).catch(e => 
                console.error("Erro ao sincronizar códigos nas vendas:", e)
            );
        }
    } catch (error: any) {
        console.error("Erro ao atualizar o produto:", error.message || error);
        if (error.details) console.error("Detalhes do erro:", error.details);
        if (error.hint) console.error("Dica:", error.hint);
        throw error;
    }
};

/**
 * Sincroniza códigos de produtos e variações em pedidos de venda existentes
 */
const syncCodesInOrders = async (productId: string, parentCode: string, variations?: Variation[]) => {
    try {
        // Find orders containing this product
        const { data: orders, error } = await supabase
            .from('orders')
            .select('id, order_data')
            .contains('order_data', { items: [{ productId }] });

        if (error) throw error;
        if (!orders || orders.length === 0) return;

        for (const order of orders) {
            let changed = false;
            const orderData = order.order_data;
            if (!orderData?.items) continue;

            const updatedItems = orderData.items.map((item: any) => {
                if (item.productId === productId) {
                    let correctCode = parentCode;
                    
                    if (item.variationId && variations) {
                        const v = variations.find((v: any) => v.id === item.variationId);
                        if (v?.sku) correctCode = v.sku;
                    }

                    if (item.code !== correctCode) {
                        changed = true;
                        return { ...item, code: correctCode };
                    }
                }
                return item;
            });

            if (changed) {
                await supabase
                    .from('orders')
                    .update({ order_data: { ...orderData, items: updatedItems } })
                    .eq('id', order.id);
            }
        }
    } catch (err) {
        console.error(`Falha no sync de códigos para produto ${productId}:`, err);
    }
};

export const moveToTrash = async (id: string): Promise<void> => {
    try {
        await updateProduct(id, {
            deleted: true,
            active: false
        });
    } catch (error) {
        console.error("Erro ao mover produto para lixeira: ", error);
        throw error;
    }
};

export const restoreProduct = async (id: string): Promise<void> => {
    try {
        await updateProduct(id, {
            deleted: false,
            active: true
        });
    } catch (error) {
        console.error("Erro ao restaurar o produto: ", error);
        throw error;
    }
};

export const permanentDeleteProduct = async (id: string): Promise<void> => {
    try {
        // Check if there are any orders linked to this product
        // We look inside the order_data JSON column for the productId
        const { data: linkedOrders, error: checkError } = await supabase
            .from('orders')
            .select('id')
            .contains('order_data', { items: [{ productId: id }] })
            .limit(1);

        if (checkError) {
            console.error("Erro ao verificar vínculos do produto:", checkError);
        }

        if (linkedOrders && linkedOrders.length > 0) {
            throw new Error("Este produto possui vendas vinculadas e não pode ser excluído permanentemente. Por favor, utilize a desativação (Mover para Lixeira).");
        }

        const { error } = await supabase
            .from(TABLE_NAME)
            .delete()
            .eq('id', id);

        if (error) throw error;
    } catch (error: any) {
        console.error("Erro ao deletar permanentemente o produto: ", error);
        throw error;
    }
};

export const saveVariation = async (productId: string, variation: any): Promise<void> => {
    try {
        const { data: parent, error: fetchError } = await supabase
            .from(TABLE_NAME)
            .select('*')
            .eq('id', productId)
            .single();

        if (fetchError) throw fetchError;
        if (!parent) throw new Error("Produto pai não encontrado.");

        const variations = parent.variations || [];
        const index = variations.findIndex((v: any) => v.id === variation.id);

        // Price History Logic
        let oldUnitPrice = 0;
        let oldCostPrice = 0;
        
        if (index !== -1) {
            const oldVar = variations[index];
            oldUnitPrice = Number(oldVar.unitPrice || 0);
            oldCostPrice = Number(oldVar.costPrice || 0);
        }

        const newUnitPrice = Number(variation.unitPrice || 0);
        const newCostPrice = Number(variation.costPrice || 0);

        if (oldUnitPrice !== newUnitPrice || oldCostPrice !== newCostPrice) {
            let changeType = index === -1 ? 'both' : 'both';
            if (index !== -1) {
                if (oldUnitPrice !== newUnitPrice && oldCostPrice === newCostPrice) changeType = 'unit_price';
                else if (oldUnitPrice === newUnitPrice && oldCostPrice !== newCostPrice) changeType = 'cost_price';
            }

            await supabase.from('product_price_history').insert([{
                product_id: productId,
                variation_id: variation.id,
                old_unit_price: oldUnitPrice,
                new_unit_price: newUnitPrice,
                old_cost_price: oldCostPrice,
                new_cost_price: newCostPrice,
                change_type: changeType
            }]);
        }

        let newVariations = [...variations];
        if (index === -1) {
            newVariations.push(variation);
        } else {
            newVariations[index] = variation;
        }

        const { error: updateError } = await supabase
            .from(TABLE_NAME)
            .update({ variations: newVariations, updated_at: new Date().toISOString() })
            .eq('id', productId);

        if (updateError) throw updateError;
    } catch (error) {
        console.error("Erro ao salvar variação: ", error);
        throw error;
    }
};

/**
 * Sincroniza fotos e descrições do catálogo do WhatsApp para um produto existente no ERP
 */
export const syncFromWhatsApp = async (whatsappProduct: any): Promise<string> => {
    try {
        let existingProduct = null;
        const cleanRetailerId = whatsappProduct.retailer_id?.trim();

        // 1. Tentar encontrar pelo Código correspondente ao Retailer ID (Prioridade Máxima)
        if (cleanRetailerId) {
            console.log(`[WhatsAppSync] Buscando por código: ${cleanRetailerId}`);
            const { data, error } = await supabase
                .from(TABLE_NAME)
                .select('*')
                .eq('code', cleanRetailerId)
                .eq('deleted', false)
                .limit(1);
            
            if (error) console.error("[WhatsAppSync] Erro Supabase (Code):", error);
            if (data && data.length > 0) existingProduct = data[0];
        }

        // 2. Tentar encontrar pelo Nome (Description) - Busca Flexível
        if (!existingProduct && whatsappProduct.name) {
            const cleanName = whatsappProduct.name.trim();
            console.log(`[WhatsAppSync] Buscando por nome: ${cleanName}`);
            
            let { data, error } = await supabase
                .from(TABLE_NAME)
                .select('*')
                .ilike('description', `%${cleanName}%`)
                .eq('deleted', false)
                .limit(1);
            
            if (error) console.error("[WhatsAppSync] Erro Supabase (Name):", error);
                
            if (data && data.length > 0) {
                existingProduct = data[0];
            } else {
                // Se não achou exato/inteiro, pega as 2 primeiras palavras significativas (> 3 letras)
                const words = cleanName.split(' ').filter((w: string) => w.length > 3);
                if (words.length >= 2) {
                    const partialPattern = `%${words[0]}%${words[1]}%`;
                    console.log(`[WhatsAppSync] Tentando busca parcial: ${partialPattern}`);
                    const { data: partialData } = await supabase
                        .from(TABLE_NAME)
                        .select('*')
                        .ilike('description', partialPattern)
                        .eq('deleted', false)
                        .limit(1);
                        
                    if (partialData && partialData.length > 0) existingProduct = partialData[0];
                }
            }
        }

        if (existingProduct) {
            console.log(`[WhatsAppSync] Produto encontrado (ID: ${existingProduct.id}). Atualizando imagens...`);
            let currentImages = Array.isArray(existingProduct.images) ? existingProduct.images : [];
            
            // Adiciona a imagem do WhatsApp no topo, caso ela exista e já não esteja na lista
            if (whatsappProduct.image_url && !currentImages.includes(whatsappProduct.image_url)) {
                currentImages = [whatsappProduct.image_url, ...currentImages];
            }

            // Atualiza o produto com a nova imagem e descrição do WhatsApp
            await updateProduct(existingProduct.id, {
                images: currentImages,
                whatsappDescription: whatsappProduct.description || existingProduct.whatsapp_description,
            });
            
            return String(existingProduct.id);
        } else {
            console.warn(`[WhatsAppSync] Produto "${whatsappProduct.name}" não encontrado. Criando rascunho...`);
            const newProduct: Partial<Product> = {
                description: whatsappProduct.name,
                unitPrice: Number(whatsappProduct.price?.replace(/[^0-9.-]+/g, "") || 0),
                images: whatsappProduct.image_url ? [whatsappProduct.image_url] : [],
                whatsappDescription: whatsappProduct.description,
                isDraft: true,
                active: true,
                itemType: 'product',
                brand: 'Móveis Morante',
                condition: 'novo',
                code: cleanRetailerId
            };
            
            return await saveProduct(newProduct as Product);
        }
        
    } catch (error) {
        console.error("[WhatsAppSync] Falha crítica na sincronização:", error);
        throw error;
    }
};
export const getProductsByIds = async (ids: string[]): Promise<Product[]> => {
    try {
        const { data, error } = await supabase
            .from(TABLE_NAME)
            .select('*, product_categories(category_id)')
            .in('id', ids);

        if (error) throw error;
        return (data || []).map(mapFromDB);
    } catch (error) {
        console.error("Erro ao buscar produtos por IDs:", error);
        return [];
    }
};

export const getProductByCode = async (code: string): Promise<{ product: Product, variation?: Variation } | null> => {
    try {
        // 1. Try to find product by its own code
        const { data: directMatch, error: directError } = await supabase
            .from(TABLE_NAME)
            .select('*')
            .eq('code', code)
            .eq('deleted', false)
            .maybeSingle();

        if (directMatch) {
            return { product: mapFromDB(directMatch) };
        }

        // 2. Try to find a product that has a variation with this SKU
        // This is tricky with JSON columns in Supabase/Postgres if not indexed properly,
        // but for now we search for variations where SKU matches.
        // If we have MANY products, we might want a better index or a dedicated variations table.
        // For now, we fetch products that have variations and filter in memory if needed,
        // or try a specialized JSON query.
        
        const { data: variationMatch, error: variationError } = await supabase
            .from(TABLE_NAME)
            .select('*')
            .not('variations', 'is', null)
            .eq('deleted', false);
            
        if (variationMatch) {
            for (const p of variationMatch) {
                const mapped = mapFromDB(p);
                const variation = mapped.variations?.find(v => v.sku === code);
                if (variation) {
                    return { product: mapped, variation };
                }
            }
        }

        return null;
    } catch (error) {
        console.error("Erro ao buscar produto por código:", error);
        return null;
    }
};
/**
 * Busca estat├¡sticas de venda de um produto nos ├║ltimos 90 dias para calcular o giro mensal
 */
export const getProductSalesStats = async (productId: string, variationId?: string): Promise<{ avgMonthlySales: number }> => {
    try {
        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

        let query = supabase
            .from('orders')
            .select('order_data')
            .eq('deleted', false)
            .gte('created_at', ninetyDaysAgo.toISOString());

        // We use contains to find orders with this product
        if (variationId) {
            query = query.contains('order_data', { items: [{ productId, variationId }] });
        } else {
            query = query.contains('order_data', { items: [{ productId }] });
        }

        const { data, error } = await query;

        if (error) throw error;
        if (!data) return { avgMonthlySales: 0 };

        let totalQty = 0;
        data.forEach((row: any) => {
            const items = row.order_data?.items || [];
            items.forEach((item: any) => {
                if (item.productId === productId && (!variationId || item.variationId === variationId)) {
                    totalQty += item.quantity || 0;
                }
            });
        });

        // Avg per month (90 days = 3 months)
        return { avgMonthlySales: Math.round(totalQty / 3) };
    } catch (error) {
        console.error("Erro ao buscar estatísticas de venda:", error);
        return { avgMonthlySales: 0 };
    }
};

/**
 * Converte todos os produtos simples (sem variações) para o modelo de variações
 * criando uma variação padrão "COR: BRANCO" herdando os dados do pai.
 */
export const bulkConvertToVariations = async (): Promise<{ success: number, fails: number }> => {
    try {
        // 1. Buscar produtos simples que não foram deletados
        const { data: simpleProducts, error: fetchError } = await supabase
            .from(TABLE_NAME)
            .select('*')
            .eq('has_variations', false)
            .eq('deleted', false);

        if (fetchError) throw fetchError;
        if (!simpleProducts || simpleProducts.length === 0) return { success: 0, fails: 0 };

        let success = 0;
        let fails = 0;

        for (const p of simpleProducts) {
            try {
                const variationId = crypto.randomUUID();
                const defaultVariation: Variation = {
                    id: variationId,
                    name: "COR: BRANCO",
                    sku: p.code || `SKU-${variationId.substring(0, 8)}`,
                    stock: Number(p.stock || 0),
                    unitPrice: Number(p.unit_price || 0),
                    costPrice: Number(p.cost_price || 0),
                    active: true,
                    condition: p.condition || 'novo',
                    attributes: [{ name: 'COR', value: 'BRANCO' }],
                    syncWithParent: true,
                    syncUnitPrice: true,
                    syncCostPrice: true,
                    syncCondition: true
                };

                const { error: updateError } = await supabase
                    .from(TABLE_NAME)
                    .update({
                        has_variations: true,
                        variations: [defaultVariation],
                        code: null,
                        stock: 0,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', p.id);

                if (updateError) throw updateError;
                success++;
            } catch (err) {
                console.error(`Falha ao converter produto ${p.id}:`, err);
                fails++;
            }
        }

        return { success, fails };
    } catch (error) {
        console.error("Erro crítico na conversão em massa:", error);
        throw error;
    }
};
