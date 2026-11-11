import { financeService } from '../../pages/services/financeService';
import { supabase } from '@/pages/utils/supabaseConfig';
import {
  normalizeFinancialPaymentMethod,
  normalizeFinancialAccountKind,
  normalizeFinancialDate,
  buildPayableInsertPayload,
  buildPayableUpdatePayload,
  buildReceivableInsertPayload,
  buildReceivableUpdatePayload,
  validateAgentDateRange,
} from '../../../../shared-utils/agentFinancialOperations';
import type { ToolExecutionResponse } from './geminiAgentTypes';

export const financialPayableReceivableTools = {
  async buscarContasAPagar(args: {
    fornecedor?: string;
    dataVencimentoInicio?: string;
    dataVencimentoFim?: string;
    apenasPendentes?: boolean;
    limite?: number;
  }): Promise<ToolExecutionResponse> {
    try {
      const rangeError = validateAgentDateRange(
        args.dataVencimentoInicio,
        args.dataVencimentoFim
      );
      if (rangeError) return { success: false, code: 'INVALID_DATE_RANGE', error: rangeError };
      const limit = Math.min(Math.max(Math.trunc(args.limite || 15), 1), 30);
      const { data, error } = await supabase.rpc('get_finance_assistant_payables', {
        p_supplier: args.fornecedor?.trim() || null,
        p_start_due_date: args.dataVencimentoInicio || null,
        p_end_due_date: args.dataVencimentoFim || null,
        p_only_pending: args.apenasPendentes !== false,
        p_limit: limit,
      });
      if (error) throw error;
      const result = data as { total_count?: unknown; items?: unknown } | null;
      if (
        !result ||
        !Array.isArray(result.items) ||
        typeof result.total_count !== 'number' ||
        !Number.isFinite(result.total_count)
      ) {
        throw new Error('Resposta inválida ao consultar contas a pagar.');
      }
      const payables = result.items as any[];
      return {
        success: true,
        data: payables.map((p: any) => ({
          id: p.id,
          fornecedor: p.supplier_name || p.description,
          descricao: p.description,
          valor: Number(p.amount) || 0,
          vencimento: p.due_date,
          categoria: p.category_name || null,
          categoriaId: p.category_id || null,
          formaPagamento: p.payment_method || null,
          status: p.status,
          observacoes: p.notes || null,
        })),
        message: `${result.total_count} conta(s) a pagar encontrada(s).`,
      };
    } catch (err: any) {
      return {
        success: false,
        code: 'PAYABLES_FETCH_ERROR',
        error: err?.message || 'Erro ao buscar contas a pagar.',
      };
    }
  },

  async buscarContasAReceber(args: {
    cliente?: string;
    dataVencimentoInicio?: string;
    dataVencimentoFim?: string;
    apenasPendentes?: boolean;
    limite?: number;
  }): Promise<ToolExecutionResponse> {
    try {
      const rangeError = validateAgentDateRange(
        args.dataVencimentoInicio,
        args.dataVencimentoFim
      );
      if (rangeError) return { success: false, code: 'INVALID_DATE_RANGE', error: rangeError };
      const limit = Math.min(Math.max(Math.trunc(args.limite || 15), 1), 30);
      const { data, error } = await supabase.rpc('get_finance_assistant_receivables', {
        p_search: args.cliente?.trim() || null,
        p_start_due_date: args.dataVencimentoInicio || null,
        p_end_due_date: args.dataVencimentoFim || null,
        p_only_pending: args.apenasPendentes !== false,
        p_limit: limit,
      });
      if (error) throw error;

      const result = data as { total_count?: unknown; items?: unknown } | null;
      if (
        !result ||
        !Array.isArray(result.items) ||
        typeof result.total_count !== 'number' ||
        !Number.isFinite(result.total_count)
      ) {
        throw new Error('Resposta inválida ao consultar contas a receber.');
      }
      const receivables = result.items as any[];
      const totalCount = result.total_count;

      return {
        success: true,
        data: receivables.map((r: any) => ({
          id: r.id,
          cliente: r.customer_name || r.counterparty || r.description,
          descricao: r.description,
          valor: Number(r.amount) || 0,
          vencimento: r.due_date,
          categoria: r.category_name || null,
          categoriaId: r.category_id || null,
          formaPagamento: r.payment_method || null,
          status: r.status,
          observacoes: r.notes || null,
        })),
        message: `${totalCount} conta(s) a receber encontrada(s).`,
      };
    } catch (err: any) {
      return {
        success: false,
        code: 'RECEIVABLES_FETCH_ERROR',
        error: err?.message || 'Erro ao buscar contas a receber.',
      };
    }
  },

  async criarContaAPagar(args: {
    descricao: string;
    valor: number;
    dataVencimento: string;
    fornecedor?: string;
    fornecedorNome?: string;
    categoriaId?: string;
    formaPagamento?: string;
    observacoes?: string;
  }): Promise<ToolExecutionResponse> {
    try {
      if (!args.descricao?.trim()) {
        return { success: false, code: 'INVALID_DESCRIPTION', error: 'A descrição da conta a pagar é obrigatória.' };
      }
      if (typeof args.valor !== 'number' || args.valor <= 0 || isNaN(args.valor)) {
        return { success: false, code: 'INVALID_AMOUNT', error: 'O valor da conta a pagar deve ser maior que zero.' };
      }
      if (!args.dataVencimento || !/^\d{4}-\d{2}-\d{2}$/.test(args.dataVencimento)) {
        return { success: false, code: 'INVALID_DUE_DATE', error: 'A data de vencimento deve estar no formato YYYY-MM-DD.' };
      }

      const payload = buildPayableInsertPayload(args);

      const created =
        typeof financeService.createPayable === 'function'
          ? await financeService.createPayable(payload as any)
          : (await supabase.from('accounts_payable').insert([payload]).select('id, description, amount, due_date, supplier_name, category_id, payment_method, notes, status').single()).data;

      return {
        success: true,
        data: created,
        message: `Conta a pagar "${args.descricao.trim()}" de R$ ${args.valor.toFixed(2)} (vencimento ${args.dataVencimento}) registrada com sucesso.`,
      };
    } catch (err: any) {
      return {
        success: false,
        code: 'PAYABLE_CREATE_ERROR',
        error: err?.message || 'Erro ao criar conta a pagar.',
      };
    }
  },

  async editarContaAPagar(args: {
    contaId?: string;
    conta_id?: string;
    id?: string;
    descricao?: string;
    valor?: number;
    dataVencimento?: string;
    fornecedor?: string;
    fornecedorNome?: string;
    categoriaId?: string;
    formaPagamento?: string;
    status?: 'pending' | 'paid' | 'overdue' | 'cancelled';
    observacoes?: string;
  }): Promise<ToolExecutionResponse> {
    try {
      const id = (args.contaId || args.conta_id || args.id)?.trim();
      if (!id) {
        return { success: false, code: 'MISSING_ID', error: 'O ID da conta a pagar é obrigatório.' };
      }
      if (args.valor !== undefined && (typeof args.valor !== 'number' || args.valor <= 0 || isNaN(args.valor))) {
        return { success: false, code: 'INVALID_AMOUNT', error: 'O valor deve ser maior que zero.' };
      }

      const updates = buildPayableUpdatePayload(args);

      if (Object.keys(updates).length === 0) {
        return { success: false, code: 'NO_CHANGES', error: 'Informe ao menos um campo para atualizar na conta a pagar.' };
      }

      const updated =
        typeof financeService.updatePayable === 'function'
          ? await financeService.updatePayable(id, updates)
          : (await supabase.from('accounts_payable').update(updates).eq('id', id).select('id, description, amount, due_date, supplier_name, category_id, payment_method, notes, status').single()).data;

      return {
        success: true,
        data: updated || { id, ...updates },
        message: `Conta a pagar ${id} atualizada com sucesso.`,
      };
    } catch (err: any) {
      return {
        success: false,
        code: 'PAYABLE_UPDATE_ERROR',
        error: err?.message || 'Erro ao editar conta a pagar.',
      };
    }
  },

  async criarContaAReceber(args: {
    descricao: string;
    valor: number;
    dataVencimento: string;
    cliente?: string;
    clienteNome?: string;
    categoriaId?: string;
    formaPagamento?: string;
    observacoes?: string;
  }): Promise<ToolExecutionResponse> {
    try {
      if (!args.descricao?.trim()) {
        return { success: false, code: 'INVALID_DESCRIPTION', error: 'A descrição da conta a receber é obrigatória.' };
      }
      if (typeof args.valor !== 'number' || args.valor <= 0 || isNaN(args.valor)) {
        return { success: false, code: 'INVALID_AMOUNT', error: 'O valor da conta a receber deve ser maior que zero.' };
      }
      if (!args.dataVencimento || !/^\d{4}-\d{2}-\d{2}$/.test(args.dataVencimento)) {
        return { success: false, code: 'INVALID_DUE_DATE', error: 'A data de vencimento deve estar no formato YYYY-MM-DD.' };
      }

      const payload = buildReceivableInsertPayload(args);

      const created =
        typeof financeService.createReceivable === 'function'
          ? await financeService.createReceivable(payload as any)
          : (await supabase.from('accounts_receivable').insert([payload]).select('id, description, amount, due_date, customer_name, category_id, payment_method, notes, status').single()).data;

      return {
        success: true,
        data: created,
        message: `Conta a receber "${args.descricao.trim()}" de R$ ${args.valor.toFixed(2)} (vencimento ${args.dataVencimento}) registrada com sucesso.`,
      };
    } catch (err: any) {
      return {
        success: false,
        code: 'RECEIVABLE_CREATE_ERROR',
        error: err?.message || 'Erro ao criar conta a receber.',
      };
    }
  },

  async editarContaAReceber(args: {
    contaId?: string;
    conta_id?: string;
    id?: string;
    descricao?: string;
    valor?: number;
    dataVencimento?: string;
    cliente?: string;
    clienteNome?: string;
    categoriaId?: string;
    formaPagamento?: string;
    status?: 'pending' | 'received' | 'overdue' | 'cancelled';
    observacoes?: string;
  }): Promise<ToolExecutionResponse> {
    try {
      const id = (args.contaId || args.conta_id || args.id)?.trim();
      if (!id) {
        return { success: false, code: 'MISSING_ID', error: 'O ID da conta a receber é obrigatório.' };
      }
      if (args.valor !== undefined && (typeof args.valor !== 'number' || args.valor <= 0 || isNaN(args.valor))) {
        return { success: false, code: 'INVALID_AMOUNT', error: 'O valor deve ser maior que zero.' };
      }

      const updates = buildReceivableUpdatePayload(args);

      if (Object.keys(updates).length === 0) {
        return { success: false, code: 'NO_CHANGES', error: 'Informe ao menos um campo para atualizar na conta a receber.' };
      }

      const updated =
        typeof financeService.updateReceivable === 'function'
          ? await financeService.updateReceivable(id, updates)
          : (await supabase.from('accounts_receivable').update(updates).eq('id', id).select('id, description, amount, due_date, customer_name, category_id, payment_method, notes, status').single()).data;

      return {
        success: true,
        data: updated || { id, ...updates },
        message: `Conta a receber ${id} atualizada com sucesso.`,
      };
    } catch (err: any) {
      return {
        success: false,
        code: 'RECEIVABLE_UPDATE_ERROR',
        error: err?.message || 'Erro ao editar conta a receber.',
      };
    }
  },

  async baixarContaFinanceira(args: {
    tipoConta?: 'payable' | 'receivable' | 'pagar' | 'receber' | string;
    tipo_conta?: string;
    tipo?: string;
    contaId?: string;
    conta_id?: string;
    id?: string;
    dataBaixa?: string;
    data_baixa?: string;
    dataPagamento?: string;
    data_pagamento?: string;
    data?: string;
    formaPagamento?: string;
    forma_pagamento?: string;
    valorPago?: number;
    valor_pago?: number;
    gerarMovimentacaoCaixa?: boolean;
    gerar_movimentacao_caixa?: boolean;
    observacoes?: string;
  }): Promise<ToolExecutionResponse> {
    try {
      const id = (args.contaId || args.conta_id || args.id)?.trim();
      if (!id) {
        return { success: false, code: 'MISSING_ID', error: 'O ID da conta é obrigatório para dar baixa.' };
      }
      const rawKind = args.tipoConta || args.tipo_conta || args.tipo;
      const normalizedKind = normalizeFinancialAccountKind(rawKind);
      if (!normalizedKind) {
        return {
          success: false,
          code: 'INVALID_ACCOUNT_KIND',
          error: 'Informe tipoConta como "pagar" (ou "payable") ou "receber" (ou "receivable").',
        };
      }
      const payDate = normalizeFinancialDate(
        args.dataBaixa || args.data_baixa || args.dataPagamento || args.data_pagamento || args.data
      );
      const paymentMethod = args.formaPagamento || args.forma_pagamento;
      const table = normalizedKind === 'payable' ? 'accounts_payable' : 'accounts_receivable';
      const settledStatus = normalizedKind === 'payable' ? 'paid' : 'received';

      const { data: current } = await supabase
        .from(table)
        .select('id, description, amount, category_id, payment_method, status')
        .eq('id', id)
        .maybeSingle();

      if (current && typeof financeService.settleAccount === 'function') {
        const settled = await financeService.settleAccount({
          kind: normalizedKind,
          account: {
            id,
            description: (current.description || 'Conta financeira').trim(),
            amount: Number(Number(current.amount).toFixed(2)),
            category_id: current.category_id || undefined,
            date: payDate,
            status: (current.status as any) || 'pending',
            payment_method: paymentMethod
              ? normalizeFinancialPaymentMethod(paymentMethod)
              : current.payment_method || null,
          } as any,
        });
        return {
          success: true,
          data: settled,
          message: `Baixa registrada com sucesso na conta ${normalizedKind === 'payable' ? 'a pagar' : 'a receber'} (${id}) em ${payDate}.`,
        };
      }

      const updateData: Record<string, any> = {
        status: settledStatus,
        payment_date: payDate,
        updated_at: new Date().toISOString(),
      };
      if (paymentMethod) {
        updateData.payment_method = normalizeFinancialPaymentMethod(paymentMethod);
      }
      if (args.observacoes) updateData.notes = args.observacoes;

      const { data, error } = await supabase
        .from(table)
        .update(updateData)
        .eq('id', id)
        .select('id, description, amount, status, payment_date, payment_method')
        .single();
      if (error) throw error;

      return {
        success: true,
        data: data || { id, status: settledStatus, payment_date: payDate },
        message: `Baixa registrada com sucesso na conta ${normalizedKind === 'payable' ? 'a pagar' : 'a receber'} (${id}).`,
      };
    } catch (err: any) {
      return {
        success: false,
        code: 'ACCOUNT_SETTLE_ERROR',
        error: err?.message || 'Erro ao dar baixa na conta financeira.',
      };
    }
  },
};
