// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type Order from '@/pages/types/order.type';
import {
  prepareWarrantyBackendValidation,
  fetchWarrantyTermsByOrderId,
  generateAndSaveWarrantyTerm,
  sendWarrantyTermWhatsApp,
  WARRANTY_WHATSAPP_MESSAGE,
} from '../warrantyTermService';

const mockRpc = vi.fn();
const mockFrom = vi.fn();
const mockUpload = vi.fn();
const mockGetPublicUrl = vi.fn();

vi.mock('@/pages/utils/supabaseConfig', () => ({
  supabase: {
    rpc: (...args: any[]) => mockRpc(...args),
    from: (...args: any[]) => mockFrom(...args),
    storage: {
      from: () => ({
        upload: mockUpload,
        getPublicUrl: mockGetPublicUrl,
      }),
    },
  },
  supabasePublicUrl: 'https://hkoxhourxwlddgsfdgws.supabase.co',
}));

vi.mock('@/pages/utils/settingsService', () => ({
  getSettings: () => ({
    companyName: 'Móveis Morante',
    companyCnpj: '44.512.248.0001/07',
    companyPhone: '(41) 99749-3547',
    companyAddress: 'R. Cascavel, 306 - Guaraituba, Colombo - PR, 83410-270',
    whatsappConfig: {
      sendMode: 'wame',
      phoneNumberId: '1020981007772705',
      accessToken: 'MOCK_TOKEN',
    },
  }),
}));

if (!globalThis.URL.createObjectURL) {
  globalThis.URL.createObjectURL = vi.fn(() => 'blob:http://localhost/mock-warranty-pdf');
}

describe('Warranty Term Service — MoranteHub', () => {
  const sampleOrder = {
    id: 'ord-service-test-1',
    orderNumber: 2001,
    orderIndex: 2001,
    orderType: 'sale',
    status: 'scheduled',
    date: '2026-10-15',
    seller: 'Vendedor Morante',
    customerData: {
      id: 'cust-1',
      fullName: 'Mariana Souza',
      phone: '(41) 99123-4567',
      cpfCnpj: '000.111.222-33',
    },
    items: [
      { orderItemId: 'item-1', description: 'Sofá Retrátil 3 Lugares Suede', quantity: 1, unitPrice: 2100 },
    ],
    itemsSummary: { totalQuantity: 1 },
    shipping: {},
    payments: [],
    paymentsSummary: {},
    observation: '',
  } as unknown as Order;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('prepareWarrantyBackendValidation', () => {
    it('chama a RPC prepare_warranty_term com o orderId correto', async () => {
      mockRpc.mockResolvedValue({
        data: {
          order_id: 'ord-service-test-1',
          order_number: '2001',
          status: 'scheduled',
          order_type: 'sale',
          date: '2026-10-15',
          next_version: 1,
        },
        error: null,
      });

      const res = await prepareWarrantyBackendValidation('ord-service-test-1');
      expect(mockRpc).toHaveBeenCalledWith('prepare_warranty_term', {
        p_order_id: 'ord-service-test-1',
      });
      expect(res.next_version).toBe(1);
    });

    it('repassa erro se a RPC rejeitar pedidos em rascunho', async () => {
      mockRpc.mockResolvedValue({
        data: null,
        error: { message: 'ORDER_IS_DRAFT: O Termo de Garantia não pode ser emitido para pedidos em rascunho.' },
      });

      await expect(prepareWarrantyBackendValidation('ord-draft')).rejects.toThrow('ORDER_IS_DRAFT');
    });
  });

  describe('generateAndSaveWarrantyTerm', () => {
    it('executa o fluxo completo: validação RPC, geração PDF, storage e insert no banco', async () => {
      mockRpc.mockResolvedValue({
        data: {
          order_id: sampleOrder.id,
          order_number: '2001',
          status: 'scheduled',
          order_type: 'sale',
          next_version: 1,
        },
        error: null,
      });

      mockUpload.mockResolvedValue({ data: { path: 'ord-service-test-1/termo_garantia_v1.pdf' }, error: null });
      mockGetPublicUrl.mockReturnValue({
        data: { publicUrl: 'https://hkoxhourxwlddgsfdgws.supabase.co/storage/v1/object/public/warranty-terms/ord-service-test-1/termo_garantia_v1.pdf' },
      });

      const insertedRecord = {
        id: 'w-rec-1',
        order_id: sampleOrder.id,
        customer_id: 'cust-1',
        customer_name: 'Mariana Souza',
        customer_phone: '(41) 99123-4567',
        document_version: 1,
        file_name: 'termo_garantia_pedido_2001_v1.pdf',
        file_path: 'ord-service-test-1/termo_garantia_v1.pdf',
        file_url: 'https://hkoxhourxwlddgsfdgws.supabase.co/storage/v1/object/public/warranty-terms/ord-service-test-1/termo_garantia_v1.pdf',
        file_hash_sha256: 'mockhash1234567890abcdef',
        delivery_status: 'not_sent',
        generated_at: new Date().toISOString(),
      };

      const mockSingle = vi.fn().mockResolvedValue({ data: insertedRecord, error: null });
      const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
      const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });

      mockFrom.mockReturnValue({ insert: mockInsert });

      const result = await generateAndSaveWarrantyTerm(sampleOrder);

      expect(result.record).toBeDefined();
      expect(result.record.id).toBe('w-rec-1');
      expect(result.generatedPdf.sha256).toBeDefined();
      expect(mockUpload).toHaveBeenCalled();
      expect(mockInsert).toHaveBeenCalled();
    });
  });

  describe('sendWarrantyTermWhatsApp', () => {
    it('rejeita envio se o cliente não tiver número válido', async () => {
      const orderWithoutPhone = {
        ...sampleOrder,
        customerData: { fullName: 'Sem Telefone' },
      } as unknown as Order;
      const record = {
        id: 'w-rec-2',
        order_id: 'ord-1',
        document_version: 1,
        file_name: 'test.pdf',
        file_hash_sha256: 'hash',
        delivery_status: 'not_sent' as const,
        generated_at: new Date().toISOString(),
      };

      await expect(
        sendWarrantyTermWhatsApp({ order: orderWithoutPhone, warrantyRecord: record })
      ).rejects.toThrow('Número de telefone do cliente inválido');
    });

    it('abre WhatsApp Web com link do PDF e mensagem oficial sugerida no modo wame', async () => {
      const windowOpenSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

      const mockEq = vi.fn().mockResolvedValue({ data: null, error: null });
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });
      mockFrom.mockReturnValue({ update: mockUpdate });

      const record = {
        id: 'w-rec-3',
        order_id: sampleOrder.id!,
        document_version: 1,
        file_name: 'termo.pdf',
        file_url: 'https://example.com/termo.pdf',
        file_hash_sha256: 'sha256-abc',
        delivery_status: 'not_sent' as const,
        generated_at: new Date().toISOString(),
      };

      const result = await sendWarrantyTermWhatsApp({
        order: sampleOrder,
        warrantyRecord: record,
      });

      expect(result.success).toBe(true);
      expect(result.mode).toBe('wame');
      expect(windowOpenSpy).toHaveBeenCalled();
      const calledUrl = windowOpenSpy.mock.calls[0][0] as string;
      expect(calledUrl).toContain('wa.me/5541991234567');
      expect(decodeURIComponent(calledUrl)).toContain('Móveis Morante agradece pela sua compra');
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          delivery_status: 'sent',
          send_mode: 'wame',
        })
      );
    });
  });

  describe('fetchWarrantyTermsByOrderId', () => {
    it('retorna os termos ordenados do mais recente ao mais antigo', async () => {
      const mockOrder = vi.fn().mockResolvedValue({
        data: [{ id: 'w-1', document_version: 2 }, { id: 'w-2', document_version: 1 }],
        error: null,
      });
      const mockEq = vi.fn().mockReturnValue({ order: mockOrder });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
      mockFrom.mockReturnValue({ select: mockSelect });

      const records = await fetchWarrantyTermsByOrderId('ord-service-test-1');
      expect(records.length).toBe(2);
      expect(records[0].document_version).toBe(2);
    });
  });
});
