import { supabase } from '@/pages/utils/supabaseConfig';
import { TABLE_NAME } from '@/pages/utils/productService/productSkuService';
import { mapFromDB } from '@/pages/utils/productService/productMapper';
import Product, { Variation } from '@/pages/types/product.type';

// Interfaces de transporte exclusivas para o Agente IA (sem IDs de banco)

export interface ProductSummaryForAgent {
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

export interface ProductVariationDetailForAgent {
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

export interface ProductDetailForAgent {
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
  variacoes: ProductVariationDetailForAgent[];
  fiscal?: {
    ncm?: string;
  };
}

export interface ProductToolResponse<T = any> {
  success: boolean;
  data?: T;
  total?: number;
  message?: string;
  error?: string;
  code?: string;
}

// Sanitizadores para garantia absoluta de omissão de IDs do banco

const sanitizeVariationForAgent = (v: Variation): ProductVariationDetailForAgent => {
  const attrs: Record<string, string> = {};
  if (Array.isArray(v.attributes)) {
    for (const attr of v.attributes) {
      if (attr && attr.name && attr.value) {
        attrs[attr.name] = attr.value;
      }
    }
  }

  const hasDims = v.height !== undefined || v.width !== undefined || v.depth !== undefined || v.weight !== undefined;

  return {
    sku: v.sku || '',
    nome: v.name || '',
    preco: Number(v.unitPrice ?? 0),
    precoPromocional: v.promoPrice !== undefined && v.promoPrice !== null ? Number(v.promoPrice) : undefined,
    precoCusto: v.costPrice !== undefined && v.costPrice !== null ? Number(v.costPrice) : undefined,
    estoque: Number(v.stock ?? 0),
    ativo: Boolean(v.active),
    atributos: attrs,
    fotos: Array.isArray(v.images) ? v.images : [],
    dimensoes: hasDims
      ? {
          alturaCm: v.height,
          larguraCm: v.width,
          profundidadeCm: v.depth,
          pesoKg: v.weight,
        }
      : undefined,
  };
};

const sanitizeProductDetailForAgent = (p: Product): ProductDetailForAgent => {
  const variations = (p.variations || []).map(sanitizeVariationForAgent);

  return {
    codigo: p.code || '',
    sku: p.sku || p.code || '',
    nome: p.name || p.title || p.description || '',
    titulo: p.title || p.name || '',
    descricao: p.description || '',
    categoria: p.category || 'Sem Categoria',
    marca: p.brand || '',
    linha: p.line || '',
    condicao: p.condition || 'novo',
    ativo: Boolean(p.active),
    precos: {
      precoVenda: Number(p.unitPrice ?? 0),
      precoPromocional: p.promoPrice !== undefined && p.promoPrice !== null ? Number(p.promoPrice) : undefined,
      precoCusto: p.costPrice !== undefined && p.costPrice !== null ? Number(p.costPrice) : undefined,
      custoFrete: p.freightCost !== undefined && p.freightCost !== null ? Number(p.freightCost) : undefined,
    },
    estoque: {
      atual: Number(p.stock ?? 0),
      minimo: p.minStock !== undefined && p.minStock !== null ? Number(p.minStock) : undefined,
      unidade: p.unit || 'UN',
    },
    dimensoes: {
      alturaCm: p.height,
      larguraCm: p.width,
      profundidadeCm: p.depth,
      pesoKg: p.weight,
      embalagem: (p.pkgHeight || p.pkgWidth || p.pkgDepth)
        ? {
            alturaCm: p.pkgHeight,
            larguraCm: p.pkgWidth,
            profundidadeCm: p.pkgDepth,
          }
        : undefined,
      adicionais: Array.isArray(p.extraDimensions)
        ? p.extraDimensions.map((e) => ({ rotulo: e.label, valor: e.value }))
        : undefined,
    },
    caracteristicas: {
      material: p.material || undefined,
      cores: p.colors || undefined,
      diferencialPrincipal: p.mainDifferential || undefined,
      naoIncluso: p.notIncluded || undefined,
    },
    fotos: Array.isArray(p.images) ? p.images : [],
    possuiVariacoes: Boolean(p.hasVariations || variations.length > 1),
    quantidadeVariacoes: variations.length,
    variacoes: variations,
    fiscal: p.fiscal?.ncm ? { ncm: p.fiscal.ncm } : undefined,
  };
};

const sanitizeProductSummaryForAgent = (p: Product): ProductSummaryForAgent => {
  const skus = (p.variations || []).map((v) => v.sku).filter(Boolean);

  return {
    codigo: p.code || '',
    sku: p.sku || p.code || '',
    nome: p.name || p.title || p.description || '',
    categoria: p.category || 'Sem Categoria',
    marca: p.brand || '',
    condicao: p.condition || 'novo',
    preco: Number(p.unitPrice ?? 0),
    precoPromocional: p.promoPrice !== undefined && p.promoPrice !== null ? Number(p.promoPrice) : undefined,
    precoCusto: p.costPrice !== undefined && p.costPrice !== null ? Number(p.costPrice) : undefined,
    estoque: Number(p.stock ?? 0),
    unidade: p.unit || 'UN',
    ativo: Boolean(p.active),
    quantidadeVariacoes: skus.length,
    skusVariacoes: skus,
  };
};

// Ferramentas seguras oficiais para o Agente IA (apenas leitura)

export const productAgentTools = {
  /**
   * Pesquisa produtos no catálogo/estoque do ERP de forma paginada e sanitizada.
   */
  async buscarProdutos(args: {
    termo?: string;
    categoria?: string;
    apenasAtivos?: boolean;
    limite?: number;
  }): Promise<ProductToolResponse<ProductSummaryForAgent[]>> {
    try {
      const limit = Math.min(Math.max(Number(args.limite) || 10, 1), 30);
      const searchTerm = args.termo?.trim();
      const categoryFilter = args.categoria?.trim();
      const onlyActive = args.apenasAtivos !== false;

      let query = supabase
        .from(TABLE_NAME)
        .select('*, product_variations(*), product_categories(*, categories(*)), product_images(*)', { count: 'exact' })
        .eq('deleted', false);

      if (onlyActive) {
        query = query.eq('active', true);
      }

      if (categoryFilter) {
        query = query.ilike('category', `%${categoryFilter}%`);
      }

      if (searchTerm) {
        const term = `%${searchTerm}%`;

        // Busca se há variações que combinam com o termo para incluir os produtos pai
        let matchedParentIds: string[] = [];
        try {
          const { data: matchedVars } = await supabase
            .from('product_variations')
            .select('product_id')
            .or(`name.ilike.${term},sku.ilike.${term}`)
            .limit(50);

          if (matchedVars && matchedVars.length > 0) {
            matchedParentIds = Array.from(
              new Set(matchedVars.map((v: any) => v.product_id).filter(Boolean))
            );
          }
        } catch (subErr) {
          console.warn('[productAgentTools] Aviso ao pesquisar variações filhas:', subErr);
        }

        const orConditions = [
          `name.ilike.${term}`,
          `description.ilike.${term}`,
          `code.ilike.${term}`,
          `sku.ilike.${term}`,
          `brand.ilike.${term}`,
        ];

        if (matchedParentIds.length > 0) {
          matchedParentIds.forEach((id) => orConditions.push(`id.eq.${id}`));
        }

        query = query.or(orConditions.join(','));
      }

      query = query.order('created_at', { ascending: false }).limit(limit);

      const { data, count, error } = await query;
      if (error) {
        return {
          success: false,
          code: 'DATABASE_ERROR',
          error: error.message || 'Erro ao consultar produtos no banco de dados.',
        };
      }

      const products: Product[] = (data || []).map((row, idx) => mapFromDB(row, idx));
      const sanitized = products.map(sanitizeProductSummaryForAgent);

      return {
        success: true,
        data: sanitized,
        total: count ?? sanitized.length,
        message: `${sanitized.length} produto(s) encontrado(s).`,
      };
    } catch (err: any) {
      return {
        success: false,
        code: 'EXECUTION_ERROR',
        error: err?.message || 'Falha inesperada ao consultar produtos.',
      };
    }
  },

  /**
   * Obtém os detalhes completos de um produto através do seu código oficial ou SKU.
   */
  async obterDetalhesProduto(args: {
    codigoOuSku: string;
  }): Promise<ProductToolResponse<ProductDetailForAgent>> {
    const rawTarget = args.codigoOuSku?.trim();
    if (!rawTarget) {
      return {
        success: false,
        code: 'INVALID_ARGUMENT',
        error: 'É obrigatório informar o código oficial de 6 dígitos ou o SKU do produto para consultar detalhes.',
      };
    }

    try {
      // 1. Tenta buscar direto pelo code ou sku do produto pai
      let { data, error } = await supabase
        .from(TABLE_NAME)
        .select('*, product_variations(*), product_categories(*, categories(*)), product_images(*)')
        .eq('deleted', false)
        .or(`code.eq.${rawTarget},sku.eq.${rawTarget}`)
        .maybeSingle();

      // 2. Se não encontrou no pai, verifica se é o SKU de uma variação filha
      if (!data && !error) {
        const { data: varData } = await supabase
          .from('product_variations')
          .select('product_id')
          .eq('sku', rawTarget)
          .maybeSingle();

        if (varData?.product_id) {
          const { data: parentData, error: parentError } = await supabase
            .from(TABLE_NAME)
            .select('*, product_variations(*), product_categories(*, categories(*)), product_images(*)')
            .eq('id', varData.product_id)
            .maybeSingle();

          data = parentData;
          error = parentError;
        }
      }

      // 3. Fallback com ilike caso o código tenha sido digitado sem zeros à esquerda ou similar
      if (!data && !error && rawTarget.length >= 3) {
        const paddedCode = rawTarget.padStart(6, '0');
        const { data: fallbackData } = await supabase
          .from(TABLE_NAME)
          .select('*, product_variations(*), product_categories(*, categories(*)), product_images(*)')
          .eq('deleted', false)
          .or(`code.eq.${paddedCode},sku.ilike.%${rawTarget}%`)
          .limit(1)
          .maybeSingle();

        data = fallbackData;
      }

      if (error) {
        return {
          success: false,
          code: 'DATABASE_ERROR',
          error: error.message || 'Erro ao carregar detalhes do produto.',
        };
      }

      if (!data) {
        return {
          success: false,
          code: 'PRODUCT_NOT_FOUND',
          error: `Nenhum produto encontrado com o código ou SKU "${rawTarget}". Verifique o código e tente novamente.`,
        };
      }

      const product = mapFromDB(data);
      const sanitized = sanitizeProductDetailForAgent(product);

      return {
        success: true,
        data: sanitized,
        message: `Ficha técnica completa do produto "${sanitized.nome}" (Código: ${sanitized.codigo}) carregada com sucesso.`,
      };
    } catch (err: any) {
      return {
        success: false,
        code: 'EXECUTION_ERROR',
        error: err?.message || 'Falha inesperada ao carregar detalhes do produto.',
      };
    }
  },
};
