import { supabase } from '@/pages/utils/supabaseConfig';
import {
  createOrderOperationForAgent,
  updateOrderOperationForAgent,
  upsertCustomerForAgent,
  searchCustomersForAgent,
  searchCollaboratorsForAgent,
  type CreateAgentOrderOperationInput,
  type UpdateAgentOrderOperationInput,
  type UpsertAgentCustomerInput,
  normalizeAgentOrderIdentifier,
} from '../../../../shared-utils/agentOrderAndPeopleOperations';
import { recordAssistantOrderTiming } from '../../../../shared-utils/ai-agent/assistantOrderTimingMetrics';
import type { AgentPermissionContext } from '../../../../shared-utils/agentPermissionGuard';
import type { ToolExecutionResponse } from './geminiAgentTypes';
import {
  searchErpOperations,
  getErpOperationDetails,
  type ErpOperationKind,
  type ErpOrderOperationSearchInput,
} from './orderAndPeopleOperationQueries';

export {
  searchErpOperations,
  getErpOperationDetails,
  type ErpOperationKind,
  type ErpOrderOperationSearchInput,
};

export const orderAndPeopleAgentTools = {
  async buscarOperacoes(
    args: ErpOrderOperationSearchInput,
    permissionContext?: AgentPermissionContext | null
  ): Promise<ToolExecutionResponse> {
    try {
      const operations = await searchErpOperations(args, permissionContext);
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
    if (!args?.operacaoId?.trim() || !normalizeAgentOrderIdentifier(args.operacaoId)) {
      return {
        success: false,
        code: 'INVALID_OPERATION_ID',
        error: 'É necessário informar o ID ou número da operação.',
      };
    }
    try {
      const operation = await getErpOperationDetails(args.operacaoId, {}, permissionContext);
      if (!operation) {
        return {
          success: false,
          code: 'OPERATION_NOT_FOUND',
          error: 'Operação não encontrada.',
        };
      }
      return {
        success: true,
        data: operation,
        message: 'Detalhes da operação carregados.',
      };
    } catch (error: unknown) {
      return {
        success: false,
        code: 'OPERATION_DETAILS_ERROR',
        error: error instanceof Error ? error.message : 'Falha ao consultar detalhes da operação.',
      };
    }
  },

  async buscarPedidosEntregas(
    args: Omit<ErpOrderOperationSearchInput, 'tipo'>,
    permissionContext?: AgentPermissionContext | null
  ): Promise<ToolExecutionResponse> {
    try {
      const orders = await searchErpOperations({ ...args, tipo: 'entrega' }, permissionContext);
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
    if (!args?.pedidoId?.trim() || !normalizeAgentOrderIdentifier(args.pedidoId)) {
      return {
        success: false,
        code: 'INVALID_ORDER_ID',
        error: 'É necessário informar um ID ou número de pedido válido.',
      };
    }
    try {
      const order = await getErpOperationDetails(
        args.pedidoId,
        { logisticsScoped: true },
        permissionContext
      );
      if (!order) {
        return {
          success: false,
          code: 'ORDER_NOT_FOUND',
          error: 'Pedido não encontrado.',
        };
      }
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
      recordAssistantOrderTiming('erp', 'create', true);
      return {
        success: true,
        data: created,
        message: `${created.tipo.charAt(0).toUpperCase() + created.tipo.slice(1)} #${created.codigo} criado(a) com sucesso para ${created.cliente}.`,
      };
    } catch (error: unknown) {
      recordAssistantOrderTiming('erp', 'create', false);
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
      recordAssistantOrderTiming('erp', 'edit', true);
      return {
        success: true,
        data: updated,
        message: `${updated.tipo.charAt(0).toUpperCase() + updated.tipo.slice(1)} #${updated.codigo} atualizado(a) com sucesso.`,
      };
    } catch (error: unknown) {
      recordAssistantOrderTiming('erp', 'edit', false);
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
};
