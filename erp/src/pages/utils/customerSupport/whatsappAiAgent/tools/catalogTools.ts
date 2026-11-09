import type { SupabaseClient } from '@supabase/supabase-js';
import type { SafeToolContext } from './types.js';

export async function handleBuscarProdutos(
  supabase: SupabaseClient,
  args: Record<string, any>,
  _context: SafeToolContext
): Promise<Record<string, any>> {
  let query = supabase
    .from('products')
    .select(
      'id, code, sku, name, title, description, category, brand, line, condition, unit_price, promo_price, stock, unit, height, width, depth, weight, images'
    )
    .eq('deleted', false)
    .eq('active', true);

  if (args.apenasEmEstoque !== false) {
    query = query.gt('stock', 0);
  }
  if (args.categoria && typeof args.categoria === 'string') {
    query = query.ilike('category', `%${args.categoria.trim()}%`);
  }
  if (args.termo && typeof args.termo === 'string') {
    const t = args.termo.trim();
    query = query.or(`name.ilike.%${t}%,description.ilike.%${t}%,code.ilike.%${t}%,sku.ilike.%${t}%`);
  }

  const limit = Math.min(Math.max(Number(args.limite) || 5, 1), 10);
  const { data, error } = await query.limit(limit);

  if (error) {
    return { success: false, erro: 'Não foi possível consultar os produtos no momento.' };
  }

  const produtos = (data || []).map((p: any) => ({
    codigo: p.code || p.sku,
    nome: p.name || p.title,
    categoria: p.category || 'Móveis',
    precoVenda: Number(p.unit_price || 0),
    precoPromocional: p.promo_price ? Number(p.promo_price) : undefined,
    emEstoque: Number(p.stock || 0) > 0,
    quantidadeEstoque: Number(p.stock || 0),
    medidas: {
      alturaCm: p.height ?? null,
      larguraCm: p.width ?? null,
      profundidadeCm: p.depth ?? null,
    },
  }));

  return {
    success: true,
    total: produtos.length,
    produtos,
    mensagem:
      produtos.length === 0
        ? 'Nenhum produto encontrado com os critérios informados.'
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

  const query = supabase
    .from('products')
    .select(
      'id, code, sku, name, title, description, category, brand, line, condition, unit_price, promo_price, stock, unit, height, width, depth, weight, images, colors, material, main_differential, not_included, product_variations(id, sku, name, unit_price, promo_price, stock, active, attributes, images)'
    )
    .eq('deleted', false)
    .or(`code.eq.${cleanTarget},sku.eq.${cleanTarget}`);

  const { data, error } = await query.maybeSingle();

  if (error || !data) {
    return {
      success: false,
      erro: `Produto com código/SKU "${cleanTarget}" não foi encontrado. Verifique o código e tente novamente.`,
    };
  }

  const rawVars = Array.isArray((data as any).product_variations)
    ? (data as any).product_variations
    : [];

  const variacoes = rawVars.map((v: any) => ({
    sku: v.sku,
    nome: v.name,
    precoVenda: Number(v.unit_price || 0),
    precoPromocional: v.promo_price ? Number(v.promo_price) : undefined,
    emEstoque: Number(v.stock || 0) > 0,
    quantidadeEstoque: Number(v.stock || 0),
    atributos: v.attributes,
    fotos: Array.isArray(v.images) ? v.images : [],
  }));

  return {
    success: true,
    produto: {
      codigo: data.code || data.sku,
      sku: data.sku || data.code,
      nome: data.name || data.title,
      categoria: data.category || 'Móveis',
      ambiente: data.line || undefined,
      marca: data.brand || 'Móveis Morante',
      precoVenda: Number(data.unit_price || 0),
      precoPromocional: data.promo_price ? Number(data.promo_price) : undefined,
      emEstoque: Number(data.stock || 0) > 0,
      quantidadeEstoque: Number(data.stock || 0),
      dimensoes: {
        alturaCm: data.height ?? null,
        larguraCm: data.width ?? null,
        profundidadeCm: data.depth ?? null,
        pesoKg: data.weight ?? null,
      },
      detalhes: {
        material: data.material || null,
        cores: data.colors || null,
        diferencial: data.main_differential || null,
        naoIncluso: data.not_included || null,
      },
      fotos: Array.isArray(data.images) ? data.images : [],
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
    const { data: catRows } = await supabase
      .from('categories')
      .select('name, is_environment, active')
      .eq('active', true)
      .order('name', { ascending: true })
      .limit(50);

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
      success: true,
      categorias: [
        { nome: 'Sofás e Poltronas', ambiente: false },
        { nome: 'Guarda-Roupas e Cômodas', ambiente: false },
        { nome: 'Mesas e Cadeiras', ambiente: false },
        { nome: 'Camas e Colchões', ambiente: false },
      ],
    };
  }
}
