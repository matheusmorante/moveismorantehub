import { buildProductCatalogUrl } from '../shared-utils/productCatalogLinks.js';
import { buildProductMetaCatalogSyncItems } from '../shared-utils/productMetaCatalogSyncItems.js';
import { buildWhatsAppNativeCatalogMessage } from '../shared-utils/whatsappNativeCatalogMessage.js';
import type { ProductCatalogSendSelection } from '../shared-utils/productCatalogFormSchemas.js';
import { RequestBodyError } from './whatsappSupportRequestError.js';

export type ResolvedCatalogMessage = {
  text: string;
  nativeProducts?: Array<{ retailerId: string; name: string }>;
};

type WithTimeout = <T>(promise: PromiseLike<T>, timeoutMs: number) => Promise<T>;

const formatCatalogPrice = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const isCatalogTestProduct = (product: Record<string, any>) => {
  const specs = product.technical_specs && typeof product.technical_specs === 'object'
    ? product.technical_specs
    : {};
  return [specs.is_test, specs.isTest, specs.testArtifact?.is_test, specs.testArtifact?.isTest]
    .some((value) => String(value).toLowerCase() === 'true');
};

export async function resolveWhatsAppSupportCatalogMessage(
  userDb: any,
  selection: ProductCatalogSendSelection,
  customMessage: string,
  withTimeout: WithTimeout,
): Promise<ResolvedCatalogMessage> {
  const nativeDelivery = selection.deliveryMode === 'native';
  if (nativeDelivery) {
    if (selection.hidePrices) {
      throw new RequestBodyError('Cards nativos exibem o preço publicado na Meta. Desative “Ocultar preços” ou use o link.', 400);
    }
    const effectiveBulkTotal = selection.bulkScope
      ? Math.max(0, selection.bulkScope.total - selection.bulkScope.excludedProductIds.length)
      : 0;
    if (selection.bulkScope && effectiveBulkTotal > 30) {
      throw new RequestBodyError('Cards nativos aceitam até 30 produtos. Reduza a seleção ou use o link.', 400);
    }
    if (!selection.bulkScope && selection.items.length > 30) {
      throw new RequestBodyError('Cards nativos aceitam até 30 produtos. Use o link para listas maiores.', 400);
    }

    if (selection.bulkScope && effectiveBulkTotal > 0 && (selection.items.length === 0 || selection.items.length < effectiveBulkTotal)) {
      const scopeResult = await withTimeout<any>(userDb.rpc('customer_support_catalog_summary_page', {
        p_category_id: selection.bulkScope.filters.categoryId,
        p_search: selection.bulkScope.filters.search,
        p_brand: selection.bulkScope.filters.brand,
        p_page: 1,
        p_page_size: 30,
        p_excluded_product_ids: selection.bulkScope.excludedProductIds,
        p_include_product_ids: [],
        p_include_only: false,
      }), 15_000);
      if (scopeResult.error || !scopeResult.data || !Array.isArray(scopeResult.data.products)) {
        throw new RequestBodyError('Não foi possível carregar os produtos da categoria. Tente novamente.', 503);
      }
      const bulkProducts = scopeResult.data.products as Array<{ id: string; hasVariations?: boolean; variations?: Array<{ id: string }> }>;
      selection.items = bulkProducts.map((p) => ({
        productId: p.id,
        variationId: p.hasVariations ? p.variations?.[0]?.id : undefined,
      }));
    } else if (selection.items.length === 0) {
      throw new RequestBodyError('Nenhum produto selecionado para envio.', 400);
    }
  }

  const productIds = Array.from(new Set(selection.items.map((item) => item.productId)));
  let products: Record<string, any>[] = [];
  if (productIds.length) {
    const productResult = await withTimeout<any>(userDb.from('products')
      .select('id,name,marketplace_title,description,slug,unit_price,price,promo_price,brand,active,is_draft,status,deleted,deleted_at,item_type,technical_specs,opportunity_id,stock,images,code,is_salvado,product_kind,material,condition,product_categories(categories(name,type))')
      .in('id', productIds)
      .eq('active', true)
      .eq('status', 'published')
      .is('deleted_at', null)
      .or('is_draft.is.null,is_draft.eq.false')
      .or('deleted.is.null,deleted.eq.false')
      .or('item_type.is.null,item_type.neq.service'), 12_000);
    if (productResult.error) throw new RequestBodyError('Não foi possível validar os produtos selecionados.', 503);
    products = (productResult.data || []).filter((product: Record<string, any>) => !isCatalogTestProduct(product));
    if (products.length !== productIds.length) {
      throw new RequestBodyError('Um ou mais produtos foram ocultados ou ficaram indisponíveis. Atualize a seleção antes de enviar.', 409);
    }
  }

  const productById = new Map(products.map((product) => [String(product.id), product]));
  const variationIds = Array.from(new Set(selection.items.flatMap((item) => item.variationId ? [item.variationId] : [])));
  let variations: Record<string, any>[] = [];
  if (variationIds.length || nativeDelivery) {
    const variationResult = await withTimeout<any>(userDb.from('product_variations')
      .select('id,product_id,status,active,name,sku,image_url,price,promo_price,stock,attributes,description,use_parent_price,use_parent_promo_price,use_parent_name,use_parent_description')
      .in(nativeDelivery ? 'product_id' : 'id', nativeDelivery ? productIds : variationIds), 12_000);
    if (variationResult.error) throw new RequestBodyError('Não foi possível validar as variações selecionadas.', 503);
    variations = (variationResult.data || []).filter((variation: Record<string, any>) =>
      nativeDelivery || (variation.active === true && (!variation.status || variation.status === 'published'))
    );
  }
  const variationById = new Map(variations.map((variation) => [String(variation.id), variation]));

  const resolvedItems = selection.items.map((item) => {
    const product = productById.get(item.productId);
    let variation = item.variationId ? variationById.get(item.variationId) : null;
    if (!product || (item.variationId && (!variation || String(variation.product_id) !== item.productId))) {
      throw new RequestBodyError('Uma variação foi ocultada ou ficou indisponível. Atualize a seleção antes de enviar.', 409);
    }
    if (!variation && nativeDelivery) {
      variation = variations.find((v) => String(v.product_id) === String(product.id)) || null;
    }
    const basePrice = Number(product.unit_price ?? product.price ?? 0);
    const basePromo = Number(product.promo_price ?? 0);
    const price = variation && variation.use_parent_price === false ? Number(variation.price ?? 0) : basePrice;
    const promoPrice = variation && variation.use_parent_promo_price === false ? Number(variation.promo_price ?? 0) : basePromo;
    const effectivePrice = promoPrice > 0 ? promoPrice : price;
    return {
      productId: item.productId,
      variationId: variation?.id ? String(variation.id) : (item.variationId || null),
      name: String(product.marketplace_title || product.name || 'Produto'),
      variationName: variation ? String(variation.name || '') : '',
      price: Number.isFinite(effectivePrice) && effectivePrice >= 0 ? effectivePrice : 0,
    };
  });

  if (nativeDelivery) {
    const retailerIdByItemId = new Map<string, string>();
    for (const product of products) {
      const productVariations = variations.filter((variation) => String(variation.product_id) === String(product.id));
      const syncItems = buildProductMetaCatalogSyncItems(product as any, productVariations as any, []);
      syncItems.forEach((item) => {
        if (!('deleted' in item) && item.status === 'published' && item.code.trim()) {
          retailerIdByItemId.set(item.id, item.code.trim());
        }
      });
    }

    const nativeProducts = resolvedItems.map((item) => {
      const catalogItemId = item.variationId || item.productId;
      let retailerId = retailerIdByItemId.get(catalogItemId);
      if (!retailerId && !item.variationId) {
        const firstVar = variations.find((v) => String(v.product_id) === String(item.productId));
        if (firstVar) {
          retailerId = retailerIdByItemId.get(String(firstVar.id));
        }
      }
      if (!retailerId) {
        throw new RequestBodyError('Um produto ou variação não está publicado no catálogo da Meta. Sincronize o catálogo e selecione novamente.', 409);
      }
      return {
        retailerId,
        name: [item.name, item.variationName].filter(Boolean).join(' · '),
      };
    });
    const bodyText = customMessage.trim() || (nativeProducts.length === 1
      ? 'Confira este produto do nosso catálogo:'
      : `Separei ${nativeProducts.length} produtos do nosso catálogo para você:`);
    if (bodyText.length > 1024) throw new RequestBodyError('A mensagem que acompanha os cards deve ter até 1024 caracteres.', 413);
    return { text: bodyText, nativeProducts };
  }

  let categoryName = '';
  let catalogCount = resolvedItems.length;
  if (selection.bulkScope) {
    const scope = selection.bulkScope;
    const scopeResult = await withTimeout<any>(userDb.rpc('customer_support_catalog_summary_page', {
      p_category_id: scope.filters.categoryId,
      p_search: scope.filters.search,
      p_brand: scope.filters.brand,
      p_page: 1,
      p_page_size: 1,
      p_excluded_product_ids: scope.excludedProductIds,
      p_include_product_ids: productIds,
      p_include_only: false,
    }), 15_000);
    if (scopeResult.error || !scopeResult.data || typeof scopeResult.data !== 'object') {
      throw new RequestBodyError('Não foi possível recalcular a lista selecionada. Tente novamente.', 503);
    }
    catalogCount = Number(scopeResult.data.totalCount) || 0;
    categoryName = typeof scopeResult.data.categoryName === 'string' ? scopeResult.data.categoryName : '';
    if (!catalogCount) throw new RequestBodyError('Nenhum produto continua disponível nesta seleção. Atualize os filtros.', 409);
  }

  const catalogUrl = buildProductCatalogUrl({
    items: selection.items,
    bulkScope: selection.bulkScope,
    hidePrices: selection.hidePrices,
  });
  if (!catalogUrl) throw new RequestBodyError('A seleção ficou grande demais para compartilhar em um link. Reduza os itens ou as exclusões.', 413);

  const catalogText = selection.bulkScope || resolvedItems.length > 8
    ? `Separei ${catalogCount} produto${catalogCount === 1 ? '' : 's'}${categoryName ? ` de ${categoryName}` : ''} para você.\n\nVeja a seleção completa: ${catalogUrl}`
    : [
      'Separei estas opções para você:',
      ...resolvedItems.map((item) => `• ${[item.name, item.variationName].filter(Boolean).join(' · ')}${selection.hidePrices ? '' : ` — ${formatCatalogPrice(item.price)}`}`),
      `Veja fotos e mais detalhes: ${catalogUrl}`,
    ].join('\n');
  const message = [customMessage.trim(), catalogText].filter(Boolean).join('\n\n');
  if (message.length > 4096) throw new RequestBodyError('O texto e o link do catálogo excedem o limite de 4096 caracteres. Reduza a seleção ou a mensagem.', 413);
  return { text: message };
}