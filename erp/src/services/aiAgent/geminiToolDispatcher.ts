import { supabase } from '@/pages/utils/supabaseConfig';
import { financialAgentTools } from './financialAgentTools';
import { orderAndPeopleAgentTools } from './orderAndPeopleAgentTools';
import { productAgentTools } from './productAgentTools';
import { GeminiFunctionCall, GeminiFunctionResponse, ExecutedToolRecord } from './geminiAgentTypes';
import {
  AgentPermissionContext,
  checkAgentToolPermission,
  getActiveAgentPermissionContext,
  resolveRuntimeAgentPermissionContext,
  setActiveAgentPermissionContext,
} from '../../../../shared-utils/agentPermissionGuard';
import { sanitizeAgentToolResponseForModel } from '../../../../shared-utils/agentToolResponse';

// Dispatcher central que recebe as tool calls da IA, valida permissões do perfil de acesso e executa os handlers seguros

const toolLabels: Record<string, string> = {
  buscarCategoriasFinanceiras: 'Consultando categorias financeiras',
  buscarContasAPagar: 'Consultando contas a pagar',
  buscarContasAReceber: 'Consultando contas a receber',
  buscarMovimentacoesFinanceiras: 'Buscando lançamentos no fluxo de caixa',
  obterResumoFinanceiro: 'Calculando resumo financeiro',
  criarMovimentacaoFinanceira: 'Registrando movimentação financeira',
  editarMovimentacaoFinanceira: 'Editando movimentação financeira',
  cancelarOuExcluirMovimentacaoFinanceira: 'Removendo lançamento financeiro',
  criarContaAPagar: 'Criando conta a pagar',
  editarContaAPagar: 'Editando conta a pagar',
  criarContaAReceber: 'Criando conta a receber',
  editarContaAReceber: 'Editando conta a receber',
  baixarContaFinanceira: 'Liquidando/baixando conta financeira',
  registrarFeedbackAgente: 'Registrando feedback do assistente de IA',
  buscarOperacoes: 'Consultando operações e pedidos',
  obterDetalhesOperacao: 'Carregando detalhes da operação',
  buscarPedidosEntregas: 'Consultando pedidos e entregas',
  obterDetalhesPedidoEntrega: 'Carregando detalhes do pedido e entrega',
  criarPedidoOperacao: 'Criando pedido/operação',
  editarPedidoOperacao: 'Editando pedido/operação',
  buscarClientes: 'Pesquisando clientes',
  criarOuEditarCliente: 'Salvando cadastro de cliente',
  buscarColaboradores: 'Pesquisando colaboradores',
  buscarProdutos: 'Pesquisando produtos no catálogo',
  obterDetalhesProduto: 'Carregando detalhes e ficha técnica do produto',
  listarCategoriasECaracteristicasProduto: 'Listando categorias e características de produtos',
  criarProduto: 'Criando produto no catálogo',
  editarProduto: 'Editando produto no catálogo',
};

const erpToolHandlers: Record<
  string,
  (args: any, permissionContext?: AgentPermissionContext | null) => Promise<any>
> = {
  buscarCategoriasFinanceiras: (a) => financialAgentTools.buscarCategoriasFinanceiras(a || {}),
  buscarContasAPagar: (a) => financialAgentTools.buscarContasAPagar(a || {}),
  buscarContasAReceber: (a) => financialAgentTools.buscarContasAReceber(a || {}),
  buscarMovimentacoesFinanceiras: (a) => financialAgentTools.buscarMovimentacoesFinanceiras(a || {}),
  obterResumoFinanceiro: (a) => financialAgentTools.obterResumoFinanceiro(a || {}),
  criarMovimentacaoFinanceira: (a) => financialAgentTools.criarMovimentacaoFinanceira(a),
  editarMovimentacaoFinanceira: (a) => financialAgentTools.editarMovimentacaoFinanceira(a),
  cancelarOuExcluirMovimentacaoFinanceira: (a) =>
    financialAgentTools.cancelarOuExcluirMovimentacaoFinanceira(a),
  criarContaAPagar: (a) => financialAgentTools.criarContaAPagar(a),
  editarContaAPagar: (a) => financialAgentTools.editarContaAPagar(a),
  criarContaAReceber: (a) => financialAgentTools.criarContaAReceber(a),
  editarContaAReceber: (a) => financialAgentTools.editarContaAReceber(a),
  baixarContaFinanceira: (a) => financialAgentTools.baixarContaFinanceira(a),
  registrarFeedbackAgente: (a) => financialAgentTools.registrarFeedbackAgente(a),
  buscarOperacoes: (a, c) => orderAndPeopleAgentTools.buscarOperacoes(a || {}, c),
  obterDetalhesOperacao: (a, c) => orderAndPeopleAgentTools.obterDetalhesOperacao(a, c),
  buscarPedidosEntregas: (a, c) => orderAndPeopleAgentTools.buscarPedidosEntregas(a || {}, c),
  obterDetalhesPedidoEntrega: (a, c) => orderAndPeopleAgentTools.obterDetalhesPedidoEntrega(a, c),
  criarPedidoOperacao: (a) => orderAndPeopleAgentTools.criarPedidoOperacao(a),
  editarPedidoOperacao: (a) => orderAndPeopleAgentTools.editarPedidoOperacao(a),
  buscarClientes: (a) => orderAndPeopleAgentTools.buscarClientes(a),
  criarOuEditarCliente: (a) => orderAndPeopleAgentTools.criarOuEditarCliente(a),
  buscarColaboradores: (a) => orderAndPeopleAgentTools.buscarColaboradores(a),
  buscarProdutos: (a, c) => productAgentTools.buscarProdutos(a || {}, c),
  obterDetalhesProduto: (a, c) => productAgentTools.obterDetalhesProduto(a, c),
  listarCategoriasECaracteristicasProduto: () =>
    productAgentTools.listarCategoriasECaracteristicasProduto(),
  criarProduto: (a, c) => productAgentTools.criarProduto(a, c),
  editarProduto: (a, c) => productAgentTools.editarProduto(a, c),
};

export class GeminiToolDispatcher {
  public static async execute(
    call: GeminiFunctionCall,
    permissionContext?: AgentPermissionContext | null
  ): Promise<{
    functionResponse: GeminiFunctionResponse;
    record: ExecutedToolRecord;
  }> {
    const { name, args } = call;
    const label = toolLabels[name] || `Executando ${name}`;
    const previousContext = getActiveAgentPermissionContext();

    try {
      let result: any;
      const handler = erpToolHandlers[name];

      if (!handler) {
        result = {
          success: false,
          code: 'UNKNOWN_TOOL',
          error: `Ferramenta "${name}" não encontrada no ERP.`,
        };
      } else {
        const effectivePermission = await resolveRuntimeAgentPermissionContext(
          supabase,
          permissionContext
        );
        setActiveAgentPermissionContext(effectivePermission);
        const permCheck = effectivePermission
          ? checkAgentToolPermission(name, args || {}, effectivePermission)
          : {
              allowed: false,
              requiredActions: [],
              code: 'PERMISSION_DENIED',
              error: 'Não foi possível validar as permissões do operador para esta consulta.',
            };
        if (!permCheck.allowed) {
          result = {
            success: false,
            code: 'PERMISSION_DENIED',
            error:
              permCheck.error ||
              `Seu perfil de acesso não possui permissão para executar "${name}".`,
          };
        } else {
          result = await handler(args || {}, effectivePermission);
        }
      }

      const isSuccess = Boolean(result && result.success !== false);
      const record: ExecutedToolRecord = {
        name,
        label,
        args: args || {},
        result,
        success: isSuccess,
        error: isSuccess ? undefined : result?.error,
      };

      return {
        functionResponse: {
          name,
          response: { output: sanitizeAgentToolResponseForModel(result) },
        },
        record,
      };
    } catch (unexpectedError: any) {
      const errMessage = unexpectedError?.message || 'Erro inesperado ao executar ferramenta';
      const record: ExecutedToolRecord = {
        name,
        label,
        args: args || {},
        result: { success: false, error: errMessage },
        success: false,
        error: errMessage,
      };

      return {
        functionResponse: {
          name,
          response: {
            output: sanitizeAgentToolResponseForModel({
              success: false,
              code: 'EXECUTION_ERROR',
              error: errMessage,
            }),
          },
        },
        record,
      };
    } finally {
      setActiveAgentPermissionContext(previousContext);
    }
  }
}
