import { financeService } from '../../pages/services/financeService';
import { supabase } from '@/pages/utils/supabaseConfig';
import { saveAgentFeedback } from './aiFeedbackService';
import {
  normalizeFinancialPaymentMethod,
  normalizeFinancialDate,
  validateTransactionCategoryAndPurpose,
} from '../../../../shared-utils/agentFinancialOperations';
import { financialPayableReceivableTools } from './financialPayableReceivableTools';
import type { ToolExecutionResponse } from './geminiAgentTypes';

export type { ToolExecutionResponse };
export { financialPayableReceivableTools };

// Handlers de execução das tools do módulo financeiro no ERP

const recentCreations = new Map<string, { data: any; timestamp: number }>();

export const financialAgentTools = {
  ...financialPayableReceivableTools,

  async buscarCategoriasFinanceiras(args: {
    tipo?: 'income' | 'expense';
  }): Promise<ToolExecutionResponse> {
    try {
      const categories = await financeService.getCategories(args.tipo);
      return {
        success: true,
        data: (categories || []).map((c) => ({
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
      const limit = Math.min(Math.max(args.limite || 10, 1), 30);
      const { data, error } = await supabase.rpc('get_finance_assistant_movements', {
        p_search: args.termo?.trim() ? args.termo : null,
        p_start_date: args.dataInicio || null,
        p_end_date: args.dataFim || null,
        p_type: args.tipo || null,
        p_category_id: args.categoriaId || null,
        p_limit: limit,
      });

      if (error) throw error;

      const rows = Array.isArray(data) ? data : [];
      const results = rows.map((t) => ({
        id: t.id,
        tipo: t.type,
        valor: t.amount,
        data: t.date,
        descricao: t.description,
        formaPagamento: t.payment_method,
        categoriaId: t.category_id || null,
        categoria: t.category_name || 'Sem categoria',
        finalidade: t.purpose || null,
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

  async obterResumoFinanceiro(args: {
    dataInicio?: string;
    dataFim?: string;
  }): Promise<ToolExecutionResponse> {
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
    finalidade?: 'BUSINESS' | 'PERSONAL' | 'PERSONAL_PARTNER';
    categoriaId?: string;
    data?: string;
    formaPagamento?: string;
    veiculo?: string;
    observacoes?: string;
    confirmado?: boolean;
    apenasPreparar?: boolean;
  }): Promise<ToolExecutionResponse> {
    try {
      if (!args.tipo || !['income', 'expense'].includes(args.tipo)) {
        return {
          success: false,
          code: 'INVALID_TYPE',
          error: 'Tipo deve ser "income" ou "expense".',
        };
      }
      if (typeof args.valor !== 'number' || args.valor <= 0 || isNaN(args.valor)) {
        return {
          success: false,
          code: 'INVALID_AMOUNT',
          error: 'O valor deve ser um número positivo maior que zero.',
        };
      }
      if (!args.descricao || !args.descricao.trim()) {
        return {
          success: false,
          code: 'INVALID_DESCRIPTION',
          error: 'A descrição da movimentação é obrigatória.',
        };
      }

      if (args.categoriaId) {
        const categories = await financeService.getCategories();
        if (Array.isArray(categories) && categories.length > 0) {
          const category = categories.find((c) => String(c.id) === String(args.categoriaId));
          const validation = validateTransactionCategoryAndPurpose(category, args.tipo, args.finalidade);
          if (!validation.valid) {
            return {
              success: false,
              code: validation.code || 'INVALID_CATEGORY',
              error: validation.error || 'Categoria inválida.',
            };
          }
        }
      }

      const normalizedPaymentMethod = normalizeFinancialPaymentMethod(args.formaPagamento);
      const targetDate = normalizeFinancialDate(args.data);
      const roundedAmount = Number(args.valor.toFixed(2));
      const cleanDesc = args.descricao.trim();
      const dedupKey = `${args.tipo}:${roundedAmount}:${cleanDesc.toLowerCase()}:${targetDate}:${args.categoriaId || ''}:${normalizedPaymentMethod.toLowerCase()}`;

      const now = Date.now();
      const recent = recentCreations.get(dedupKey);
      if (recent && now - recent.timestamp < 60_000) {
        return {
          success: true,
          data: recent.data,
          message: `Movimentação de ${args.tipo === 'expense' ? 'saída' : 'entrada'} de R$ ${roundedAmount.toFixed(2)} já havia sido registrada (id: ${recent.data?.id}). Nenhuma duplicata foi criada.`,
        };
      }

      if (args.confirmado === false || args.apenasPreparar === true) {
        const preparedData = {
          id: `draft_${Date.now()}`,
          tipo: args.tipo,
          valor: roundedAmount,
          descricao: cleanDesc,
          categoriaId: args.categoriaId || null,
          data: targetDate,
          formaPagamento: normalizedPaymentMethod,
          finalidade: args.finalidade || 'BUSINESS',
          veiculo: args.veiculo || null,
          observacoes: args.observacoes || null,
          preparadoParaConfirmacao: true,
        };
        return {
          success: true,
          data: preparedData,
          message: `Movimentação de ${args.tipo === 'expense' ? 'saída' : 'entrada'} de R$ ${roundedAmount.toFixed(2)} ("${cleanDesc}") preparada para confirmação do operador.`,
        };
      }

      const payload = {
        type: args.tipo,
        amount: roundedAmount,
        description: cleanDesc,
        category_id: args.categoriaId || undefined,
        date: targetDate,
        payment_method: normalizedPaymentMethod,
        purpose:
          (args.finalidade === 'PERSONAL_PARTNER' ? 'PERSONAL' : args.finalidade) || 'BUSINESS',
        vehicle_id: args.veiculo || undefined,
        notes: args.observacoes || undefined,
      };

      const created = await financeService.createTransaction(payload as any);
      recentCreations.set(dedupKey, { data: created, timestamp: now });
      return {
        success: true,
        data: created,
        message: `Movimentação de ${args.tipo === 'expense' ? 'saída' : 'entrada'} de R$ ${roundedAmount.toFixed(2)} criada com sucesso.`,
      };
    } catch (err: any) {
      return {
        success: false,
        code: 'TRANSACTION_CREATE_ERROR',
        error: err?.message || 'Erro ao registrar movimentação no banco.',
      };
    }
  },

  async editarMovimentacaoFinanceira(args: {
    movimentacaoId: string;
    tipo?: 'income' | 'expense';
    valor?: number;
    descricao?: string;
    categoriaId?: string;
    finalidade?: 'BUSINESS' | 'PERSONAL' | 'PERSONAL_PARTNER';
    data?: string;
    formaPagamento?: string;
    veiculo?: string;
    observacoes?: string;
  }): Promise<ToolExecutionResponse> {
    try {
      const id = args.movimentacaoId?.trim();
      if (!id) {
        return {
          success: false,
          code: 'MISSING_ID',
          error: 'O ID da movimentação financeira é obrigatório para edição.',
        };
      }
      if (args.valor !== undefined && (typeof args.valor !== 'number' || args.valor <= 0 || isNaN(args.valor))) {
        return {
          success: false,
          code: 'INVALID_AMOUNT',
          error: 'O novo valor deve ser um número positivo maior que zero.',
        };
      }
      if (args.descricao !== undefined && !args.descricao.trim()) {
        return {
          success: false,
          code: 'INVALID_DESCRIPTION',
          error: 'A descrição da movimentação não pode ficar vazia.',
        };
      }

      const updates: Record<string, any> = {};
      if (args.tipo) updates.type = args.tipo;
      if (args.valor !== undefined) updates.amount = Number(args.valor.toFixed(2));
      if (args.descricao !== undefined) updates.description = args.descricao.trim();
      if (args.categoriaId !== undefined) updates.category_id = args.categoriaId;
      if (args.finalidade !== undefined) {
        updates.purpose = args.finalidade === 'PERSONAL_PARTNER' ? 'PERSONAL' : args.finalidade;
      }
      if (args.data !== undefined) updates.date = args.data;
      if (args.formaPagamento !== undefined) updates.payment_method = args.formaPagamento;
      if (args.veiculo !== undefined) updates.vehicle_id = args.veiculo;
      if (args.observacoes !== undefined) updates.notes = args.observacoes;

      if (Object.keys(updates).length === 0) {
        return {
          success: false,
          code: 'NO_CHANGES',
          error: 'Informe ao menos um campo para atualizar na movimentação financeira.',
        };
      }

      const updated = await financeService.updateTransaction(id, updates);
      return {
        success: true,
        data: { id: updated?.id || id, ...updates },
        message: `Movimentação financeira ${id} atualizada com sucesso.`,
      };
    } catch (err: any) {
      return {
        success: false,
        code: 'TRANSACTION_UPDATE_ERROR',
        error: err?.message || 'Erro ao editar movimentação financeira.',
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
