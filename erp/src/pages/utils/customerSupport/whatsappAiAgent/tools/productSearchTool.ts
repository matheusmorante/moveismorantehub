import type { SupabaseClient } from '@supabase/supabase-js';
import type { SafeToolContext } from './types.js';
import {
  buildAgentProductSearchFilter,
  classifyAgentProductMatch,
  hasSinkBaseCabinetIntent,
  normalizeAgentProductSearchTerm,
} from '../../../../../../../shared-utils/agentProductSearch';
import {
  buildPostgrestAccentInsensitiveOrFilter,
  buildPostgrestAccentInsensitivePattern,
} from '../../../../../../../shared-utils/searchText';
import { resolveProductUnitPrice } from '../../../../../../../shared-utils/productUnitPrice';
import { NON_TEST_PRODUCT_ARTIFACT_FILTER } from '../../../../../../../shared-utils/testArtifactQueries';
import { buildProductMetaCatalogSyncItems } from '../../../../../../../shared-utils/productMetaCatalogSyncItems';

// Keep dimensions out of this text filter. Measures remain searchable through
// product names/descriptions and variation attributes.
const PRODUCT_SEARCH_COLUMNS = {
  search: ['name', 'marketplace_title', 'description', 'code', 'brand', 'line', 'category', 'colors', 'material'],
  name: ['name', 'marketplace_title'],
};

const PRODUCT_CATEGORY_RELATION = 'category_details:categories!products_category_id_fkey';
const PRODUCT_VARIATIONS_SELECT =
  'product_variations(id,product_id,status,sku,name,stock,active,merged_to_variation_id,attributes,width,height,depth,image_url,price,promo_price,use_parent_price,use_parent_promo_price,use_parent_name,use_parent_description)';

const buildProductSearchSelect = (category: string) => [
  'id,code,sku:code,name,title:marketplace_title,description,category,brand,line,material,colors,status,active,deleted,deleted_at,is_draft,is_salvado,product_kind,unit_price,price,promo_price,stock,height,width,depth',
  `${PRODUCT_CATEGORY_RELATION}${category ? '!inner' : ''}(name,type)`,
  PRODUCT_VARIATIONS_SELECT,
].join(',');

const isActiveCatalogVariation = (variation: any) =>
  variation.active === true &&
  !variation.merged_to_variation_id &&
  !['hidden', 'draft'].includes(String(variation.status || '').toLowerCase());

const searchableProductText = (product: any) => [
  product.description,
  product.colors,
  product.material,
  product.width,
  product.height,
  product.depth,
  ...(Array.isArray(product.product_variations)
    ? product.product_variations
      .filter(isActiveCatalogVariation)
      .flatMap((variation: any) => [
        variation.name,
        variation.sku,
        JSON.stringify(variation.attributes || {}),
        variation.width,
        variation.height,
        variation.depth,
      ])
    : []),
].filter(Boolean).join(' ');

const matchingProductRows = (rows: any[], term: string) => rows
  .filter((product: any) => !term || classifyAgentProductMatch({
    ...product,
    description: searchableProductText(product),
  }, term) === 'corresponding');

// O estoque cadastrado (inclusive o "sem estoque" publicado na Meta) não é uma
// informação confiável para o atendimento: nunca filtrar nem expor saldo ao modelo.
const buildProductSearchQuery = ({
  supabase,
  term,
  category,
  matchedParentIds,
  limit,
}: {
  supabase: SupabaseClient;
  term: string;
  category: string;
  matchedParentIds: string[];
  limit: number;
}) => {
  let query = supabase
    .from('products')
    .select(buildProductSearchSelect(category))
    .eq('deleted', false)
    .eq('active', true)
    .eq('is_draft', false)
    .eq('status', 'published')
    .eq('product_variations.active', true)
    .is('product_variations.merged_to_variation_id', null);

  // The legacy products.category text is often empty; use the real FK, and keep
  // the category as a server-side constraint alongside any free-text term.
  if (category) {
    query = query
      .eq('category_details.type', 'category')
      .filter(
        'category_details.name',
        'imatch',
        buildPostgrestAccentInsensitivePattern(category, 'exact')
      );
  }

  const productFilter = term
    ? buildAgentProductSearchFilter(term, matchedParentIds, PRODUCT_SEARCH_COLUMNS)
    : '';

  const filters = [NON_TEST_PRODUCT_ARTIFACT_FILTER, productFilter].filter(Boolean);

  query = query.or(`and(${filters.join(',')})`);

  return query.order('name', { ascending: true }).order('code', { ascending: true }).limit(limit);
};

const mapAgentProductResults = (rows: any[], term: string) => matchingProductRows(rows, term)
  .map((product: any) => {
    const activeVariations = Array.isArray(product.product_variations)
      ? product.product_variations.filter(isActiveCatalogVariation)
      : [];

    return {
      codigo: product.code || product.sku,
      nome: product.name || product.title,
      categoria: product.category || product.category_details?.name || 'Móveis',
      linha: product.line || null,
      precoVenda: resolveProductUnitPrice(product),
      precoPromocional: product.promo_price ? Number(product.promo_price) : undefined,
      cores: product.colors || null,
      material: product.material || null,
      variacoes: activeVariations.map((variation: any) => ({
        sku: variation.sku || null,
        nome: variation.name || null,
        atributos: variation.attributes || null,
        medidas: {
          alturaCm: variation.use_parent_dimensions === false ? variation.height ?? null : product.height ?? null,
          larguraCm: variation.use_parent_dimensions === false ? variation.width ?? null : product.width ?? null,
          profundidadeCm: variation.use_parent_dimensions === false ? variation.depth ?? null : product.depth ?? null,
        },
      })),
      medidas: {
        alturaCm: product.height ?? null,
        larguraCm: product.width ?? null,
        profundidadeCm: product.depth ?? null,
      },
      correspondencia: 'correspondente',
    };
  });

const buildNativeCatalogProducts = (rows: any[], term: string, limit: number) => {
  const byRetailerId = new Map<string, { retailerId: string; name: string }>();

  matchingProductRows(rows, term).slice(0, limit).forEach((product: any) => {
    const catalogVariations = Array.isArray(product.product_variations)
      ? product.product_variations
      : [];
    const variations = catalogVariations.filter(isActiveCatalogVariation);
    const syncItems = buildProductMetaCatalogSyncItems(product, catalogVariations, []);

    syncItems
      .filter((item: any) => !('deleted' in item) && item.status === 'published' && item.code)
      .filter((item: any) => {
        if (!term) return true;
        const variation = item.isVariation
          ? variations.find((candidate: any) => candidate.id === item.id)
          : null;
        const itemText = [
          product.description,
          product.colors,
          product.material,
          product.width,
          product.height,
          product.depth,
          item.name,
          item.color,
          item.size,
          variation?.name,
          variation?.sku,
          JSON.stringify(variation?.attributes || {}),
          variation?.width,
          variation?.height,
          variation?.depth,
        ].filter(Boolean).join(' ');

        return classifyAgentProductMatch({
          ...product,
          description: itemText,
        }, term) === 'corresponding';
      })
      .forEach((item: any) => {
        byRetailerId.set(String(item.code).trim(), {
          retailerId: String(item.code).trim(),
          name: String(item.name || product.name || product.title || 'Produto'),
        });
      });
  });

  const products = Array.from(byRetailerId.values());
  return { products: products.slice(0, 30), hasMore: products.length > 30 };
};

export async function handleBuscarProdutos(
  supabase: SupabaseClient,
  args: Record<string, any>,
  _context: SafeToolContext
): Promise<Record<string, any>> {
  let term = typeof args.termo === 'string'
    ? normalizeAgentProductSearchTerm(args.termo)
    : '';
  let category = typeof args.categoria === 'string' ? args.categoria.trim() : '';
  const requestedSinkBaseCabinet = hasSinkBaseCabinetIntent(term);
  const isSinkBaseCabinetCategory = normalizeAgentProductSearchTerm(category) === 'balcao para pia';
  if (requestedSinkBaseCabinet || isSinkBaseCabinetCategory) {
    category = 'Balcões para Pia';
    term = term.split(/\s+/).filter((word) => !['balcao', 'para', 'pia'].includes(word)).join(' ').trim();
  }
  const enviarCartoes = args.enviarCartoes === true;
  const limit = enviarCartoes ? 30 : Math.min(Math.max(Number(args.limite) || 5, 1), 10);
  let matchedParentIds: string[] = [];
  if (term) {
    let variationQuery = supabase
      .from('product_variations')
      .select(category
        ? `product_id,products!inner(id,${PRODUCT_CATEGORY_RELATION}!inner(name,type))`
        : 'product_id,products!inner(id)')
      .eq('active', true)
      .is('merged_to_variation_id', null)
      .eq('products.active', true)
      .eq('products.deleted', false)
      .eq('products.is_draft', false)
      .or(NON_TEST_PRODUCT_ARTIFACT_FILTER, { referencedTable: 'products' });
    if (category) {
      variationQuery = variationQuery
        .eq('products.category_details.type', 'category')
        .filter(
          'products.category_details.name',
          'imatch',
          buildPostgrestAccentInsensitivePattern(category, 'exact')
        );
    }
    const { data: variationRows, error: variationError } = await variationQuery
      .or(buildPostgrestAccentInsensitiveOrFilter(
        ['name', 'sku', 'attributes->>Cor', 'attributes->>Tamanho'],
        term
      ))
      .limit(51);
    if (variationError) {
      return {
        success: false,
        code: 'DATABASE_ERROR',
        erro: 'Não consegui consultar os produtos agora. Posso tentar novamente mais tarde.',
      };
    }
    if ((variationRows?.length || 0) > 50) {
      return {
        success: false,
        code: 'SEARCH_TOO_BROAD',
        erro: 'A busca encontrou muitas variações. Informe um modelo, código ou característica mais específica.',
      };
    }
    matchedParentIds = Array.from(
      new Set((variationRows || []).map((row: any) => row.product_id).filter(Boolean))
    );
  }

  const queryOptions = {
    supabase,
    term,
    category,
    matchedParentIds,
    limit: limit + (enviarCartoes ? 1 : 0),
  };
  const initialResult = await buildProductSearchQuery(queryOptions);

  if (initialResult.error) {
    return {
      success: false,
      code: 'DATABASE_ERROR',
      erro: 'Não consegui consultar os produtos agora. Posso tentar novamente mais tarde.',
    };
  }

  const catalogResultRows = initialResult.data || [];
  let produtos = mapAgentProductResults(catalogResultRows, term);

  const moreProductRows = enviarCartoes && produtos.length > limit;
  produtos = produtos.slice(0, limit);
  const nativeCatalogResult = enviarCartoes
    ? buildNativeCatalogProducts(catalogResultRows, term, limit)
    : { products: [], hasMore: false };
  const maisResultadosDisponiveis = moreProductRows || nativeCatalogResult.hasMore;

  return {
    success: true,
    total: produtos.length,
    produtos,
    ...(enviarCartoes ? {
      maisResultadosDisponiveis,
      __nativeCatalogProducts: nativeCatalogResult.products,
    } : {}),
    mensagem: produtos.length === 0
      ? 'Não encontrei um produto que corresponda ao modelo ou características informadas.'
      : `${produtos.length} modelo(s) encontrado(s).`,
  };
}
