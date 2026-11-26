import { supabase } from '@/pages/utils/supabaseConfig';
import { TABLE_NAME } from '@/pages/utils/productService/mutations/productSkuService';
import { mapFromDB } from '@/pages/utils/productService/mapping/productMapper';
import Product from '@/pages/types/product.type';
import {
  buildPostgrestAccentInsensitiveOrFilter,
  buildPostgrestAccentInsensitivePattern,
} from '../../../../shared-utils/core/searchText';
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
import {
  PRODUCT_DETAIL_COLUMNS,
  sanitizeProductDetailForAgent,
  sanitizeProductSummaryForAgent,
  type ProductDetailForAgent,
  type ProductSummaryForAgent,
  type ProductToolResponse,
  type ProductVariationDetailForAgent,
} from './productAgentToolMappers';

export type {
  ProductSummaryForAgent,
  ProductVariationDetailForAgent,
  ProductDetailForAgent,
  ProductToolResponse,
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
      const allowCost = permissionContext === undefined
        ? canAgentViewProductCost()
        : permissionContext === null
          ? false
          : canAgentViewProductCost(permissionContext);
      const summaryColumns =
        `id,code,sku,name,title,description,category,brand,line,condition,unit_price,price,promo_price,${allowCost ? 'cost_price,' : ''}stock,unit,active,deleted,item_type,is_draft,status,product_variations(sku,name)`;

      let query = supabase
        .from(TABLE_NAME)
        .select(summaryColumns, { count: 'exact' })
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
        .select(PRODUCT_DETAIL_COLUMNS)
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
            .select(PRODUCT_DETAIL_COLUMNS)
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
          .select(PRODUCT_DETAIL_COLUMNS)
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
