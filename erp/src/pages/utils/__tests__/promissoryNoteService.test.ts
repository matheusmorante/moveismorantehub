import { describe, expect, it, vi } from 'vitest';
import type Order from '@/pages/types/order.type';

vi.mock('@/pages/utils/supabaseConfig', () => ({
  supabase: {},
  supabasePublicUrl: 'https://mock.supabase.co',
}));
vi.mock('../supabaseConfig', () => ({
  supabase: {},
  supabasePublicUrl: 'https://mock.supabase.co',
}));

import {
  canIssuePromissoryNote,
  formatCustomerDocument,
  buildPromissoryNotesFromOrder,
} from '../promissory/promissoryNoteService';

describe('promissoryNoteService', () => {
  describe('canIssuePromissoryNote', () => {
    it('retorna false para pedidos sem forma de pagamento promissória', () => {
      const order: Partial<Order> = {
        orderType: 'sale',
        payments: [
          { method: 'Dinheiro', amount: 500, fee: 0, feeType: 'fixed', status: 'Pago' },
          { method: 'Cartão de Crédito 3x', amount: 1500, fee: 0, feeType: 'fixed', status: 'Pago' },
        ],
      };
      expect(canIssuePromissoryNote(order)).toBe(false);
    });

    it('retorna false para pedidos que não são de venda mesmo com promissória', () => {
      const order: Partial<Order> = {
        orderType: 'budget',
        payments: [
          { method: 'Promissória 1x', amount: 1000, fee: 0, feeType: 'fixed', status: 'Pendente' },
        ],
      };
      expect(canIssuePromissoryNote(order)).toBe(false);
    });

    it('retorna true para pedido de venda que contém pagamento do tipo promissória', () => {
      const order: Partial<Order> = {
        orderType: 'sale',
        payments: [
          { method: 'Dinheiro', amount: 500, fee: 0, feeType: 'fixed', status: 'Pago' },
          { method: 'Cartão de Crédito', amount: 1500, fee: 0, feeType: 'fixed', status: 'Pago' },
          { method: 'Promissória 1x', amount: 1000, fee: 0, feeType: 'fixed', status: 'Pendente' },
        ],
      };
      expect(canIssuePromissoryNote(order)).toBe(true);
    });
  });

  describe('formatCustomerDocument (Regra 4 do usuário)', () => {
    it('mantém o label CPF: visível e valor vazio quando não informado', () => {
      expect(formatCustomerDocument(undefined)).toEqual({ label: 'CPF:', value: '' });
      expect(formatCustomerDocument({ fullName: 'Maria da Silva', phone: '41999999999', fullAddress: {} as any })).toEqual({
        label: 'CPF:',
        value: '',
      });
      expect(formatCustomerDocument({ fullName: 'Maria', phone: '', cpfCnpj: '', fullAddress: {} as any })).toEqual({
        label: 'CPF:',
        value: '',
      });
    });

    it('bloqueia valores fictícios de placeholder como 000.000.000-00 ou "Não informado"', () => {
      expect(
        formatCustomerDocument({
          fullName: 'Maria',
          phone: '',
          cpfCnpj: '000.000.000-00',
          fullAddress: {} as any,
        })
      ).toEqual({ label: 'CPF:', value: '' });

      expect(
        formatCustomerDocument({
          fullName: 'Maria',
          phone: '',
          cpfCnpj: 'Não informado',
          fullAddress: {} as any,
        })
      ).toEqual({ label: 'CPF:', value: '' });

      expect(
        formatCustomerDocument({
          fullName: 'Maria',
          phone: '',
          cpfCnpj: 'N/A',
          fullAddress: {} as any,
        })
      ).toEqual({ label: 'CPF:', value: '' });
    });

    it('formata CPF real corretamente', () => {
      expect(
        formatCustomerDocument({
          fullName: 'Maria da Silva',
          phone: '',
          cpfCnpj: '12345678901',
          fullAddress: {} as any,
        })
      ).toEqual({ label: 'CPF:', value: '123.456.789-01' });
    });

    it('aplica label CNPJ: para pessoa jurídica e deixa valor vazio se não informado', () => {
      expect(
        formatCustomerDocument({
          fullName: 'Empresa Teste',
          personType: 'PJ',
          phone: '',
          cpfCnpj: '',
          fullAddress: {} as any,
        })
      ).toEqual({ label: 'CNPJ:', value: '' });
    });

    it('formata CNPJ real corretamente', () => {
      expect(
        formatCustomerDocument({
          fullName: 'Empresa Teste Ltda',
          personType: 'PJ',
          phone: '',
          cpfCnpj: '12345678000199',
          fullAddress: {} as any,
        })
      ).toEqual({ label: 'CNPJ:', value: '12.345.678/0001-99' });
    });
  });

  describe('buildPromissoryNotesFromOrder (Cenário Exato do Usuário)', () => {
    it('emite a nota promissória somente pelo valor que ainda falta pagar na promissória (R$ 1.000,00)', () => {
      const order: Order = {
        orderIndex: 1234,
        orderType: 'sale',
        status: 'scheduled',
        date: '2026-10-17',
        customerData: {
          fullName: 'Maria da Silva',
          phone: '41999998888',
          // Sem CPF cadastrado
          fullAddress: {
            street: 'Rua Exemplo',
            number: '100',
            city: 'Colombo',
            state: 'PR',
          } as any,
        },
        payments: [
          { method: 'Dinheiro', amount: 500, fee: 0, feeType: 'fixed', status: 'Pago' },
          { method: 'Cartão de crédito', amount: 1500, fee: 0, feeType: 'fixed', status: 'Pago no cartão' },
          { method: 'Nota promissória', amount: 1000, fee: 0, feeType: 'fixed', status: 'A receber', dueDate: '2026-11-17' },
        ],
        paymentsSummary: {
          totalOrderValue: 3000,
          totalAmountPaid: 2000,
          amountRemaining: 1000,
          totalPaymentsFee: 0,
        },
        items: [],
        shipping: {} as any,
        seller: 'Vendedor Teste',
        observation: '',
      };

      const notes = buildPromissoryNotesFromOrder(order);
      expect(notes.length).toBe(1);

      const note = notes[0];
      expect(note.amount).toBe(1000);
      expect(note.amountFormatted).toContain('1.000,00');
      expect(note.amountInWords).toBe('mil reais');
      expect(note.dueDate).toBe('17/11/2026');
      expect(note.noteNumber).toBe('001234');
      expect(note.orderReference).toBe('Pedido de venda nº 1234');
      expect(note.debtorName).toBe('Maria da Silva');
      expect(note.debtorDocLabel).toBe('CPF:');
      expect(note.debtorDocValue).toBe(''); // Totalmente vazio conforme Regra 4
      expect(note.debtorAddress).toBe('Rua Exemplo, 100 – Colombo/PR');
      expect(note.paymentPlace).toBe('Colombo – PR');
      expect(note.legalText).toContain('1.000,00 (mil reais)');
      expect(note.legalText).toContain('Por esta única via de NOTA PROMISSÓRIA, prometo pagar, pura e simplesmente');
    });

    it('gera notas individuais quando parcelado em 3x', () => {
      const order: Order = {
        orderIndex: 5678,
        orderType: 'sale',
        status: 'scheduled',
        date: '2026-10-17',
        customerData: {
          fullName: 'João Souza',
          phone: '41988887777',
          cpfCnpj: '11122233344',
          fullAddress: { street: 'Rua Paraná', number: '50', city: 'Colombo', state: 'PR' } as any,
        },
        payments: [
          { method: 'Promissória 3x', amount: 900, fee: 0, feeType: 'fixed', status: 'Pendente', dueDate: '2026-11-17' },
        ],
        paymentsSummary: {
          totalOrderValue: 900,
          totalAmountPaid: 0,
          amountRemaining: 900,
          totalPaymentsFee: 0,
        },
        items: [],
        shipping: {} as any,
        seller: 'Vendedor Teste',
        observation: '',
      };

      const notes = buildPromissoryNotesFromOrder(order);
      expect(notes.length).toBe(3);

      expect(notes[0].noteNumber).toBe('005678/01');
      expect(notes[0].installmentText).toBe('Parcela 1 de 3');
      expect(notes[0].amount).toBe(300);
      expect(notes[0].dueDate).toBe('17/11/2026');

      expect(notes[1].noteNumber).toBe('005678/02');
      expect(notes[1].installmentText).toBe('Parcela 2 de 3');
      expect(notes[1].amount).toBe(300);
      expect(notes[1].dueDate).toBe('17/12/2026');

      expect(notes[2].noteNumber).toBe('005678/03');
      expect(notes[2].installmentText).toBe('Parcela 3 de 3');
      expect(notes[2].amount).toBe(300);
      expect(notes[2].dueDate).toBe('17/01/2027');
    });
  });
});
