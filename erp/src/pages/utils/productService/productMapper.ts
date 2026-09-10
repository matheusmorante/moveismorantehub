import Product, { Variation } from '../../types/product.type';
import { normalizeSlug } from '../uniqueSlug';
import { parseVariationImages } from './productImageHelpers';

export const mapToDB = (product: Partial<Product>) => {
    const data: any = {
        updated_at: new Date().toISOString()
    };

    if (product.id !== undefined && product.id !== '') data.id = product.id;
    if (product.code !== undefined) data.code = product.code;

    const nameCandidate = product.name || product.title || product.marketplaceTitle || product.description;
    if (nameCandidate !== undefined && nameCandidate !== '') {
        data.name = nameCandidate;
        data.slug = normalizeSlug(nameCandidate);
    } else if (product.isDraft) {
        data.name = 'Rascunho de Produto';
        data.slug = normalizeSlug(`rascunho-${product.id || Date.now()}`);
    }
    if (product.description !== undefined) data.description = product.description;
    if (product.brand !== undefined) data.brand = product.brand;
    if (product.category !== undefined) data.category = product.category;
    if ((product as any).category_id !== undefined) data.category_id = (product as any).category_id;
    if (Array.isArray(product.categoryIds) && product.categoryIds.length > 0) {
        data.category_id = product.categoryIds[0];
    } else if (Array.isArray(product.categoryIds) && product.categoryIds.length === 0) {
        data.category_id = null;
    }
    if (product.condition !== undefined) data.condition = product.condition;
    if (product.unitPrice !== undefined) {
        data.unit_price = product.unitPrice;
        data.price = product.unitPrice;
    }
    if (product.costPrice !== undefined) data.cost_price = product.costPrice;
    if (product.freightType !== undefined) data.freight_type = product.freightType;
    if (product.freightCost !== undefined) data.freight_cost = product.freightCost;
    if (product.ipiPercent !== undefined) data.ipi_percent = product.ipiPercent;
    if (product.finalPurchasePrice !== undefined) data.final_purchase_price = product.finalPurchasePrice;
    if (product.initialStock !== undefined) data.initial_stock = product.initialStock;
    if (product.stock !== undefined) data.stock = product.stock;
    if (product.minStock !== undefined) data.min_stock = product.minStock;
    if (product.unit !== undefined) data.unit = product.unit;
    if (product.active !== undefined) data.active = product.active;
    if (product.isDraft !== undefined) data.is_draft = product.isDraft;
    if (product.deleted !== undefined) data.deleted = product.deleted;
    const supplierCandidate = product.mainSupplierId || product.supplierId || (product as any).main_supplier_id || (product as any).supplier_id || null;
    if (product.mainSupplierId !== undefined || product.supplierId !== undefined || (product as any).main_supplier_id !== undefined || (product as any).supplier_id !== undefined) {
        data.supplier_id = supplierCandidate;
        data.main_supplier_id = supplierCandidate;
    }
    if (product.supplierIds !== undefined || (product as any).supplier_ids !== undefined) {
        data.supplier_ids = product.supplierIds || (product as any).supplier_ids || (supplierCandidate ? [supplierCandidate] : []);
    } else if (supplierCandidate) {
        data.supplier_ids = [supplierCandidate];
    }
    if (product.images !== undefined) data.images = product.images;
    if (product.ecommerceDescription !== undefined) data.ecommerce_description = product.ecommerceDescription;
    if (product.whatsappDescription !== undefined) data.whatsapp_description = product.whatsappDescription;
    if (product.whatsappTemplate !== undefined) data.whatsapp_template = product.whatsappTemplate;
    if (product.ecommerceTemplate !== undefined) data.ecommerce_template = product.ecommerceTemplate;
    if (product.hasVariations !== undefined || product.variations !== undefined) {
        data.has_variations = Boolean(product.hasVariations);
    }
    if (product.variations !== undefined) data.variations = product.variations;
    if (product.itemType !== undefined) data.item_type = product.itemType;
    if (product.fiscal !== undefined) data.fiscal = product.fiscal;
    if (product.notificationConfig !== undefined) data.notification_config = product.notificationConfig;
    if (product.isCombo !== undefined) data.is_combo = product.isCombo;
    if (product.comboItems !== undefined) data.combo_items = product.comboItems;
    if (product.initialStockEntries !== undefined) data.initial_stock_entries = product.initialStockEntries;
    if (product.whatsappSync !== undefined) data.whatsapp_sync = product.whatsappSync;
    if (product.ecommerceSync !== undefined) data.ecommerce_sync = product.ecommerceSync;
    if (product.whatsappAutoSync !== undefined) data.whatsapp_auto_sync = product.whatsappAutoSync;
    if (product.lastWhatsappSync !== undefined) data.last_whatsapp_sync = product.lastWhatsappSync;
    if (product.width !== undefined) data.width = product.width !== null ? String(product.width) : null;
    if (product.height !== undefined) data.height = product.height !== null ? String(product.height) : null;
    if (product.depth !== undefined) data.depth = product.depth !== null ? String(product.depth) : null;

    // Manter o campo measures sincronizado no Supabase se houver dimensões
    const measureParts: string[] = [];
    if (product.height) measureParts.push(`Altura: ${product.height}cm`);
    if (product.width) measureParts.push(`Largura: ${product.width}cm`);
    if (product.depth) measureParts.push(`Profundidade: ${product.depth}cm`);
    if (measureParts.length > 0) {
        data.measures = measureParts.join(' | ');
    }
    if (product.pkgWidth !== undefined) data.pkg_width = product.pkgWidth;
    if (product.pkgHeight !== undefined) data.pkg_height = product.pkgHeight;
    if (product.pkgDepth !== undefined) data.pkg_depth = product.pkgDepth;
    if (product.extraDimensions !== undefined) data.extra_dimensions = product.extraDimensions;
    if (product.line !== undefined) data.line = product.line;
    if (product.mainDifferential !== undefined) data.main_differential = product.mainDifferential;
    if (product.material !== undefined) data.material = product.material;
    if (product.colors !== undefined) data.colors = product.colors;
    if (product.notIncluded !== undefined) data.not_included = product.notIncluded;
    if (product.mainSupplierId !== undefined) data.main_supplier_id = product.mainSupplierId || null;
    if (product.supplierRef !== undefined) data.supplier_ref = product.supplierRef;
    if (product.observations !== undefined) data.observations = product.observations;
    if (product.parentId !== undefined) data.parent_id = product.parentId || null;
    if (product.isVariation !== undefined) data.is_variation = product.isVariation;
    if (product.noWidth !== undefined) data.no_width = product.noWidth;
    if (product.noHeight !== undefined) data.no_height = product.noHeight;
    if (product.noDepth !== undefined) data.no_depth = product.noDepth;
    if (product.noBrand !== undefined) data.no_brand = product.noBrand;
    if (product.noColors !== undefined) data.no_colors = product.noColors;
    if (product.hasNoLine !== undefined) data.has_no_line = product.hasNoLine;
    if (product.productTypeId !== undefined) data.product_type_id = product.productTypeId || null;
    if (product.productTypeName !== undefined) data.product_type_name = product.productTypeName;
    if (product.environment !== undefined) data.environment = product.environment;
    if (product.includeEnvironment !== undefined) data.include_environment = product.includeEnvironment;
    if (product.includeLine !== undefined) data.include_line = product.includeLine;
    if (product.includeBrand !== undefined) data.include_brand = product.includeBrand;
    if (product.includeType !== undefined) data.include_type = product.includeType;
    if (product.includeSupplierRef !== undefined) data.include_supplier_ref = product.includeSupplierRef;
    if (product.titleComplement !== undefined) data.title_complement = product.titleComplement;
    if (product.includeComplement !== undefined) data.include_complement = product.includeComplement;
    if (product.titleOrder !== undefined) data.title_order = product.titleOrder;
    if (product.slug !== undefined && product.slug.trim()) data.slug = normalizeSlug(product.slug);
    if (product.meta_title !== undefined) data.meta_title = product.meta_title;
    if (product.meta_description !== undefined) data.meta_description = product.meta_description;
    if (product.seo_description !== undefined) data.seo_description = product.seo_description;

    // Novas propriedades do e-commerce
    if (product.promoPrice !== undefined) data.promo_price = product.promoPrice || null;
    if (product.featured !== undefined) data.featured = product.featured;
    if (product.depthUseLength !== undefined) data.depth_use_length = product.depthUseLength;
    if (product.status !== undefined) data.status = product.status;
    if (product.condition !== undefined) data.is_salvado = product.condition === 'salvado';
    if (product.opportunityId !== undefined) data.opportunity_id = product.opportunityId || null;

    return data;
};

export const mapFromDB = (data: any, index?: number): Product => {
    const rawName = data.name || data.title || (data.description ? data.description.split('\n')[0].substring(0, 120) : '');

    // Coletar imagens (da tabela relacionada product_images, data.images, ou variações)
    let productImages: string[] = [];
    if (Array.isArray(data.product_images) && data.product_images.length > 0) {
        const sortedImages = [...data.product_images].sort((a, b) => (b.is_main ? 1 : 0) - (a.is_main ? 1 : 0));
        productImages = sortedImages.map((img: any) => img.image_url ? String(img.image_url).trim() : '').filter(Boolean);
    }

    if (productImages.length === 0) {
        if (Array.isArray(data.images)) {
            productImages = data.images.map((img: any) => typeof img === 'string' ? img.trim() : String(img)).filter(Boolean);
        } else if (typeof data.images === 'string' && data.images.trim()) {
            const trimmed = data.images.trim();
            if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
                try {
                    const parsed = JSON.parse(trimmed);
                    if (Array.isArray(parsed)) {
                        productImages = parsed.map((img: any) => String(img).trim()).filter(Boolean);
                    }
                } catch (e) {
                    productImages = [trimmed];
                }
            } else if (trimmed.includes(',')) {
                productImages = trimmed.split(',').map((s: string) => s.trim()).filter(Boolean);
            } else {
                productImages = [trimmed];
            }
        }
    }

    const variationRecords = data.product_variations || data.variations || [];
    
    // Coletar categoria
    let categoryNames: string[] = [];
    if (Array.isArray(data.product_categories) && data.product_categories.length > 0) {
        categoryNames = data.product_categories
            .map((pc: any) => pc.categories?.name || pc.category_name || pc.name)
            .filter(Boolean);
    }
    let primaryCategory = data.category || (categoryNames.length > 0 ? categoryNames.join(' | ') : '');

    // Extrair dimensões (height, width, depth) com parsing numérico robusto e fallback para string measures
    let parsedWidth = data.width !== null && data.width !== undefined && String(data.width).trim() !== '' ? parseFloat(String(data.width).replace(',', '.')) : undefined;
    let parsedHeight = data.height !== null && data.height !== undefined && String(data.height).trim() !== '' ? parseFloat(String(data.height).replace(',', '.')) : undefined;
    let parsedDepth = data.depth !== null && data.depth !== undefined && String(data.depth).trim() !== '' ? parseFloat(String(data.depth).replace(',', '.')) : undefined;

    const measuresText = data.measures || '';
    if (measuresText) {
        const wMatch = measuresText.match(/larg(?:ura)?:\s*([0-9.,]+)/i) || measuresText.match(/([0-9.,]+)\s*cm\s*de\s*larg/i);
        if (wMatch) {
            const val = parseFloat(wMatch[1].replace(',', '.'));
            if (!isNaN(val) && val > 0) parsedWidth = val;
        }

        const hMatch = measuresText.match(/alt(?:ura)?:\s*([0-9.,]+)/i) || measuresText.match(/([0-9.,]+)\s*cm\s*de\s*alt/i);
        if (hMatch) {
            const val = parseFloat(hMatch[1].replace(',', '.'));
            if (!isNaN(val) && val > 0) parsedHeight = val;
        }

        const dMatch = measuresText.match(/prof(?:undidade)?:\s*([0-9.,]+)/i) || measuresText.match(/([0-9.,]+)\s*cm\s*de\s*prof/i);
        if (dMatch) {
            const val = parseFloat(dMatch[1].replace(',', '.'));
            if (!isNaN(val) && val > 0) parsedDepth = val;
        }
    }

    const fallbackCode = index !== undefined ? String(index + 1).padStart(6, '0') : '';
    const parentCode = data.code || data.sku || fallbackCode;

    const mappedVariations = variationRecords.map((v: any, vIdx: number) => {
        const varImages = parseVariationImages(v.image_url, v.images);
        const suffix = String(vIdx + 1).padStart(2, '0');
        const expectedPrefix = parentCode ? `${parentCode}-` : '';
        const isAlreadyFormatted = expectedPrefix && v.sku && typeof v.sku === 'string' && v.sku.startsWith(expectedPrefix);
        const resolvedSku = isAlreadyFormatted ? v.sku : (parentCode ? `${parentCode}-${suffix}` : (v.sku || ''));
        
        let attributesList: { name: string; value: string; showName?: boolean }[] = [];
        const rawAttrs = v.attributes;

        if (Array.isArray(rawAttrs)) {
            attributesList = rawAttrs.map((a: any) => ({
                name: a.name || a.attribute_name || a.key || '',
                value: String(a.value || a.option || ''),
                showName: a.showName ?? true
            })).filter(a => a.name && a.value);
        } else if (rawAttrs && typeof rawAttrs === 'object') {
            attributesList = Object.entries(rawAttrs).map(([name, value]) => ({
                name,
                value: typeof value === 'object' && value !== null ? String((value as any).value || (value as any).name || JSON.stringify(value)) : String(value),
                showName: true
            })).filter(a => a.name && a.value);
        } else if (typeof rawAttrs === 'string') {
            try {
                const parsed = JSON.parse(rawAttrs);
                if (Array.isArray(parsed)) {
                    attributesList = parsed.map((a: any) => ({ name: a.name || '', value: String(a.value || ''), showName: true }));
                } else if (parsed && typeof parsed === 'object') {
                    attributesList = Object.entries(parsed).map(([name, value]) => ({ name, value: String(value), showName: true }));
                }
            } catch (e) {}
        }

        if (v.product_id) {
            return {
                id: String(v.id),
                mergedToVariationId: v.merged_to_variation_id || undefined,
                sku: resolvedSku,
                name: v.name || '',
                stock: Number(v.stock || 0),
                unitPrice: v.use_parent_price ? Number(data.unit_price || 0) : Number(v.price || 0),
                promoPrice: v.use_parent_promo_price ? Number(data.promo_price || 0) : Number(v.promo_price || 0),
                costPrice: Number(data.cost_price || 0),
                active: v.active !== undefined && v.active !== null ? Boolean(v.active) : Boolean(data.active),
                status: (v.status || data.status || 'published') as 'draft' | 'published' | 'hidden',
                condition: data.condition || 'novo',
                attributes: attributesList,
                images: varImages,
                syncUnitPrice: v.use_parent_price !== false,
                syncPromoPrice: v.use_parent_promo_price !== false,
                syncDescription: v.use_parent_description !== false,
                description: v.description || '',
                syncWidth: v.use_parent_dimensions !== false,
                syncHeight: v.use_parent_dimensions !== false,
                syncDepth: v.use_parent_dimensions !== false,
                syncWeight: v.use_parent_dimensions !== false,
                width: v.width ? Number(v.width) : undefined,
                depth: v.depth ? Number(v.depth) : undefined,
                height: v.height ? Number(v.height) : undefined,
                weight: v.weight ? Number(v.weight) : undefined,
            };
        }
        return {
            ...v,
            images: varImages,
            attributes: attributesList,
            unitPrice: v.unitPrice || 0,
            costPrice: v.costPrice || 0,
            stock: v.stock || 0,
            sku: resolvedSku
        };
    });

    const finalVariations = (mappedVariations.length === 0 && (!data.item_type || data.item_type === 'product'))
        ? [{
            id: `${data.id}_${parentCode ? `${parentCode}-01` : '01'}`,
            sku: parentCode ? `${parentCode}-01` : '01',
            name: rawName || 'Padrão',
            stock: Number(data.stock || 0),
            unitPrice: Number(data.price !== undefined && data.price !== null ? data.price : (data.unit_price || 0)),
            promoPrice: data.promo_price !== null && data.promo_price !== undefined ? Number(data.promo_price) : undefined,
            costPrice: Number(data.cost_price || 0),
            active: Boolean(data.active),
            status: (data.status || 'published') as 'draft' | 'published' | 'hidden',
            condition: data.condition || (data.is_salvado ? 'salvado' : 'novo'),
            attributes: [],
            images: productImages,
            syncUnitPrice: true,
            syncPromoPrice: true,
            syncCostPrice: true,
            syncDescription: true,
            syncWidth: true,
            syncHeight: true,
            syncDepth: true,
            syncWeight: true,
        }]
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
        active: Boolean(data.active),
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
