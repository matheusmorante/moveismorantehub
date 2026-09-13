import Product from "@/pages/types/product.type";

export interface ERPLegibilityResult {
    isLegible: boolean;
    errors: string[];
    checks: {
        description: boolean;
        unitPrice: boolean;
        categories: boolean;
        supplier: boolean;
    };
}

export interface EcomLegibilityResult {
    isLegible: boolean;
    errors: string[];
    checks: {
        marketplaceTitle: boolean;
        description: boolean;
        unitPrice: boolean;
        categories: boolean;
        images: boolean;
        dimensions: boolean;
    };
}

export function checkERPLegibility(data: Partial<Product>): ERPLegibilityResult {
    const errors: string[] = [];
    const hasVars = Boolean(data.hasVariations);

    if (!data.description || data.description.trim().length < 2) {
        errors.push("Nome do Produto (Interno) deve ter pelo menos 2 caracteres.");
    }
    if (!hasVars) {
        if (!data.unitPrice || data.unitPrice <= 0) {
            errors.push("Preço de Venda deve ser maior que zero.");
        }
        if (data.promoPrice !== undefined && data.promoPrice !== null && !isNaN(data.promoPrice) && data.promoPrice > 0) {
            const up = data.unitPrice || 0;
            if (data.promoPrice >= up) {
                errors.push("O preço promocional deve ser menor que o preço de venda.");
            }
        }
    } else {
        if (!data.variations || data.variations.length === 0) {
            errors.push("Adicione pelo menos uma variação para o produto.");
        }
    }
    if (!data.categoryIds || data.categoryIds.length === 0) {
        errors.push("Pelo menos uma categoria deve ser selecionada.");
    }
    if (!data.mainSupplierId) {
        errors.push("Selecione pelo menos um fornecedor.");
    }

    return {
        isLegible: errors.length === 0,
        errors,
        checks: {
            description: !!data.description && data.description.trim().length >= 2,
            unitPrice: hasVars ? Boolean(data.variations && data.variations.length > 0) : Boolean(data.unitPrice && data.unitPrice > 0),
            categories: Boolean(data.categoryIds && data.categoryIds.length > 0),
            supplier: Boolean(data.mainSupplierId)
        }
    };
}

export function checkEcomLegibility(data: Partial<Product>): EcomLegibilityResult {
    const errors: string[] = [];
    const hasVars = Boolean(data.hasVariations);
    const catalogTitle = data.title || data.marketplaceTitle;
    const catalogDescription = data.ecommerceDescription || data.description;

    if (!catalogTitle || catalogTitle.trim().length < 2) {
        errors.push("Título do Produto (E-commerce) deve ter pelo menos 2 caracteres.");
    }
    if (!catalogDescription || catalogDescription.trim().length < 2) {
        errors.push("Descrição do catálogo deve ser preenchida antes da publicação.");
    }
    if (!hasVars && (!data.unitPrice || data.unitPrice <= 0)) {
        errors.push("Preço de Venda deve ser maior que zero.");
    }
    if (!data.categoryIds || data.categoryIds.length === 0) {
        errors.push("Pelo menos uma categoria deve ser selecionada.");
    }
    if (!data.images || data.images.length === 0) {
        errors.push("Pelo menos uma foto deve ser adicionada.");
    }

    const isService = data.itemType === 'service';
    if (!isService) {
        if (!data.width || Number(data.width) <= 0) {
            errors.push("Largura deve ser maior que zero.");
        }
        if (!data.height || Number(data.height) <= 0) {
            errors.push("Altura deve ser maior que zero.");
        }
        if (!data.depth || Number(data.depth) <= 0) {
            errors.push("Profundidade deve ser maior que zero.");
        }
    }
    
    if (data.promoPrice !== undefined && data.promoPrice !== null && !isNaN(data.promoPrice) && data.promoPrice > 0) {
        const up = data.unitPrice || 0;
        if (data.promoPrice >= up) {
            errors.push("O preço promocional deve ser menor que o preço de venda.");
        }
    }

    return {
        isLegible: errors.length === 0,
        errors,
        checks: {
            marketplaceTitle: Boolean(catalogTitle && catalogTitle.trim().length >= 2),
            description: Boolean(catalogDescription && catalogDescription.trim().length >= 2),
            unitPrice: Boolean(data.unitPrice && data.unitPrice > 0),
            categories: Boolean(data.categoryIds && data.categoryIds.length > 0),
            images: Boolean(data.images && data.images.length > 0),
            dimensions: isService || Boolean(Number(data.width) > 0 && Number(data.height) > 0 && Number(data.depth) > 0)
        }
    };
}
