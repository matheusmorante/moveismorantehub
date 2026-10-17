// @vitest-environment happy-dom
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act, cleanup } from '@testing-library/react';
import OrderSelectionModal from './OrderSelectionModal';
import Order from '@/pages/types/order.type';

describe('OrderSelectionModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  const createMockOrder = (
    id: string,
    customerName: string,
    status: Order['status'] = 'fulfilled',
    orderType: Order['orderType'] = 'sale',
    totalValue = 500,
    orderIndex = Number(id) || 1
  ): Order =>
    ({
      id,
      orderIndex,
      orderNumber: orderIndex,
      date: '2026-10-15',
      orderType,
      status,
      deleted: false,
      customerData: {
        id: `c-${id}`,
        fullName: customerName,
        phone: '41999999999',
        noPhone: false,
        fullAddress: {
          cep: '80000-000',
          street: 'Rua das Flores',
          number: '100',
          neighborhood: 'Centro',
          city: 'Curitiba',
          state: 'PR',
        },
      },
      seller: 'Vendedor Teste',
      items: [
        {
          productId: `prod-${id}`,
          description: `Produto ${id}`,
          quantity: 1,
          unitPrice: totalValue,
          discountType: 'fixed',
          handlingType: 'Standard',
        },
      ],
      paymentsSummary: {
        totalOrderValue: totalValue,
        totalPaymentsFee: 0,
        totalAmountPaid: totalValue,
        amountRemaining: 0,
      },
    } as unknown as Order);

  it('exibe estritamente pedidos de venda atendidos, ignorando orçamentos, devoluções, assistências e vendas não atendidas', () => {
    const orders: Order[] = [
      createMockOrder('1', 'Cliente Venda Atendida 1', 'fulfilled', 'sale'),
      createMockOrder('2', 'Cliente Venda Atendida 2', 'atendido', 'sale'),
      createMockOrder('3', 'Cliente Venda Entregue', 'delivered', 'sale'),
      createMockOrder('4', 'Cliente Venda Retirada', 'retirado', 'sale'),
      // Devem ser ignorados:
      createMockOrder('5', 'Cliente Orçamento', 'fulfilled', 'budget'),
      createMockOrder('6', 'Cliente Devolução', 'fulfilled', 'return'),
      createMockOrder('7', 'Cliente Assistência', 'fulfilled', 'assistance'),
      createMockOrder('8', 'Cliente Venda Agendada', 'scheduled', 'sale'),
      createMockOrder('9', 'Cliente Venda Rascunho', 'draft', 'sale'),
      createMockOrder('10', 'Cliente Venda Cancelada', 'cancelled', 'sale'),
      { ...createMockOrder('11', 'Cliente Deletado', 'fulfilled', 'sale'), deleted: true },
    ];

    render(
      <OrderSelectionModal
        orders={orders}
        onSelect={vi.fn()}
        onClose={vi.fn()}
      />
    );

    // Deve exibir apenas os 4 pedidos de venda atendidos
    expect(screen.getByText('Cliente Venda Atendida 1')).toBeInTheDocument();
    expect(screen.getByText('Cliente Venda Atendida 2')).toBeInTheDocument();
    expect(screen.getByText('Cliente Venda Entregue')).toBeInTheDocument();
    expect(screen.getByText('Cliente Venda Retirada')).toBeInTheDocument();

    // Os demais não devem existir no documento
    expect(screen.queryByText('Cliente Orçamento')).not.toBeInTheDocument();
    expect(screen.queryByText('Cliente Devolução')).not.toBeInTheDocument();
    expect(screen.queryByText('Cliente Assistência')).not.toBeInTheDocument();
    expect(screen.queryByText('Cliente Venda Agendada')).not.toBeInTheDocument();
    expect(screen.queryByText('Cliente Venda Rascunho')).not.toBeInTheDocument();
    expect(screen.queryByText('Cliente Venda Cancelada')).not.toBeInTheDocument();
    expect(screen.queryByText('Cliente Deletado')).not.toBeInTheDocument();

    // Contagem da paginação
    expect(screen.getByText(/Exibindo/)).toBeInTheDocument();
    expect(screen.getByText('1-4')).toBeInTheDocument();
    expect(screen.getByText('4', { selector: 'span.font-extrabold' })).toBeInTheDocument();
    expect(screen.getByText(/\(15 por página\)/)).toBeInTheDocument();
  });

  it('paginação exibe exatamente 15 itens por página e permite navegar pelas páginas', () => {
    // Cria 35 pedidos de venda atendidos
    const orders: Order[] = Array.from({ length: 35 }, (_, idx) => {
      const num = String(idx + 1).padStart(3, '0');
      return createMockOrder(num, `Cliente Teste ${num}`, 'fulfilled', 'sale', 100 * (idx + 1), idx + 1);
    });

    render(
      <OrderSelectionModal
        orders={orders}
        onSelect={vi.fn()}
        onClose={vi.fn()}
      />
    );

    // Página 1: Exibindo 1-15 de 35 pedidos
    expect(screen.getByText('1-15')).toBeInTheDocument();
    expect(screen.getByText('35')).toBeInTheDocument();
    expect(screen.getByText('(15 por página)')).toBeInTheDocument();

    // Botão da página 2 deve existir
    const page2Button = screen.getByRole('button', { name: 'Página 2' });
    expect(page2Button).toBeInTheDocument();

    // Navega para página 2
    fireEvent.click(page2Button);

    // Página 2: Exibindo 16-30 de 35 pedidos
    expect(screen.getByText('16-30')).toBeInTheDocument();

    // Botão da página 3 deve existir
    const page3Button = screen.getByRole('button', { name: 'Página 3' });
    expect(page3Button).toBeInTheDocument();

    // Navega para página 3
    fireEvent.click(page3Button);

    // Página 3: Exibindo 31-35 de 35 pedidos
    expect(screen.getByText('31-35')).toBeInTheDocument();
  });

  it('filtra por busca de código e nome do cliente com debounce', async () => {
    vi.useFakeTimers();

    const orders: Order[] = [
      createMockOrder('100', 'Carlos Ferreira', 'fulfilled', 'sale', 500, 100),
      createMockOrder('101', 'Ana Beatriz', 'fulfilled', 'sale', 600, 101),
      createMockOrder('102', 'Marcos Carlos Silva', 'fulfilled', 'sale', 700, 102),
    ];

    render(
      <OrderSelectionModal
        orders={orders}
        onSelect={vi.fn()}
        onClose={vi.fn()}
      />
    );

    const input = screen.getByPlaceholderText(/Buscar por Código ou Nome do Cliente/i);

    // Digita "Carlos"
    fireEvent.change(input, { target: { value: 'Carlos' } });
    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(screen.getByText('Carlos Ferreira')).toBeInTheDocument();
    expect(screen.getByText('Marcos Carlos Silva')).toBeInTheDocument();
    expect(screen.queryByText('Ana Beatriz')).not.toBeInTheDocument();

    // Digita código "101"
    fireEvent.change(input, { target: { value: '101' } });
    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(screen.getByText('Ana Beatriz')).toBeInTheDocument();
    expect(screen.queryByText('Carlos Ferreira')).not.toBeInTheDocument();

    vi.useRealTimers();
  });

  it('dispara onSelect ao clicar em Selecionar em um pedido', () => {
    const onSelect = vi.fn();
    const orders: Order[] = [
      createMockOrder('10', 'Cliente Alvo', 'fulfilled', 'sale', 899, 10),
    ];

    render(
      <OrderSelectionModal
        orders={orders}
        onSelect={onSelect}
        onClose={vi.fn()}
      />
    );

    const selectButton = screen.getByRole('button', { name: /Selecionar/i });
    fireEvent.click(selectButton);

    expect(onSelect).toHaveBeenCalledOnce();
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: '10' }));
  });

  it('suporta modo de busca remota paginada via fetchPage prop', async () => {
    const mockFetchPage = vi.fn().mockResolvedValue({
      orders: [createMockOrder('200', 'Cliente Remoto Atendido', 'fulfilled', 'sale', 950, 200)],
      total: 1,
    });

    render(
      <OrderSelectionModal
        onSelect={vi.fn()}
        onClose={vi.fn()}
        fetchPage={mockFetchPage}
      />
    );

    await waitFor(() => {
      expect(mockFetchPage).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 1,
          pageSize: 15,
        })
      );
    });

    await waitFor(() => {
      expect(screen.getByText('Cliente Remoto Atendido')).toBeInTheDocument();
    });
  });
});
