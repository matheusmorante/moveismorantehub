import { describe, expect, it, vi, beforeEach } from 'vitest';
import { parseMetaStatusFailure } from '../../../../api/whatsapp-webhook';
import {
  recordWhatsAppDispatch,
  waitForMetaDeliveryConfirmation,
} from '../whatsapp/whatsappDispatchTracker';
import { sendDirectCustomerOrderViaMetaApi } from '../whatsapp/metaDirectSend';
import { clearRecentSendTimestamps } from '../whatsapp/metaDirectSend';
import { whatsappGraphService } from '../whatsappGraphService';
import { getSettings } from '../settingsService';
import { toast } from 'react-toastify';
import Order from '../../types/order.type';

const { channelMock, supabaseMock } = vi.hoisted(() => {
  const channel: any = {};
  channel.on = vi.fn().mockReturnValue(channel);
  channel.subscribe = vi.fn().mockReturnValue(channel);

  const supa = {
    from: vi.fn(),
    channel: vi.fn(() => channel),
    removeChannel: vi.fn(),
  };
  return { channelMock: channel, supabaseMock: supa };
});

vi.mock('@/pages/utils/supabaseConfig', () => ({
  supabase: supabaseMock,
}));

vi.mock('../settingsService', () => ({
  getSettings: vi.fn(),
}));

vi.mock('../whatsappGraphService', () => ({
  whatsappGraphService: {
    sendTemplateMessage: vi.fn(),
    sendTextMessage: vi.fn(),
  },
}));

vi.mock('react-toastify', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
    loading: vi.fn(() => 'toast-test-id'),
    update: vi.fn(),
    dismiss: vi.fn(),
  },
}));

function mockSupabaseQuery(data: any = null, error: any = null) {
  const qb: any = {
    insert: vi.fn().mockResolvedValue({ error }),
    select: vi.fn(),
    eq: vi.fn(),
    maybeSingle: vi.fn().mockResolvedValue({ data, error }),
  };
  qb.select.mockReturnValue(qb);
  qb.eq.mockReturnValue(qb);
  supabaseMock.from.mockReturnValue(qb);
  return qb;
}

describe('parseMetaStatusFailure', () => {
  it('identifica e traduz código 131056 (anti-spam / duplicação rápida)', () => {
    const result = parseMetaStatusFailure([
      {
        code: 131056,
        title: 'Message dropped',
        message: 'Message dropped',
        error_data: { details: 'Message dropped due to spam / rate limit' },
      },
    ]);

    expect(result.errorCode).toBe('131056');
    expect(result.failureReason).toContain('anti-spam');
    expect(result.failureReason).toContain('Message dropped due to spam');
  });

  it('identifica e traduz código 131049 (restrição de integridade ou política)', () => {
    const result = parseMetaStatusFailure([{ code: 131049, title: 'Policy violation' }]);
    expect(result.errorCode).toBe('131049');
    expect(result.failureReason).toContain('restrições de integridade ou política');
  });

  it('identifica e traduz código 131047 (regra 24 horas)', () => {
    const result = parseMetaStatusFailure([{ code: 131047, title: 'Re-engagement message' }]);
    expect(result.errorCode).toBe('131047');
    expect(result.failureReason).toContain('Janela de 24h');
  });

  it('identifica e traduz código 131026 (número sem WhatsApp)', () => {
    const result = parseMetaStatusFailure([{ code: 131026, title: 'Undeliverable' }]);
    expect(result.errorCode).toBe('131026');
    expect(result.failureReason).toContain('Número não encontrado');
  });

  it('retorna null se não houver erros', () => {
    const result = parseMetaStatusFailure([]);
    expect(result.errorCode).toBeNull();
    expect(result.failureReason).toBeNull();
  });
});

describe('whatsappDispatchTracker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('registra o despacho em whatsapp_dispatches com status pending', async () => {
    const qb = mockSupabaseQuery();

    await recordWhatsAppDispatch({
      orderId: '123',
      recipientPhone: '5541999998888',
      messageType: 'order_confirmation',
      messageContent: 'Texto do pedido',
      apiMessageId: 'wamid.HBgL123',
    });

    expect(supabaseMock.from).toHaveBeenCalledWith('whatsapp_dispatches');
    expect(qb.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        order_id: '123',
        recipient_phone: '5541999998888',
        api_message_id: 'wamid.HBgL123',
        status: 'pending',
      })
    );
  });

  it('retorna status delivered quando o banco retorna entrega confirmada', async () => {
    mockSupabaseQuery({ status: 'delivered', failure_reason: null, error_code: null });

    const res = await waitForMetaDeliveryConfirmation('wamid.HBgL123', {
      timeoutMs: 500,
      pollIntervalMs: 50,
    });
    expect(res.status).toBe('delivered');
  });

  it('retorna status failed com motivo quando a Meta rejeita a mensagem', async () => {
    mockSupabaseQuery({
      status: 'failed',
      failure_reason: 'Mensagem descartada pela Meta (anti-spam)',
      error_code: '131056',
    });

    const res = await waitForMetaDeliveryConfirmation('wamid.HBgL123', {
      timeoutMs: 500,
      pollIntervalMs: 50,
    });
    expect(res.status).toBe('failed');
    expect(res.failureReason).toContain('anti-spam');
    expect(res.errorCode).toBe('131056');
  });

  it('retorna timeout após expirar sem confirmação', async () => {
    mockSupabaseQuery({ status: 'pending' });

    const res = await waitForMetaDeliveryConfirmation('wamid.HBgL123', {
      timeoutMs: 80,
      pollIntervalMs: 30,
    });
    expect(res.status).toBe('timeout');
  });
});

describe('sendDirectCustomerOrderViaMetaApi com Webhook Flow', () => {
  const baseOrder = {
    id: 'ord-meta-webhook-1',
    customerData: {
      fullName: 'Cliente Webhook',
      phone: '41988887777',
      fullAddress: { street: 'Rua A', number: '10' },
    },
    shipping: {
      deliveryMethod: 'delivery',
      scheduling: { date: '2026-10-30', type: 'fixed', time: '14:00' },
    },
    items: [{ id: '1', description: 'Item 1', quantity: 1, unitPrice: 100 }],
    paymentsSummary: { totalOrderValue: 100 },
  } as unknown as Order;

  beforeEach(() => {
    vi.clearAllMocks();
    clearRecentSendTimestamps();
    (getSettings as any).mockReturnValue({
      companyPhone: '(41) 99749-3547',
      whatsappConfig: {
        accessToken: 'valid-meta-token',
        phoneNumberId: '10987654321',
      },
    });
  });

  it('exibe toast.loading, aguarda webhook e atualiza para sucesso quando entregue', async () => {
    (whatsappGraphService.sendTextMessage as any).mockResolvedValue({
      messaging_product: 'whatsapp',
      messages: [{ id: 'wamid.HBgL_SUCCESS' }],
    });

    mockSupabaseQuery({ status: 'delivered' });

    const success = await sendDirectCustomerOrderViaMetaApi(baseOrder);

    expect(success).toBe(true);
    expect(toast.loading).toHaveBeenCalledWith(
      expect.stringContaining('Enviando via Cloud WhatsApp e aguardando confirmação')
    );
    expect(toast.update).toHaveBeenCalledWith(
      'toast-test-id',
      expect.objectContaining({
        type: 'success',
        render: expect.stringContaining('com sucesso'),
      })
    );
  });

  it('exibe toast.loading, aguarda webhook e atualiza para toast de erro se a Meta descartar a mensagem (spam/rejeição)', async () => {
    (whatsappGraphService.sendTextMessage as any).mockResolvedValue({
      messaging_product: 'whatsapp',
      messages: [{ id: 'wamid.HBgL_SPAM_DROP' }],
    });

    mockSupabaseQuery({
      status: 'failed',
      failure_reason:
        'Mensagem descartada pela Meta (proteção anti-spam ou envio repetido). Aguarde 1 minuto.',
      error_code: '131056',
    });

    const success = await sendDirectCustomerOrderViaMetaApi(baseOrder);

    expect(success).toBe(false);
    expect(toast.loading).toHaveBeenCalledWith(
      expect.stringContaining('Enviando via Cloud WhatsApp e aguardando confirmação')
    );
    expect(toast.update).toHaveBeenCalledWith(
      'toast-test-id',
      expect.objectContaining({
        type: 'error',
        render: expect.stringContaining('Falha na entrega'),
      })
    );
  });

  it('quando o webhook reporta falha por janela de 24h (131047) e há template configurado, aciona automaticamente o fallback para o modelo aprovado e atualiza para sucesso', async () => {
    (getSettings as any).mockReturnValue({
      companyPhone: '(41) 99749-3547',
      whatsappConfig: {
        accessToken: 'valid-meta-token',
        phoneNumberId: '10987654321',
        templateNameOrderConfirmation: 'envio_de_pedido',
        templateLanguage: 'pt_BR',
        templateVariableCount: 7,
      },
    });

    (whatsappGraphService.sendTextMessage as any).mockResolvedValue({
      messaging_product: 'whatsapp',
      messages: [{ id: 'wamid.HBgL_INITIAL_TEXT' }],
    });

    (whatsappGraphService.sendTemplateMessage as any).mockResolvedValue({
      messaging_product: 'whatsapp',
      messages: [{ id: 'wamid.HBgL_TEMPLATE_FALLBACK' }],
    });

    let callCount = 0;
    const qb: any = {
      insert: vi.fn().mockResolvedValue({ error: null }),
      select: vi.fn(),
      eq: vi.fn(),
      maybeSingle: vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount <= 1) {
          return Promise.resolve({
            data: {
              status: 'failed',
              error_code: '131047',
              failure_reason:
                'Janela de 24h fechada. É obrigatório o uso de modelo de mensagem aprovado. Detalhes: Message failed to send because more than 24 hours have passed since the customer last replied to this number.',
            },
            error: null,
          });
        }
        return Promise.resolve({
          data: { status: 'delivered', error_code: null, failure_reason: null },
          error: null,
        });
      }),
    };
    qb.select.mockReturnValue(qb);
    qb.eq.mockReturnValue(qb);
    supabaseMock.from.mockReturnValue(qb);

    const success = await sendDirectCustomerOrderViaMetaApi(baseOrder);

    expect(success).toBe(true);
    expect(whatsappGraphService.sendTemplateMessage).toHaveBeenCalledWith(
      '41988887777',
      'envio_de_pedido',
      expect.any(Array),
      'pt_BR'
    );
    expect(toast.update).toHaveBeenCalledWith(
      'toast-test-id',
      expect.objectContaining({
        type: 'success',
        render: expect.stringContaining('via modelo aprovado'),
      })
    );
  });

  it('quando o webhook reporta falha por janela de 24h (131047) e não há template configurado, alerta sobre modelo e abre WhatsApp Web', async () => {
    const originalWindow = (globalThis as any).window;
    const openMock = vi.fn();
    (globalThis as any).window = { open: openMock };

    (getSettings as any).mockReturnValue({
      companyPhone: '(41) 99749-3547',
      whatsappConfig: {
        accessToken: 'valid-meta-token',
        phoneNumberId: '10987654321',
        templateNameOrderConfirmation: '',
      },
    });

    (whatsappGraphService.sendTextMessage as any).mockResolvedValue({
      messaging_product: 'whatsapp',
      messages: [{ id: 'wamid.HBgL_INITIAL_TEXT' }],
    });

    mockSupabaseQuery({
      status: 'failed',
      error_code: '131047',
      failure_reason:
        'Janela de 24h fechada. É obrigatório o uso de modelo de mensagem aprovado.',
    });

    const success = await sendDirectCustomerOrderViaMetaApi(baseOrder);

    expect(success).toBe(false);
    expect(toast.update).toHaveBeenCalledWith(
      'toast-test-id',
      expect.objectContaining({
        type: 'warning',
        render: expect.stringContaining('Janela de 24h fechada'),
      })
    );
    expect(openMock).toHaveBeenCalledWith(
      expect.stringContaining('https://wa.me/41988887777'),
      '_blank'
    );

    (globalThis as any).window = originalWindow;
  });
});
