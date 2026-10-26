import { InboundInvoiceItem } from '@/pages/utils/inboundNfe/inboundNfeTypes';
import Product, { Variation } from '@/pages/types/product.type';
import { itemCostWithAdditionalCosts } from '@/pages/utils/inboundNfe/inboundItemCosts';
import {
  generateVariationSku,
  getNextSequentialProductCode,
} from '@/pages/utils/productService/productSkuService';
import { ensureDefaultVariation } from '@/pages/utils/productVariationDefaults';
import { aiService } from '@/pages/utils/aiService';

interface PrepareProductCreateParams {
  item: InboundInvoiceItem;
  supplierId?: string;
  family?: { id: string; name: string };
  markupInput?: string;
}

export interface PreparedProductDataResult {
  initialProductData: Partial<Product>;
}

export async function prepareInboundProductData({
  item,
  supplierId,
  family,
  markupInput,
}: PrepareProductCreateParams): Promise<PreparedProductDataResult> {
  const suggestion = await aiService.generateMarketplaceTitle({
    description: item.productDescription,
  });

  const finalCost = itemCostWithAdditionalCosts(item);
  const markup = markupInput ? Number(markupInput.replace(',', '.')) : 0;
  const salePrice =
    Number.isFinite(markup) && markup > 0
      ? Number((finalCost * (1 + markup / 100)).toFixed(2))
      : undefined;

  // Variações e atributos devem ser definidos manualmente pelo usuário
  const initialVariations: Variation[] | undefined = undefined;

  const initialProductData: Partial<Product> = {
    name: suggestion.title,
    title: suggestion.title,
    description: '',
    unit: item.unit || 'UN',
    itemType: 'product',
    active: true,
    isDraft: false,
    status: 'hidden',
    mainSupplierId: supplierId,
    supplierId,
    supplierIds: supplierId ? [supplierId] : [],
    supplierRef: item.productCode || undefined,
    categoryIds: [],
    parentId: family?.id,
    costPrice: finalCost,
    unitPrice: salePrice,
    stock: 0,
    hasVariations: true,
    variations: initialVariations,
    fiscal: {
      ncm: item.ncm || undefined,
      cest: item.cest || undefined,
      cfop: item.cfop || undefined,
    },
    ecommerceSync: false,
    whatsappSync: false,
  };

  return { initialProductData };
}

export interface QuickItemPayload {
  productDescription: string;
  productCode?: string;
  unit?: string;
  ncm?: string;
  quantity?: number;
  unitCost?: number;
  finalCost?: number;
}

/**
 * Prepara os dados iniciais para a criação de um Novo Produto Pai com a primeira Variação.
 * Extrai a cor do item da NF (via IA ou heurística), garante o cadastro global do atributo Cor,
 * limpa o nome do pai para não duplicar a cor no título do pai e insere a variação com attributes.
 */
export async function prepareNewParentWithVariation(
  item: QuickItemPayload,
  supplierId?: string,
  assertCurrent: () => void = () => {},
  options: {
    name?: string;
    categoryId?: string;
    ncm?: string;
    costPrice?: number;
    barcode?: string;
    itemType?: Product['itemType'];
    components?: Variation['comboItems'];
  } = {},
): Promise<Partial<Product>> {
  const finalCost = options.costPrice ?? item.finalCost ?? item.unitCost ?? 0;

  const parentName = (options.name || item.productDescription).trim();

  // 2. Montar a variação inicial sem atributos automáticos (deve ser configurada manualmente pelo usuário)
  const initialVariationId = crypto.randomUUID();
  assertCurrent();
  const parentCode = await getNextSequentialProductCode();
  assertCurrent();
  const initialVariation: Variation = {
    id: initialVariationId,
    sku: generateVariationSku(parentCode, []),
    name: parentName,
    stock: 0,
    unitPrice: undefined as any,
    costPrice: finalCost,
    barcode: options.barcode || undefined,
    comboItems: options.components,
    active: true,
    attributes: [],
    images: [],
    syncUnitPrice: true,
    syncPromoPrice: true,
    syncCostPrice: true,
    syncDescription: true,
    syncWidth: true,
    syncHeight: true,
    syncDepth: true,
    syncWeight: true,
  };

  return {
    name: parentName,
    code: parentCode,
    title: parentName,
    description: '',
    fiscal: { ncm: options.ncm || item.ncm || undefined },
    costPrice: finalCost,
    unitPrice: undefined,
    stock: 0,
    mainSupplierId: supplierId || undefined,
    supplierId,
    supplierIds: supplierId ? [supplierId] : [],
    categoryIds: options.categoryId ? [options.categoryId] : [],
    supplierRef: item.productCode || undefined,
    hasVariations: true,
    variations: [initialVariation],
    ...(options.itemType ? { itemType: options.itemType } : {}),
    ...(options.itemType === 'composition' ? { isCombo: true, comboItems: options.components || [] } : {}),
  };
}

export async function prepareExistingParentNewVariation(
  parentProduct: Product,
  item: QuickItemPayload,
  options: {
    name?: string;
    barcode?: string;
    technicalValues?: Record<string, unknown>;
    attributes?: Variation['attributes'];
    ncmResolution?: 'variation' | 'update-parent' | 'keep-parent';
  } = {},
): Promise<Product> {
  const finalCost = item.finalCost ?? item.unitCost ?? 0;

  // A variação virtual de um produto simples só existe na projeção do ERP.
  // Materialize-a com UUID antes de adicionar a nova variação para preservar
  // o cadastro atual quando o produto passar a ter mais de uma variação física.
  const currentVariations = parentProduct.variations?.length
    ? parentProduct.variations
    : ensureDefaultVariation(parentProduct).variations || [];
  const parentVariations = currentVariations.map((variation, index) => {
    const hasUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(variation.id || '');
    if (hasUuid && !variation.isVirtual) return variation;
    return {
      ...variation,
      id: crypto.randomUUID(),
      isVirtual: false,
      sku: variation.sku || generateVariationSku(parentProduct.code || '', currentVariations.slice(0, index)),
    };
  });

  const newVarId = crypto.randomUUID();
  const newVar: Variation = {
    id: newVarId,
    sku: generateVariationSku(parentProduct.code || '', parentVariations),
    name: options.name || item.productDescription,
    stock: 0,
    unitPrice: parentProduct.unitPrice || (undefined as any),
    costPrice: finalCost,
    active: true,
    status: 'hidden',
    attributes: options.attributes || [],
    technicalValues: options.technicalValues as Record<string, any> | undefined,
    barcode: options.barcode || undefined,
    syncFiscal: true,
    syncNcm: options.ncmResolution !== 'variation',
    ...(options.ncmResolution === 'variation' && item.ncm ? { fiscal: { ncm: item.ncm } } : {}),
    images: [],
    syncUnitPrice: true,
    syncPromoPrice: true,
    syncCostPrice: true,
    syncDescription: true,
    syncWidth: true,
    syncHeight: true,
    syncDepth: true,
    syncWeight: true,
  };

  return {
    ...parentProduct,
    hasVariations: true,
    variations: [...parentVariations, newVar],
  };
}
