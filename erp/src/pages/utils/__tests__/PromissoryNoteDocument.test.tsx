// @vitest-environment happy-dom
import { render, screen, cleanup } from '@testing-library/react';
import { describe, expect, it, vi, afterEach } from 'vitest';
import React from 'react';
import type Order from '@/pages/types/order.type';
import PromissoryNoteDocument from '../promissory/PromissoryNoteDocument';
import { buildPromissoryNotesFromOrder } from '../promissory/promissoryNoteService';

vi.mock('bwip-js', () => ({
  default: { toCanvas: vi.fn() },
  toCanvas: vi.fn(),
}));

vi.mock('@/pages/utils/supabaseConfig', () => ({
  supabase: {},
  supabasePublicUrl: 'https://mock.supabase.co',
}));

vi.mock('../supabaseConfig', () => ({
  supabase: {},
  supabasePublicUrl: 'https://mock.supabase.co',
}));

describe('PromissoryNoteDocument', () => {
  afterEach(cleanup);

  const baseOrder: Order = {
    id: 'ord-12345',
    orderIndex: 1234,
    orderType: 'sale',
    status: 'scheduled',
    date: '2026-10-17',
    seller: 'Vendedor Loja',
    customerData: {
      fullName: 'Maria da Silva',
      phone: '41999998888',
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
    observation: '',
  };

  it('renderiza o campo de vencimento e informações sobre o vencimento para escrita manual a caneta', () => {
    const notes = buildPromissoryNotesFromOrder(baseOrder);
    render(<PromissoryNoteDocument notes={notes} order={baseOrder} />);

    // Título e documento
    expect(screen.getByRole('heading', { name: /NOTA PROMISSÓRIA/i })).toBeTruthy();
    expect(screen.getByText(/DOCUMENTO FINANCEIRO/i)).toBeTruthy();

    // Campo de vencimento manual a caneta
    expect(
      screen.getByText(/Informações sobre o vencimento \(preenchimento manual a caneta\)/i)
    ).toBeTruthy();
    expect(screen.getByText(/Observações \/ Acordo do vencimento:/i)).toBeTruthy();
    expect(screen.getAllByText(/17\/11\/2026/i).length).toBeGreaterThan(0);
  });

  it('renderiza o campo de assinatura da cliente e a assinatura da loja com o carimbo do certificado digital', () => {
    const notes = buildPromissoryNotesFromOrder(baseOrder);
    render(<PromissoryNoteDocument notes={notes} order={baseOrder} />);

    // Assinatura da cliente (devedora)
    expect(screen.getByText(/Assinatura da emitente \(devedora\)/i)).toBeTruthy();
    expect(screen.getAllByText('Maria da Silva').length).toBeGreaterThan(0);

    // Assinatura da loja / credora via certificado digital
    expect(screen.getByText(/Assinatura da Credora \(Loja\)/i)).toBeTruthy();
    expect(screen.getByText(/Documento Assinado Digitalmente/i)).toBeTruthy();
    expect(screen.getByText(/ICP-BRASIL \/ A1/i)).toBeTruthy();
    expect(screen.getByText(/Autenticidade garantida por Certificado Digital/i)).toBeTruthy();
  });

  it('respeita a Regra 4 de CPF vazio visualmente quando não cadastrado', () => {
    const notes = buildPromissoryNotesFromOrder(baseOrder);
    render(<PromissoryNoteDocument notes={notes} order={baseOrder} />);

    // O label CPF: deve estar visível
    expect(screen.getAllByText(/^CPF:$/).length).toBeGreaterThan(0);
    // Não deve conter valores fictícios
    expect(screen.queryByText(/000\.000\.000-00/)).toBeNull();
    expect(screen.queryByText(/Não informado/i)).toBeNull();
  });
});
