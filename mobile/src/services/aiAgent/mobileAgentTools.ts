import { supabase } from '../supabaseClient';
import { isIdentifiedTestArtifact } from '../../../../shared-utils/testArtifactPolicy';
import { ToolExecutionResponse } from './mobileAgentTypes';
import {
  getOrderDeliveryDetails,
  searchOperations,
  searchOrdersAndDeliveries,
} from './orderDeliveryAgentService';
import { getMobileProductDetails, searchMobileProducts } from './productAgentService';
import { mobileAgentFinanceTools } from './mobileAgentFinanceTools';
import { buildPostgrestAccentInsensitiveOrFilter } from '../../../../shared-utils/searchText';

// Executores deterministicos das ferramentas do Gemini no Mobile

export const mobileAgentTools = {
  async buscarOperacoes(args: {
    termo?: string;
    dataInicio?: string;
    dataFim?: string;
    status?: string;
    tipo?: 'todas' | 'venda' | 'entrega' | 'retirada' | 'assistencia' | 'devolucao' | 'montagem';
    limite?: number;
  }): Promise<ToolExecutionResponse> {
    try {
      const operations = await searchOperations(args);
      return {
        success: true,
        data: operations,
        message: `${operations.length} operação(ões) encontrada(s).`,
      };
    } catch (error: unknown) {
      return {
        success: false,
        code: 'OPERATIONS_SEARCH_ERROR',
        error: error instanceof Error ? error.message : 'Falha ao consultar operações.',
      };
    }
  },

  async obterDetalhesOperacao(args: { operacaoId: string }): Promise<ToolExecutionResponse> {
    if (!args.operacaoId?.trim())
      return {
        success: false,
        code: 'INVALID_OPERATION_ID',
        error: 'É necessário informar o ID real da operação.',
      };
    try {
      const operation = await getOrderDeliveryDetails(args.operacaoId);
      if (!operation)
        return { success: false, code: 'OPERATION_NOT_FOUND', error: 'Operação não encontrada.' };
      return { success: true, data: operation, message: 'Detalhes da operação carregados.' };
    } catch (error: unknown) {
      return {
        success: false,
        code: 'OPERATION_DETAILS_ERROR',
        error: error instanceof Error ? error.message : 'Falha ao consultar detalhes da operação.',
      };
    }
  },

  async buscarPedidosEntregas(args: {
    termo?: string;
    dataInicio?: string;
    dataFim?: string;
    status?: string;
    limite?: number;
  }): Promise<ToolExecutionResponse> {
    try {
      const orders = await searchOrdersAndDeliveries({ ...args, tipo: 'venda' });
      return {
        success: true,
        data: orders,
        message: `${orders.length} pedido(s) ou entrega(s) encontrado(s).`,
      };
    } catch (error: unknown) {
      return {
        success: false,
        code: 'ORDER_DELIVERY_SEARCH_ERROR',
        error: error instanceof Error ? error.message : 'Falha ao consultar pedidos e entregas.',
      };
    }
  },

  async obterDetalhesPedidoEntrega(args: { pedidoId: string }): Promise<ToolExecutionResponse> {
    if (!args.pedidoId?.trim())
      return {
        success: false,
        code: 'INVALID_ORDER_ID',
        error: 'É necessário informar um ID de pedido válido.',
      };
    try {
      const order = await getOrderDeliveryDetails(args.pedidoId);
      if (!order)
        return { success: false, code: 'ORDER_NOT_FOUND', error: 'Pedido não encontrado.' };
      return {
        success: true,
        data: order,
        message: 'Dados completos do pedido e da entrega encontrados.',
      };
    } catch (error: unknown) {
      return {
        success: false,
        code: 'ORDER_DELIVERY_DETAILS_ERROR',
        error: error instanceof Error ? error.message : 'Falha ao carregar os detalhes do pedido.',
      };
    }
  },

  async buscarClientes(args: { termo: string; limite?: number }): Promise<ToolExecutionResponse> {
    const term = args.termo?.trim().replace(/[,%()]/g, '');
    if (!term || term.length < 2)
      return {
        success: false,
        code: 'CUSTOMER_SEARCH_TERM_REQUIRED',
        error: 'Informe pelo menos dois caracteres do nome, telefone ou e-mail do cliente.',
      };
    try {
      const limit = Math.min(Math.max(Math.floor(args.limite ?? 10), 1), 20);
      const { data, error } = await supabase
        .from('people')
        .select('id, full_name, phone, email, full_address, active')
        .eq('person_type', 'customers')
        .eq('deleted', false)
        .or(
          'full_address->testArtifact->>is_test.is.null,full_address->testArtifact->>is_test.neq.true'
        )
        .or(buildPostgrestAccentInsensitiveOrFilter(['full_name', 'phone', 'email'], term))
        .order('full_name', { ascending: true })
        .limit(limit);
      if (error) throw error;
      const visiblePeople = (data || []).filter((person) => !isIdentifiedTestArtifact(person));
      return {
        success: true,
        data: visiblePeople.map((person) => ({
          id: person.id,
          nome: person.full_name,
          telefone: person.phone,
          email: person.email,
          cidade: person.full_address?.city || person.full_address?.cidade || null,
          ativo: person.active,
        })),
        message: `${visiblePeople.length} cliente(s) encontrado(s).`,
      };
    } catch (error: unknown) {
      return {
        success: false,
        code: 'CUSTOMER_SEARCH_ERROR',
        error: error instanceof Error ? error.message : 'Falha ao consultar clientes.',
      };
    }
  },

  async buscarColaboradores(args: {
    termo: string;
    limite?: number;
  }): Promise<ToolExecutionResponse> {
    const term = args.termo?.trim().replace(/[,%(){}]/g, '');
    if (!term || term.length < 2)
      return {
        success: false,
        code: 'COLLABORATOR_SEARCH_TERM_REQUIRED',
        error: 'Informe pelo menos dois caracteres do nome, e-mail ou cargo do colaborador.',
      };
    try {
      const limit = Math.min(Math.max(Math.floor(args.limite ?? 10), 1), 20);
      const normalizedTerm = term
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
      const roleAliases: Record<string, string> = {
        administrador: 'administrator',
        administradora: 'administrator',
        admin: 'administrator',
        gerente: 'manager',
        vendedor: 'seller',
        vendedora: 'seller',
        entregador: 'deliverer',
        entregadora: 'deliverer',
        contador: 'accountant',
        contadora: 'accountant',
        estoquista: 'stockist',
        pendente: 'pending',
      };
      const role =
        roleAliases[normalizedTerm] ||
        ([
          'administrator',
          'manager',
          'seller',
          'deliverer',
          'accountant',
          'stockist',
          'pending',
        ].includes(normalizedTerm)
          ? normalizedTerm
          : null);
      const conditions = [
        buildPostgrestAccentInsensitiveOrFilter(['full_name', 'email', 'position'], term),
      ];
      if (role) conditions.push(`role.eq.${role}`, `roles.cs.{${role}}`);
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name, position, role, roles')
        .or(conditions.join(','))
        .order('full_name', { ascending: true })
        .limit(100);
      if (error) throw error;
      const matched = (data || [])
        .filter((profile) => {
          const roles =
            Array.isArray(profile.roles) && profile.roles.length
              ? profile.roles
              : profile.role
                ? [profile.role]
                : [];
          return !role || roles.includes(role) || profile.role === role;
        })
        .slice(0, limit);
      return {
        success: true,
        data: matched.map((profile) => ({
          id: profile.id,
          nome: profile.full_name || profile.email,
          email: profile.email,
          cargo: profile.position,
          cargos: profile.roles?.length ? profile.roles : profile.role ? [profile.role] : [],
        })),
        message: `${matched.length} colaborador(es) encontrado(s).`,
      };
    } catch (error: unknown) {
      return {
        success: false,
        code: 'COLLABORATOR_SEARCH_ERROR',
        error: error instanceof Error ? error.message : 'Falha ao consultar colaboradores.',
      };
    }
  },

  ...mobileAgentFinanceTools,

  async registrarFeedbackAgente(args: {
    categoria: string;
    queixaUsuario: string;
    campoDivergente?: string;
    severidade?: 'low' | 'medium' | 'high' | 'critical';
    conversaId?: string;
    mensagemUsuario?: string;
    respostaAgente?: string;
  }): Promise<ToolExecutionResponse> {
    try {
      const generatedId = `fb-mob-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const nowIso = new Date().toISOString();

      try {
        await supabase.from('ai_agent_feedback').insert([
          {
            conversation_id: args.conversaId || 'mobile-session',
            user_message: args.mensagemUsuario || args.queixaUsuario,
            agent_response: args.respostaAgente || null,
            category: args.categoria || 'misunderstanding',
            user_complaint: args.queixaUsuario,
            divergent_field: args.campoDivergente || null,
            tool_calls: [],
            severity: args.severidade || 'medium',
            status: 'pending_review',
            source_app: 'MOBILE',
            created_at: nowIso,
          },
        ]);
      } catch (dbErr) {
        console.warn('[mobileAgentTools] Falha silenciosa ao gravar feedback no Supabase:', dbErr);
      }

      return {
        success: true,
        data: { id: generatedId },
        message: 'Feedback registrado com sucesso no aplicativo móvel.',
      };
    } catch (err: any) {
      return {
        success: false,
        code: 'FEEDBACK_ERROR',
        error: err?.message || 'Erro ao registrar feedback da IA no Mobile.',
      };
    }
  },

  async buscarProdutos(args: {
    termo?: string;
    categoria?: string;
    apenasAtivos?: boolean;
    limite?: number;
  }): Promise<ToolExecutionResponse> {
    try {
      const products = await searchMobileProducts(args);
      return {
        success: true,
        data: products,
        message: `${products.length} produto(s) encontrado(s).`,
      };
    } catch (error: unknown) {
      return {
        success: false,
        code: 'PRODUCT_SEARCH_ERROR',
        error:
          error instanceof Error ? error.message : 'Falha ao consultar produtos no aplicativo.',
      };
    }
  },

  async obterDetalhesProduto(args: { codigoOuSku: string }): Promise<ToolExecutionResponse> {
    const target = args?.codigoOuSku?.trim();
    if (!target) {
      return {
        success: false,
        code: 'INVALID_ARGUMENT',
        error:
          'É necessário informar o código de 6 dígitos ou o SKU do produto para obter os detalhes.',
      };
    }

    try {
      const product = await getMobileProductDetails(target);
      if (!product) {
        return {
          success: false,
          code: 'PRODUCT_NOT_FOUND',
          error: `Nenhum produto encontrado com o código ou SKU "${target}".`,
        };
      }
      return {
        success: true,
        data: product,
        message: `Ficha técnica completa do produto "${product.nome}" (Código: ${product.codigo}) carregada.`,
      };
    } catch (error: unknown) {
      return {
        success: false,
        code: 'PRODUCT_DETAILS_ERROR',
        error: error instanceof Error ? error.message : 'Falha ao carregar detalhes do produto.',
      };
    }
  },
};
