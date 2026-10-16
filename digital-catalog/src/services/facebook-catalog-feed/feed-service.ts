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
 * Busca os produtos cadastrados com todas as relações necessárias para o catálogo
 */
export async function fetchFeedProducts(): Promise<RawCatalogProduct[]> {
  const { data, error } = await supabase
    .from('products')
    .select(
      '*, product_categories(categories(name, type)), product_images(*), product_variations(*), opportunities(*)'
    )
    .is('deleted_at', null);

  if (error) {
    throw new Error(`Erro ao buscar produtos para o catálogo Meta: ${error.message}`);
  }

  return (data as RawCatalogProduct[]) || [];
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
