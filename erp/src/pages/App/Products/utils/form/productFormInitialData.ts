import type { Product } from '../../../../types/product.type';

/**
 * Retorna uma nova instância desvinculada do estado inicial do formulário de produto,
 * prevenindo vazamento de referências e mutação acidental de arrays aninhados.
 */
export function getInitialProductFormData(): Partial<Product> {
  return {
    productKind: undefined,
    description: '',
    code: '',
    unit: 'UN',
    unitPrice: 0,
    costPrice: 0,
    finalPurchasePrice: 0,
    ipiPercent: 0,
    ipiType: 'percentage',
    freightCost: 0,
    freightType: 'fixed',
    stock: 0,
    minStock: 0,
    hasVariations: true,
    variations: [],
    images: [],
    marketplaceTitle: '',
    condition: '',
    itemType: 'product',
    active: false,
    status: 'draft',
    isDraft: true,
    isCombo: false,
    comboItems: [],
    categoryIds: [],
    fiscal: { ncm: '', cest: '', ncmDescription: '', cfop: '5102', cst: '103', icmsPercent: 0 },
    launchInitialStock: false,
    line: '',
    brand: '',
    colors: '',
    material: '',
    supplierRef: '',
    observations: '',
    noColors: false,
    environment: '',
    hasNoLine: false,
    noBrand: false,
  };
}

export const INITIAL_PRODUCT_FORM_DATA: Partial<Product> = Object.freeze(
  getInitialProductFormData()
);
