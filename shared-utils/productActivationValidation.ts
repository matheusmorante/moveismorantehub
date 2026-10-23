export interface ProductActivationVariation {
  readonly id?: string | number;
  readonly sku?: string | null;
  readonly syncUnitPrice?: boolean;
  readonly unitPrice?: number | string | null;
  readonly comboItems?: readonly unknown[] | null;
  readonly combo_items?: readonly unknown[] | null;
}

export interface ProductActivationProduct {
  readonly id?: string | number;
  readonly sku?: string | null;
  readonly code?: string | null;
  readonly name?: string | null;
  readonly description?: string | null;
  readonly unitPrice?: number | string | null;
  readonly category?: string | null;
  readonly categoryIds?: readonly string[] | null;
  readonly supplierId?: string | null;
  readonly mainSupplierId?: string | null;
  readonly isDraft?: boolean;
  readonly isParent?: boolean;
  readonly hasVariations?: boolean;
  readonly has_variations?: boolean;
  readonly itemType?: string | null;
  readonly isCombo?: boolean;
  readonly comboItems?: readonly unknown[] | null;
  readonly variations?: readonly ProductActivationVariation[] | null;
  readonly productKind?: unknown;
  readonly product_kind?: unknown;
  readonly condition?: unknown;
  readonly is_salvado?: unknown;
  readonly stock_origin?: unknown;
}

export interface ProductActivationValidationResult {
  readonly isValid: boolean;
  readonly errorMessage?: string;
}

const isNonConventionalProduct = (product?: ProductActivationProduct): boolean => {
  const kind = product?.productKind ?? product?.product_kind ?? product?.condition;
  if (
    kind === 'salvado' ||
    kind === 'salvados' ||
    product?.is_salvado === true ||
    product?.stock_origin === 'salvados'
  ) {
    return true;
  }
  return kind === 'usado' || kind === 'usados' || product?.stock_origin === 'usados';
};

/** Regras de ativação do ERP, compartilhadas com o app para manter o mesmo contrato. */
export const validateProductActivationRequirements = (
  id: string,
  products: readonly ProductActivationProduct[],
  serverProducts: readonly ProductActivationProduct[]
): ProductActivationValidationResult => {
  const orderedProducts = [...serverProducts, ...products];
  const compositeParts = id.includes('_') ? id.split('_') : [];
  const compositeParentId = compositeParts[0];
  const compositeSku = compositeParts.length > 1 ? compositeParts.slice(1).join('_') : '';
  const compositeParent = compositeParentId
    ? orderedProducts.find((product) => String(product.id) === compositeParentId)
    : undefined;
  const variationParent =
    orderedProducts.find((product) =>
      product.variations?.some((variation) => String(variation.id) === String(id))
    ) ||
    (compositeParent && compositeSku
      ? compositeParent.variations?.some((variation, index) => {
          const sku =
            variation.sku ||
            `${compositeParent.sku || compositeParent.code}-${String(index + 1).padStart(2, '0')}`;
          return String(sku) === compositeSku;
        })
        ? compositeParent
        : undefined
      : undefined);
  const targetVariation = variationParent?.variations?.find((variation, index) => {
    if (compositeSku) {
      const sku =
        variation.sku ||
        `${variationParent.sku || variationParent.code}-${String(index + 1).padStart(2, '0')}`;
      return String(sku) === compositeSku;
    }
    return String(variation.id) === String(id);
  });
  const isVariationTarget = Boolean(variationParent && targetVariation);
  const targetProduct =
    orderedProducts.find((product) => String(product.id) === String(id)) ||
    (compositeParentId
      ? orderedProducts.find((product) => String(product.id) === compositeParentId)
      : undefined) ||
    variationParent;

  if (isNonConventionalProduct(variationParent || targetProduct)) {
    return {
      isValid: false,
      errorMessage:
        'Produtos de origem de estoque Salvados não podem ser ativados no ERP, apenas no catálogo digital.',
    };
  }

  if (isVariationTarget) {
    if (variationParent?.isDraft) {
      return {
        isValid: false,
        errorMessage:
          'Este produto é um rascunho. Termine o cadastramento para poder ativá-lo no ERP.',
      };
    }
  } else {
    if (targetProduct?.isDraft) {
      return {
        isValid: false,
        errorMessage:
          'Este produto é um rascunho. Termine o cadastramento para poder ativá-lo no ERP.',
      };
    }
  }

  if (isVariationTarget && variationParent && targetVariation) {
    const parent = variationParent;
    const variation = targetVariation;
    const missingFields: string[] = [];
    const hasValidPrice = variation.syncUnitPrice === false
      ? Number(variation.unitPrice || 0) > 0
      : Number(parent.unitPrice || 0) > 0;

    const parentName = String(parent.name || parent.description || '').trim();
    if (parentName.length < 2) {
      missingFields.push('nome do produto no pai');
    }
    if (!hasValidPrice) missingFields.push('preço de venda');
    if (!(parent.categoryIds || []).length && !parent.category) {
      missingFields.push('categoria no pai');
    }
    if (!parent.mainSupplierId && !parent.supplierId) {
      missingFields.push('fornecedor no pai');
    }
    if (parent.itemType === 'composition' || parent.isCombo) {
      const comboItems = variation.comboItems || variation.combo_items || [];
      if (comboItems.length < 2) {
        missingFields.push('pelo menos 2 produtos componentes vinculados');
      }
    }

    if (missingFields.length > 0) {
      return {
        isValid: false,
        errorMessage: `Preencha os requisitos do ERP (${missingFields.join(', ')}) antes de ativar esta variação.`,
      };
    }
  } else if (compositeParent) {
    return {
      isValid: false,
      errorMessage: 'A variação mudou. Atualize a lista antes de ativá-la.',
    };
  } else {
    const product = targetProduct;
    if (product) {
      const missingFields: string[] = [];
      const isParent = Boolean(
        product.isParent ||
          product.hasVariations ||
          product.has_variations ||
          (product.variations?.length || 0) > 1
      );

      if (!(product.name || product.description || '').trim() || (product.name || product.description || '').trim().length < 2) {
        missingFields.push('nome do produto');
      }
      if (!isParent && (!product.unitPrice || Number(product.unitPrice) <= 0)) {
        missingFields.push('preço de venda');
      }
      if (!(product.categoryIds || []).length && !product.category) {
        missingFields.push('categoria');
      }
      if (!product.mainSupplierId && !product.supplierId) {
        missingFields.push('fornecedor');
      }
      if (!isParent && (product.itemType === 'composition' || product.isCombo)) {
        const comboItems = product.comboItems || [];
        if (comboItems.length < 2) {
          missingFields.push('pelo menos 2 produtos componentes vinculados');
        }
      }

      if (missingFields.length > 0) {
        return {
          isValid: false,
          errorMessage: `Preencha os requisitos do ERP (${missingFields.join(', ')}) antes de ativar este produto.`,
        };
      }
    }
  }

  return { isValid: true };
};
