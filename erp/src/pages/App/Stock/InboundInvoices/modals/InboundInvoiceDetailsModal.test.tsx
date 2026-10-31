// @vitest-environment happy-dom
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { InboundInvoice } from '@/pages/utils/inboundNfe/inboundNfeTypes';
import { InboundInvoiceDetailsModal } from './InboundInvoiceDetailsModal';

const invoice: InboundInvoice = {
  id: 'nota-exemplo',
  nfeKey: '12345678901234567890123456789012345678901234',
  nfeNumber: '123',
  series: '1',
  issuedAt: '2026-10-30',
  emitterCnpj: '00000000000100',
  emitterName: 'Fornecedor exemplo',
  recipientCnpj: '00000000000200',
  recipientName: 'Destinatário exemplo',
  totalProducts: 100,
  totalFreight: 10,
  totalIpi: 5,
  totalInvoice: 115,
  protocol: 'PROTOCOLO-EXEMPLO',
  operationNature: 'Compra para revenda',
  additionalInfo: 'Observação de exemplo',
  status: 'pending',
  itemsCount: 1,
  items: [{
    itemNumber: 1,
    productCode: 'PROD-1',
    productDescription: 'Produto de exemplo',
    ncm: '94036000',
    cfop: '5102',
    unit: 'UN',
    quantity: 2,
    unitCost: 50,
    totalCost: 100,
  }],
};

afterEach(cleanup);

describe('InboundInvoiceDetailsModal', () => {
  it('organiza os dados existentes em abas e reinicia no resumo ao trocar a nota', () => {
    const { rerender } = render(<InboundInvoiceDetailsModal invoice={invoice} onClose={vi.fn()} />);
    const tabs = screen.getAllByRole('tab');
    expect(tabs.map((tab) => tab.textContent)).toEqual(['Resumo', 'Participantes', 'Itens', 'Fiscal']);
    expect(screen.getByRole('tab', { name: 'Resumo' }).getAttribute('aria-selected')).toBe('true');
    expect(screen.getByText(invoice.nfeKey)).toBeTruthy();
    tabs.forEach((tab) => expect(document.getElementById(tab.getAttribute('aria-controls')!)).toBeTruthy());

    fireEvent.click(screen.getByRole('tab', { name: 'Participantes' }));
    expect(screen.getByText('Fornecedor exemplo')).toBeTruthy();
    expect(screen.getByText('Destinatário exemplo')).toBeTruthy();

    fireEvent.click(screen.getByRole('tab', { name: 'Itens' }));
    expect(screen.getByText('Produto de exemplo')).toBeTruthy();
    expect(screen.getByText(/NCM: 94036000/)).toBeTruthy();

    fireEvent.click(screen.getByRole('tab', { name: 'Fiscal' }));
    expect(screen.getByText('PROTOCOLO-EXEMPLO')).toBeTruthy();
    expect(screen.getByText(/Observações: Observação de exemplo/)).toBeTruthy();
    fireEvent.keyDown(screen.getByRole('tab', { name: 'Fiscal' }), { key: 'ArrowLeft' });
    expect(screen.getByRole('tab', { name: 'Itens' }).getAttribute('aria-selected')).toBe('true');

    rerender(<InboundInvoiceDetailsModal invoice={{ ...invoice, id: 'outra-nota' }} onClose={vi.fn()} />);
    expect(screen.getByRole('tab', { name: 'Resumo' }).getAttribute('aria-selected')).toBe('true');
  });

  it('mantém o aviso de XML incompleto e libera a rolagem ao fechar', () => {
    const incomplete = { ...invoice, items: [{ ...invoice.items[0], quantity: 0, unitCost: 0, totalCost: 0 }] };
    const { rerender } = render(<InboundInvoiceDetailsModal invoice={incomplete} onClose={vi.fn()} />);
    expect(document.body.style.overflow).toBe('hidden');
    fireEvent.click(screen.getByRole('tab', { name: 'Itens' }));
    expect(screen.getByText(/sincronização automática não carrega itens/i)).toBeTruthy();
    rerender(<InboundInvoiceDetailsModal invoice={null} onClose={vi.fn()} />);
    expect(document.body.style.overflow).toBe('');
  });
});
