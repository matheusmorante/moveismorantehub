import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../../supabaseConfig', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
  },
}));

vi.mock('../../settingsService', () => ({
  getSettings: vi.fn(() => ({ companyName: 'Morante Móveis' })),
  saveSettings: vi.fn(),
}));

vi.mock('react-toastify', () => ({
  toast: {
    loading: vi.fn().mockReturnValue('toast_1'),
    dismiss: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

import Order from '@/pages/types/order.type';
import { DanfeData } from '../../nfe/danfeGenerator';
import * as printFallbackHandler from '../printFallbackHandler';
import { printSalesOrder, printReceipt, printDanfe, printConventional } from '../printService';

describe('printService (impressão pelo navegador)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  const mockOrder: Order = {
    id: 'ord-123',
    code: 101,
    date: '2026-09-24T10:00:00Z',
    orderType: 'sale',
    status: 'pending',
    seller: 'Matheus Morante',
    customerData: {
      fullName: 'Carlos Eduardo',
      phone: '41999998888',
      cpfCnpj: '12345678900',
    },
    items: [
      {
        productId: 'p1',
        description: 'Sofá Retrátil 3 Lugares',
        quantity: 1,
        unitValue: 2500,
      } as any,
    ],
    shipping: {
      deliveryMethod: 'delivery',
      value: 100,
    },
    paymentsSummary: {
      totalOrderValue: 2600,
    },
  };

  it('deve rejeitar impressão de pedido se não houver atendente informado', async () => {
    const orderWithoutSeller = { ...mockOrder, seller: '' };
    const result = await printSalesOrder(orderWithoutSeller);
    expect(result.success).toBe(false);
    expect(result.message).toContain('Atendente');
  });

  it('deve abrir o pedido na janela de impressão do navegador', async () => {
    const fallbackSpy = vi.spyOn(printFallbackHandler, 'executePrintFallback').mockReturnValue({
      success: true,
      status: 'fallback_browser',
      message: 'Aberto na janela de impressão do navegador',
    });

    const result = await printSalesOrder(mockOrder);
    expect(fallbackSpy).toHaveBeenCalledWith('sales_order', mockOrder);
    expect(result.success).toBe(true);
    expect(result.status).toBe('fallback_browser');
  });

  it('deve rejeitar impressão de recibo se o cliente for anônimo ou inválido', async () => {
    const orderNoCustomer = { ...mockOrder, customerData: { fullName: 'Ao Consumidor' } as any };
    const result = await printReceipt(orderNoCustomer);
    expect(result.success).toBe(false);
    expect(result.message).toContain('Cliente não informado');
  });

  it('deve abrir o recibo na janela de impressão do navegador', async () => {
    const fallbackSpy = vi.spyOn(printFallbackHandler, 'executePrintFallback').mockReturnValue({
      success: true,
      status: 'fallback_browser',
      message: 'Aberto na janela de impressão do navegador',
    });

    const result = await printReceipt(mockOrder);
    expect(fallbackSpy).toHaveBeenCalledWith('receipt', mockOrder);
    expect(result.success).toBe(true);
    expect(result.status).toBe('fallback_browser');
  });

  it('deve abrir o DANFE na janela de impressão do navegador', async () => {
    const fallbackSpy = vi.spyOn(printFallbackHandler, 'executePrintFallback').mockReturnValue({
      success: true,
      status: 'fallback_browser',
      message: 'Aberto na janela de impressão do navegador',
    });

    const mockDanfeData: DanfeData = {
      order: mockOrder,
      settings: { companyName: 'Morante Móveis' } as any,
      accessKey: '41260900000000000000550010000000011000000010',
      nfeNumber: 1,
      series: 1,
      protocolNumber: '141260000000000',
      protocolDate: '2026-09-24T10:00:00Z',
      model: '55',
      environment: 2,
    };

    const result = await printDanfe(mockDanfeData);
    expect(fallbackSpy).toHaveBeenCalledWith('danfe', mockOrder, expect.any(String), undefined);
    expect(result.success).toBe(true);
    expect(result.status).toBe('fallback_browser');
  });

  it('deve reutilizar a janela aberta ao selecionar o formato da NFC-e', async () => {
    const fallbackSpy = vi.spyOn(printFallbackHandler, 'executePrintFallback').mockReturnValue({
      success: true,
      status: 'fallback_browser',
    });
    const selectedPrintWindow = {} as Window;

    await printDanfe(
      {
        order: mockOrder,
        settings: { companyName: 'Morante Móveis' } as any,
        accessKey: '41260900000000000000550010000000011000000010',
        nfeNumber: 1,
        series: 1,
        protocolNumber: '141260000000000',
        protocolDate: '2026-09-24T10:00:00Z',
        model: '65',
        environment: 2,
      },
      selectedPrintWindow
    );

    expect(fallbackSpy).toHaveBeenCalledWith(
      'danfe',
      mockOrder,
      expect.any(String),
      selectedPrintWindow
    );
  });

  it('abre a impressão automaticamente quando o HTML do DANFE termina de carregar', () => {
    const listeners = new Map<string, EventListener>();
    const printWindow = {
      document: { open: vi.fn(), write: vi.fn(), close: vi.fn() },
      addEventListener: vi.fn((type: string, listener: EventListenerOrEventListenerObject) => {
        if (typeof listener === 'function') listeners.set(type, listener);
      }),
      focus: vi.fn(),
      print: vi.fn(),
      close: vi.fn(),
      closed: false,
    } as unknown as Window;
    const openWindow = vi.fn().mockReturnValue(printWindow);
    vi.stubGlobal('window', { open: openWindow });

    const result = printFallbackHandler.executePrintFallback('danfe', mockOrder, '<!doctype html><html></html>');

    expect(result.success).toBe(true);
    expect(openWindow).toHaveBeenCalledWith('', '_blank');
    expect(printWindow.document.write).toHaveBeenCalledWith('<!doctype html><html></html>');
    expect(printWindow.print).not.toHaveBeenCalled();
    listeners.get('load')?.(new Event('load'));
    expect(printWindow.focus).toHaveBeenCalledOnce();
    expect(printWindow.print).toHaveBeenCalledOnce();
    listeners.get('afterprint')?.(new Event('afterprint'));
    expect(printWindow.close).toHaveBeenCalledOnce();
  });

  it('deve permitir impressão convencional explicitamente quando acionada', () => {
    const fallbackSpy = vi.spyOn(printFallbackHandler, 'executePrintFallback').mockReturnValue({
      success: true,
      status: 'fallback_browser',
      message: 'Aberto no navegador',
    });

    const result = printConventional('receipt', mockOrder);
    expect(fallbackSpy).toHaveBeenCalledWith('receipt', mockOrder, undefined);
    expect(result.status).toBe('fallback_browser');
  });
});
