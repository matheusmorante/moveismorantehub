// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type Order from '../../../types/order.type';
import PostOrderActionsModal from './PostOrderActionsModal';

const { mockActionsMap } = vi.hoisted(() => ({
  mockActionsMap: {
    PRINT_SHIPPING_ORDER: vi.fn(),
    SEND_SHIPPING_ORDER: vi.fn(),
    SEND_CUSTOMER_ORDER: vi.fn(),
    PRINT_RECEIPT: vi.fn(),
    PRINT_PROMISSORY_NOTE: vi.fn(),
    ISSUE_NFE: vi.fn(),
    PRINT_WARRANTY_TERM: vi.fn(),
    SEND_GROUP_INVITE: vi.fn(),
    SEND_CUSTOMER_REVIEWS: vi.fn(),
    PRINT_RETURN_OS: vi.fn(),
    SEND_RETURN_OS_CUSTOMER: vi.fn(),
    SEND_RETURN_OS_TEAM: vi.fn(),
    SEND_CUSTOMER_ORDER_DIRECT_API: vi.fn(),
  },
}));

vi.mock('./orderActionsConfig', () => ({
  buttons: [
    { key: 'printShippingOrder', label: 'Imprimir Pedido', icon: 'bi-printer-fill', action: 'PRINT_SHIPPING_ORDER', color: '' },
    { key: 'printReceipt', label: 'Imprimir Recibo', icon: 'bi-receipt', action: 'PRINT_RECEIPT', color: '' },
    { key: 'printPromissoryNote', label: 'Nota Promissória', icon: 'bi-file-earmark-ruled', action: 'PRINT_PROMISSORY_NOTE', color: '' },
    { key: 'issueNfe', label: 'Emissão de NF de saída', icon: 'bi-receipt', action: 'ISSUE_NFE', color: '' },
    { key: 'printWarrantyTerm', label: 'Termo de garantia', icon: 'bi-shield-check', action: 'PRINT_WARRANTY_TERM', color: '' },
    { key: 'sendShippingOrder', label: 'Enviar Entrega para a equipe', icon: 'bi-truck', action: 'SEND_SHIPPING_ORDER', color: '' },
    { key: 'sendCustomerOrder', label: 'Enviar entrega para o cliente', icon: 'bi-whatsapp', action: 'SEND_CUSTOMER_ORDER', color: '' },
    {
      key: 'sendCustomerOrderDirectApi',
      label: 'Enviar para o cliente diretamente (Cloud WhatsApp)',
      icon: 'bi-whatsapp',
      action: 'SEND_CUSTOMER_ORDER_DIRECT_API',
      color: 'amber',
      isBeta: true,
      adminOnly: true,
    },
    { key: 'sendGroupInvite', label: 'Enviar Convite VIP', icon: 'bi-people-fill', action: 'SEND_GROUP_INVITE', color: '' },
    { key: 'sendCustomerReviews', label: 'Enviar pedido de avaliação', icon: 'bi-star-fill', action: 'SEND_CUSTOMER_REVIEWS', color: '' },
    {
      key: 'printReturnOS',
      label: (order: Order) =>
        order.returnMethod === 'store_collection'
          ? 'Imprimir OS de Coleta da Devolução'
          : 'Imprimir Comprovante de Devolução',
      icon: 'bi-printer',
      action: 'PRINT_RETURN_OS',
      color: '',
    },
    { key: 'sendReturnOSCustomer', label: 'Enviar pedido de devolução ao cliente', icon: 'bi-whatsapp', action: 'SEND_RETURN_OS_CUSTOMER', color: '' },
    { key: 'sendReturnOSTeam', label: 'Enviar dados da coleta da devolução para equipe', icon: 'bi-send', action: 'SEND_RETURN_OS_TEAM', color: '' },
  ],
  actionsMap: mockActionsMap,
}));
import { fetchOrderFiscalBadgeStatuses } from '../../../utils/nfe/orderFiscalBadgeService';

vi.mock('../../../utils/orderHistoryService', () => ({ updateOrder: vi.fn() }));
vi.mock('@/pages/utils/supabaseConfig', () => ({
  supabase: {
    rpc: vi.fn(),
    from: vi.fn(),
    storage: { from: vi.fn() },
  },
  supabasePublicUrl: 'https://hkoxhourxwlddgsfdgws.supabase.co',
}));
vi.mock('../../../utils/supabaseConfig', () => ({
  supabase: {
    rpc: vi.fn(),
    from: vi.fn(),
    storage: { from: vi.fn() },
  },
  supabasePublicUrl: 'https://hkoxhourxwlddgsfdgws.supabase.co',
}));
vi.mock('../../../utils/nfe/orderFiscalBadgeService', () => ({
  fetchOrderFiscalBadgeStatuses: vi.fn(() => Promise.resolve({})),
}));
vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    isAdministrator: false,
    isRealAdministrator: false,
    profile: null,
  }),
}));
vi.mock('./NfeEmissionModal', () => ({ NfeEmissionModal: () => null }));
vi.mock('./nfe-modal/NfeEnvironmentChoiceModal', () => ({
  NfeEnvironmentChoiceModal: () => null,
}));
vi.mock('./WarrantyTermModal', () => ({
  default: () => null,
  WarrantyTermModal: () => null,
}));
vi.mock('./PromissoryNoteModal', () => ({
  default: () => null,
  PromissoryNoteModal: () => null,
}));

const returnOrder = {
  id: undefined,
  orderType: 'return',
  status: 'scheduled',
  returnMethod: 'store_collection',
  linkedOrderCode: '000123',
  items: [],
} as unknown as Order;

beforeEach(() => {
  vi.mocked(fetchOrderFiscalBadgeStatuses).mockImplementation(() => Promise.resolve({} as any));
});

describe('ações após cadastro do pedido de devolução', () => {
  afterEach(cleanup);

  it('exibe impressão e WhatsApp, sem oferecer emissão manual da NFD no modal', async () => {
    render(<PostOrderActionsModal order={returnOrder} onClose={vi.fn()} />);

    expect(
      await screen.findByRole('heading', { name: 'Ações após cadastro' })
    ).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Imprimir OS de Coleta da Devolução' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Enviar pedido de devolução ao cliente' })).toBeTruthy();
    expect(
      screen.getByRole('button', { name: 'Enviar dados da coleta da devolução para equipe' })
    ).toBeTruthy();
    expect(screen.queryByRole('button', { name: /emitir.*nota fiscal/i })).toBeNull();
  });

  it('não oferece ação de coleta da equipe quando o cliente já entregou na loja', async () => {
    render(
      <PostOrderActionsModal
        order={{ ...returnOrder, status: 'fulfilled', returnMethod: 'store_delivery' } as Order}
        onClose={vi.fn()}
      />
    );

    expect(await screen.findByRole('heading', { name: 'Ações após cadastro' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Imprimir Comprovante de Devolução' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /coleta.*equipe/i })).toBeNull();
    expect(screen.getByRole('button', { name: 'Enviar pedido de devolução ao cliente' })).toBeTruthy();
  });

  it('não oferece envios de WhatsApp para um artefato de teste', async () => {
    render(
      <PostOrderActionsModal
        order={
          {
            ...returnOrder,
            is_test: true,
          } as Order
        }
        onClose={vi.fn()}
      />
    );

    expect(await screen.findByRole('heading', { name: 'Ações após cadastro' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Imprimir OS de Coleta da Devolução' })).toBeTruthy();
    expect(
      screen.queryByRole('button', { name: 'Enviar pedido de devolução ao cliente' })
    ).toBeNull();
    expect(
      screen.queryByRole('button', { name: 'Enviar dados da coleta da devolução para equipe' })
    ).toBeNull();
  });
});

const saleOrder = {
  id: 'sale-123',
  orderType: 'sale',
  status: 'scheduled',
  orderIndex: 456,
  date: '2026-10-15T12:00:00.000Z',
  customerData: {
    fullName: 'Cliente Venda Teste',
    phone: '11999998888',
  },
  shipping: {
    deliveryMethod: 'delivery',
    deliveryAddress: {
      street: 'Rua das Flores',
      number: '123',
      neighborhood: 'Jardins',
      city: 'São Paulo',
      state: 'SP',
    },
    scheduling: {
      date: '2026-10-20',
      type: 'fixed',
      time: '14:00',
    },
  },
  items: [],
} as unknown as Order;

describe('ações pós-venda do pedido de venda', () => {
  afterEach(cleanup);

  it('não exibe o rótulo de cadastrado no cabeçalho das ações pós-venda', async () => {
    render(<PostOrderActionsModal order={saleOrder} onClose={vi.fn()} />);
    expect(await screen.findByRole('heading', { name: 'Ações Pós-Venda' })).toBeTruthy();
    expect(screen.queryByText(/^cadastrado$/i)).toBeNull();
  });

  it('exibe o botão Informações da Entrega (ou Informações da Retirada) e oculta botões soltos de entrega na grade principal', async () => {
    const { unmount } = render(<PostOrderActionsModal order={saleOrder} onClose={vi.fn()} />);
    expect(screen.getByRole('button', { name: /Informações da Entrega/i })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Imprimir Pedido' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Enviar Entrega para a equipe' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Enviar entrega para o cliente' })).toBeNull();
    unmount();

    const pickupOrder = {
      ...saleOrder,
      shipping: { ...saleOrder.shipping, deliveryMethod: 'pickup' },
    } as Order;
    render(<PostOrderActionsModal order={pickupOrder} onClose={vi.fn()} />);
    expect(screen.getByRole('button', { name: /Informações da Retirada/i })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Informações da Retirada/i }));
    expect(await screen.findByRole('heading', { name: 'Informações da Retirada' })).toBeTruthy();
  });

  it('ao clicar em Informações da Entrega abre o modal sem campos de resumo e executa suas ações', async () => {
    render(<PostOrderActionsModal order={saleOrder} onClose={vi.fn()} isAdministrator={true} />);

    // Abre o modal de Informações da Entrega
    fireEvent.click(screen.getByRole('button', { name: /Informações da Entrega/i }));

    expect(await screen.findByRole('heading', { name: 'Informações da Entrega' })).toBeTruthy();

    // Garante que não há campos com resumo da entrega (endereço/data/cliente) dentro do modal
    expect(screen.queryByText(/Entrega no Endereço/i)).toBeNull();
    expect(screen.queryByText(/Rua das Flores/i)).toBeNull();

    // Verifica os botões de ação dentro do modal
    const sendCustomerBtn = screen.getByRole('button', {
      name: (content) => content.startsWith('Enviar para o Cliente') && !content.includes('Cloud WhatsApp'),
    });
    const sendDirectApiBtn = screen.getByRole('button', { name: /Enviar para o cliente diretamente \(Cloud WhatsApp\)/i });
    const sendTeamBtn = screen.getByRole('button', { name: /Enviar para a Equipe/i });
    const printDeliveryBtn = screen.getByRole('button', { name: /Imprimir informações da entrega/i });

    expect(sendCustomerBtn).toBeTruthy();
    expect(sendDirectApiBtn).toBeTruthy();
    expect(sendTeamBtn).toBeTruthy();
    expect(printDeliveryBtn).toBeTruthy();

    // Executa as ações
    fireEvent.click(sendCustomerBtn);
    await waitFor(() => {
      expect(mockActionsMap.SEND_CUSTOMER_ORDER).toHaveBeenCalledWith(saleOrder);
    });

    fireEvent.click(sendDirectApiBtn);
    await waitFor(() => {
      expect(mockActionsMap.SEND_CUSTOMER_ORDER_DIRECT_API).toHaveBeenCalledWith(saleOrder);
    });

    fireEvent.click(sendTeamBtn);
    await waitFor(() => {
      expect(mockActionsMap.SEND_SHIPPING_ORDER).toHaveBeenCalledWith(saleOrder);
    });

    fireEvent.click(printDeliveryBtn);
    await waitFor(() => {
      expect(mockActionsMap.PRINT_SHIPPING_ORDER).toHaveBeenCalledWith(saleOrder);
    });
  });

  it('exibe o botão de envio direto Cloud WhatsApp dentro do modal como desativado para quem não é administrador', async () => {
    render(<PostOrderActionsModal order={saleOrder} onClose={vi.fn()} isAdministrator={false} />);

    // Abre o modal de Informações da Entrega
    fireEvent.click(screen.getByRole('button', { name: /Informações da Entrega/i }));

    const directApiBtn = screen.getByRole('button', {
      name: /Enviar para o cliente diretamente \(Cloud WhatsApp\)/i,
    });
    expect(directApiBtn).toBeTruthy();
    expect(directApiBtn.hasAttribute('disabled')).toBe(true);
    expect(directApiBtn.getAttribute('title')).toContain('apenas para administradores');
    expect(screen.getAllByText(/^BETA$/i).length).toBeGreaterThan(0);
  });

  it('permite envio direto via Cloud WhatsApp dentro do modal quando o usuário é administrador', async () => {
    render(<PostOrderActionsModal order={saleOrder} onClose={vi.fn()} isAdministrator={true} />);

    // Abre o modal de Informações da Entrega
    fireEvent.click(screen.getByRole('button', { name: /Informações da Entrega/i }));

    const directApiBtn = screen.getByRole('button', {
      name: /Enviar para o cliente diretamente \(Cloud WhatsApp\)/i,
    });
    expect(directApiBtn).toBeTruthy();
    expect(directApiBtn.hasAttribute('disabled')).toBe(false);

    fireEvent.click(directApiBtn);
    await waitFor(() => {
      expect(mockActionsMap.SEND_CUSTOMER_ORDER_DIRECT_API).toHaveBeenCalledWith(saleOrder);
    });
  });

  it('o botão externo Informações da Entrega não recebe check nem borda verde, mas os botões internos do modal recebem', async () => {
    const clickedOrder = {
      ...saleOrder,
      isButtonsClicked: {
        sendCustomerOrder: true,
        printShippingOrder: true,
      },
    } as unknown as Order;

    render(<PostOrderActionsModal order={clickedOrder} onClose={vi.fn()} isAdministrator={true} />);

    // Botão externo não tem ring-emerald-500 nem check
    const outerBtn = screen.getByRole('button', { name: /Informações da Entrega/i });
    expect(outerBtn.className).not.toContain('ring-emerald-500');
    expect(outerBtn.querySelector('.bi-check')).toBeNull();

    // Abre o modal
    fireEvent.click(outerBtn);

    // Botão interno sendCustomerOrder possui borda verde e check
    const sendCustomerBtn = screen.getByRole('button', {
      name: (content) => content.startsWith('Enviar para o Cliente') && !content.includes('Cloud WhatsApp'),
    });
    expect(sendCustomerBtn.className).toContain('border-emerald-500');
    expect(sendCustomerBtn.className).toContain('ring-emerald-500');
    expect(sendCustomerBtn.querySelector('.bi-check')).toBeTruthy();

    // Botão interno printShippingOrder possui borda verde e check
    const printDeliveryBtn = screen.getByRole('button', { name: /Imprimir informações da entrega/i });
    expect(printDeliveryBtn.className).toContain('border-emerald-500');
    expect(printDeliveryBtn.className).toContain('ring-emerald-500');
    expect(printDeliveryBtn.querySelector('.bi-check')).toBeTruthy();

    // Botão interno sendShippingOrder (não clicado) não possui borda verde nem check
    const sendTeamBtn = screen.getByRole('button', { name: /Enviar para a Equipe/i });
    expect(sendTeamBtn.className).not.toContain('border-emerald-500');
    expect(sendTeamBtn.querySelector('.bi-check')).toBeNull();
  });

  it('desativa o scroll da página de fundo (body e html) enquanto o modal estiver aberto e restaura ao fechar', () => {
    const { unmount } = render(
      <PostOrderActionsModal order={saleOrder} onClose={vi.fn()} isAdministrator={false} />
    );

    expect(document.body.style.overflow).toBe('hidden');
    expect(document.documentElement.style.overflow).toBe('hidden');

    unmount();

    expect(document.body.style.overflow).toBe('');
    expect(document.documentElement.style.overflow).toBe('');
  });

  it('não exibe o botão de Nota Promissória se a venda não possuir pagamento com forma promissória', () => {
    const orderWithoutPromissory = {
      ...saleOrder,
      payments: [
        { method: 'Dinheiro', amount: 500 },
        { method: 'Cartão de crédito', amount: 1500 },
      ],
    } as unknown as Order;

    render(<PostOrderActionsModal order={orderWithoutPromissory} onClose={vi.fn()} />);
    expect(screen.queryByRole('button', { name: /Nota Promissória/i })).toBeNull();
  });

  it('exibe o botão de Nota Promissória e executa a ação apenas quando houver pagamento com forma promissória', async () => {
    const orderWithPromissory = {
      ...saleOrder,
      payments: [
        { method: 'Dinheiro', amount: 500 },
        { method: 'Cartão de crédito', amount: 1500 },
        { method: 'Nota promissória', amount: 1000 },
      ],
    } as unknown as Order;

    render(<PostOrderActionsModal order={orderWithPromissory} onClose={vi.fn()} />);
    const promissoryBtn = screen.getByRole('button', { name: /Nota Promissória/i });
    expect(promissoryBtn).toBeTruthy();

    fireEvent.click(promissoryBtn);
    await waitFor(() => {
      expect(mockActionsMap.PRINT_PROMISSORY_NOTE).toHaveBeenCalledWith(orderWithPromissory);
    });
  });
});



