// @vitest-environment happy-dom
import React from 'react';
import { act, fireEvent, render, renderHook, cleanup, screen, waitFor } from '@testing-library/react';
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
import FormFooter from '../components/form/FormFooter';
import Order from '@/pages/types/order.type';
import { fetchOrderById } from '@/pages/utils/orderHistoryService';
import { useOrderEditActions } from '../modals/order-edit-modal/hooks/useOrderEditActions';
import { bindTestArtifactContext, clearTestArtifactContext } from '../../../../../../shared-utils/testing/testArtifactContext';

const { mockUseAuth, mockFormHookOptions, mockFlushDraft } = vi.hoisted(() => ({
  mockUseAuth: vi.fn((): { isAdministrator: boolean } => ({ isAdministrator: false })),
  mockFormHookOptions: vi.fn(),
  mockFlushDraft: vi.fn(),
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

vi.mock('../components/form/SalesOrderFormSection', () => ({
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

vi.mock('../hooks/form-flow/useSalesOrderForm', () => ({
  useSalesOrderForm: (...args: unknown[]) => (mockFormHookOptions(...args), {
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
      flushDraftAutoSave: mockFlushDraft,
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
    mockFormHookOptions.mockClear();
    mockFlushDraft.mockReset().mockResolvedValue(true);
    clearTestArtifactContext();
  });

  afterEach(() => {
    cleanup();
    document.body.style.overflow = 'auto';
  });

  it('OrderEditModal bloqueia o scroll do body (overflow: hidden) e o restaura ao desmontar', async () => {
    document.body.style.overflow = 'scroll';

    const mockOrder: Order = {
      id: 'order-123',
      orderType: 'sale',
      items: [],
    } as any;

    vi.mocked(fetchOrderById).mockResolvedValueOnce(mockOrder);

    const { unmount, container } = render(<OrderEditModal order={mockOrder} onClose={vi.fn()} />);

    // Body scroll deve estar bloqueado com hidden
    expect(document.body.style.overflow).toBe('hidden');

    // Modal deve estar em tela cheia (fixed, inset-0, w-screen, h-screen)
    await waitFor(() => expect(container.firstElementChild?.className).toContain('fixed'));
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

  it('ativa o autosave de rascunhos na edição comum e mantém a conciliação explícita', () => {
    const order = { id: 'order-123', orderType: 'sale', status: 'draft', items: [] } as unknown as Order;
    const editing = render(<OrderEditModal order={order} onClose={vi.fn()} />);
    expect(mockFormHookOptions).toHaveBeenCalledWith(undefined, 'sale', { autoSaveExistingDrafts: true });
    editing.unmount();
    mockFormHookOptions.mockClear();
    render(<OrderEditModal order={order} onClose={vi.fn()} reconciliationMode />);
    expect(mockFormHookOptions).toHaveBeenCalledWith(undefined, 'sale', { autoSaveExistingDrafts: false });
  });

  it('espera a confirmação do autosave antes de fechar uma nova venda', async () => {
    let finish!: (value: boolean) => void;
    mockFlushDraft.mockReturnValueOnce(new Promise<boolean>((resolve) => { finish = resolve; }));
    const onClose = vi.fn();
    render(<NewSaleOrder onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: 'Fechar pedido' }));
    expect(mockFlushDraft).toHaveBeenCalledOnce();
    expect(onClose).not.toHaveBeenCalled();
    await act(async () => { finish(true); });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('mantém a nova venda aberta quando o rascunho não é confirmado', async () => {
    mockFlushDraft.mockResolvedValueOnce(false);
    const onClose = vi.fn();
    render(<NewSaleOrder onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: 'Fechar pedido' }));
    await waitFor(() => expect(mockFlushDraft).toHaveBeenCalledOnce());
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Fechar pedido' })).toBeTruthy();
  });

  it('avisa quando a confirmação do salvamento ainda não chegou', () => {
    render(<FormFooter currentOrder={{ orderType: 'sale' } as Order} totalOrderValue={0}
      isSaving={false} draftAutoSaveStatus="error" showDraftAutoSave
      onCompleteOrder={vi.fn()} currentStep={1} />);
    expect(screen.getByRole('status').textContent).toContain('Não foi possível confirmar o salvamento');
  });

  it('usa o salvamento de rascunho ao salvar a edição e espera sua confirmação', async () => {
    let finish!: (value: string | false) => void;
    const handleSaveOrder = vi.fn(() => new Promise<string | false>((resolve) => { finish = resolve; }));
    const onSaveSuccess = vi.fn();
    const onClose = vi.fn();
    const saveWithFiscalAudit = vi.fn();
    const { result } = renderHook(() => useOrderEditActions({
      effectiveOrder: { id: 'order-123', status: 'draft' } as Order,
      formState: { status: 'draft', isDraftAutoSaveEnabled: true } as any,
      formActions: { handleSaveOrder } as any,
      saveWithFiscalAudit,
      setPendingUpdate: vi.fn(),
      onSaveSuccess,
      onClose,
    }));

    let saving!: Promise<string | false>;
    await act(async () => { saving = result.current.handleUpdate(); });
    expect(onClose).not.toHaveBeenCalled();
    await act(async () => { finish('order-123'); await saving; });
    expect(onSaveSuccess).toHaveBeenCalledWith('order-123');
    expect(onClose).toHaveBeenCalledOnce();
    expect(saveWithFiscalAudit).not.toHaveBeenCalled();
  });

  it('mantém a edição do rascunho aberta se o salvamento falhar', async () => {
    const onClose = vi.fn();
    const onSaveSuccess = vi.fn();
    const { result } = renderHook(() => useOrderEditActions({
      effectiveOrder: { id: 'order-123', status: 'draft' } as Order,
      formState: { status: 'draft', isDraftAutoSaveEnabled: true } as any,
      formActions: { handleSaveOrder: vi.fn().mockResolvedValue(false) } as any,
      saveWithFiscalAudit: vi.fn(),
      setPendingUpdate: vi.fn(),
      onSaveSuccess,
      onClose,
    }));

    await act(async () => { expect(await result.current.handleUpdate()).toBe(false); });
    expect(onSaveSuccess).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('mostra o modo teste somente para administrador com contexto autorizado em nova venda', () => {
    const values = new Map<string, string>();
    Object.defineProperty(globalThis, 'sessionStorage', {
      configurable: true,
      value: {
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => values.set(key, value),
        removeItem: (key: string) => values.delete(key),
      },
    });
    bindTestArtifactContext({
      runId: '550e8400-e29b-41d4-a716-446655440000',
      ownerId: '550e8400-e29b-41d4-a716-446655440001',
    });
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

  it('oculta o modo teste quando a sessão não tem a identidade da execução', () => {
    mockUseAuth.mockReturnValue({ isAdministrator: true });
    const adminView = render(<NewSaleOrder onClose={vi.fn()} />);
    expect(adminView.getByTestId('mock-sales-order-form-section').dataset.showTestMode).toBe(
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
