// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type Order from '@/pages/types/order.type';
import {
  sendDirectWarrantyTermViaMetaApi,
  clearWarrantyRecentSendTimestamps,
} from '../warrantyWhatsAppService';
import { whatsappGraphService } from '@/pages/utils/whatsappGraphService';
import { getSettings } from '@/pages/utils/settingsService';
import { toast } from 'react-toastify';
import { supabase } from '@/pages/utils/supabaseConfig';
import * as dispatchTracker from '@/pages/utils/whatsapp/whatsappDispatchTracker';

const { supabaseMock } = vi.hoisted(() => {
  const supa = {
    from: vi.fn(),
  };
  return { supabaseMock: supa };
});

vi.mock('@/pages/utils/supabaseConfig', () => ({
  supabase: supabaseMock,
}));

vi.mock('@/pages/utils/settingsService', () => ({
  getSettings: vi.fn(),
}));

vi.mock('@/pages/utils/whatsappGraphService', () => ({
  whatsappGraphService: {
    sendDocumentMessage: vi.fn(),
  },
}));

vi.mock('react-toastify', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
    loading: vi.fn(() => 'toast-warranty-id'),
    update: vi.fn(),
    dismiss: vi.fn(),
  },
}));

function mockDbQuery(data: any = null, error: any = null) {
  const qb: any = {
    insert: vi.fn().mockResolvedValue({ error }),
    update: vi.fn(),
    select: vi.fn(),
    eq: vi.fn(),
    maybeSingle: vi.fn().mockResolvedValue({ data, error }),
  };
  qb.update.mockReturnValue(qb);
  qb.select.mockReturnValue(qb);
  qb.eq.mockReturnValue(qb);
  supabaseMock.from.mockReturnValue(qb);
  return qb;
}

describe('sendDirectWarrantyTermViaMetaApi', () => {
  const sampleOrder = {
    id: 'ord-warranty-cloud-1',
    customerData: {
      fullName: 'Cliente Garantia',
      phone: '(41) 98888-7777',
    },
  } as unknown as Order;

  const validRecord = {
    id: 'w-record-1',
    order_id: 'ord-warranty-cloud-1',
    document_version: 1,
    file_name: 'termo_v1.pdf',
    file_url: 'https://storage.supabase.com/termo_v1.pdf',
    file_hash_sha256: 'sha256-xyz',
    delivery_status: 'not_sent' as const,
    generated_at: new Date().toISOString(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    clearWarrantyRecentSendTimestamps();
    (getSettings as any).mockReturnValue({
      companyPhone: '(41) 99749-3547',
      whatsappConfig: {
        accessToken: 'valid-meta-token',
        phoneNumberId: '10987654321',
      },
    });
  });

  it('retorna false e alerta se o cliente não tiver telefone válido', async () => {
    const orderNoPhone = {
      ...sampleOrder,
      customerData: { phone: '' },
    } as unknown as Order;

    const result = await sendDirectWarrantyTermViaMetaApi({
      order: orderNoPhone,
      warrantyRecord: validRecord,
    });

    expect(result).toBe(false);
    expect(toast.error).toHaveBeenCalledWith(
      expect.stringContaining('Número de telefone do cliente inválido')
    );
  });

  it('retorna false e alerta se as credenciais da Meta Cloud API estiverem incompletas', async () => {
    (getSettings as any).mockReturnValue({
      whatsappConfig: { accessToken: '', phoneNumberId: '' },
    });

    const result = await sendDirectWarrantyTermViaMetaApi({
      order: sampleOrder,
      warrantyRecord: validRecord,
    });

    expect(result).toBe(false);
    expect(toast.error).toHaveBeenCalledWith(
      expect.stringContaining('Configuração da Meta incompleta')
    );
  });

  it('retorna false e alerta se o telefone for o mesmo número da empresa (auto-envio)', async () => {
    const orderSelfPhone = {
      ...sampleOrder,
      customerData: { phone: '(41) 99749-3547' },
    } as unknown as Order;

    const result = await sendDirectWarrantyTermViaMetaApi({
      order: orderSelfPhone,
      warrantyRecord: validRecord,
    });

    expect(result).toBe(false);
    expect(toast.warning).toHaveBeenCalledWith(
      expect.stringContaining('mesmo número do WhatsApp Business da empresa')
    );
  });

  it('retorna false e alerta se o arquivo PDF não possuir URL pública', async () => {
    const recordNoUrl = {
      ...validRecord,
      file_url: '',
    };

    const result = await sendDirectWarrantyTermViaMetaApi({
      order: sampleOrder,
      warrantyRecord: recordNoUrl,
    });

    expect(result).toBe(false);
    expect(toast.error).toHaveBeenCalledWith(
      expect.stringContaining('URL do documento em PDF não disponível')
    );
  });

  it('bloqueia reenvio do mesmo documento em sequência rápida (< 60s) para prevenir descarte da Meta', async () => {
    mockDbQuery();
    (whatsappGraphService.sendDocumentMessage as any).mockResolvedValue({
      messaging_product: 'whatsapp',
      messages: [{ id: 'wamid.DOC_1' }],
    });
    vi.spyOn(dispatchTracker, 'waitForMetaDeliveryConfirmation').mockResolvedValue({
      status: 'delivered',
    });

    // Primeiro envio
    const first = await sendDirectWarrantyTermViaMetaApi({
      order: sampleOrder,
      warrantyRecord: validRecord,
    });
    expect(first).toBe(true);

    // Segundo envio imediato com o mesmo documento e telefone
    const second = await sendDirectWarrantyTermViaMetaApi({
      order: sampleOrder,
      warrantyRecord: validRecord,
    });
    expect(second).toBe(false);
    expect(toast.error).toHaveBeenCalledWith(
      expect.stringContaining('Envio repetido bloqueado'),
      expect.anything()
    );
  });

  it('executa envio com sucesso e atualiza toast para sucesso quando o webhook confirma a entrega', async () => {
    const qb = mockDbQuery();
    (whatsappGraphService.sendDocumentMessage as any).mockResolvedValue({
      messaging_product: 'whatsapp',
      messages: [{ id: 'wamid.DOC_SUCCESS' }],
    });
    vi.spyOn(dispatchTracker, 'waitForMetaDeliveryConfirmation').mockResolvedValue({
      status: 'delivered',
    });

    const result = await sendDirectWarrantyTermViaMetaApi({
      order: sampleOrder,
      warrantyRecord: validRecord,
    });

    expect(result).toBe(true);
    expect(whatsappGraphService.sendDocumentMessage).toHaveBeenCalledWith(
      '41988887777',
      'https://storage.supabase.com/termo_v1.pdf',
      'termo_v1.pdf',
      expect.stringContaining('Móveis Morante agradece pela sua compra')
    );
    expect(toast.loading).toHaveBeenCalledWith(
      expect.stringContaining('Enviando Termo de Garantia via Cloud WhatsApp')
    );
    expect(toast.update).toHaveBeenCalledWith(
      'toast-warranty-id',
      expect.objectContaining({
        type: 'success',
        render: expect.stringContaining('sucesso'),
      })
    );
    expect(qb.update).toHaveBeenCalled();
  });

  it('atualiza toast para erro explicativo se a Meta descartar o documento via webhook', async () => {
    mockDbQuery();
    (whatsappGraphService.sendDocumentMessage as any).mockResolvedValue({
      messaging_product: 'whatsapp',
      messages: [{ id: 'wamid.DOC_FAILED' }],
    });
    vi.spyOn(dispatchTracker, 'waitForMetaDeliveryConfirmation').mockResolvedValue({
      status: 'failed',
      failureReason: 'Mensagem descartada pela Meta (proteção anti-spam ou envio repetido).',
      errorCode: '131056',
    });

    const result = await sendDirectWarrantyTermViaMetaApi({
      order: sampleOrder,
      warrantyRecord: validRecord,
    });

    expect(result).toBe(false);
    expect(toast.update).toHaveBeenCalledWith(
      'toast-warranty-id',
      expect.objectContaining({
        type: 'error',
        render: expect.stringContaining('Falha na entrega'),
      })
    );
  });
});
