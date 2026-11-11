import {
  fetchFinancialCategories,
  fetchFinancialCategoriesForAgent,
} from '../financial/mobileCategoryService';
import {
  deleteFinancialTransaction,
  updateFinancialTransaction,
  createFinancialTransaction,
} from '../financial/mobileTransactionCrudService';
import { supabase } from '../supabaseClient';
import { ToolExecutionResponse } from './mobileAgentTypes';
import {
  VEHICLES,
  isProLaboreCat,
  buildIncomeCategories,
} from '../../features/finance/components/transactionModalUtils';
import {
  normalizeFinancialPaymentMethod,
  normalizeFinancialDate,
  validateTransactionCategoryAndPurpose,
  validateAgentDateRange,
} from '../../../../shared-utils/agentFinancialOperations';
import { mobileAgentPayableReceivableTools } from './mobileAgentPayableReceivableTools';

export { mobileAgentPayableReceivableTools };

const recentCreations = new Map<string, { data: any; timestamp: number }>();

const parseIsoDate = (value: string, fieldName: string): Date => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`${fieldName} deve usar o formato AAAA-MM-DD.`);
  }
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    throw new Error(`${fieldName} não é uma data válida.`);
  }
  return parsed;
};

const addOneDay = (value: string): string => {
  const date = parseIsoDate(value, 'A data final');
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
};

export const mobileAgentFinanceTools = {
  ...mobileAgentPayableReceivableTools,

  async buscarCategoriasFinanceiras(args: {
    tipo?: 'income' | 'expense';
  }): Promise<ToolExecutionResponse> {
    try {
      const categories = await fetchFinancialCategoriesForAgent(args.tipo);

      if (args.tipo === 'income') {
        const incomeList = buildIncomeCategories(categories);
        return {
          success: true,
          data: incomeList.map((c) => ({
            id: c.id,
            nome: c.name,
            tipo: 'receita/entrada',
            finalidadePermitida: 'Receitas da Empresa',
          })),
          message: `${incomeList.length} categoria(s) de receita do formulário encontrada(s).`,
        };
      }

      let filtered = categories;
      if (args.tipo === 'expense') {
        filtered = categories.filter((c) => c.type === 'expense');
      }

      return {
        success: true,
        data: filtered.map((c) => {
          const isPersonal = isProLaboreCat(c.name);
          return {
            id: c.id,
            nome: c.name,
            tipo: c.type === 'expense' ? 'despesa/saida' : 'receita/entrada',
            finalidadeOficial: isPersonal ? 'PERSONAL_PARTNER' : 'BUSINESS',
            descricaoFinalidade: isPersonal
              ? '👤 Uso Particular (Pró-labore)'
              : '🏢 Operação da Empresa',
          };
        }),
        message: `${filtered.length} categoria(s) encontrada(s).`,
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
      const rangeError = validateAgentDateRange(args.dataInicio, args.dataFim);
      if (rangeError) return { success: false, code: 'INVALID_DATE_RANGE', error: rangeError };
      const limite = Math.min(Math.max(Math.trunc(args.limite || 10), 1), 30);
      const { data, error } = await supabase.rpc('get_mobile_finance_assistant_movements', {
        p_search: args.termo?.trim() ? args.termo : null,
        p_start_date: args.dataInicio || null,
        p_end_date: args.dataFim || null,
        p_type: args.tipo || null,
        p_category_id: args.categoriaId || null,
        p_limit: limite,
      });

      if (error) throw error;

      const results = Array.isArray(data) ? data : [];

      return {
        success: true,
        data: results.map((t) => ({
          id: t.id,
          tipo: t.type,
          valor: Number(t.amount) || 0,
          data: t.date,
          descricao: t.description,
          formaPagamento: t.payment_method,
          categoriaId: t.category_id,
          observacoes: t.notes || null,
        })),
        message: `${results.length} movimentacao(oes) encontrada(s).`,
      };
    } catch (err: any) {
      return {
        success: false,
        code: 'TRANSACTIONS_FETCH_ERROR',
        error: err?.message || 'Erro ao consultar movimentacoes financeiras.',
      };
    }
  },

  async obterResumoFinanceiro(args: {
    dataInicio?: string;
    dataFim?: string;
  }): Promise<ToolExecutionResponse> {
    try {
      const now = new Date();
      const today = [
        now.getFullYear(),
        String(now.getMonth() + 1).padStart(2, '0'),
        String(now.getDate()).padStart(2, '0'),
      ].join('-');
      const anchorDate = args.dataInicio || args.dataFim || today;
      const anchor = parseIsoDate(anchorDate, 'A data do resumo');
      const defaultStart = `${anchor.getUTCFullYear()}-${String(anchor.getUTCMonth() + 1).padStart(2, '0')}-01`;
      const startDate = args.dataInicio || defaultStart;
      const endDate = args.dataFim || (args.dataInicio ? today : anchorDate);
      parseIsoDate(startDate, 'A data inicial');
      parseIsoDate(endDate, 'A data final');
      if (startDate > endDate) {
        throw new Error('A data inicial não pode ser posterior à data final.');
      }
      const { data, error } = await supabase.rpc('get_mobile_financial_monthly_summary', {
        p_start_date: startDate,
        p_end_date_exclusive: addOneDay(endDate),
      });
      if (error) throw error;

      const summary = data as any;
      const income = Number(summary?.income);
      const expense = Number(summary?.expense);
      if (!Number.isFinite(income) || !Number.isFinite(expense)) {
        throw new Error('A resposta do resumo financeiro está incompleta.');
      }

      return {
        success: true,
        data: {
          periodo: { inicio: startDate, fim: endDate },
          totalEntradas: income,
          totalSaidas: expense,
          saldoPeriodo: income - expense,
          totalLancamentos: null,
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
    finalidade?: 'BUSINESS' | 'PERSONAL_PARTNER' | 'PERSONAL';
    categoriaId?: string;
    data?: string;
    formaPagamento?: string;
    veiculo?: string;
    observacoes?: string;
    confirmado?: boolean;
  }): Promise<ToolExecutionResponse> {
    try {
      if (!args.tipo || !['income', 'expense'].includes(args.tipo)) {
        return {
          success: false,
          code: 'INVALID_TYPE',
          error: 'Tipo deve ser "income" ou "expense" (exatamente como no formulário).',
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

      const categories = await fetchFinancialCategories();
      const category = categories.find((item) => String(item.id) === String(args.categoriaId));
      const validation = validateTransactionCategoryAndPurpose(category, args.tipo, args.finalidade);
      if (!validation.valid) {
        return {
          success: false,
          code: validation.code || 'INVALID_CATEGORY',
          error: validation.error || 'Categoria inválida.',
        };
      }

      const normalizedPurpose =
        args.tipo === 'expense'
          ? (args.finalidade === 'PERSONAL_PARTNER' || args.finalidade === 'PERSONAL'
              ? 'PERSONAL_PARTNER'
              : 'BUSINESS')
          : null;

      const normalizedPaymentMethod = normalizeFinancialPaymentMethod(args.formaPagamento);

      let normalizedVehicle: string | null = null;
      if (args.veiculo) {
        const foundVeh = VEHICLES.find(
          (v) => v.toLowerCase() === args.veiculo!.toLowerCase().trim()
        );
        normalizedVehicle = foundVeh || args.veiculo.trim();
      }

      const targetDate = normalizeFinancialDate(args.data);
      const preparedData = {
        id: `draft_${Date.now()}`,
        tipo: args.tipo,
        valor: Number(args.valor.toFixed(2)),
        descricao: args.descricao.trim(),
        finalidade: normalizedPurpose,
        categoriaId: category!.id,
        categoriaNome: category!.name,
        data: targetDate,
        formaPagamento: normalizedPaymentMethod,
        veiculo: normalizedVehicle,
        observacoes: args.observacoes || null,
      };

      if (args.confirmado === true) {
        const roundedAmount = Number(args.valor.toFixed(2));
        const cleanDesc = args.descricao.trim();
        const dedupKey = `${args.tipo}:${roundedAmount}:${cleanDesc.toLowerCase()}:${targetDate}:${category!.id}:${normalizedPaymentMethod.toLowerCase()}`;

        const now = Date.now();
        const recent = recentCreations.get(dedupKey);
        if (recent && now - recent.timestamp < 60_000) {
          return {
            success: true,
            data: recent.data,
            message: `Movimentação de ${args.tipo === 'expense' ? 'saída' : 'entrada'} de R$ ${roundedAmount.toFixed(2)} já havia sido registrada (id: ${recent.data?.id}). Nenhuma duplicata foi criada.`,
          };
        }

        const insertPayload: any = {
          type: args.tipo,
          amount: roundedAmount,
          description: cleanDesc,
          category_id: category!.id,
          date: targetDate,
          payment_method: normalizedPaymentMethod,
          purpose: normalizedPurpose,
          vehicle_id: normalizedVehicle,
          notes: args.observacoes || null,
        };
        const created = await createFinancialTransaction(insertPayload);
        recentCreations.set(dedupKey, { data: created || preparedData, timestamp: now });
        return {
          success: true,
          data: created || preparedData,
          message: `Movimentação de ${args.tipo === 'expense' ? 'saída' : 'entrada'} de R$ ${args.valor.toFixed(2)} ("${cleanDesc}") registrada com sucesso.`,
        };
      }

      return {
        success: true,
        data: preparedData,
        message: `Movimentacao de ${args.tipo === 'expense' ? 'saida' : 'entrada'} de R$ ${args.valor.toFixed(2)} ("${args.descricao.trim()}") preparada com os campos oficiais do formulário de transação.`,
      };
    } catch (err: any) {
      return {
        success: false,
        code: 'CREATE_EXCEPTION',
        error: err?.message || 'Erro ao preparar movimentacao financeira.',
      };
    }
  },

  async editarMovimentacaoFinanceira(args: {
    movimentacaoId: string;
    tipo?: 'income' | 'expense';
    valor?: number;
    descricao?: string;
    categoriaId?: string;
    finalidade?: 'BUSINESS' | 'PERSONAL_PARTNER' | 'PERSONAL';
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

      const payload: Record<string, any> = {};
      if (args.tipo !== undefined) payload.type = args.tipo;
      if (args.valor !== undefined) payload.amount = Number(args.valor.toFixed(2));
      if (args.descricao !== undefined) payload.description = args.descricao.trim();
      if (args.categoriaId !== undefined) payload.category_id = args.categoriaId;
      if (args.finalidade !== undefined) {
        payload.purpose = args.finalidade === 'PERSONAL' ? 'PERSONAL_PARTNER' : args.finalidade;
      }
      if (args.data !== undefined) payload.date = args.data;
      if (args.formaPagamento !== undefined) payload.payment_method = args.formaPagamento;
      if (args.veiculo !== undefined) payload.vehicle_id = args.veiculo;
      if (args.observacoes !== undefined) payload.notes = args.observacoes;

      if (Object.keys(payload).length === 0) {
        return {
          success: false,
          code: 'NO_CHANGES',
          error: 'Informe ao menos um campo para atualizar na movimentação financeira.',
        };
      }

      const res = await updateFinancialTransaction(id, payload);
      if (!res.success) {
        return {
          success: false,
          code: 'UPDATE_FAILED',
          error: res.error || 'Não foi possível atualizar a movimentação financeira.',
        };
      }

      return {
        success: true,
        data: { id, ...payload },
        message: `Movimentação financeira ${id} atualizada com sucesso.`,
      };
    } catch (err: any) {
      return {
        success: false,
        code: 'UPDATE_ERROR',
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
        return { success: false, code: 'MISSING_ID', error: 'ID da movimentacao e obrigatorio.' };
      }
      const res = await deleteFinancialTransaction(args.movimentacaoId);
      const success = typeof res === 'boolean' ? res : res?.success;
      if (!success) {
        return {
          success: false,
          code: 'DELETE_FAILED',
          error: (typeof res === 'object' ? res?.error : undefined) || 'Nao foi possivel excluir a movimentacao.',
        };
      }
      return {
        success: true,
        data: { id: args.movimentacaoId },
        message: `Movimentacao ${args.movimentacaoId} removida com sucesso.`,
      };
    } catch (err: any) {
      return {
        success: false,
        code: 'DELETE_ERROR',
        error: err?.message || 'Erro ao cancelar/excluir movimentacao.',
      };
    }
  },
};
