import { supabase } from '../supabaseClient';
import { ToolExecutionResponse } from './mobileAgentTypes';
import {
  getOrderDeliveryDetails,
  searchOperations,
  searchOrdersAndDeliveries,
} from './orderDeliveryAgentService';
import { getMobileProductDetails, searchMobileProducts } from './productAgentService';
import { mobileAgentFinanceTools } from './mobileAgentFinanceTools';
import {
  CreateAgentOrderOperationInput,
  UpdateAgentOrderOperationInput,
  UpsertAgentCustomerInput,
  createOrderOperationForAgent,
  updateOrderOperationForAgent,
  upsertCustomerForAgent,
  searchCustomersForAgent,
  searchCollaboratorsForAgent,
  normalizeAgentOrderIdentifier,
} from '../../../../shared-utils/agentOrderAndPeopleOperations';
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

// Executores determinísticos das ferramentas do agente OpenAI no mobile.

export const mobileAgentTools = {
  async buscarOperacoes(args: {
    termo?: string;
    dataInicio?: string;
    dataFim?: string;
    status?: string;
    tipo?:
      | 'todas'
      | 'venda'
      | 'orcamento'
      | 'entrega'
      | 'retirada'
      | 'assistencia'
      | 'devolucao'
      | 'montagem';
    limite?: number;
  }, permissionContext?: AgentPermissionContext | null): Promise<ToolExecutionResponse> {
    try {
      const operations = await searchOperations(args, permissionContext);
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

  async obterDetalhesOperacao(
    args: { operacaoId: string },
    permissionContext?: AgentPermissionContext | null
  ): Promise<ToolExecutionResponse> {
    if (!args.operacaoId?.trim() || !normalizeAgentOrderIdentifier(args.operacaoId))
      return {
        success: false,
        code: 'INVALID_OPERATION_ID',
        error: 'É necessário informar o ID ou número real da operação.',
      };
    try {
      const operation = await getOrderDeliveryDetails(args.operacaoId, {}, permissionContext);
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
  }, permissionContext?: AgentPermissionContext | null): Promise<ToolExecutionResponse> {
    try {
      const orders = await searchOrdersAndDeliveries(
        { ...args, tipo: 'entrega' },
        permissionContext
      );
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

  async obterDetalhesPedidoEntrega(
    args: { pedidoId: string },
    permissionContext?: AgentPermissionContext | null
  ): Promise<ToolExecutionResponse> {
    if (!args.pedidoId?.trim() || !normalizeAgentOrderIdentifier(args.pedidoId))
      return {
        success: false,
        code: 'INVALID_ORDER_ID',
        error: 'É necessário informar um ID ou número de pedido válido.',
      };
    try {
      const order = await getOrderDeliveryDetails(
        args.pedidoId,
        { logisticsScoped: true },
        permissionContext
      );
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

  async criarPedidoOperacao(args: CreateAgentOrderOperationInput): Promise<ToolExecutionResponse> {
    try {
      const created = await createOrderOperationForAgent(supabase, args);
      return {
        success: true,
        data: created,
        message: `${created.tipo.charAt(0).toUpperCase() + created.tipo.slice(1)} #${created.codigo} criado(a) com sucesso para ${created.cliente}.`,
      };
    } catch (error: unknown) {
      return {
        success: false,
        code: 'ORDER_OPERATION_CREATE_ERROR',
        error: error instanceof Error ? error.message : 'Falha ao criar pedido/operação.',
      };
    }
  },

  async editarPedidoOperacao(args: UpdateAgentOrderOperationInput): Promise<ToolExecutionResponse> {
    try {
      const updated = await updateOrderOperationForAgent(supabase, args);
      return {
        success: true,
        data: updated,
        message: `${updated.tipo.charAt(0).toUpperCase() + updated.tipo.slice(1)} #${updated.codigo} atualizado(a) com sucesso.`,
      };
    } catch (error: unknown) {
      return {
        success: false,
        code: 'ORDER_OPERATION_UPDATE_ERROR',
        error: error instanceof Error ? error.message : 'Falha ao atualizar pedido/operação.',
      };
    }
  },

  async buscarClientes(args: { termo: string; limite?: number }): Promise<ToolExecutionResponse> {
    if (!args?.termo || args.termo.trim().length < 2) {
      return {
        success: false,
        code: 'CUSTOMER_SEARCH_TERM_REQUIRED',
        error: 'Informe pelo menos dois caracteres do nome, telefone ou e-mail do cliente.',
      };
    }
    try {
      const customers = await searchCustomersForAgent(supabase, args);
      return {
        success: true,
        data: customers,
        message: `${customers.length} cliente(s) encontrado(s).`,
      };
    } catch (error: unknown) {
      return {
        success: false,
        code: 'CUSTOMER_SEARCH_ERROR',
        error: error instanceof Error ? error.message : 'Falha ao consultar clientes.',
      };
    }
  },

  async criarOuEditarCliente(args: UpsertAgentCustomerInput): Promise<ToolExecutionResponse> {
    try {
      const customer = await upsertCustomerForAgent(supabase, args);
      return {
        success: true,
        data: customer,
        message: `Cliente "${customer.nome}" ${customer.acao} com sucesso.`,
      };
    } catch (error: unknown) {
      return {
        success: false,
        code: 'CUSTOMER_UPSERT_ERROR',
        error: error instanceof Error ? error.message : 'Falha ao criar ou atualizar cliente.',
      };
    }
  },

  async buscarColaboradores(args: {
    termo: string;
    limite?: number;
  }): Promise<ToolExecutionResponse> {
    if (!args?.termo || args.termo.trim().length < 2) {
      return {
        success: false,
        code: 'COLLABORATOR_SEARCH_TERM_REQUIRED',
        error: 'Informe pelo menos dois caracteres do nome, e-mail ou cargo do colaborador.',
      };
    }
    try {
      const collaborators = await searchCollaboratorsForAgent(supabase, args);
      return {
        success: true,
        data: collaborators,
        message: `${collaborators.length} colaborador(es) encontrado(s).`,
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
    naLixeira?: boolean;
    limite?: number;
  }, permissionContext?: AgentPermissionContext | null): Promise<ToolExecutionResponse> {
    try {
      const products = await searchMobileProducts(args, permissionContext);
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

  async obterDetalhesProduto(
    args: { codigoOuSku: string },
    permissionContext?: AgentPermissionContext | null
  ): Promise<ToolExecutionResponse> {
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
      const product = await getMobileProductDetails(target, permissionContext);
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

  async listarCategoriasECaracteristicasProduto(): Promise<ToolExecutionResponse> {
    return listProductCategoriesAndCharacteristicsForAgent(supabase);
  },

  async criarProduto(
    args: AgentCreateProductInput,
    permissionContext?: AgentPermissionContext | null
  ): Promise<ToolExecutionResponse> {
    const canViewCost = permissionContext === undefined
      ? undefined
      : permissionContext !== null && canAgentViewProductCost(permissionContext);
    return createProductForAgent(supabase, args, canViewCost);
  },

  async editarProduto(
    args: AgentUpdateProductInput,
    permissionContext?: AgentPermissionContext | null
  ): Promise<ToolExecutionResponse> {
    const canViewCost = permissionContext === undefined
      ? undefined
      : permissionContext !== null && canAgentViewProductCost(permissionContext);
    return updateProductForAgent(supabase, args, canViewCost);
  },
};
