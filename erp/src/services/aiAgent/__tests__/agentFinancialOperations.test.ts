import { describe, it, expect } from 'vitest';
import {
  normalizeFinancialPaymentMethod,
  normalizeFinancialAccountKind,
  normalizeFinancialDate,
  validateTransactionCategoryAndPurpose,
  buildPayableInsertPayload,
  buildPayableUpdatePayload,
  buildReceivableInsertPayload,
  buildReceivableUpdatePayload,
} from '../../../../../shared-utils/agentFinancialOperations';

describe('agentFinancialOperations (Shared Operations & Domain Invariants)', () => {
  describe('normalizeFinancialPaymentMethod', () => {
    it('normaliza métodos de pagamento válidos preservando casing canônico', () => {
      expect(normalizeFinancialPaymentMethod('pix')).toBe('PIX');
      expect(normalizeFinancialPaymentMethod('PIX')).toBe('PIX');
      expect(normalizeFinancialPaymentMethod('cartão de crédito')).toBe('Cartão de Crédito');
      expect(normalizeFinancialPaymentMethod('cartao de credito')).toBe('Cartão de Crédito');
      expect(normalizeFinancialPaymentMethod('boleto')).toBe('Boleto');
      expect(normalizeFinancialPaymentMethod('dinheiro')).toBe('Dinheiro');
    });

    it('retorna "Manual" quando não informado ou vazio', () => {
      expect(normalizeFinancialPaymentMethod(null)).toBe('Manual');
      expect(normalizeFinancialPaymentMethod(undefined)).toBe('Manual');
      expect(normalizeFinancialPaymentMethod('')).toBe('Manual');
      expect(normalizeFinancialPaymentMethod('   ')).toBe('Manual');
    });

    it('preserva valor limpo quando for um método desconhecido customizado', () => {
      expect(normalizeFinancialPaymentMethod('Cheque Especial')).toBe('Cheque Especial');
    });
  });

  describe('normalizeFinancialAccountKind', () => {
    it('reconhece variações de contas a pagar', () => {
      expect(normalizeFinancialAccountKind('payable')).toBe('payable');
      expect(normalizeFinancialAccountKind('pagar')).toBe('payable');
      expect(normalizeFinancialAccountKind('a_pagar')).toBe('payable');
      expect(normalizeFinancialAccountKind('a pagar')).toBe('payable');
      expect(normalizeFinancialAccountKind('despesa')).toBe('payable');
      expect(normalizeFinancialAccountKind('saida')).toBe('payable');
      expect(normalizeFinancialAccountKind('saída')).toBe('payable');
      expect(normalizeFinancialAccountKind('PAGAR')).toBe('payable');
    });

    it('reconhece variações de contas a receber', () => {
      expect(normalizeFinancialAccountKind('receivable')).toBe('receivable');
      expect(normalizeFinancialAccountKind('receber')).toBe('receivable');
      expect(normalizeFinancialAccountKind('a_receber')).toBe('receivable');
      expect(normalizeFinancialAccountKind('a receber')).toBe('receivable');
      expect(normalizeFinancialAccountKind('receita')).toBe('receivable');
      expect(normalizeFinancialAccountKind('entrada')).toBe('receivable');
      expect(normalizeFinancialAccountKind('RECEBER')).toBe('receivable');
    });

    it('retorna null para entradas inválidas ou vazias', () => {
      expect(normalizeFinancialAccountKind('')).toBeNull();
      expect(normalizeFinancialAccountKind(null)).toBeNull();
      expect(normalizeFinancialAccountKind('outro')).toBeNull();
    });
  });

  describe('normalizeFinancialDate', () => {
    it('preserva datas válidas no formato YYYY-MM-DD', () => {
      expect(normalizeFinancialDate('2026-11-08')).toBe('2026-11-08');
      expect(normalizeFinancialDate('2026-01-15')).toBe('2026-01-15');
    });

    it('retorna a data atual quando a data for inválida ou omitida', () => {
      const today = new Date().toISOString().split('T')[0];
      expect(normalizeFinancialDate(null)).toBe(today);
      expect(normalizeFinancialDate(undefined)).toBe(today);
      expect(normalizeFinancialDate('08/11/2026')).toBe(today);
    });
  });

  describe('validateTransactionCategoryAndPurpose', () => {
    it('rejeita categoria inexistente', () => {
      const result = validateTransactionCategoryAndPurpose(undefined, 'expense');
      expect(result.valid).toBe(false);
      expect(result.code).toBe('INVALID_CATEGORY');
    });

    it('rejeita tipo incompatível entre categoria e movimentação', () => {
      const cat = { id: '1', name: 'Venda de Balcão', type: 'income' };
      const result = validateTransactionCategoryAndPurpose(cat, 'expense');
      expect(result.valid).toBe(false);
      expect(result.code).toBe('CATEGORY_TYPE_MISMATCH');
    });

    it('exige Pró-labore para finalidade particular', () => {
      const catOperacional = { id: '2', name: 'Material de Escritório', type: 'expense' };
      const result = validateTransactionCategoryAndPurpose(
        catOperacional,
        'expense',
        'PERSONAL_PARTNER'
      );
      expect(result.valid).toBe(false);
      expect(result.code).toBe('PERSONAL_CATEGORY_REQUIRED');
    });

    it('bloqueia uso da categoria Pró-labore para finalidade empresarial (BUSINESS)', () => {
      const catProLabore = { id: '3', name: 'Pró-labore Sócios', type: 'expense' };
      const result = validateTransactionCategoryAndPurpose(catProLabore, 'expense', 'BUSINESS');
      expect(result.valid).toBe(false);
      expect(result.code).toBe('BUSINESS_CATEGORY_REQUIRED');
    });

    it('aceita combinação válida', () => {
      const catOperacional = { id: '2', name: 'Material de Escritório', type: 'expense' };
      const resOp = validateTransactionCategoryAndPurpose(catOperacional, 'expense', 'BUSINESS');
      expect(resOp.valid).toBe(true);

      const catProLabore = { id: '3', name: 'Pró-labore Sócios', type: 'expense' };
      const resPl = validateTransactionCategoryAndPurpose(
        catProLabore,
        'expense',
        'PERSONAL_PARTNER'
      );
      expect(resPl.valid).toBe(true);
    });
  });

  describe('buildPayableInsertPayload and buildPayableUpdatePayload', () => {
    it('monta payload de inserção de conta a pagar', () => {
      const payload = buildPayableInsertPayload({
        descricao: 'Fornecedor de Tecidos',
        valor: 1500.5,
        dataVencimento: '2026-11-20',
        fornecedorNome: 'Tecidos Morante',
        formaPagamento: 'pix',
        observacoes: 'Parcela 1/3',
      });

      expect(payload).toEqual({
        description: 'Fornecedor de Tecidos',
        amount: 1500.5,
        due_date: '2026-11-20',
        supplier_name: 'Tecidos Morante',
        category_id: null,
        payment_method: 'PIX',
        notes: 'Parcela 1/3',
        status: 'pending',
      });
    });

    it('monta payload de atualização de conta a pagar com campos definidos', () => {
      const updates = buildPayableUpdatePayload({
        valor: 1600.0,
        status: 'paid',
      });

      expect(updates).toEqual({
        amount: 1600.0,
        status: 'paid',
      });
    });
  });

  describe('buildReceivableInsertPayload and buildReceivableUpdatePayload', () => {
    it('monta payload de inserção de conta a receber', () => {
      const payload = buildReceivableInsertPayload({
        descricao: 'Venda de Sofá',
        valor: 2500,
        dataVencimento: '2026-11-25',
        clienteNome: 'João Silva',
        formaPagamento: 'cartão de crédito',
      });

      expect(payload).toEqual({
        description: 'Venda de Sofá',
        amount: 2500,
        due_date: '2026-11-25',
        customer_name: 'João Silva',
        category_id: null,
        payment_method: 'Cartão de Crédito',
        notes: null,
        status: 'pending',
      });
    });

    it('monta payload de atualização de conta a receber com campos definidos', () => {
      const updates = buildReceivableUpdatePayload({
        clienteNome: 'João da Silva Atualizado',
      });

      expect(updates).toEqual({
        customer_name: 'João da Silva Atualizado',
      });
    });
  });
});
