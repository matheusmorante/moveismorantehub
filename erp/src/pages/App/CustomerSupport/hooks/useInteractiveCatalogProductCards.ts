import { useEffect, useMemo, useRef, useState } from 'react';
import type { WhatsAppMessage } from '../types';
import {
  collectCatalogRetailerIds,
  type CatalogInteractiveProductCard,
} from '../catalogInteractiveProducts';
import { supabase } from '@/pages/utils/supabaseConfig';
import { withTimeout } from '../../../../../../shared-utils/withTimeout';
import { buildProductMetaCatalogSyncItems } from '../../../../../../shared-utils/productMetaCatalogSyncItems';
import type {
  MetaCatalogItem,
  MetaCatalogProductSource,
  MetaCatalogVariationSource,
} from '../../../../../../shared-utils/metaCatalogPayload';
import { isSlugSku } from '../../../../../../shared-utils/metaCatalogPayload';

const PRODUCT_CARD_SELECT = 'id, name, title:marketplace_title, status, active, deleted, deleted_at, unit_price, price, promo_price, stock, images, code, is_draft, slug, is_salvado, product_kind, product_variations(id, product_id, status, active, name, sku, image_url, price, promo_price, stock, attributes, use_parent_price, use_parent_promo_price, use_parent_name, use_parent_description)';
const PRODUCT_VARIATION_CARD_SELECT = 'id, product_id, status, active, name, sku, image_url, price, promo_price, stock, attributes, use_parent_price, use_parent_promo_price, use_parent_name, use_parent_description, products!inner(id, name, title:marketplace_title, status, active, deleted, deleted_at, unit_price, price, promo_price, stock, images, code, is_draft, slug, is_salvado, product_kind)';
const CATALOG_PRODUCT_QUERY_TIMEOUT_MS = 12_000;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;

type ProductRow = MetaCatalogProductSource & {
  product_variations?: MetaCatalogVariationSource[] | null;
};
type ProductVariationRow = MetaCatalogVariationSource & {
  products?: ProductRow | ProductRow[] | null;
};

type CardSource = Pick<MetaCatalogItem, 'name' | 'images' | 'sales_price' | 'promo_price'>;

const toCard = (retailerId: string, item: CardSource): CatalogInteractiveProductCard => ({
  retailerId,
  name: String(item.name || retailerId),
  imageUrl: Array.isArray(item.images) && typeof item.images[0] === 'string' ? item.images[0] : null,
  salesPrice: Number.isFinite(Number(item.sales_price)) && Number(item.sales_price) > 0
    ? Number(item.sales_price)
    : null,
  promoPrice: Number.isFinite(Number(item.promo_price)) && Number(item.promo_price) > 0
    ? Number(item.promo_price)
    : null,
});

const resolveCards = (
  retailerIds: readonly string[],
  products: readonly ProductRow[],
  variations: readonly ProductVariationRow[]
): Record<string, CatalogInteractiveProductCard> => {
  const cards: Record<string, CatalogInteractiveProductCard> = {};
  const addProduct = (product: ProductRow) => {
    const sourceVariations = Array.isArray(product.product_variations) ? product.product_variations : [];
    const items = buildProductMetaCatalogSyncItems(product, sourceVariations, []);
    items.forEach((item) => {
      if ('deleted' in item) return;
      const keys = [String(item.code || '').trim(), String(item.id || '').trim()];
      if (item.isVariation) keys.push(`variation:${item.id}`);
      keys.filter((key) => retailerIds.includes(key)).forEach((key) => {
        cards[key] = toCard(key, item);
      });
    });

    const hasVariations = sourceVariations.length > 0;
    if (!hasVariations) {
      const code = String(product.code || '').trim();
      const keys = [(!isSlugSku(code) && code) || product.id, product.id]
        .filter((key) => retailerIds.includes(key) && !cards[key]);
      if (keys.length) {
        let price = Number(product.unit_price || product.price || 0);
        const promoPrice = Number(product.promo_price || 0);
        if (price <= 0 && promoPrice > 0) price = promoPrice;
        const card = {
          name: String(product.name || product.title || 'Produto do catálogo'),
          images: Array.isArray(product.images) ? product.images : [],
          sales_price: price,
          promo_price: promoPrice > 0 && promoPrice < price ? promoPrice : undefined,
        };
        keys.forEach((key) => { cards[key] = toCard(key, card); });
      }
    }

    sourceVariations.forEach((variation, index) => {
      const rawCode = String(variation.sku || variation.code || '').trim();
      const parentCode = String(product.code || '').trim();
      const code = (!isSlugSku(rawCode) && rawCode)
        || (parentCode && !isSlugSku(parentCode)
          ? `${parentCode}-${String(index + 1).padStart(2, '0')}`
          : variation.id);
      const keys = [code, String(variation.id || ''), `variation:${variation.id}`]
        .filter((key) => retailerIds.includes(key) && !cards[key]);
      if (!keys.length) return;
      const hasVariationPrice = Boolean(variation.sales_price || variation.price);
      const useParentPrice = variation.use_parent_price === true
        || (!hasVariationPrice && variation.use_parent_price !== false);
      let price = Number(useParentPrice
        ? product.sales_price || product.unit_price || product.price || 0
        : variation.sales_price || variation.price || product.sales_price || product.price || 0);
      const useParentPromo = variation.use_parent_promo_price === true
        || (!variation.promo_price && variation.use_parent_promo_price !== false);
      const promoPrice = Number(useParentPromo
        ? product.promo_price || 0
        : variation.promo_price || product.promo_price || 0);
      if (price <= 0 && promoPrice > 0) price = promoPrice;
      const variationImages = String(variation.image_url || '')
        .split(',').map((image) => image.trim()).filter(Boolean);
      const card = {
        name: String(variation.name || product.name || product.title || 'Produto do catálogo'),
        images: variationImages.length ? variationImages : Array.isArray(product.images) ? product.images : [],
        sales_price: price,
        promo_price: promoPrice > 0 && promoPrice < price ? promoPrice : undefined,
      };
      keys.forEach((key) => { cards[key] = toCard(key, card); });
    });
  };

  products.forEach(addProduct);
  variations.forEach((row) => {
    const parent = Array.isArray(row.products) ? row.products[0] : row.products;
    if (!parent) return;
    const items = buildProductMetaCatalogSyncItems(parent, [row], []);
    items.forEach((item) => {
      if ('deleted' in item) return;
      const keys = [String(item.code || '').trim(), String(item.id || '').trim()];
      if (item.isVariation) keys.push(`variation:${item.id}`);
      keys.filter((key) => retailerIds.includes(key)).forEach((key) => {
        cards[key] = toCard(key, item);
      });
    });
    const keys = [String(row.sku || row.code || '').trim(), String(row.id || ''), `variation:${row.id}`]
      .filter((key) => retailerIds.includes(key) && !cards[key]);
    if (keys.length) {
      const hasVariationPrice = Boolean(row.sales_price || row.price);
      const useParentPrice = row.use_parent_price === true
        || (!hasVariationPrice && row.use_parent_price !== false);
      let price = Number(useParentPrice
        ? parent.sales_price || parent.unit_price || parent.price || 0
        : row.sales_price || row.price || parent.sales_price || parent.price || 0);
      const useParentPromo = row.use_parent_promo_price === true
        || (!row.promo_price && row.use_parent_promo_price !== false);
      const promoPrice = Number(useParentPromo
        ? parent.promo_price || 0
        : row.promo_price || parent.promo_price || 0);
      if (price <= 0 && promoPrice > 0) price = promoPrice;
      const variationImages = String(row.image_url || '')
        .split(',').map((image) => image.trim()).filter(Boolean);
      const card = {
        name: String(row.name || parent.name || parent.title || 'Produto do catálogo'),
        images: variationImages.length ? variationImages : Array.isArray(parent.images) ? parent.images : [],
        sales_price: price,
        promo_price: promoPrice > 0 && promoPrice < price ? promoPrice : undefined,
      };
      keys.forEach((key) => { cards[key] = toCard(key, card); });
    }
  });

  return cards;
};

export function useInteractiveCatalogProductCards(messages: readonly WhatsAppMessage[]) {
  const retailerIds = useMemo(() => collectCatalogRetailerIds(messages), [messages]);
  const retailerIdsKey = JSON.stringify(retailerIds);
  const [cardsByRetailerId, setCardsByRetailerId] = useState<Record<string, CatalogInteractiveProductCard>>({});
  const [loadingRetailerIds, setLoadingRetailerIds] = useState<string[]>([]);
  const [batchVersion, setBatchVersion] = useState(0);
  const cardsRef = useRef(cardsByRetailerId);
  const pendingIdsRef = useRef(new Set<string>());
  const attemptedIdsRef = useRef(new Set<string>());
  const previousIdsKeyRef = useRef(retailerIdsKey);
  const mountedRef = useRef(false);
  cardsRef.current = cardsByRetailerId;

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (previousIdsKeyRef.current !== retailerIdsKey) {
      previousIdsKeyRef.current = retailerIdsKey;
      attemptedIdsRef.current.clear();
    }
    const currentIds = JSON.parse(retailerIdsKey) as string[];
    const missingIds = currentIds.filter((id) =>
      !cardsRef.current[id] && !pendingIdsRef.current.has(id) && !attemptedIdsRef.current.has(id)
    ).slice(-120);
    if (!missingIds.length) return;

    missingIds.forEach((id) => pendingIdsRef.current.add(id));
    const variationIdsFromLinks = missingIds.flatMap((id) => {
      const match = /^variation:(.+)$/u.exec(id);
      return match && UUID_PATTERN.test(match[1]) ? [match[1]] : [];
    });
    const variationKeysFromLinks = new Set(variationIdsFromLinks.map((id) => `variation:${id}`));
    const retailerCodes = missingIds.filter((id) => !variationKeysFromLinks.has(id));
    const productCodes = Array.from(new Set(retailerCodes.flatMap((id) => {
      const generatedVariation = id.match(/^(.*)-\d{2}$/u);
      return generatedVariation ? [id, generatedVariation[1]] : [id];
    })));
    const productIds = retailerCodes.filter((id) => UUID_PATTERN.test(id));
    const variationIds = Array.from(new Set([...productIds, ...variationIdsFromLinks]));
    setLoadingRetailerIds((current) => Array.from(new Set([...current, ...missingIds])));

    void (async () => {
      try {
        if (typeof supabase?.from !== 'function') return;
        const queries: Array<{ kind: 'product' | 'variation'; request: PromiseLike<any> }> = [];
        if (productCodes.length) queries.push({ kind: 'product', request: supabase.from('products').select(PRODUCT_CARD_SELECT).in('code', productCodes) });
        if (retailerCodes.length) queries.push({ kind: 'variation', request: supabase.from('product_variations').select(PRODUCT_VARIATION_CARD_SELECT).in('sku', retailerCodes) });
        if (productIds.length) queries.push({ kind: 'product', request: supabase.from('products').select(PRODUCT_CARD_SELECT).in('id', productIds) });
        if (variationIds.length) queries.push({ kind: 'variation', request: supabase.from('product_variations').select(PRODUCT_VARIATION_CARD_SELECT).in('id', variationIds) });
        const results = await withTimeout(
          Promise.allSettled(queries.map(({ request }) => Promise.resolve(request))),
          CATALOG_PRODUCT_QUERY_TIMEOUT_MS,
          null,
          'central:interactive-catalog-products'
        );
        if (!results) return;
        const productRows: ProductRow[] = [];
        const variationRows: ProductVariationRow[] = [];
        results.forEach((result, index) => {
          if (result.status === 'rejected' || result.value?.error) {
            console.warn('[Central] Não foi possível consultar parte dos produtos do catálogo.');
            return;
          }
          const rows = Array.isArray(result.value?.data) ? result.value.data : [];
          if (queries[index].kind === 'product') productRows.push(...rows);
          else variationRows.push(...rows);
        });
        const matchedCards = resolveCards(
          missingIds,
          productRows,
          variationRows
        );
        if (mountedRef.current) setCardsByRetailerId((current) => ({ ...current, ...matchedCards }));
      } catch (error) {
        console.warn('[Central] Falha ao consultar os cards do catálogo:', error);
      } finally {
        missingIds.forEach((id) => {
          pendingIdsRef.current.delete(id);
          attemptedIdsRef.current.add(id);
        });
        if (mountedRef.current) {
          setLoadingRetailerIds((current) => current.filter((id) => !missingIds.includes(id)));
          setBatchVersion((current) => current + 1);
        }
      }
    })();
  }, [retailerIdsKey, batchVersion]);

  return { cardsByRetailerId, loadingRetailerIds: new Set(loadingRetailerIds) };
}
