import { supabase } from '@/pages/utils/supabaseConfig';
import { TABLE_NAME } from '@/pages/utils/productService/productSkuService';
import { mapFromDB } from '@/pages/utils/productService/productMapper';
import Product, { Variation } from '@/pages/types/product.type';
import {
  buildPostgrestAccentInsensitiveOrFilter,
  buildPostgrestAccentInsensitivePattern,
} from '../../../../shared-utils/searchText';
import {
  buildAgentProductSearchFilter,
  classifyAgentProductMatch,
} from '../../../../shared-utils/agentProductSearch';
import {
  AgentCreateProductInput,
  AgentUpdateProductInput,
  createProductForAgent,
  listProductCategoriesAndCharacteristicsForAgent,
  updateProductForAgent,
} from '../../../../shared-utils/agentProductOperations';
import {
  canAgentViewProductCost,
  type AgentPermissionContext,
} from '../../../../shared-utils/agentPermissionGuard';

// Interfaces de transporte exclusivas para o Agente IA (sem IDs de banco)

export interface ProductSummaryForAgent {
  codigo: string;
  sku: string;
  nome: string;
  categoria: string;
  marca: string;
  linha?: string;
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
    valoresTecnicos?: Record<string, any>;
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

const sanitizeVariationForAgent = (
  v: Variation,
  allowCost = false
): ProductVariationDetailForAgent => {
  const attrs: Record<string, string> = {};
  if (Array.isArray(v.attributes)) {
    for (const attr of v.attributes) {
      if (attr && attr.name && attr.value !== undefined && attr.value !== null) {
        attrs[attr.name] = String(attr.value);
      }
    }
  }

  const hasDims =
    v.height !== undefined ||
    v.width !== undefined ||
    v.depth !== undefined ||
    v.weight !== undefined;

  return {
    sku: v.sku || '',
    nome: v.name || '',
    preco: Number(v.unitPrice ?? 0),
    precoPromocional:
      v.promoPrice !== undefined && v.promoPrice !== null ? Number(v.promoPrice) : undefined,
    precoCusto:
      allowCost && v.costPrice !== undefined && v.costPrice !== null
        ? Number(v.costPrice)
        : undefined,
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

const sanitizeProductDetailForAgent = (
  p: Product,
  allowCost = false
): ProductDetailForAgent => {
  const variations = (p.variations || []).map((v) => sanitizeVariationForAgent(v, allowCost));

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
      precoPromocional:
        p.promoPrice !== undefined && p.promoPrice !== null ? Number(p.promoPrice) : undefined,
      precoCusto:
        allowCost && p.costPrice !== undefined && p.costPrice !== null
          ? Number(p.costPrice)
          : undefined,
      custoFrete:
        p.freightCost !== undefined && p.freightCost !== null ? Number(p.freightCost) : undefined,
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
      embalagem:
        p.pkgHeight || p.pkgWidth || p.pkgDepth
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
      valoresTecnicos:
        p.technicalValues && Object.keys(p.technicalValues).length > 0
          ? p.technicalValues
          : undefined,
    },
    fotos: Array.isArray(p.images) ? p.images : [],
    possuiVariacoes: Boolean(p.hasVariations || variations.length > 1),
    quantidadeVariacoes: variations.length,
    variacoes: variations,
    fiscal: p.fiscal?.ncm ? { ncm: p.fiscal.ncm } : undefined,
  };
};

const sanitizeProductSummaryForAgent = (
  p: Product,
  allowCost = false
): ProductSummaryForAgent => {
  const skus = (p.variations || []).map((v) => v.sku).filter(Boolean);

  return {
    codigo: p.code || '',
    sku: p.sku || p.code || '',
    nome: p.name || p.title || p.description || '',
    categoria: p.category || 'Sem Categoria',
    marca: p.brand || '',
    condicao: p.condition || 'novo',
    preco: Number(p.unitPrice ?? 0),
    precoPromocional:
      p.promoPrice !== undefined && p.promoPrice !== null ? Number(p.promoPrice) : undefined,
    precoCusto:
      allowCost && p.costPrice !== undefined && p.costPrice !== null
        ? Number(p.costPrice)
        : undefined,
    estoque: Number(p.stock ?? 0),
    unidade: p.unit || 'UN',
    ativo: Boolean(p.active),
    quantidadeVariacoes: skus.length,
    skusVariacoes: skus,
  };
};

// Ferramentas oficiais de Produto para o Agente IA (consulta, metadados, criação e edição)

export const productAgentTools = {
  /**
   * Pesquisa produtos no catálogo/estoque do ERP de forma paginada e sanitizada.
   */
  async buscarProdutos(args: {
    termo?: string;
    categoria?: string;
    apenasAtivos?: boolean;
    naLixeira?: boolean;
    limite?: number;
  }, permissionContext?: AgentPermissionContext | null): Promise<ProductToolResponse<ProductSummaryForAgent[]>> {
    try {
      const limit = Math.min(Math.max(Number(args.limite) || 10, 1), 30);
      const searchTerm = args.termo?.trim();
      const categoryFilter = args.categoria?.trim();
      const inTrash = Boolean(args.naLixeira);
      const onlyActive = !inTrash && args.apenasAtivos !== false;

      let query = supabase
        .from(TABLE_NAME)
        .select(
          'id,code,sku,name,title,description,category,brand,line,condition,unit_price,price,promo_price,cost_price,stock,unit,active,deleted,item_type,is_draft,status,product_variations(sku,name)',
          { count: 'exact' }
        )
        .eq('deleted', inTrash);

      if (onlyActive) {
        query = query.eq('active', true);
      }

      if (categoryFilter) {
        query = query.filter('category', 'imatch', buildPostgrestAccentInsensitivePattern(categoryFilter));
      }

      if (searchTerm) {
        let matchedParentIds: string[] = [];
        const { data: matchedVars, error: variationError } = await supabase
          .from('product_variations')
          .select('product_id')
          .or(buildPostgrestAccentInsensitiveOrFilter(['name', 'sku'], searchTerm))
          .limit(51);
        if (variationError) {
          return {
            success: false,
            code: 'DATABASE_ERROR',
            error: 'Não consegui pesquisar as variações do catálogo agora. Tente novamente mais tarde.',
          };
        }
        if ((matchedVars?.length || 0) > 50) {
          return {
            success: false,
            code: 'SEARCH_TOO_BROAD',
            error: 'A busca encontrou muitas variações. Informe um modelo, código ou característica mais específica.',
          };
        }
        if (matchedVars?.length) {
          matchedParentIds = Array.from(
            new Set(matchedVars.map((variation: any) => variation.product_id).filter(Boolean))
          );
        }

        query = query.or(buildAgentProductSearchFilter(searchTerm, matchedParentIds));
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

      const matchedRows = searchTerm
        ? (data || []).filter((row: any) =>
            classifyAgentProductMatch(
              {
                ...row,
                description: [
                  row.description,
                  ...(Array.isArray(row.product_variations)
                    ? row.product_variations.flatMap((variation: any) => [variation.name, variation.sku])
                    : []),
                ].filter(Boolean).join(' '),
              },
              searchTerm
            ) === 'corresponding'
          )
        : data || [];
      const products: Product[] = matchedRows.map((row, idx) => mapFromDB(row, idx));
      const allowCost = permissionContext === undefined
        ? canAgentViewProductCost()
        : permissionContext === null
          ? false
          : canAgentViewProductCost(permissionContext);
      const sanitized = products.map((p) => sanitizeProductSummaryForAgent(p, allowCost));

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
  }, permissionContext?: AgentPermissionContext | null): Promise<ProductToolResponse<ProductDetailForAgent>> {
    const rawTarget = args.codigoOuSku?.trim();
    if (!rawTarget) {
      return {
        success: false,
        code: 'INVALID_ARGUMENT',
        error:
          'É obrigatório informar o código oficial de 6 dígitos ou o SKU do produto para consultar detalhes.',
      };
    }
    if (!/^[a-z\d_-]+$/i.test(rawTarget)) {
      return {
        success: false,
        code: 'INVALID_IDENTIFIER',
        error: 'Informe um código ou SKU completo e válido.',
      };
    }

    try {
      let { data, error } = await supabase
        .from(TABLE_NAME)
        .select(
          'id,code,sku,name,title,marketplace_title,description,category,category_id,brand,line,condition,unit_price,price,promo_price,cost_price,freight_cost,stock,min_stock,unit,active,deleted,item_type,is_draft,status,product_kind,is_salvado,width,height,depth,weight,pkg_width,pkg_height,pkg_depth,extra_dimensions,material,colors,main_differential,not_included,images,product_variations(id,product_id,sku,name,unit_price,price,promo_price,cost_price,stock,active,attributes,images,height,width,depth,weight),product_categories(category_id,categories(name)),product_images(image_url,is_main),technical_specs,fiscal'
        )
        .eq('deleted', false)
        .or(`code.eq.${rawTarget},sku.eq.${rawTarget}`)
        .maybeSingle();

      if (!data && !error) {
        const { data: varData, error: variationError } = await supabase
          .from('product_variations')
          .select('product_id')
          .eq('sku', rawTarget)
          .maybeSingle();
        if (variationError) {
          return {
            success: false,
            code: variationError.code === 'PGRST116' ? 'AMBIGUOUS_IDENTIFIER' : 'DATABASE_ERROR',
            error:
              variationError.code === 'PGRST116'
                ? 'Esse SKU corresponde a mais de um produto. Confirme o identificador completo.'
                : 'Não consegui consultar a ficha do produto agora.',
          };
        }

        if (varData?.product_id) {
          const { data: parentData, error: parentError } = await supabase
            .from(TABLE_NAME)
            .select(
              'id,code,sku,name,title,marketplace_title,description,category,category_id,brand,line,condition,unit_price,price,promo_price,cost_price,freight_cost,stock,min_stock,unit,active,deleted,item_type,is_draft,status,product_kind,is_salvado,width,height,depth,weight,pkg_width,pkg_height,pkg_depth,extra_dimensions,material,colors,main_differential,not_included,images,product_variations(id,product_id,sku,name,unit_price,price,promo_price,cost_price,stock,active,attributes,images,height,width,depth,weight),product_categories(category_id,categories(name)),product_images(image_url,is_main),technical_specs,fiscal'
            )
            .eq('id', varData.product_id)
            .maybeSingle();

          data = parentData;
          error = parentError;
        }
      }

      if (!data && !error && /^\d{1,5}$/.test(rawTarget)) {
        const paddedCode = rawTarget.padStart(6, '0');
        const { data: fallbackData, error: fallbackError } = await supabase
          .from(TABLE_NAME)
          .select(
            'id,code,sku,name,title,marketplace_title,description,category,category_id,brand,line,condition,unit_price,price,promo_price,cost_price,freight_cost,stock,min_stock,unit,active,deleted,item_type,is_draft,status,product_kind,is_salvado,width,height,depth,weight,pkg_width,pkg_height,pkg_depth,extra_dimensions,material,colors,main_differential,not_included,images,product_variations(id,product_id,sku,name,unit_price,price,promo_price,cost_price,stock,active,attributes,images,height,width,depth,weight),product_categories(category_id,categories(name)),product_images(image_url,is_main),technical_specs,fiscal'
          )
          .eq('deleted', false)
          .eq('code', paddedCode)
          .maybeSingle();

        data = fallbackData;
        error = fallbackError;
      }

      if (error) {
        return {
          success: false,
          code: error.code === 'PGRST116' ? 'AMBIGUOUS_IDENTIFIER' : 'DATABASE_ERROR',
          error:
            error.code === 'PGRST116'
              ? 'Esse código ou SKU corresponde a mais de um produto. Confirme o identificador completo.'
              : 'Não consegui consultar a ficha do produto agora. Tente novamente mais tarde.',
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
      const allowCost = permissionContext === undefined
        ? canAgentViewProductCost()
        : permissionContext === null
          ? false
          : canAgentViewProductCost(permissionContext);
      const sanitized = sanitizeProductDetailForAgent(product, allowCost);

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

  /**
   * Lista categorias, ambientes e características técnicas cadastradas para produtos.
   */
  async listarCategoriasECaracteristicasProduto(): Promise<ProductToolResponse> {
    return listProductCategoriesAndCharacteristicsForAgent(supabase);
  },

  /**
   * Cria um novo produto no catálogo/estoque com suas variações, preços, estoque e ficha técnica.
   */
  async criarProduto(
    args: AgentCreateProductInput,
    permissionContext?: AgentPermissionContext | null
  ): Promise<ProductToolResponse<ProductDetailForAgent>> {
    const canViewCost = permissionContext === undefined
      ? undefined
      : permissionContext !== null && canAgentViewProductCost(permissionContext);
    return createProductForAgent(supabase, args, canViewCost);
  },

  /**
   * Edita um produto existente (dados gerais, preços, estoque, dimensões, características, variações, ativação ou lixeira).
   */
  async editarProduto(
    args: AgentUpdateProductInput,
    permissionContext?: AgentPermissionContext | null
  ): Promise<ProductToolResponse<ProductDetailForAgent>> {
    const canViewCost = permissionContext === undefined
      ? undefined
      : permissionContext !== null && canAgentViewProductCost(permissionContext);
    return updateProductForAgent(supabase, args, canViewCost);
  },
};
