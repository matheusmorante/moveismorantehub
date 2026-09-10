import Product from '../../types/product.type';
import { mapToDB } from './productToDbMapper';
import { mapDbVariations, createDefaultVariation } from './productVariationMapper';
import { extractProductImages, extractProductDimensions } from './productDimensionsExtractor';

export { mapToDB };

/**
 * Converte um registro do banco de dados (Supabase) para o tipo de domínio Product
 */
export const mapFromDB = (data: any, index?: number): Product => {
    const rawName = data.name || data.title || (data.description ? data.description.split('\n')[0].substring(0, 120) : '');

    const productImages = extractProductImages(data);
    const { width: parsedWidth, height: parsedHeight, depth: parsedDepth } = extractProductDimensions(data);

    const variationRecords = data.product_variations || data.variations || [];
    
    // Coletar categoria
    let categoryNames: string[] = [];
    if (Array.isArray(data.product_categories) && data.product_categories.length > 0) {
        categoryNames = data.product_categories
            .map((pc: any) => pc.categories?.name || pc.category_name || pc.name)
            .filter(Boolean);
    }
    const primaryCategory = data.category || (categoryNames.length > 0 ? categoryNames.join(' | ') : '');

    const fallbackCode = index !== undefined ? String(index + 1).padStart(6, '0') : '';
    const parentCode = data.code || data.sku || fallbackCode;

    const mappedVariations = mapDbVariations(variationRecords, data, parentCode);

    const finalVariations = (mappedVariations.length === 0 && (!data.item_type || data.item_type === 'product'))
        ? createDefaultVariation(data, parentCode, rawName, productImages)
        : mappedVariations;

    return {
        id: String(data.id),
        sku: data.sku || parentCode,
        code: parentCode,
        name: rawName,
        title: data.title || rawName,
        marketplaceTitle: data.title || rawName,
        description: data.description || '',
        brand: data.brand || '',
        category: primaryCategory,
        condition: data.condition || (data.is_salvado ? 'salvado' : 'novo'),
        opportunityId: data.opportunity_id || null,
        opportunityName: data.opportunities?.name || data.opportunity_name || null,
        opportunity: data.opportunities ? { id: data.opportunities.id, name: data.opportunities.name, badge_color: data.opportunities.badge_color } : null,
        unitPrice: Number(data.price !== undefined && data.price !== null ? data.price : (data.unit_price || 0)),
        costPrice: Number(data.cost_price || 0),
        freightType: data.freight_type || 'fixed',
        freightCost: Number(data.freight_cost || 0),
        ipiPercent: Number(data.ipi_percent || 0),
        finalPurchasePrice: Number(data.final_purchase_price || 0),
        initialStock: Number(data.initial_stock || 0),
        stock: Number(data.stock || 0),
        minStock: Number(data.min_stock || 0),
        unit: data.unit || 'UN',
        active: finalVariations.length > 0 ? finalVariations.some(v => v.active) : Boolean(data.active),
        isDraft: Boolean(data.is_draft) || data.status === 'draft',
        deleted: data.deleted ?? false,
        supplierId: data.supplier_id || data.main_supplier_id || '',
        mainSupplierId: data.main_supplier_id || data.supplier_id || '',
        supplierIds: Array.isArray(data.supplier_ids) ? data.supplier_ids : (data.supplier_id ? [data.supplier_id] : (data.main_supplier_id ? [data.main_supplier_id] : [])),
        images: productImages,
        ecommerceDescription: data.ecommerce_description || '',
        whatsappDescription: data.whatsapp_description || '',
        whatsappTemplate: data.whatsapp_template || '',
        ecommerceTemplate: data.ecommerce_template || '',
        hasVariations: (data.item_type === 'product' || !data.item_type) ? true : Boolean(data.has_variations),
        variations: finalVariations,
        itemType: data.item_type || 'product',
        fiscal: {
            ncm: data.fiscal?.ncm || '',
            cest: data.fiscal?.cest || '',
            ncmDescription: data.fiscal?.ncmDescription || '',
            cfop: data.fiscal?.cfop || '5102',
            icmsPercent: Number(data.fiscal?.icmsPercent || 0)
        },
        notificationConfig: data.notification_config || {},
        isCombo: data.is_combo || false,
        comboItems: data.combo_items || [],
        categoryIds: (Array.isArray(data.product_categories) && data.product_categories.length > 0)
            ? data.product_categories.map((pc: any) => pc.category_id || pc.id || pc).filter(Boolean)
            : (data.category_id ? [data.category_id] : []),
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        width: parsedWidth,
        height: parsedHeight,
        depth: parsedDepth,
        weight: data.weight !== null && data.weight !== undefined ? Number(data.weight) : undefined,
        pkgWidth: Number(data.pkg_width || 0),
        pkgHeight: Number(data.pkg_height || 0),
        pkgDepth: Number(data.pkg_depth || 0),
        extraDimensions: data.extra_dimensions || [],
        line: data.line || '',
        mainDifferential: data.main_differential || '',
        material: data.material || '',
        colors: data.colors || '',
        notIncluded: data.not_included || '',
        slug: data.slug || '',
        meta_title: data.meta_title || '',
        meta_description: data.meta_description || '',
        seo_description: data.seo_description || '',
        promoPrice: data.promo_price !== null && data.promo_price !== undefined ? Number(data.promo_price) : undefined,
        featured: data.featured ?? false,
        depthUseLength: data.depth_use_length ?? false,
        status: data.status || 'draft',
        supplierRef: data.supplier_ref || '',
        observations: data.observations || '',
        parentId: data.parent_id || '',
        isVariation: data.is_variation ?? false,
        noWidth: data.no_width ?? false,
        noHeight: data.no_height ?? false,
        noDepth: data.no_depth ?? false,
        noBrand: data.no_brand ?? false,
        noColors: data.no_colors ?? false,
        hasNoLine: data.has_no_line ?? false,
        productTypeId: data.product_type_id || '',
        productTypeName: data.product_type_name || '',
        environment: data.environment || '',
        includeEnvironment: data.include_environment ?? true,
        includeLine: data.include_line ?? true,
        includeBrand: data.include_brand ?? true,
        includeType: data.include_type ?? true,
        includeSupplierRef: data.include_supplier_ref ?? false,
        titleComplement: data.title_complement || '',
        includeComplement: data.include_complement ?? true,
        titleOrder: data.title_order || ["type", "environment", "line", "brand", "complement"],
        whatsappSync: data.whatsapp_sync ?? false,
        ecommerceSync: data.ecommerce_sync ?? false,
        whatsappAutoSync: data.whatsapp_auto_sync ?? false,
        lastWhatsappSync: data.last_whatsapp_sync
    };
};
