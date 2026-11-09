import {
  buildMetaCatalogItems,
  isSlugSku,
  type MetaCatalogItem,
  type MetaCatalogOpportunitySource,
  type MetaCatalogProductSource,
  type MetaCatalogVariationSource,
} from './metaCatalogPayload';

export interface MetaCatalogDeleteItem {
  id: string;
  code: string;
  deleted: true;
  status: 'hidden';
}

export type ProductMetaCatalogSyncItem = MetaCatalogItem | MetaCatalogDeleteItem;

const deletedItem = (id: string, code: string): MetaCatalogDeleteItem => ({
  id,
  code,
  deleted: true,
  status: 'hidden',
});

const getVariationCode = (
  variation: MetaCatalogVariationSource,
  index: number,
  parentCode: string | null | undefined
): string => {
  const rawCode = String(variation.sku || variation.code || '').trim();
  return (!isSlugSku(rawCode) && rawCode) ||
    (parentCode ? `${parentCode}-${String(index + 1).padStart(2, '0')}` : variation.id);
};

const getParentCode = (product: MetaCatalogProductSource): string => {
  const rawCode = String(product.code || '').trim();
  const rawSku = String(product.sku || '').trim();
  return (!isSlugSku(rawCode) && rawCode) || (!isSlugSku(rawSku) && rawSku) || product.id;
};

const isDeleteItem = (item: ProductMetaCatalogSyncItem): item is MetaCatalogDeleteItem =>
  'deleted' in item && item.deleted === true;

const uniqueCodes = (values: readonly (string | null | undefined)[]): string[] =>
  Array.from(new Set(values.map((value) => String(value || '').trim()).filter(Boolean)));

function getVariationDeleteCodes(
  variation: MetaCatalogVariationSource,
  index: number,
  parentCode: string | null | undefined
): string[] {
  const rawSku = String(variation.sku || '').trim();
  const rawCode = String(variation.code || '').trim();
  const rawId = String(variation.id || '').trim();
  const idPrefix = rawId && rawId.length >= 6 ? rawId.slice(0, 6) : '';
  const cleanParentCode = String(parentCode || '').trim();
  const generatedCode = cleanParentCode
    ? `${cleanParentCode}-${String(index + 1).padStart(2, '0')}`
    : rawId;

  return uniqueCodes([
    getVariationCode(variation, index, cleanParentCode),
    generatedCode,
    isSlugSku(rawSku) ? '' : rawSku,
    isSlugSku(rawCode) ? '' : rawCode,
    rawId,
    // Padrões legados com sufixo hash/UUID da variação (ex: 000227-01-641cc6, 000253-b976c2):
    idPrefix && rawSku ? `${rawSku}-${idPrefix}` : '',
    idPrefix && cleanParentCode ? `${cleanParentCode}-${idPrefix}` : '',
    idPrefix && generatedCode ? `${generatedCode}-${idPrefix}` : '',
  ]);
}

/** Aplica sem I/O as regras do ERP para sincronizar um produto e suas variações. */
export function buildProductMetaCatalogSyncItems(
  product: MetaCatalogProductSource,
  variations: readonly MetaCatalogVariationSource[],
  opportunities: readonly MetaCatalogOpportunitySource[]
): ProductMetaCatalogSyncItem[] {
  const items: ProductMetaCatalogSyncItem[] = [];
  const isSalvado = product.is_salvado === true || product.product_kind === 'salvado';
  const isParentEligible =
    product.status === 'published' &&
    !product.deleted_at &&
    !product.deleted &&
    !product.is_draft &&
    (isSalvado || product.active !== false);

  if (variations.length > 0) {
    // O produto pai da família não é vendido avulso no catálogo.
    items.push(deletedItem(product.id, product.code || product.id));
    if (product.code && product.id && product.code !== product.id) {
      items.push(deletedItem(product.id, product.id));
    }

    const built = isParentEligible
      ? buildMetaCatalogItems(
          [product],
          variations,
          opportunities.filter((opportunity) => opportunity.id === product.opportunity_id)
        )
      : [];
    const itemsById = new Map<string, MetaCatalogItem>();
    built.forEach((item) => {
      if (item.isVariation && !itemsById.has(item.id)) itemsById.set(item.id, item);
    });

    variations.forEach((variation, index) => {
      const currentItem = itemsById.get(variation.id);
      if (currentItem) {
        items.push(currentItem);
        return;
      }

      getVariationDeleteCodes(variation, index, product.code).forEach((code) => {
        items.push(deletedItem(variation.id, code));
      });
    });
    return items;
  }

  if (!isParentEligible) {
    return [deletedItem(product.id, getParentCode(product))];
  }

  const built = buildMetaCatalogItems(
    [product],
    [],
    opportunities.filter((opportunity) => opportunity.id === product.opportunity_id)
  );
  return built.length > 0 ? built : [deletedItem(product.id, getParentCode(product))];
}

/** Monta uma reconciliação completa: atualiza itens elegíveis e remove IDs ocultos/legados. */
export function buildMetaCatalogSyncItems(
  products: readonly MetaCatalogProductSource[],
  variations: readonly MetaCatalogVariationSource[],
  opportunities: readonly MetaCatalogOpportunitySource[]
): ProductMetaCatalogSyncItem[] {
  const variationsByProductId = new Map<string, MetaCatalogVariationSource[]>();
  variations.forEach((variation) => {
    const current = variationsByProductId.get(variation.product_id) || [];
    current.push(variation);
    variationsByProductId.set(variation.product_id, current);
  });

  const items = products.flatMap((product) =>
    buildProductMetaCatalogSyncItems(
      product,
      variationsByProductId.get(product.id) || [],
      opportunities
    )
  );
  const currentCodes = new Set(items.filter((item) => !isDeleteItem(item)).map((item) => item.code));
  const updates = items.filter((item) => !isDeleteItem(item));
  const deletesByCode = new Map<string, MetaCatalogDeleteItem>();

  items.forEach((item) => {
    if (isDeleteItem(item) && !currentCodes.has(item.code) && !deletesByCode.has(item.code)) {
      deletesByCode.set(item.code, item);
    }
  });

  return [...updates, ...deletesByCode.values()];
}

/** Omite exclusões cujo retailer_id pertence a outra linha ou será atualizado no mesmo lote. */
export function excludeMetaCatalogDeleteCollisions(
  items: readonly ProductMetaCatalogSyncItem[],
  protectedCodes: ReadonlySet<string> = new Set()
): ProductMetaCatalogSyncItem[] {
  const updateCodes = new Set(items.filter((item) => !isDeleteItem(item)).map((item) => item.code));
  return items.filter(
    (item) => !isDeleteItem(item) || (!updateCodes.has(item.code) && !protectedCodes.has(item.code))
  );
}
