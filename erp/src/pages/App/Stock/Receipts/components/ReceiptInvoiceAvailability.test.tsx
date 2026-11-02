// @vitest-environment happy-dom
import React from 'react';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { effectiveInvoiceReceiptStatus, receiptInvoiceConflictError } from '../../../../../../../shared-utils/receiptInvoiceAvailability';

const mocks = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock('@/pages/utils/supabaseConfig', () => ({ supabase: { rpc: mocks.rpc } }));

import { ReceiptsActionsMenu } from './ReceiptsActionsMenu';
import { InboundInvoiceReceiptItem } from '../modals/inbound-invoice-picker/InboundInvoiceReceiptItem';
import { filterInboundInvoicesForReceipt } from '../utils/inboundInvoicePickerFilters';

afterEach(cleanup);
beforeEach(() => { vi.clearAllMocks(); });

describe('disponibilidade da NF no recebimento', () => {
  it('usa o recebimento efetivo mesmo quando o status antigo da NF diverge', () => {
    const received = new Set(['ABC123']);
    expect(effectiveInvoiceReceiptStatus('pending', 'ab.c-123', received)).toBe('received');
    expect(effectiveInvoiceReceiptStatus('received', 'other', received)).toBe('pending');
    expect(effectiveInvoiceReceiptStatus('manifested', 'other', received)).toBe('manifested');
  });

  it('mostra a nota vinculada como Em uso e não permite usá-la novamente', () => {
    const invoice = { id: 'i', status: 'received', items: [{ matchedProductId: 'p', quantity: 1 }], itemsCount: 1, nfeNumber: '1', totalInvoice: 1, issuedAt: new Date().toISOString(), supplierStockOrigins: ['normal'] } as any;
    expect(filterInboundInvoicesForReceipt([invoice], '', { mode: 'current_month' } as any)).toHaveLength(1);
    const { container } = render(<InboundInvoiceReceiptItem invoice={invoice} onSelect={vi.fn()} onOpenMapping={vi.fn()} onOpenXml={vi.fn()} />);
    expect(screen.getByText('Em uso')).toBeTruthy();
    const card = container.querySelector('[data-testid="inbound-invoice-receipt-item"]');
    expect(card?.getAttribute('data-state')).toBe('unavailable');
    expect(card?.className).toContain('bg-slate-900/[0.12]');
    expect(screen.getByText('Em uso').className).not.toContain('opacity-40');
    expect(screen.queryByRole('button', { name: 'Usar NF' })).toBeNull();
    expect(screen.queryByText(/Já recebida/i)).toBeNull();
    expect(screen.queryByText('Vinculação incompleta')).toBeNull();
  });

  it('mantém o alerta e o botão Obtenha o XML destacados no card incompleto', () => {
    const onOpenXml = vi.fn();
    const invoice = {
      id: 'incomplete',
      status: 'pending',
      nfeNumber: '2',
      nfeKey: 'KEY-2',
      emitterName: 'Fornecedor',
      totalInvoice: 1,
      issuedAt: new Date().toISOString(),
      rawXml: '<resNFe />',
      items: [],
      supplierStockOrigins: ['normal'],
    } as any;
    const { container } = render(
      <InboundInvoiceReceiptItem
        invoice={invoice}
        onSelect={vi.fn()}
        onOpenMapping={vi.fn()}
        onOpenXml={onOpenXml}
      />
    );

    const card = container.querySelector('[data-testid="inbound-invoice-receipt-item"]');
    const xmlButton = screen.getByRole('button', { name: 'Obtenha o XML' });
    const warning = screen.getByText('NF incompleta');
    expect(card?.getAttribute('data-state')).toBe('unavailable');
    expect(warning.className).not.toContain('opacity-40');
    expect(xmlButton.parentElement?.contains(warning)).toBe(true);
    expect(warning.compareDocumentPosition(xmlButton) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(xmlButton.className).not.toContain('opacity-40');
    xmlButton.click();
    expect(onOpenXml).toHaveBeenCalledWith(invoice);
  });

  it('não libera a nota quando falta a chave para conferir outros recebimentos', () => {
    render(<InboundInvoiceReceiptItem invoice={{ id: 'i', status: 'pending', items: [{ matchedProductId: 'p' }], nfeNumber: '1', totalInvoice: 1 } as any} onSelect={vi.fn()} onOpenMapping={vi.fn()} onOpenXml={vi.fn()} />);
    expect((screen.getByRole('button', { name: 'Chave indisponível' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('desativa desfazer estorno quando outro recebimento usa a nota', async () => {
    mocks.rpc.mockResolvedValue({ data: [{ fiscal_key: 'ABC123' }], error: null });
    render(<ReceiptsActionsMenu receipt={{ id: 'reversed', status: 'estornado', fiscalKey: 'ab.c-123', items: [] } as any} isOpen onClose={vi.fn()} onOpenDetails={vi.fn()} onUnreverseRequest={vi.fn()} />);
    const button = screen.getByRole('menuitem', { name: /Desfazer Estorno/i }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    await waitFor(() => expect(screen.getByText(/em uso em outro recebimento/)).toBeTruthy());
    expect(button.disabled).toBe(true);
    expect(mocks.rpc).toHaveBeenCalledWith('in_use_goods_receipt_keys', { p_keys: ['ABC123'], p_exclude_receipt_id: 'reversed' });
  });

  it('permite desfazer estorno quando não existe outro recebimento vinculado', async () => {
    mocks.rpc.mockResolvedValue({ data: [], error: null });
    render(<ReceiptsActionsMenu receipt={{ id: 'reversed', status: 'estornado', fiscalKey: 'ABC123', items: [] } as any} isOpen onClose={vi.fn()} onOpenDetails={vi.fn()} onUnreverseRequest={vi.fn()} />);
    const button = screen.getByRole('menuitem', { name: /Desfazer Estorno/i }) as HTMLButtonElement;
    await waitFor(() => expect(button.disabled).toBe(false));
  });

  it('mantém a ação desativada se a consulta falhar', async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { message: 'falhou' } });
    render(<ReceiptsActionsMenu receipt={{ id: 'reversed', status: 'estornado', fiscalKey: 'ABC123', items: [] } as any} isOpen onClose={vi.fn()} onOpenDetails={vi.fn()} onUnreverseRequest={vi.fn()} />);
    await waitFor(() => expect(screen.getByText(/Não foi possível conferir/)).toBeTruthy());
    expect((screen.getByRole('menuitem', { name: /Desfazer Estorno/i }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('traduz a concorrência protegida pelo índice para uma mensagem útil', () => {
    expect(receiptInvoiceConflictError({ code: '23505', message: 'goods_receipts_received_fiscal_key_unique' })?.message).toMatch(/em uso em outro recebimento/);
    expect(receiptInvoiceConflictError({ code: '23505', message: 'outro_indice' })).toBeNull();
  });
});
