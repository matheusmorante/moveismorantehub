import Product from '../../types/product.type';
import { normalizeSlug } from '../uniqueSlug';

/**
 * Converte um objeto Product (domínio) para os campos da tabela 'products' do Supabase
 */
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
