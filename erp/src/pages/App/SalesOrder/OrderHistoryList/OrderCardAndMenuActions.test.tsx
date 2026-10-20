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

  it.each(['table', 'card'])('abre a confirmação física pelo menu da coleta agendada (%s)', (layout) => {
    const order = { ...baseOrder, orderType: 'return', returnMethod: 'store_collection' };
    const props = { order, onEdit: vi.fn(), onDelete: vi.fn(), onRestore: vi.fn(), onPermanentDelete: vi.fn(), onAction: vi.fn(), onStatusUpdate: vi.fn() };
    render(layout === 'card' ? <MemoryRouter><OrderHistoryCard {...props} /></MemoryRouter> : <OrderOptionsMenu {...props} />);
    fireEvent.click(screen.getByTitle('Mais ações e opções de envio'));
    expect(props.onStatusUpdate).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar coleta', exact: true }));
    expect(props.onStatusUpdate).toHaveBeenCalledTimes(1);
    expect(props.onStatusUpdate).toHaveBeenCalledWith(order.id, 'fulfilled');
    expect(props.onAction).not.toHaveBeenCalled();
    expect(document.querySelector('.portal-menu-container')).toBeNull();
  });

  it.each([
    { status: 'fulfilled', orderType: 'return', returnMethod: 'store_collection' },
    { status: 'cancelled', orderType: 'return', returnMethod: 'store_collection' },
    { status: 'draft', orderType: 'return', returnMethod: 'store_collection' },
    { status: 'scheduled', orderType: 'return', returnMethod: 'store_delivery' },
    { status: 'scheduled', orderType: 'return', returnMethod: undefined },
    { status: 'scheduled', orderType: 'sale', returnMethod: 'store_collection' },
  ])('não oferece nova confirmação fora da coleta agendada: %j', (state) => {
    render(<OrderOptionsMenu order={{ ...baseOrder, ...state }} onEdit={vi.fn()} onDelete={vi.fn()} onRestore={vi.fn()} onPermanentDelete={vi.fn()} onAction={vi.fn()} onStatusUpdate={vi.fn()} />);
    fireEvent.click(screen.getByTitle(state.status === 'cancelled' ? 'Mais opções (Duplicar pedido)' : 'Mais ações e opções de envio'));
    expect(screen.queryByRole('button', { name: 'Confirmar coleta', exact: true })).toBeNull();
  });

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

  it('fecha o menu após mudança de status e permite reabrir as opções do pedido cancelado', () => {
    const props = { order: baseOrder, onEdit: vi.fn(), onDelete: vi.fn(), onRestore: vi.fn(), onPermanentDelete: vi.fn(), onAction: vi.fn(), onStatusUpdate: vi.fn() };
    const view = render(<OrderOptionsMenu {...props} />);
    fireEvent.click(screen.getByTitle('Mais ações e opções de envio'));
    expect(document.querySelector('.portal-menu-container')).toBeTruthy();
    view.rerender(<OrderOptionsMenu {...props} order={{ ...baseOrder, status: 'cancelled' }} />);
    expect(document.querySelector('.portal-menu-container')).toBeNull();
    fireEvent.click(screen.getByTitle('Mais opções (Duplicar pedido)'));
    expect(screen.getByText('Duplicar Pedido')).toBeTruthy();
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

  it('abre o menu sem enviar o formulário que contém o card', () => {
    const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault());
    render(
      <form onSubmit={onSubmit}>
        <OrderOptionsMenu
          order={baseOrder}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
          onRestore={vi.fn()}
          onPermanentDelete={vi.fn()}
          onAction={vi.fn()}
          onStatusUpdate={vi.fn()}
        />
      </form>
    );

    fireEvent.click(screen.getByTitle('Mais ações e opções de envio'));

    expect(screen.getByText('Editar Venda')).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();
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

  it('oculta NFH sem documento de homologação e mantém a emissão de produção no rótulo NF', () => {
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
    expect(screen.queryByText('NFH')).toBeNull();
    expect(onIssueNfe).not.toHaveBeenCalled();

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

  it('renderiza o badge AGENDAMENTO PENDENTE compacto (w-fit) na coluna de entrega quando pendingScheduling=true', () => {
    const pendingOrder = {
      ...baseOrder,
      date: '2026-10-20',
      shipping: {
        deliveryMethod: 'delivery',
        scheduling: {
          pendingScheduling: true,
          time: '14:00',
        },
      },
    };

    render(
      <MemoryRouter>
        <OrderHistoryCard
          order={pendingOrder}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
          onRestore={vi.fn()}
          onPermanentDelete={vi.fn()}
          onAction={vi.fn()}
          onStatusUpdate={vi.fn()}
        />
      </MemoryRouter>
    );

    const badge = screen.getByText('AGENDAMENTO PENDENTE');
    expect(badge).toBeTruthy();
    expect(badge.parentElement?.className).toContain('w-fit');
    expect(badge.parentElement?.className).toContain('bg-orange-500');
    // Garante que há apenas um badge e não um banner duplicado
    expect(screen.getAllByText('AGENDAMENTO PENDENTE')).toHaveLength(1);
    // Não exibe o horário quando pendingScheduling está ativo
    expect(screen.queryByText('14:00')).toBeNull();
  });
});
