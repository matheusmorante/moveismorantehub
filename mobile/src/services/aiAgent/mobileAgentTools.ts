import { fetchFinancialCategories } from '../financial/mobileCategoryService';
import { fetchPayableAccounts } from '../financial/mobilePayablesService';
import { fetchFinancialSummary } from '../financial/mobileFinanceReports';
import {
  createFinancialTransaction,
  deleteFinancialTransaction,
} from '../financial/mobileTransactionCrudService';
import { supabase } from '../supabaseClient';
import { ToolExecutionResponse } from './mobileAgentTypes';

import {
  PAYMENT_METHODS,
  VEHICLES,
  isProLaboreCat,
  buildIncomeCategories,
} from '../../features/finance/components/transactionModalUtils';

// Executores deterministicos das ferramentas do Gemini no Mobile

export const mobileAgentTools = {
  async buscarCategoriasFinanceiras(args: { tipo?: 'income' | 'expense' }): Promise<ToolExecutionResponse> {
    try {
      const categories = await fetchFinancialCategories();
      
      if (args.tipo === 'income') {
        const incomeList = buildIncomeCategories(categories);
        return {
          success: true,
          data: incomeList.map(c => ({
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
        filtered = categories.filter(c => c.type === 'expense');
      }

      return {
        success: true,
        data: filtered.map(c => {
          const isPersonal = isProLaboreCat(c.name);
          return {
            id: c.id,
            nome: c.name,
            tipo: c.type === 'expense' ? 'despesa/saida' : 'receita/entrada',
            finalidadeOficial: isPersonal ? 'PERSONAL_PARTNER' : 'BUSINESS',
            descricaoFinalidade: isPersonal ? '👤 Uso Particular (Pró-labore)' : '🏢 Operação da Empresa',
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

  async buscarContasAPagar(args: {
    fornecedor?: string;
    dataVencimentoInicio?: string;
    dataVencimentoFim?: string;
    apenasPendentes?: boolean;
  }): Promise<ToolExecutionResponse> {
    try {
      const allPayables = await fetchPayableAccounts();
      let filtered = allPayables;

      if (args.fornecedor && args.fornecedor.trim()) {
        const query = args.fornecedor.toLowerCase().trim();
        filtered = filtered.filter(p => {
          const desc = (p.description || '').toLowerCase();
          const party = (p.counterparty || '').toLowerCase();
          const cat = (p.category_name || '').toLowerCase();
          return desc.includes(query) || party.includes(query) || cat.includes(query);
        });
      }

      if (args.dataVencimentoInicio) {
        filtered = filtered.filter(p => (p.due_date || p.date) >= args.dataVencimentoInicio!);
      }

      if (args.dataVencimentoFim) {
        filtered = filtered.filter(p => (p.due_date || p.date) <= args.dataVencimentoFim!);
      }

      return {
        success: true,
        data: filtered.slice(0, 15).map(p => ({
          id: p.id,
          fornecedor: p.counterparty || p.description,
          valor: p.amount,
          vencimento: p.due_date || p.date,
          categoria: p.category_name,
          formaPagamento: p.payment_method,
          status: p.status,
        })),
        message: `${filtered.length} conta(s) a pagar encontrada(s).`,
      };
    } catch (err: any) {
      return {
        success: false,
        code: 'PAYABLES_FETCH_ERROR',
        error: err?.message || 'Erro ao buscar contas a pagar.',
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
      let query = supabase
        .from('financial_transactions')
        .select('*')
        .order('date', { ascending: false });

      if (args.dataInicio) query = query.gte('date', args.dataInicio);
      if (args.dataFim) query = query.lte('date', args.dataFim);
      if (args.tipo) query = query.eq('type', args.tipo);
      if (args.categoriaId) query = query.eq('category_id', args.categoriaId);

      const { data, error } = await query.limit(Math.min(Math.max(args.limite || 10, 1), 30));

      if (error) throw error;

      let results = data || [];
      if (args.termo && args.termo.trim()) {
        const norm = args.termo.toLowerCase().trim();
        results = results.filter(t => {
          const desc = (t.description || '').toLowerCase();
          const notes = (t.notes || '').toLowerCase();
          const party = (t.counterparty || '').toLowerCase();
          return desc.includes(norm) || notes.includes(norm) || party.includes(norm);
        });
      }

      return {
        success: true,
        data: results.map(t => ({
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

  async obterResumoFinanceiro(args: { dataInicio?: string; dataFim?: string }): Promise<ToolExecutionResponse> {
    try {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;
      const summary = await fetchFinancialSummary(year, month);

      return {
        success: true,
        data: {
          periodo: {
            inicio: args.dataInicio || `${year}-${String(month).padStart(2, '0')}-01`,
            fim: args.dataFim || now.toISOString().split('T')[0],
          },
          totalEntradas: summary.totalIncome,
          totalSaidas: summary.totalExpense,
          saldoPeriodo: summary.balance,
          totalLancamentos: summary.transactionCount,
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
  }): Promise<ToolExecutionResponse> {
    try {
      if (!args.tipo || !['income', 'expense'].includes(args.tipo)) {
        return { success: false, code: 'INVALID_TYPE', error: 'Tipo deve ser "income" ou "expense" (exatamente como no formulário).' };
      }
      if (typeof args.valor !== 'number' || args.valor <= 0 || isNaN(args.valor)) {
        return { success: false, code: 'INVALID_AMOUNT', error: 'O valor deve ser um número positivo maior que zero.' };
      }
      if (!args.descricao || !args.descricao.trim()) {
        return { success: false, code: 'INVALID_DESCRIPTION', error: 'A descrição da movimentação é obrigatória.' };
      }

      // Normalização da finalidade: estritamente 'BUSINESS' ou 'PERSONAL_PARTNER' para despesas
      let normalizedPurpose: 'BUSINESS' | 'PERSONAL_PARTNER' | null = null;
      if (args.tipo === 'expense') {
        if (args.finalidade === 'PERSONAL_PARTNER' || args.finalidade === 'PERSONAL') {
          normalizedPurpose = 'PERSONAL_PARTNER';
        } else {
          normalizedPurpose = 'BUSINESS';
        }
      }

      // Normalização da forma de pagamento estritamente com PAYMENT_METHODS do formulário (vazio até o usuário informar)
      let normalizedPaymentMethod: string | null = null;
      if (args.formaPagamento && args.formaPagamento.trim()) {
        const foundMethod = PAYMENT_METHODS.find(
          m => m.toLowerCase() === args.formaPagamento!.toLowerCase().trim()
        );
        normalizedPaymentMethod = foundMethod || args.formaPagamento.trim();
      }

      // Normalização do veículo estritamente com VEHICLES do formulário
      let normalizedVehicle: string | null = null;
      if (args.veiculo) {
        const foundVeh = VEHICLES.find(
          v => v.toLowerCase() === args.veiculo!.toLowerCase().trim()
        );
        normalizedVehicle = foundVeh || args.veiculo.trim();
      }

      const today = new Date().toISOString().split('T')[0];
      const preparedData = {
        id: `draft_${Date.now()}`,
        tipo: args.tipo,
        valor: Number(args.valor.toFixed(2)),
        descricao: args.descricao.trim(),
        finalidade: normalizedPurpose,
        categoriaId: args.categoriaId || null,
        data: args.data || today,
        formaPagamento: normalizedPaymentMethod,
        veiculo: normalizedVehicle,
        observacoes: args.observacoes || null,
      };

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

  async cancelarOuExcluirMovimentacaoFinanceira(args: {
    movimentacaoId: string;
    justificativa?: string;
  }): Promise<ToolExecutionResponse> {
    try {
      if (!args.movimentacaoId) {
        return { success: false, code: 'MISSING_ID', error: 'ID da movimentacao e obrigatorio.' };
      }
      const success = await deleteFinancialTransaction(args.movimentacaoId);
      if (!success) {
        return { success: false, code: 'DELETE_FAILED', error: 'Nao foi possivel excluir a movimentacao.' };
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
