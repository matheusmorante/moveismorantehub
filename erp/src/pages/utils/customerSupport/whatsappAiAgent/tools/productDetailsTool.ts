import type { SupabaseClient } from '@supabase/supabase-js';
import type { SafeToolContext } from './types.js';
import { resolveProductUnitPrice } from '../../../../../../../shared-utils/productUnitPrice';
import { parseVariationImages } from '../../../../../../../shared-utils/productVariationImages';
import { NON_TEST_PRODUCT_ARTIFACT_FILTER } from '../../../../../../../shared-utils/testArtifactQueries';

const PRODUCT_DETAILS_SELECT =
  'id, code, sku:code, name, title:marketplace_title, description, category, brand, line, condition, unit_price, price, promo_price, stock, unit, height, width, depth, images, colors, material, main_differential, not_included, product_variations(id, sku, name, price, promo_price, use_parent_price, use_parent_promo_price, stock, active, merged_to_variation_id, attributes, image_url)';

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
    .select(PRODUCT_DETAILS_SELECT)
    .eq('deleted', false)
    .eq('active', true)
    .eq('is_draft', false)
    .eq('product_variations.active', true)
    .is('product_variations.merged_to_variation_id', null)
    .or(NON_TEST_PRODUCT_ARTIFACT_FILTER)
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
      .select('product_id,products!inner(id)')
      .eq('sku', cleanTarget)
      .eq('active', true)
      .is('merged_to_variation_id', null)
      .eq('products.active', true)
      .eq('products.deleted', false)
      .eq('products.is_draft', false)
      .or(NON_TEST_PRODUCT_ARTIFACT_FILTER, { referencedTable: 'products' })
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
        .select(PRODUCT_DETAILS_SELECT)
        .eq('id', variation.product_id)
        .eq('deleted', false)
        .eq('active', true)
        .eq('is_draft', false)
        .eq('product_variations.active', true)
        .is('product_variations.merged_to_variation_id', null)
        .or(NON_TEST_PRODUCT_ARTIFACT_FILTER)
        .maybeSingle();
      if (parentError) {
        return {
          success: false,
          code: 'DATABASE_ERROR',
          erro: 'Não consegui consultar a ficha do produto agora. Tente novamente mais tarde.',
        };
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

  const variacoes = rawVars
    .filter((v: any) => v.active === true && !v.merged_to_variation_id)
    .map((v: any) => ({
      sku: v.sku,
      nome: v.name,
      precoVenda: v.use_parent_price !== false ? resolveProductUnitPrice(productRow) : Number(v.price || 0),
      precoPromocional: (v.use_parent_promo_price !== false ? productRow.promo_price : v.promo_price) != null
        ? Number(v.use_parent_promo_price !== false ? productRow.promo_price : v.promo_price)
        : undefined,
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
