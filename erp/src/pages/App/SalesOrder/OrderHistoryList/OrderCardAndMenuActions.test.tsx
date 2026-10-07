// @vitest-environment happy-dom
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import OrderHistoryCard from './OrderHistoryCard';
import { OrderOptionsMenu } from './OrderOptionsMenu';

vi.mock('@/pages/utils/settingsService', () => ({ getSettings: () => ({}) }));
vi.mock('@/pages/utils/supabaseConfig', () => ({ supabase: {} }));

describe('OrderCardAndMenuActions', () => {
  afterEach(() => {
    cleanup();
    document.body.innerHTML = '';
  });
  const baseOrder = {
    id: 'order-123',
    status: 'scheduled',
    orderType: 'sale',
    customerData: { fullName: 'João da Silva' },
    paymentsSummary: { totalOrderValue: 1500 },
    items: [],
  } as any;

  it('oculta o botão de edição dentro do menu de três pontinhos quando hideEditAction=true', () => {
    render(
      <OrderOptionsMenu
        order={baseOrder}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onRestore={vi.fn()}
        onPermanentDelete={vi.fn()}
        onAction={vi.fn()}
        onStatusUpdate={vi.fn()}
        hideEditAction={true}
      />
    );

    const menuButton = screen.getByTitle('Mais ações e opções de envio');
    fireEvent.click(menuButton);

    expect(screen.queryByText('Editar Venda')).toBeNull();
  });

  it('exibe o botão de edição dentro do menu de três pontinhos quando hideEditAction é falso ou omitido (tabela)', () => {
    render(
      <OrderOptionsMenu
        order={baseOrder}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onRestore={vi.fn()}
        onPermanentDelete={vi.fn()}
        onAction={vi.fn()}
        onStatusUpdate={vi.fn()}
      />
    );

    const menuButton = screen.getByTitle('Mais ações e opções de envio');
    fireEvent.click(menuButton);

    expect(screen.getByText('Editar Venda')).toBeTruthy();
  });

  it('renderiza o botão de editar e os três pontinhos no card com as mesmas dimensões (w-8 h-8)', () => {
    const onEditMock = vi.fn();
    const { container } = render(
      <MemoryRouter>
        <OrderHistoryCard
          order={baseOrder}
          onEdit={onEditMock}
          onDelete={vi.fn()}
          onRestore={vi.fn()}
          onPermanentDelete={vi.fn()}
          onAction={vi.fn()}
          onStatusUpdate={vi.fn()}
        />
      </MemoryRouter>
    );

    const editBtn = screen.getByTitle('Editar pedido');
    const menuBtn = screen.getByTitle('Mais ações e opções de envio');

    expect(editBtn.className).toContain('w-8');
    expect(editBtn.className).toContain('h-8');
    expect(editBtn.className).toContain('rounded-xl');

    expect(menuBtn.className).toContain('w-8');
    expect(menuBtn.className).toContain('h-8');
    expect(menuBtn.className).toContain('rounded-xl');

    // Ao abrir o menu no card, a opção Editar Venda não deve estar duplicada lá dentro
    fireEvent.click(menuBtn);
    expect(screen.queryByText('Editar Venda')).toBeNull();
  });

  it('exibe o rótulo NFH no card mesmo quando não houver nota fiscal de homologação emitida e permite emitir ao clicar', () => {
    const onIssueNfe = vi.fn();
    const onViewFiscalDocument = vi.fn();
    const { rerender } = render(
      <MemoryRouter>
        <OrderHistoryCard
          order={baseOrder}
          fiscalBadgeStatus="not_issued"
          fiscalHmlBadgeStatus="not_issued"
          onEdit={vi.fn()}
          onDelete={vi.fn()}
          onRestore={vi.fn()}
          onPermanentDelete={vi.fn()}
          onAction={vi.fn()}
          onStatusUpdate={vi.fn()}
          onIssueNfe={onIssueNfe}
          onViewFiscalDocument={onViewFiscalDocument}
        />
      </MemoryRouter>
    );

    expect(screen.getByText('NF')).toBeTruthy();
    expect(screen.getByText('NFH')).toBeTruthy();

    fireEvent.click(screen.getByText('NFH'));
    expect(onIssueNfe).toHaveBeenCalledWith(baseOrder, 2);

    fireEvent.click(screen.getByText('NF'));
    expect(onIssueNfe).toHaveBeenCalledWith(baseOrder, 1);

    rerender(
      <MemoryRouter>
        <OrderHistoryCard
          order={baseOrder}
          fiscalBadgeStatus="not_issued"
          fiscalHmlBadgeStatus="issued"
          fiscalHmlDocumentId="hml-doc-123"
          onEdit={vi.fn()}
          onDelete={vi.fn()}
          onRestore={vi.fn()}
          onPermanentDelete={vi.fn()}
          onAction={vi.fn()}
          onStatusUpdate={vi.fn()}
          onIssueNfe={onIssueNfe}
          onViewFiscalDocument={onViewFiscalDocument}
        />
      </MemoryRouter>
    );

    expect(screen.getByText('NF')).toBeTruthy();
    expect(screen.getByText('NFH')).toBeTruthy();
    expect(screen.getByTitle('Nota fiscal de homologação emitida · Abrir documento fiscal')).toBeTruthy();

    fireEvent.click(screen.getByText('NFH'));
    expect(onViewFiscalDocument).toHaveBeenCalledWith('hml-doc-123', 2);
  });
});
