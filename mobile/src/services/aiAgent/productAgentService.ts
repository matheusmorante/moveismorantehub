import { supabase } from '../supabaseClient';
import { fetchMobileProductsPage } from '../../features/products/services/mobileProductFetchService';

export interface MobileProductSummaryForAgent {
  codigo: string;
  sku: string;
  nome: string;
  categoria: string;
  marca: string;
  condicao: string;
  preco: number;
  precoPromocional?: number;
  precoCusto?: number;
  estoque: number;
  unidade: string;
  ativo: boolean;
  quantidadeVariacoes: number;
  skusVariacoes: string[];
}

export interface MobileProductVariationDetailForAgent {
  sku: string;
  nome: string;
  preco: number;
  precoPromocional?: number;
  precoCusto?: number;
  estoque: number;
  ativo: boolean;
  atributos: Record<string, string>;
  fotos: string[];
  dimensoes?: {
    alturaCm?: number;
    larguraCm?: number;
    profundidadeCm?: number;
    pesoKg?: number;
  };
}

export interface MobileProductDetailForAgent {
  codigo: string;
  sku: string;
  nome: string;
  titulo?: string;
  descricao?: string;
  categoria: string;
  marca?: string;
  linha?: string;
  condicao?: string;
  ativo: boolean;
  precos: {
    precoVenda: number;
    precoPromocional?: number;
    precoCusto?: number;
    custoFrete?: number;
  };
  estoque: {
    atual: number;
    minimo?: number;
    unidade: string;
  };
  dimensoes: {
    alturaCm?: number;
    larguraCm?: number;
    profundidadeCm?: number;
    pesoKg?: number;
    embalagem?: {
      alturaCm?: number;
      larguraCm?: number;
      profundidadeCm?: number;
    };
    adicionais?: Array<{ rotulo: string; valor: string }>;
  };
  caracteristicas?: {
    material?: string;
    cores?: string;
    diferencialPrincipal?: string;
    naoIncluso?: string;
  };
  fotos: string[];
  possuiVariacoes: boolean;
  quantidadeVariacoes: number;
  variacoes: MobileProductVariationDetailForAgent[];
  fiscal?: {
    ncm?: string;
  };
}

const normalizeLimit = (value?: number): number => Math.min(Math.max(value ?? 10, 1), 30);

export async function searchMobileProducts(input: {
  termo?: string;
  categoria?: string;
  apenasAtivos?: boolean;
  limite?: number;
}): Promise<MobileProductSummaryForAgent[]> {
  const limit = normalizeLimit(input.limite);
  const statusFilter = input.apenasAtivos !== false ? 'active' : 'all';
  const searchTerm = input.termo?.trim().replace(/[,%()]/g, '');

  const { data } = await fetchMobileProductsPage(1, limit, {
    search: searchTerm,
    category: input.categoria,
    statusFilter,
    includeDeactivated: input.apenasAtivos === false,
    throwOnError: true,
  });

  return (data || []).map((p: any) => {
    const parentCode = p.code || p.sku || '';
    const variations = p.allVariations || p.product_variations || [];
    const skus = variations.map((v: any) => v.sku).filter(Boolean);

    return {
      codigo: parentCode,
      sku: p.sku || parentCode,
      nome: p.name || p.title || p.description || '',
      categoria: p.category || 'Sem Categoria',
      marca: p.brand || '',
      condicao: p.condition || 'novo',
      preco: Number(p.unitPrice ?? p.price ?? 0),
      precoPromocional: p.promoPrice ? Number(p.promoPrice) : undefined,
      precoCusto: p.costPrice ? Number(p.costPrice) : undefined,
      estoque: Number(p.stock ?? 0),
      unidade: p.unit || 'UN',
      ativo: p.active !== false,
      quantidadeVariacoes: skus.length,
      skusVariacoes: skus,
    };
  });
}

export async function getMobileProductDetails(
  codigoOuSku: string
): Promise<MobileProductDetailForAgent | null> {
  const target = codigoOuSku.trim();
  if (!target) return null;
  if (!/^[a-z\d_-]+$/i.test(target)) throw new Error('O código ou SKU do produto contém caracteres inválidos.');

  // 1. Consulta pelo código ou SKU do produto pai
  let { data, error } = await supabase
    .from('products')
    .select('*, product_variations(*)')
    .eq('deleted', false)
    .or(`code.eq.${target},sku.eq.${target}`)
    .maybeSingle();
  if (error) throw error;

  // 2. Se não encontrou no pai, verifica se é SKU de variação
  if (!data && !error) {
    const { data: varData, error: variationError } = await supabase
      .from('product_variations')
      .select('product_id')
      .eq('sku', target)
      .maybeSingle();
    if (variationError) throw variationError;

    if (varData?.product_id) {
      const { data: parentData, error: parentError } = await supabase
        .from('products')
        .select('*, product_variations(*)')
        .eq('id', varData.product_id)
        .eq('deleted', false)
        .maybeSingle();

      if (parentError) throw parentError;
      data = parentData;
    }
  }

  // 3. Fallback para códigos com padding (ex: "10" -> "000010")
  if (!data && !error && target.length >= 3) {
    const padded = target.padStart(6, '0');
    const { data: fallbackData, error: fallbackError } = await supabase
      .from('products')
      .select('*, product_variations(*)')
      .eq('deleted', false)
      .or(`code.eq.${padded},sku.ilike.%${target}%`)
      .limit(1)
      .maybeSingle();
    if (fallbackError) throw fallbackError;

    data = fallbackData;
  }

  if (!data) return null;

  const rawVars = data.product_variations || [];
  const parentCode = data.code || data.sku || '';

  const mappedVars: MobileProductVariationDetailForAgent[] = rawVars.map((v: any) => {
    let attrs: Record<string, string> = {};
    if (v.attributes && typeof v.attributes === 'object') {
      if (Array.isArray(v.attributes)) {
        for (const item of v.attributes) {
          if (item?.name && item?.value) attrs[item.name] = item.value;
        }
      } else {
        attrs = { ...v.attributes };
      }
    }

    const varImages = Array.isArray(v.images) && v.images.length > 0
      ? v.images
      : v.image_url
      ? String(v.image_url).split(',').map((s: string) => s.trim()).filter(Boolean)
      : Array.isArray(data.images) ? data.images : [];

    const hasDims = v.height !== undefined || v.width !== undefined || v.depth !== undefined || v.weight !== undefined;

    return {
      sku: v.sku || '',
      nome: v.name || data.name || '',
      preco: Number(v.price ?? data.unit_price ?? data.price ?? 0),
      precoPromocional: v.promo_price ? Number(v.promo_price) : undefined,
      precoCusto: v.cost_price ? Number(v.cost_price) : undefined,
      estoque: Number(v.stock ?? 0),
      ativo: v.active !== false,
      atributos: attrs,
      fotos: varImages,
      dimensoes: hasDims
        ? {
            alturaCm: v.height,
            larguraCm: v.width,
            profundidadeCm: v.depth,
            pesoKg: v.weight,
          }
        : undefined,
    };
  });

  const parentImages = Array.isArray(data.images)
    ? data.images
    : typeof data.images === 'string' && data.images
    ? [data.images]
    : [];

  return {
    codigo: parentCode,
    sku: data.sku || parentCode,
    nome: data.name || data.title || data.description || '',
    titulo: data.title || data.name || '',
    descricao: data.description || '',
    categoria: data.category || 'Sem Categoria',
    marca: data.brand || '',
    linha: data.line || '',
    condicao: data.condition || 'novo',
    ativo: data.active !== false,
    precos: {
      precoVenda: Number(data.price ?? data.unit_price ?? 0),
      precoPromocional: data.promo_price ? Number(data.promo_price) : undefined,
      precoCusto: data.cost_price ? Number(data.cost_price) : undefined,
      custoFrete: data.freight_cost ? Number(data.freight_cost) : undefined,
    },
    estoque: {
      atual: Number(data.stock ?? 0),
      minimo: data.min_stock ? Number(data.min_stock) : undefined,
      unidade: data.unit || 'UN',
    },
    dimensoes: {
      alturaCm: data.height,
      larguraCm: data.width,
      profundidadeCm: data.depth,
      pesoKg: data.weight,
      embalagem: (data.pkg_height || data.pkg_width || data.pkg_depth)
        ? {
            alturaCm: data.pkg_height,
            larguraCm: data.pkg_width,
            profundidadeCm: data.pkg_depth,
          }
        : undefined,
      adicionais: Array.isArray(data.extra_dimensions)
        ? data.extra_dimensions.map((e: any) => ({ rotulo: e.label || e.name, valor: e.value }))
        : undefined,
    },
    caracteristicas: {
      material: data.material || undefined,
      cores: data.colors || undefined,
      diferencialPrincipal: data.main_differential || undefined,
      naoIncluso: data.not_included || undefined,
    },
    fotos: parentImages,
    possuiVariacoes: Boolean(data.has_variations || mappedVars.length > 1),
    quantidadeVariacoes: mappedVars.length,
    variacoes: mappedVars,
    fiscal: data.fiscal?.ncm ? { ncm: data.fiscal.ncm } : undefined,
  };
}
