import { financialAgentTools } from './financialAgentTools';
import { GeminiFunctionCall, GeminiFunctionResponse, ExecutedToolRecord } from './geminiAgentTypes';

// Dispatcher central que recebe as tool calls da IA e executa os handlers seguros

const toolLabels: Record<string, string> = {
  buscarCategoriasFinanceiras: 'Consultando categorias financeiras',
  buscarMovimentacoesFinanceiras: 'Buscando lançamentos no fluxo de caixa',
  obterResumoFinanceiro: 'Calculando resumo financeiro',
  criarMovimentacaoFinanceira: 'Registrando movimentação financeira',
  cancelarOuExcluirMovimentacaoFinanceira: 'Removendo lançamento financeiro',
};

export class GeminiToolDispatcher {
  public static async execute(call: GeminiFunctionCall): Promise<{
    functionResponse: GeminiFunctionResponse;
    record: ExecutedToolRecord;
  }> {
    const { name, args } = call;
    const label = toolLabels[name] || `Executando ${name}`;

    try {
      let result: any;
      switch (name) {
        case 'buscarCategoriasFinanceiras':
          result = await financialAgentTools.buscarCategoriasFinanceiras(args || {});
          break;
        case 'buscarMovimentacoesFinanceiras':
          result = await financialAgentTools.buscarMovimentacoesFinanceiras(args || {});
          break;
        case 'obterResumoFinanceiro':
          result = await financialAgentTools.obterResumoFinanceiro(args || {});
          break;
        case 'criarMovimentacaoFinanceira':
          result = await financialAgentTools.criarMovimentacaoFinanceira(args as any);
          break;
        case 'cancelarOuExcluirMovimentacaoFinanceira':
          result = await financialAgentTools.cancelarOuExcluirMovimentacaoFinanceira(args as any);
          break;
        default:
          result = {
            success: false,
            code: 'UNKNOWN_TOOL',
            error: `Ferramenta "${name}" não encontrada no ERP.`,
          };
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
    }
  }
}
