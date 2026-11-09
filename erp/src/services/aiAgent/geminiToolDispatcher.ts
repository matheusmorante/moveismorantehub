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

const erpToolHandlers: Record<string, (args: any) => Promise<any>> = {
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
  buscarOperacoes: (a) => orderAndPeopleAgentTools.buscarOperacoes(a || {}),
  obterDetalhesOperacao: (a) => orderAndPeopleAgentTools.obterDetalhesOperacao(a),
  buscarPedidosEntregas: (a) => orderAndPeopleAgentTools.buscarPedidosEntregas(a || {}),
  obterDetalhesPedidoEntrega: (a) => orderAndPeopleAgentTools.obterDetalhesPedidoEntrega(a),
  criarPedidoOperacao: (a) => orderAndPeopleAgentTools.criarPedidoOperacao(a),
  editarPedidoOperacao: (a) => orderAndPeopleAgentTools.editarPedidoOperacao(a),
  buscarClientes: (a) => orderAndPeopleAgentTools.buscarClientes(a),
  criarOuEditarCliente: (a) => orderAndPeopleAgentTools.criarOuEditarCliente(a),
  buscarColaboradores: (a) => orderAndPeopleAgentTools.buscarColaboradores(a),
  buscarProdutos: (a) => productAgentTools.buscarProdutos(a || {}),
  obterDetalhesProduto: (a) => productAgentTools.obterDetalhesProduto(a),
  listarCategoriasECaracteristicasProduto: () =>
    productAgentTools.listarCategoriasECaracteristicasProduto(),
  criarProduto: (a) => productAgentTools.criarProduto(a),
  editarProduto: (a) => productAgentTools.editarProduto(a),
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
        const permCheck = checkAgentToolPermission(name, args || {}, effectivePermission);
        if (!permCheck.allowed) {
          result = {
            success: false,
            code: 'PERMISSION_DENIED',
            error:
              permCheck.error ||
              `Seu perfil de acesso não possui permissão para executar "${name}".`,
          };
        } else {
          result = await handler(args || {});
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
          response: { output: result },
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
          response: { output: { success: false, error: errMessage } },
        },
        record,
      };
    } finally {
      setActiveAgentPermissionContext(previousContext);
    }
  }
}
