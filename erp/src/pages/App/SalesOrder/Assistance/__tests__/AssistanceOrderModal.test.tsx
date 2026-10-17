// @vitest-environment happy-dom
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import AssistanceOrderModal from '../AssistanceOrderModal';
import type Order from '@/pages/types/order.type';

// Mock dependencies
vi.mock('@/pages/utils/supabaseConfig', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        not: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue({ data: [], error: null }),
          })),
        })),
      })),
    })),
  },
}));

vi.mock('@/components/SmartInput', () => ({
  default: ({ label, value, onValueChange, placeholder }: any) => (
    <input
      data-testid={label || 'smart-input'}
      placeholder={placeholder}
      value={value || ''}
      onChange={(e) => onValueChange?.(e.target.value)}
    />
  ),
}));

vi.mock('react-number-format', () => ({
  PatternFormat: ({ onValueChange, format: _format, mask: _mask, ...props }: any) => (
    <input {...props} onChange={(event) => onValueChange?.({ value: event.target.value })} />
  ),
  NumericFormat: ({ onValueChange, ...props }: any) => (
    <input {...props} onChange={(event) => onValueChange?.({ floatValue: Number(event.target.value) })} />
  ),
}));

vi.mock('@/pages/App/SalesOrder/ShippingComponents/Agendamento', () => ({
  default: () => <div data-testid="agendamento-mock" />,
}));

vi.mock('@/components/shared/AddressAutocompleteInput', () => ({
  AddressAutocompleteInput: ({ label, value, onChange, placeholder }: any) => (
    <input
      data-testid={label || 'address-input'}
      placeholder={placeholder}
      value={value || ''}
      onChange={(e) => onChange?.(e.target.value)}
    />
  ),
}));

vi.mock('@/pages/utils/orderHistoryService', () => ({
  subscribeToOrders: vi.fn((cb) => {
    cb([]);
    return () => {};
  }),
  fetchOrderById: vi.fn().mockImplementation(() => Promise.resolve(null)),
  saveOrder: vi.fn().mockImplementation(() => Promise.resolve('new-ast-id')),
  getNoticeFrequency: vi.fn().mockImplementation(() => Promise.resolve({})),
}));

vi.mock('@/pages/utils/settingsService', () => ({
  getSettings: vi.fn(() => ({
    requiredFields: {},
    deliveryHandlingOptions: [],
    pickupHandlingOptions: [],
  })),
}));

vi.mock('@/pages/utils/personService', () => ({
  subscribeToPeople: vi.fn(() => () => {}),
}));

vi.mock('react-toastify', () => ({
  toast: {
    info: vi.fn(),
    success: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
  },
}));

describe('AssistanceOrderModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renderiza o modal de nova assistência avulsa sem seção de vínculo de venda e com título correto', () => {
    render(
      <AssistanceOrderModal
        onClose={vi.fn()}
        onSaveSuccess={vi.fn()}
      />
    );

    // Cabeçalho deve ser Pedido de Assistência Avulso
    expect(screen.getByText('Pedido de Assistência Avulso')).toBeInTheDocument();

    // Não deve existir campo/seção de vincular venda
    expect(screen.queryByText('Vínculo com Venda')).not.toBeInTheDocument();
    expect(screen.queryByText('Pedido de Venda Vinculado')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Selecionar Pedido Original/i })).not.toBeInTheDocument();

    // Seção de cliente
    expect(screen.getByText('Dados do Cliente')).toBeInTheDocument();

    // Seção de atendente principal
    expect(screen.getByText('Atendente Principal')).toBeInTheDocument();

    // Seção de descrição e valores financeiros
    expect(screen.getByText('Detalhes da Assistência')).toBeInTheDocument();
    expect(screen.getByText(/Valor Cobrado do Serviço/i)).toBeInTheDocument();
    expect(screen.getByText(/Custo Interno da Assistência/i)).toBeInTheDocument();

    // Seção de peças e materiais extras
    expect(screen.getByText('Peças e Materiais Utilizados')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Adicionar Item/i })).toBeInTheDocument();

    // Botões de ação
    expect(screen.getByRole('button', { name: /Cancelar/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Finalizar Assistência/i })).toBeInTheDocument();
  });

  it('permite fechar o modal clicando em Cancelar', () => {
    const onClose = vi.fn();
    render(
      <AssistanceOrderModal
        onClose={onClose}
        onSaveSuccess={vi.fn()}
      />
    );

    const cancelButton = screen.getByRole('button', { name: /Cancelar/i });
    fireEvent.click(cancelButton);

    expect(onClose).toHaveBeenCalledOnce();
  });

  it('renderiza modal de assistência vinculada ao receber sourceOrder com card de venda vinculado e seleção de produtos', () => {
    const sourceOrder: Order = {
      id: 'sale-999',
      orderIndex: 10045,
      orderCode: '010045',
      orderType: 'sale',
      status: 'fulfilled',
      date: '2026-10-10',
      seller: 'Vendedora Ana',
      customerData: {
        id: 'cust-1',
        fullName: 'Carlos Eduardo',
        phone: '41988887777',
        noPhone: false,
        fullAddress: {
          cep: '80000-000',
          street: 'Rua das Flores',
          number: '123',
          neighborhood: 'Centro',
          city: 'Curitiba',
          state: 'PR',
        },
      },
      items: [
        {
          productId: 'prod-1',
          description: 'Sofá Retrátil 3 Lugares',
          quantity: 2,
          unitPrice: 2500,
          unitDiscount: 0,
          discountType: 'fixed',
          handlingType: 'Standard',
        },
      ],
      paymentsSummary: {
        totalOrderValue: 5000,
        totalPaymentsFee: 0,
        totalAmountPaid: 5000,
        amountRemaining: 0,
      },
    } as unknown as Order;

    render(
      <AssistanceOrderModal
        sourceOrder={sourceOrder}
        onClose={vi.fn()}
        onSaveSuccess={vi.fn()}
      />
    );

    // Cabeçalho deve ser Nova Assistência Vinculada com badge do pedido
    expect(screen.getByText('Nova Assistência Vinculada')).toBeInTheDocument();
    expect(screen.getByText(/Venda #010045/i)).toBeInTheDocument();

    // Card do Pedido Vinculado deve estar visível com informações da venda
    expect(screen.getByText('Pedido de Venda Vinculado')).toBeInTheDocument();
    expect(screen.getByText(/#010045 — Carlos Eduardo/i)).toBeInTheDocument();
    expect(screen.getByText(/Vendedor: Vendedora Ana/i)).toBeInTheDocument();

    // Itens da venda devem estar listados para seleção
    expect(screen.getByText('Sofá Retrátil 3 Lugares')).toBeInTheDocument();
    expect(screen.getByText(/Qtd na Venda: 2/i)).toBeInTheDocument();

    // Clicar no item para selecioná-lo
    const itemCard = screen.getByText('Sofá Retrátil 3 Lugares').closest('div[class*="rounded-2xl"]');
    expect(itemCard).not.toBeNull();
    if (itemCard) fireEvent.click(itemCard);

    // Deve exibir o seletor de quantidade
    expect(screen.getByRole('button', { name: /Aumentar quantidade/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Diminuir quantidade/i })).toBeInTheDocument();
  });

  it('renderiza modal de edição de assistência vinculada preservando dados', () => {
    const existingLinkedOrder: Order = {
      id: 'ast-1',
      orderCode: 'AST-01',
      orderType: 'assistance',
      status: 'scheduled',
      date: '2026-10-15',
      linkedOrderId: 'sale-888',
      seller: 'Vendedor João',
      customerData: {
        id: 'c-1',
        fullName: 'Cliente Com Vínculo',
        phone: '41999990000',
        noPhone: false,
        fullAddress: {
          cep: '80000-000',
          street: 'Rua Central',
          number: '50',
          neighborhood: 'Batel',
          city: 'Curitiba',
          state: 'PR',
        },
      },
      assistanceDescription: 'Ajuste de corrediça',
      items: [],
      assistanceItems: [
        {
          id: 'item-1',
          description: 'Armário Multiuso',
          quantity: 1,
          originalOrderId: 'sale-888',
        },
      ],
      paymentsSummary: {
        totalOrderValue: 0,
        totalPaymentsFee: 0,
        totalAmountPaid: 0,
        amountRemaining: 0,
      },
    } as unknown as Order;

    render(
      <AssistanceOrderModal
        order={existingLinkedOrder}
        onClose={vi.fn()}
        onSaveSuccess={vi.fn()}
      />
    );

    // Deve exibir o cabeçalho de edição vinculada
    expect(screen.getByText('Editar Assistência Vinculada')).toBeInTheDocument();
  });

  it('permite fechar o modal pressionando a tecla Escape quando não estiver ocupado', () => {
    const onClose = vi.fn();
    render(
      <AssistanceOrderModal
        onClose={onClose}
        onSaveSuccess={vi.fn()}
      />
    );

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledOnce();
  });
});

