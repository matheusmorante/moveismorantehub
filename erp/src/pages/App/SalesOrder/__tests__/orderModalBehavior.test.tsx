// @vitest-environment jsdom
import React from 'react';
import { render, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';

if (typeof window !== 'undefined' && !window.URL.createObjectURL) {
  window.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
}

vi.mock('maplibre-gl', () => ({
  default: {
    Map: vi.fn(),
    NavigationControl: vi.fn(),
    setWorkerUrl: vi.fn(),
  },
}));

// Mock dependencies
import OrderEditModal from '../modals/OrderEditModal';
import NewSaleOrder from '../pages/NewSaleOrder';
import Order from '@/pages/types/order.type';

const { mockUseAuth } = vi.hoisted(() => ({
  mockUseAuth: vi.fn((): { isAdministrator: boolean } => ({ isAdministrator: false })),
}));

vi.mock('react-router-dom', () => ({
  useParams: () => ({ id: '123' }),
  useNavigate: () => vi.fn(),
  useSearchParams: () => [new URLSearchParams(), vi.fn()],
}));

vi.mock('@/pages/utils/supabaseConfig', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          single: async () => ({ data: null, error: null }),
          order: () => ({ limit: async () => ({ data: [], error: null }) }),
        }),
        order: () => ({ limit: async () => ({ data: [], error: null }) }),
      }),
      insert: async () => ({ data: null, error: null }),
      update: () => ({ eq: async () => ({ data: null, error: null }) }),
    }),
  },
}));

vi.mock('@/pages/utils/orderHistoryService', () => ({
  updateOrder: vi.fn(),
  fetchOrderById: vi.fn(),
}));

vi.mock('../SalesOrderFormSection', () => ({
  default: (props: any) => (
    <div
      data-testid="mock-sales-order-form-section"
      data-show-test-mode={String(Boolean(props.showTestMode))}
    >
      Form Section
    </div>
  ),
}));

vi.mock('@/context/AuthContext', () => ({ useAuth: mockUseAuth }));

vi.mock('../useSalesOrderForm', () => ({
  useSalesOrderForm: () => ({
    state: {
      currentStep: 1,
      currentOrder: { id: 'order-123', orderType: 'sale' },
      items: [],
      errors: {},
      shipping: { deliveryMethod: 'delivery' },
      payments: [],
    },
    actions: {
      setItems: vi.fn(),
      setPayments: vi.fn(),
      jumpToStep: vi.fn(),
      handleSaveOrder: vi.fn(),
      handleCompleteOrder: vi.fn(),
      setSeller: vi.fn(),
      setCustomerData: vi.fn(),
      loadOrderForEditing: vi.fn(),
    },
  }),
  parseStorageDateToLocal: (d: any) => d,
}));

describe('Etapa 1.6: Modal de pedido em tela cheia e scroll lock [TESTE_AUT]', () => {
  beforeEach(() => {
    document.body.style.overflow = 'auto';
    mockUseAuth.mockReturnValue({ isAdministrator: false });
  });

  afterEach(() => {
    cleanup();
    document.body.style.overflow = 'auto';
  });

  it('OrderEditModal bloqueia o scroll do body (overflow: hidden) e o restaura ao desmontar', () => {
    document.body.style.overflow = 'scroll';

    const mockOrder: Order = {
      id: 'order-123',
      orderType: 'sale',
      items: [],
    } as any;

    const { unmount, container } = render(<OrderEditModal order={mockOrder} onClose={vi.fn()} />);

    // Body scroll deve estar bloqueado com hidden
    expect(document.body.style.overflow).toBe('hidden');

    // Modal deve estar em tela cheia (fixed, inset-0, w-screen, h-screen)
    const modalContainer = container.firstElementChild as HTMLElement;
    expect(modalContainer.className).toContain('fixed');
    expect(modalContainer.className).toContain('inset-0');
    expect(modalContainer.className).toContain('w-screen');
    expect(modalContainer.className).toContain('h-screen');

    unmount();

    // Ao desmontar o modal, restaura overflow anterior
    expect(document.body.style.overflow).toBe('scroll');
  });

  it('NewSaleOrder bloqueia o scroll do body (overflow: hidden) e o restaura ao desmontar', () => {
    document.body.style.overflow = 'auto';

    const { unmount, container } = render(<NewSaleOrder onClose={vi.fn()} />);

    expect(document.body.style.overflow).toBe('hidden');

    const modalContainer = container.firstElementChild as HTMLElement;
    expect(modalContainer.className).toContain('fixed');
    expect(modalContainer.className).toContain('inset-0');
    expect(modalContainer.className).toContain('w-screen');
    expect(modalContainer.className).toContain('h-screen');

    unmount();

    expect(document.body.style.overflow).toBe('auto');
  });

  it('mostra o modo teste somente para administrador em nova venda', () => {
    mockUseAuth.mockReturnValue({ isAdministrator: true });
    const adminView = render(<NewSaleOrder onClose={vi.fn()} />);
    expect(adminView.getByTestId('mock-sales-order-form-section').dataset.showTestMode).toBe(
      'true'
    );
    adminView.unmount();

    mockUseAuth.mockReturnValue({ isAdministrator: false });
    const regularView = render(<NewSaleOrder onClose={vi.fn()} />);
    expect(regularView.getByTestId('mock-sales-order-form-section').dataset.showTestMode).toBe(
      'false'
    );
  });

  it('oculta o modo teste ao editar ou criar outro tipo de pedido', () => {
    mockUseAuth.mockReturnValue({ isAdministrator: true });
    const editingView = render(
      <NewSaleOrder onClose={vi.fn()} initialOrder={{ id: 'sale-1', orderType: 'sale' } as Order} />
    );
    expect(editingView.getByTestId('mock-sales-order-form-section').dataset.showTestMode).toBe(
      'false'
    );
    editingView.unmount();

    const budgetView = render(<NewSaleOrder onClose={vi.fn()} orderType="budget" />);
    expect(budgetView.getByTestId('mock-sales-order-form-section').dataset.showTestMode).toBe(
      'false'
    );
  });
});
