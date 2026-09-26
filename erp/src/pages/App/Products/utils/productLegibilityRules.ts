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

function isPositiveNumber(value: unknown): boolean {
    const num = Number(value);
    return Number.isFinite(num) && num > 0;
}

export function checkERPLegibility(data: Readonly<Partial<Product>>): ERPLegibilityResult {
    const errors: string[] = [];
    const hasVars = Boolean(data.hasVariations);

    // Cadastros antigos podem ter apenas description; o nome editado tem prioridade.
    const internalName = data.name ?? data.description ?? '';
    const hasValidDescription = internalName.trim().length >= 2;
    if (!hasValidDescription) {
        errors.push("Nome do Produto (Interno) deve ter pelo menos 2 caracteres.");
    }

    const hasValidCategories = Boolean(data.categoryIds && data.categoryIds.length > 0);
    if (!hasValidCategories) {
        errors.push("Pelo menos uma categoria deve ser selecionada.");
    }

    const hasValidSupplier = Boolean(data.mainSupplierId);
    if (!hasValidSupplier) {
        errors.push("Selecione pelo menos um fornecedor.");
    }

    let hasValidPrice: boolean;
    if (!hasVars) {
        hasValidPrice = isPositiveNumber(data.unitPrice);
        if (!hasValidPrice) {
            errors.push("Preço de Venda deve ser maior que zero.");
        }
        if (data.promoPrice !== undefined && data.promoPrice !== null && !isNaN(Number(data.promoPrice)) && Number(data.promoPrice) > 0) {
            const up = Number(data.unitPrice) || 0;
            if (Number(data.promoPrice) >= up) {
                errors.push("O preço promocional deve ser menor que o preço de venda.");
            }
        }
    } else {
        hasValidPrice = Boolean(data.variations && data.variations.length > 0);
        if (!hasValidPrice) {
            errors.push("Adicione pelo menos uma variação para o produto.");
        }
    }

    return {
        isLegible: errors.length === 0,
        errors,
        checks: {
            description: hasValidDescription,
            unitPrice: hasValidPrice,
            categories: hasValidCategories,
            supplier: hasValidSupplier
        }
    };
}

export function checkEcomLegibility(data: Readonly<Partial<Product>>): EcomLegibilityResult {
    const errors: string[] = [];
    const hasVars = Boolean(data.hasVariations);
    const catalogTitle = data.title || data.marketplaceTitle;
    const catalogDescription = data.ecommerceDescription || data.description;

    const hasValidTitle = Boolean(catalogTitle && catalogTitle.trim().length >= 2);
    if (!hasValidTitle) {
        errors.push("Título do Produto (E-commerce) deve ter pelo menos 2 caracteres.");
    }

    const hasValidDesc = Boolean(catalogDescription && catalogDescription.trim().length >= 2);
    if (!hasValidDesc) {
        errors.push("Descrição do catálogo deve ser preenchida antes da publicação.");
    }

    let hasValidPrice: boolean;
    if (!hasVars) {
        hasValidPrice = isPositiveNumber(data.unitPrice);
        if (!hasValidPrice) {
            errors.push("Preço de Venda deve ser maior que zero.");
        }
    } else {
        hasValidPrice = Boolean(data.variations && data.variations.length > 0);
    }

    const hasValidCategories = Boolean(data.categoryIds && data.categoryIds.length > 0);
    if (!hasValidCategories) {
        errors.push("Pelo menos uma categoria deve ser selecionada.");
    }

    const hasValidImages = Boolean(data.images && data.images.length > 0);
    if (!hasValidImages) {
        errors.push("Pelo menos uma foto deve ser adicionada.");
    }

    const isService = data.itemType === 'service';
    const hasValidDimensions = isService || (
        isPositiveNumber(data.width) &&
        isPositiveNumber(data.height) &&
        isPositiveNumber(data.depth)
    );

    if (!isService && !hasValidDimensions) {
        errors.push("Informe largura, altura e profundidade maiores que zero para publicar o produto no catálogo.");
    }
    
    if (data.promoPrice !== undefined && data.promoPrice !== null && !isNaN(Number(data.promoPrice)) && Number(data.promoPrice) > 0) {
        const up = Number(data.unitPrice) || 0;
        if (Number(data.promoPrice) >= up) {
            errors.push("O preço promocional deve ser menor que o preço de venda.");
        }
    }

    return {
        isLegible: errors.length === 0,
        errors,
        checks: {
            marketplaceTitle: hasValidTitle,
            description: hasValidDesc,
            unitPrice: hasValidPrice,
            categories: hasValidCategories,
            images: hasValidImages,
            dimensions: hasValidDimensions
        }
    };
}

