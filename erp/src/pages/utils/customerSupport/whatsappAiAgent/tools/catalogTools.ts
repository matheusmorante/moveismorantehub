import type { SupabaseClient } from '@supabase/supabase-js';
import type { SafeToolContext } from './types.js';
import {
  buildAgentProductSearchFilter,
  classifyAgentProductMatch,
} from '../../../../../../../shared-utils/agentProductSearch';
import {
  buildPostgrestAccentInsensitiveOrFilter,
  buildPostgrestAccentInsensitivePattern,
} from '../../../../../../../shared-utils/searchText';
import { resolveProductUnitPrice } from '../../../../../../../shared-utils/productUnitPrice';
import { parseVariationImages } from '../../../../../../../shared-utils/productVariationImages';

const PRODUCT_SEARCH_COLUMNS = { search: ['name', 'marketplace_title', 'description', 'code', 'brand', 'line', 'category'],
  name: ['name', 'marketplace_title'] };

export async function handleBuscarProdutos(
  supabase: SupabaseClient,
  args: Record<string, any>,
  _context: SafeToolContext
): Promise<Record<string, any>> {
  const term = typeof args.termo === 'string' ? args.termo.trim() : '';
  let matchedParentIds: string[] = [];
  if (term) {
    const { data: variationRows, error: variationError } = await supabase
      .from('product_variations')
      .select('product_id')
      .eq('active', true)
      .is('merged_to_variation_id', null)
      .or(buildPostgrestAccentInsensitiveOrFilter(['name', 'sku'], term))
      .limit(51);
    if (variationError) {
      return {
        success: false,
        code: 'DATABASE_ERROR',
        erro: 'Não consegui consultar o catálogo agora. Posso tentar novamente mais tarde.',
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

  let query = supabase
    .from('products')
    .select(
      'id, code, sku:code, name, title:marketplace_title, description, category, brand, line, condition, unit_price, price, promo_price, stock, unit, height, width, depth, images, product_variations(sku,name,active,merged_to_variation_id)'
    )
    .eq('deleted', false)
    .eq('active', true)
    .eq('product_variations.active', true)
    .is('product_variations.merged_to_variation_id', null);

  if (args.apenasEmEstoque !== false) {
    query = query.gt('stock', 0);
  }
  if (args.categoria && typeof args.categoria === 'string') {
    query = query.filter(
      'category',
      'imatch',
      buildPostgrestAccentInsensitivePattern(args.categoria.trim())
    );
  }
  if (term) {
    query = query.or(buildAgentProductSearchFilter(term, matchedParentIds, PRODUCT_SEARCH_COLUMNS));
  }

  const limit = Math.min(Math.max(Number(args.limite) || 5, 1), 10);
  const { data, error } = await query
    .order('name', { ascending: true })
    .order('code', { ascending: true })
    .limit(limit);

  if (error) {
    return {
      success: false,
      code: 'DATABASE_ERROR',
      erro: 'Não consegui consultar o catálogo agora. Posso tentar novamente mais tarde.',
    };
  }

  const produtos = (data || [])
    .filter((p: any) => !term || classifyAgentProductMatch({
      ...p,
      description: [
        p.description,
        ...(Array.isArray(p.product_variations)
          ? p.product_variations.filter((variation: any) => variation.active === true && !variation.merged_to_variation_id)
            .flatMap((variation: any) => [variation.name, variation.sku])
          : []),
      ].filter(Boolean).join(' '),
    }, term) === 'corresponding')
    .map((p: any) => ({
    codigo: p.code || p.sku,
    nome: p.name || p.title,
    categoria: p.category || 'Móveis',
    linha: p.line || null,
    precoVenda: resolveProductUnitPrice(p),
    precoPromocional: p.promo_price ? Number(p.promo_price) : undefined,
    emEstoque: Number(p.stock || 0) > 0,
    quantidadeEstoque: Number(p.stock || 0),
    medidas: {
      alturaCm: p.height ?? null,
      larguraCm: p.width ?? null,
      profundidadeCm: p.depth ?? null,
    },
    correspondencia: 'correspondente',
  }));

  return {
    success: true,
    total: produtos.length,
    produtos,
    mensagem:
      produtos.length === 0
      ? 'Não encontrei um produto que corresponda ao tipo, finalidade e modelo informados.'
        : `${produtos.length} produto(s) encontrado(s).`,
  };
}

export async function handleObterDetalhesProduto(
  supabase: SupabaseClient,
  args: Record<string, any>,
  _context: SafeToolContext
): Promise<Record<string, any>> {
  const cleanTarget = String(args.codigoOuSku || '').trim();
  if (!cleanTarget) {
    return { success: false, erro: 'Código ou SKU não informado.' };
  }
  if (!/^[a-z\d_-]+$/i.test(cleanTarget)) {
    return { success: false, code: 'INVALID_IDENTIFIER', erro: 'Informe um código ou SKU válido.' };
  }

  const exactCode = /^\d{1,6}$/.test(cleanTarget) ? cleanTarget.padStart(6, '0') : cleanTarget;
  const { data, error } = await supabase
    .from('products')
    .select(
      'id, code, sku:code, name, title:marketplace_title, description, category, brand, line, condition, unit_price, price, promo_price, stock, unit, height, width, depth, images, colors, material, main_differential, not_included, product_variations(id, sku, name, price, promo_price, use_parent_price, use_parent_promo_price, stock, active, merged_to_variation_id, attributes, image_url)'
    )
    .eq('deleted', false)
    .eq('active', true)
    .eq('product_variations.active', true)
    .is('product_variations.merged_to_variation_id', null)
    .eq('code', exactCode)
    .maybeSingle();

  if (error) {
    return {
      success: false,
      code: error.code === 'PGRST116' ? 'AMBIGUOUS_IDENTIFIER' : 'DATABASE_ERROR',
      erro:
        error.code === 'PGRST116'
          ? 'Esse código ou SKU corresponde a mais de um produto. Confirme o identificador completo.'
          : 'Não consegui consultar a ficha do produto agora. Tente novamente mais tarde.',
    };
  }

  let productRow = data;
  if (!productRow) {
    const { data: variation, error: variationError } = await supabase
      .from('product_variations')
      .select('product_id')
      .eq('sku', cleanTarget)
      .eq('active', true)
      .is('merged_to_variation_id', null)
      .maybeSingle();
    if (variationError) {
      return {
        success: false,
        code: variationError.code === 'PGRST116' ? 'AMBIGUOUS_IDENTIFIER' : 'DATABASE_ERROR',
        erro:
          variationError.code === 'PGRST116'
            ? 'Esse SKU corresponde a mais de um produto. Confirme o identificador completo.'
            : 'Não consegui consultar a ficha do produto agora. Tente novamente mais tarde.',
      };
    }
    if (variation?.product_id) {
      const { data: parent, error: parentError } = await supabase
        .from('products')
        .select(
          'id, code, sku:code, name, title:marketplace_title, description, category, brand, line, condition, unit_price, price, promo_price, stock, unit, height, width, depth, images, colors, material, main_differential, not_included, product_variations(id, sku, name, price, promo_price, use_parent_price, use_parent_promo_price, stock, active, merged_to_variation_id, attributes, image_url)'
        )
        .eq('id', variation.product_id)
        .eq('deleted', false)
        .eq('active', true)
        .eq('product_variations.active', true)
        .is('product_variations.merged_to_variation_id', null)
        .maybeSingle();
      if (parentError) {
        return { success: false, code: 'DATABASE_ERROR', erro: 'Não consegui consultar a ficha do produto agora. Tente novamente mais tarde.' };
      }
      productRow = parent;
    }
  }

  if (!productRow) {
    return {
      success: false,
      code: 'PRODUCT_NOT_FOUND',
      erro: `Não encontrei produto ativo com o código/SKU exato "${cleanTarget}".`,
    };
  }

  const rawVars = Array.isArray((productRow as any).product_variations)
    ? (productRow as any).product_variations
    : [];

  const variacoes = rawVars.filter((v: any) => v.active === true && !v.merged_to_variation_id).map((v: any) => ({
    sku: v.sku,
    nome: v.name,
    precoVenda: v.use_parent_price !== false ? resolveProductUnitPrice(productRow) : Number(v.price || 0),
    precoPromocional: (v.use_parent_promo_price !== false ? productRow.promo_price : v.promo_price) != null
      ? Number(v.use_parent_promo_price !== false ? productRow.promo_price : v.promo_price) : undefined,
    emEstoque: Number(v.stock || 0) > 0,
    quantidadeEstoque: Number(v.stock || 0),
    atributos: v.attributes,
    fotos: parseVariationImages(v.image_url),
  }));

  return {
    success: true,
    produto: {
      codigo: productRow.code || productRow.sku,
      sku: productRow.sku || productRow.code,
      nome: productRow.name || productRow.title,
      categoria: productRow.category || 'Móveis',
      ambiente: productRow.line || undefined,
      marca: productRow.brand || 'Móveis Morante',
      precoVenda: resolveProductUnitPrice(productRow),
      precoPromocional: productRow.promo_price ? Number(productRow.promo_price) : undefined,
      emEstoque: Number(productRow.stock || 0) > 0,
      quantidadeEstoque: Number(productRow.stock || 0),
      dimensoes: {
        alturaCm: productRow.height ?? null,
        larguraCm: productRow.width ?? null,
        profundidadeCm: productRow.depth ?? null,
        pesoKg: null,
      },
      detalhes: {
        material: productRow.material || null,
        cores: productRow.colors || null,
        diferencial: productRow.main_differential || null,
        naoIncluso: productRow.not_included || null,
      },
      fotos: Array.isArray(productRow.images) ? productRow.images : [],
      possuiVariacoes: variacoes.length > 0,
      variacoes,
    },
  };
}

export async function handleListarCategoriasECaracteristicasProduto(
  supabase: SupabaseClient,
  _args: Record<string, any>,
  _context: SafeToolContext
): Promise<Record<string, any>> {
  try {
    const { data: catRows, error } = await supabase
      .from('categories')
      .select('name, is_environment, active')
      .eq('active', true)
      .order('name', { ascending: true })
      .limit(50);
    if (error) {
      return {
        success: false,
        code: 'DATABASE_ERROR',
        erro: 'Não consegui carregar as categorias agora. Tente novamente mais tarde.',
      };
    }

    const categorias = (catRows || []).map((c: any) => ({
      nome: c.name,
      ambiente: Boolean(c.is_environment),
    }));

    return {
      success: true,
      categorias,
      ambientesPrincipais: [
        'Sala de Estar',
        'Quarto / Dormitório',
        'Cozinha',
        'Sala de Jantar',
        'Escritório / Home Office',
      ],
    };
  } catch {
    return {
      success: false,
      code: 'DATABASE_ERROR',
      erro: 'Não consegui carregar as categorias agora. Tente novamente mais tarde.',
    };
  }
}
