import { financeService } from '../../pages/services/financeService';
import { normalizeSearchTerm } from '../../pages/utils/textUtils';

import { saveAgentFeedback } from './aiFeedbackService';

// Handlers de execução das tools do módulo financeiro

export interface ToolExecutionResponse {
  success: boolean;
  data?: any;
  error?: string;
  code?: string;
  message?: string;
}

export const financialAgentTools = {
  async buscarCategoriasFinanceiras(args: { tipo?: 'income' | 'expense' }): Promise<ToolExecutionResponse> {
    try {
      const categories = await financeService.getCategories(args.tipo);
      return {
        success: true,
        data: (categories || []).map(c => ({
          id: c.id,
          nome: c.name,
          tipo: c.type === 'expense' ? 'despesa/saída' : 'receita/entrada',
        })),
        message: `${(categories || []).length} categorias encontradas.`,
      };
    } catch (err: any) {
      return {
        success: false,
        code: 'CATEGORIES_FETCH_ERROR',
        error: err?.message || 'Falha ao buscar categorias no banco.',
      };
    }
  },

  async buscarMovimentacoesFinanceiras(args: {
    termo?: string;
    dataInicio?: string;
    dataFim?: string;
    tipo?: 'income' | 'expense';
    categoriaId?: string;
    limite?: number;
  }): Promise<ToolExecutionResponse> {
    try {
      const txs = await financeService.getTransactions(args.dataInicio, args.dataFim);
      let filtered = txs || [];

      if (args.tipo) {
        filtered = filtered.filter(t => t.type === args.tipo);
      }

      if (args.categoriaId) {
        filtered = filtered.filter(t => t.category_id === args.categoriaId);
      }

      if (args.termo && args.termo.trim()) {
        const normTerm = normalizeSearchTerm(args.termo);
        filtered = filtered.filter(t => {
          const desc = normalizeSearchTerm(t.description || '');
          const notes = normalizeSearchTerm(t.notes || '');
          const catName = normalizeSearchTerm((t as any).financial_categories?.name || '');
          return desc.includes(normTerm) || notes.includes(normTerm) || catName.includes(normTerm);
        });
      }

      const limit = Math.min(Math.max(args.limite || 10, 1), 30);
      const results = filtered.slice(0, limit).map(t => ({
        id: t.id,
        tipo: t.type,
        valor: t.amount,
        data: t.date,
        descricao: t.description,
        formaPagamento: t.payment_method,
        categoria: (t as any).financial_categories?.name || 'Sem categoria',
        observacoes: t.notes || null,
      }));

      return {
        success: true,
        data: results,
        message: `${results.length} movimentação(ões) encontrada(s).`,
      };
    } catch (err: any) {
      return {
        success: false,
        code: 'TRANSACTIONS_FETCH_ERROR',
        error: err?.message || 'Erro ao consultar movimentações.',
      };
    }
  },

  async obterResumoFinanceiro(args: { dataInicio?: string; dataFim?: string }): Promise<ToolExecutionResponse> {
    try {
      const summary = await financeService.getFinancialSummary(args.dataInicio, args.dataFim);
      return {
        success: true,
        data: {
          periodo: {
            inicio: args.dataInicio || 'Início dos registros',
            fim: args.dataFim || 'Hoje',
          },
          totalEntradas: summary.totalIncome,
          totalSaidas: summary.totalExpense,
          saldoPeriodo: summary.balance,
          totalLancamentos: summary.count,
        },
      };
    } catch (err: any) {
      return {
        success: false,
        code: 'SUMMARY_ERROR',
        error: err?.message || 'Erro ao calcular resumo financeiro.',
      };
    }
  },

  async criarMovimentacaoFinanceira(args: {
    tipo: 'income' | 'expense';
    valor: number;
    descricao: string;
    finalidade?: 'BUSINESS' | 'PERSONAL';
    categoriaId?: string;
    data?: string;
    formaPagamento?: string;
    observacoes?: string;
  }): Promise<ToolExecutionResponse> {
    try {
      if (!args.tipo || !['income', 'expense'].includes(args.tipo)) {
        return { success: false, code: 'INVALID_TYPE', error: 'Tipo deve ser "income" ou "expense".' };
      }
      if (typeof args.valor !== 'number' || args.valor <= 0 || isNaN(args.valor)) {
        return { success: false, code: 'INVALID_AMOUNT', error: 'O valor deve ser um número positivo maior que zero.' };
      }
      if (!args.descricao || !args.descricao.trim()) {
        return { success: false, code: 'INVALID_DESCRIPTION', error: 'A descrição da movimentação é obrigatória.' };
      }

      const today = new Date().toISOString().split('T')[0];
      const payload = {
        type: args.tipo,
        amount: Number(args.valor.toFixed(2)),
        description: args.descricao.trim(),
        category_id: args.categoriaId || undefined,
        date: args.data || today,
        payment_method: args.formaPagamento || 'Manual',
        purpose: args.finalidade || 'BUSINESS',
        notes: args.observacoes || undefined,
      };

      const created = await financeService.createTransaction(payload);
      return {
        success: true,
        data: created,
        message: `Movimentação de ${args.tipo === 'expense' ? 'saída' : 'entrada'} de R$ ${args.valor.toFixed(2)} criada com sucesso.`,
      };
    } catch (err: any) {
      return {
        success: false,
        code: 'TRANSACTION_CREATE_ERROR',
        error: err?.message || 'Erro ao registrar movimentação no banco.',
      };
    }
  },

  async cancelarOuExcluirMovimentacaoFinanceira(args: {
    movimentacaoId: string;
    justificativa?: string;
  }): Promise<ToolExecutionResponse> {
    try {
      if (!args.movimentacaoId) {
        return { success: false, code: 'MISSING_ID', error: 'ID da movimentação é obrigatório.' };
      }
      const deleted = await financeService.deleteTransaction(args.movimentacaoId);
      return {
        success: true,
        data: deleted,
        message: `Movimentação ${args.movimentacaoId} removida com sucesso.`,
      };
    } catch (err: any) {
      return {
        success: false,
        code: 'TRANSACTION_DELETE_ERROR',
        error: err?.message || 'Erro ao remover movimentação financeira.',
      };
    }
  },

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
      const result = await saveAgentFeedback({
        conversationId: args.conversaId || 'erp-agent-session',
        userMessage: args.mensagemUsuario || args.queixaUsuario,
        agentResponse: args.respostaAgente,
        category: (args.categoria as any) || 'misunderstanding',
        userComplaint: args.queixaUsuario,
        divergentField: args.campoDivergente,
        severity: args.severidade || 'medium',
        sourceApp: 'ERP',
      });
      return {
        success: true,
        data: result,
        message: 'Feedback registrado com sucesso para auditoria e regressão da equipe.',
      };
    } catch (err: any) {
      return {
        success: false,
        code: 'FEEDBACK_RECORD_ERROR',
        error: err?.message || 'Erro ao registrar feedback da IA.',
      };
    }
  },
};
