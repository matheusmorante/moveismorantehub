import { supabase } from '@/pages/utils/supabaseConfig';
import Product from '../../types/product.type';
import { resolveUniqueSlug } from '../uniqueSlug';
import { isDefaultVariation, normalizeVariationSku } from '../productVariationDefaults';
import { MAX_VARIATION_IMAGES } from './productImageHelpers';
import { mapToDB } from './productMapper';
import { TABLE_NAME, generateUniqueCode } from './productSkuService';

export const ensureUuidFormat = (product: Partial<Product>): string => {
    if (!product.id) return crypto.randomUUID();
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(product.id);
    if (isUUID) return product.id;
    throw new Error('IDs existentes são imutáveis. Um cadastro legado sem UUID deve ser regularizado em manutenção externa antes de ser alterado.');
};

export const syncProductToSupabase = async (product: Product): Promise<void> => {
    try {
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(product.id || '');
        if (!isUUID) {
            throw new Error('Produto sem UUID válido. IDs existentes não podem ser regenerados pelo sistema; regularize-o diretamente em manutenção externa.');
        }

        const dbData = mapToDB(product);
        // Remover propriedades que não são colunas diretas da tabela products
        delete dbData.variations;
        delete dbData.brand;
        delete dbData.category;
        delete dbData.ecommerce_description;
        delete dbData.whatsapp_description;
        delete dbData.whatsapp_template;
        delete dbData.ecommerce_template;
        delete dbData.initial_stock_entries;
        delete dbData.meta_title;
        delete dbData.meta_description;
        delete dbData.seo_description;

        dbData.slug = await resolveUniqueSlug(
            supabase,
            TABLE_NAME,
            dbData.slug || dbData.name || product.description || 'produto',
            dbData.id
        );
        
        // Preencher category_id primário na tabela products se houver categorias selecionadas
        if (Array.isArray(product.categoryIds) && product.categoryIds.length > 0) {
            dbData.category_id = product.categoryIds[0];
        } else if (Array.isArray(product.categoryIds) && product.categoryIds.length === 0) {
            dbData.category_id = null;
        }

        // O upsert atende tanto produtos novos quanto edições pelo UUID.
        dbData.name = dbData.name || product.description || 'Produto Sem Nome';
        let { error: productError } = await supabase.from(TABLE_NAME).upsert(dbData);
        if (productError && (productError.code === '23505' || productError.message?.toLowerCase().includes('slug'))) {
            dbData.slug = await resolveUniqueSlug(supabase, TABLE_NAME, dbData.slug, dbData.id);
            const retry = await supabase.from(TABLE_NAME).upsert(dbData);
            productError = retry.error;
        }
        if (productError) throw productError;

        // Atualizar category_id primário e sincronizar tabela product_categories
        if (product.id && Array.isArray(product.categoryIds)) {
            try {
                // Sincronizar na tabela intermediária N:N product_categories
                await supabase.from("product_categories").delete().eq("product_id", product.id);
                if (product.categoryIds.length > 0) {
                    const categoryRecords = product.categoryIds.map(catId => ({
                        product_id: product.id,
                        category_id: catId
                    }));
                    const { error: catInsertErr } = await supabase.from("product_categories").insert(categoryRecords);
                    if (catInsertErr) {
                        console.warn("[ProductService] Aviso ao inserir product_categories:", catInsertErr);
                    }
                }
            } catch (catErr) {
                console.error("[ProductService] Erro ao sincronizar product_categories:", catErr);
            }
        }

        // Sincronizar imagens na tabela product_images
        if (product.id && Array.isArray(product.images) && product.images.length > 0) {
            try {
                const imageRecords = product.images.map((url, idx) => ({
                    product_id: product.id,
                    image_url: url,
                    is_main: idx === 0
                }));
                await supabase.from("product_images").delete().eq("product_id", product.id);
                await supabase.from("product_images").insert(imageRecords);
            } catch (imgErr) {
                console.error("[ProductService] Erro ao sincronizar product_images:", imgErr);
            }
        }

        // Sincronizar variações na tabela product_variations
        if (product.id) {
            if ((product.hasVariations || (Array.isArray(product.variations) && product.variations.length > 0)) && product.variations && product.variations.length > 0) {
                // Foto é requisito de publicação no catálogo, não requisito operacional.
                const isUuid = (value?: string) => Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value));
                const variationsWithUuid = product.variations
                    .map((variation, originalIndex) => ({ variation, originalIndex }))
                    .filter(({ variation }) => isUuid(variation.id));
                if (variationsWithUuid.length !== product.variations.length) {
                    console.warn('[ProductService] Variações legadas sem UUID foram preservadas e ignoradas neste salvamento.');
                }

                const { data: existingVariations, error: existingVariationsError } = await supabase
                    .from("product_variations")
                    .select("sku")
                    .neq("product_id", product.id);
                if (existingVariationsError) throw existingVariationsError;
                const usedSkus = new Set((existingVariations || []).map((variation: any) => String(variation.sku || '')).filter(Boolean));

                const recordsToSave = variationsWithUuid.map(({ variation: v, originalIndex: index }) => {
                    const attributesObj: Record<string, string> = {};
                    (v.attributes || []).forEach((attr: any) => {
                        if (attr.name && attr.value) {
                            attributesObj[attr.name] = attr.value;
                        }
                    });

                    const parentCode = product.code && product.code !== '000000' ? product.code : generateUniqueCode(product.id);
                    const suffix = String(index + 1).padStart(2, '0');
                    const defaultSku = `${parentCode}-${suffix}`;
                    const rawSku = v.sku && typeof v.sku === 'string' ? normalizeVariationSku(v.sku.trim()) : '';
                    let resolvedSku = rawSku || defaultSku;
                    if (usedSkus.has(resolvedSku)) {
                        throw new Error(`O SKU da variação "${resolvedSku}" já está em uso por outro produto.`);
                    }
                    usedSkus.add(resolvedSku);
                    v.sku = resolvedSku;

                    const effectiveImages = isDefaultVariation(v, index)
                        ? (product.images || v.images || []).slice(0, MAX_VARIATION_IMAGES)
                        : (v.images || []);
                    return {
                        ...(v.id ? { id: v.id } : {}),
                        product_id: product.id,
                        name: v.name,
                        sku: resolvedSku,
                        price: v.syncUnitPrice ? (product.unitPrice ? Number(product.unitPrice) : 0) : (v.unitPrice !== undefined && v.unitPrice !== null ? Number(v.unitPrice) : 0),
                        stock: v.stock ? parseInt(String(v.stock), 10) : 0,
                        image_url: effectiveImages.length > 0 ? effectiveImages.join(",") : null,
                        attributes: attributesObj,
                        promo_price: v.syncPromoPrice !== false ? (product.promoPrice ? Number(product.promoPrice) : null) : (v.promoPrice !== undefined && v.promoPrice !== null ? Number(v.promoPrice) : null),
                        description: v.syncDescription ? null : (v.description || null),
                        width: v.width ? String(v.width) : null,
                        depth: v.depth ? String(v.depth) : null,
                        height: v.height ? String(v.height) : null,
                        use_parent_price: v.syncUnitPrice !== false,
                        use_parent_promo_price: v.syncPromoPrice !== false,
                        use_parent_dimensions: v.syncWidth !== false,
                        use_parent_description: v.syncDescription !== false,
                        use_parent_name: true,
                        status: v.status || 'published',
                        active: v.active !== undefined ? Boolean(v.active) : (product.active !== false)
                    };
                });

                if (recordsToSave.length > 0) {
                    const { error: varErr } = await supabase.from("product_variations").upsert(recordsToSave);
                    if (varErr) throw varErr;
                }
            } else {
                await supabase.from("product_variations").delete().eq("product_id", product.id);
            }
        }
    } catch (err: any) {
        console.error("[ProductService] Erro ao salvar dados no Supabase:", err);
        throw new Error(err.message || "Erro ao salvar no Supabase");
    }
};
