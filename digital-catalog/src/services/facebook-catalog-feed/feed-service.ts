import { supabase } from '@/lib/supabase/client';
import {
  RawCatalogProduct,
  MetaCatalogSettings,
} from './types';
import { mapProductsToFeedRows } from './feed-mapper';
import { serializeFeedRowsToCsv } from './csv-serializer';

const DEFAULT_SETTINGS: MetaCatalogSettings = {
  globalDescriptionPrefix: '',
  columnMappings: {
    brand: 'Móveis Morante',
    condition: 'new',
    gender: 'unisex',
    age_group: 'adult',
  },
};

/**
 * Busca as configurações personalizadas do feed da Meta no banco
 */
export async function fetchFeedSettings(): Promise<MetaCatalogSettings> {
  try {
    const { data: catSettings } = await supabase
      .from('facebook_catalog_settings')
      .select('global_description_prefix, column_mappings')
      .eq('id', true)
      .maybeSingle();

    if (catSettings) {
      return {
        globalDescriptionPrefix: catSettings.global_description_prefix || '',
        columnMappings: {
          ...DEFAULT_SETTINGS.columnMappings,
          ...(catSettings.column_mappings || {}),
        },
      };
    }
  } catch (err) {
    console.warn('[FacebookCatalogFeed] facebook_catalog_settings não pôde ser lido, usando fallbacks:', err);
  }

  return DEFAULT_SETTINGS;
}

/**
 * Busca os campos e relações usados pelo mapeador do feed.
 */
export async function fetchFeedProducts(): Promise<RawCatalogProduct[]> {
  const { data, error } = await supabase
    .from('products')
    .select(
      'id, code, name, slug, description, price, promo_price, active, status, is_draft, deleted, deleted_at, is_salvado, product_kind, material, images, variations, product_categories(categories(name, type)), product_images(image_url, is_main), product_variations(id, sku, name, price, promo_price, description, image_url, active, status, attributes, use_parent_price, use_parent_promo_price, use_parent_description), opportunities(name, observations)'
    )
    .is('deleted_at', null);

  if (error) {
    throw new Error(`Erro ao buscar produtos para o catálogo Meta: ${error.message}`);
  }

  // O tipo inferido do select aninhado não coincide com RawCatalogProduct;
  // manter o contrato local consumido pelo mapeador.
  return (data as unknown as RawCatalogProduct[]) || [];
}

/**
 * Resolve a URL de origem padrão para links de produtos
 */
export function resolveOrigin(requestUrl?: string): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://moveismorante.com.br';
  if (appUrl.includes('localhost') && requestUrl) {
    return new URL(requestUrl).origin;
  }
  return appUrl.replace(/\/$/, '');
}

/**
 * Serviço principal que gera o CSV completo do catálogo do Facebook/Meta
 */
export async function generateFacebookCatalogCsv(requestUrl?: string): Promise<string> {
  const [products, settings] = await Promise.all([
    fetchFeedProducts(),
    fetchFeedSettings(),
  ]);

  const origin = resolveOrigin(requestUrl);

  const rows = mapProductsToFeedRows({
    products,
    settings,
    origin,
  });

  return serializeFeedRowsToCsv(rows);
}
