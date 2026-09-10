import { Variation } from '../../types/product.type';
import { parseVariationImages } from './productImageHelpers';

/**
 * Converte um atributo cru de variação em lista estruturada
 */
export const parseVariationAttributes = (rawAttrs: any): { name: string; value: string; showName?: boolean }[] => {
    if (Array.isArray(rawAttrs)) {
        return rawAttrs.map((a: any) => ({
            name: a.name || a.attribute_name || a.key || '',
            value: String(a.value || a.option || ''),
            showName: a.showName ?? true
        })).filter(a => a.name && a.value);
    }
    
    if (rawAttrs && typeof rawAttrs === 'object') {
        return Object.entries(rawAttrs).map(([name, value]) => ({
            name,
            value: typeof value === 'object' && value !== null ? String((value as any).value || (value as any).name || JSON.stringify(value)) : String(value),
            showName: true
        })).filter(a => a.name && a.value);
    }
    
    if (typeof rawAttrs === 'string') {
        try {
            const parsed = JSON.parse(rawAttrs);
            if (Array.isArray(parsed)) {
                return parsed.map((a: any) => ({ name: a.name || '', value: String(a.value || ''), showName: true }));
            }
            if (parsed && typeof parsed === 'object') {
                return Object.entries(parsed).map(([name, value]) => ({ name, value: String(value), showName: true }));
            }
        } catch (e) {
            // Se não for JSON válido, ignora
        }
    }

    return [];
};

/**
 * Mapeia os registros de variação vindos do banco de dados para a interface Variation do domínio
 */
export const mapDbVariations = (variationRecords: any[], data: any, parentCode: string): Variation[] => {
    return variationRecords.map((v: any, vIdx: number) => {
        const varImages = parseVariationImages(v.image_url, v.images);
        const suffix = String(vIdx + 1).padStart(2, '0');
        const expectedPrefix = parentCode ? `${parentCode}-` : '';
        const isAlreadyFormatted = expectedPrefix && v.sku && typeof v.sku === 'string' && v.sku.startsWith(expectedPrefix);
        const resolvedSku = isAlreadyFormatted ? v.sku : (parentCode ? `${parentCode}-${suffix}` : (v.sku || ''));
        
        const attributesList = parseVariationAttributes(v.attributes);

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
};

/**
 * Cria a variação padrão para produtos simples
 */
export const createDefaultVariation = (data: any, parentCode: string, rawName: string, productImages: string[]): Variation[] => {
    return [{
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
    }];
};
