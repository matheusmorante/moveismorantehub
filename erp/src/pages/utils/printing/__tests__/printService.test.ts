import { describe, it, expect, vi, beforeEach } from 'vitest';

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
    }
}));

import Order from '@/pages/types/order.type';
import { DanfeData } from '../../nfe/danfeGenerator';
import * as printAgentClient from '../printAgentClient';
import * as printFallbackHandler from '../printFallbackHandler';
import { printSalesOrder, printReceipt, printDanfe, printConventional } from '../printService';

describe('printService (ERP Windows Direct Print & Fallback)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
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
            cpfCnpj: '12345678900'
        },
        items: [
            { productId: 'p1', description: 'Sofá Retrátil 3 Lugares', quantity: 1, unitValue: 2500 } as any
        ],
        shipping: {
            deliveryMethod: 'delivery',
            value: 100
        },
        paymentsSummary: {
            totalOrderValue: 2600
        }
    };

    it('deve rejeitar impressão de pedido se não houver atendente informado', async () => {
        const orderWithoutSeller = { ...mockOrder, seller: '' };
        const result = await printSalesOrder(orderWithoutSeller);
        expect(result.success).toBe(false);
        expect(result.message).toContain('Atendente');
    });

    it('deve acionar fallback automaticamente por padrão quando o agente local estiver offline', async () => {
        vi.spyOn(printAgentClient, 'checkPrintAgentHealth').mockResolvedValue({ isOnline: false });
        const fallbackSpy = vi.spyOn(printFallbackHandler, 'executePrintFallback').mockReturnValue({
            success: true,
            status: 'fallback_browser',
            message: 'Aberto na janela de impressão do navegador'
        });

        const result = await printSalesOrder(mockOrder);
        expect(fallbackSpy).toHaveBeenCalledWith('sales_order', mockOrder);
        expect(result.success).toBe(true);
        expect(result.status).toBe('fallback_browser');
    });

    it('deve respeitar autoFallback: false quando explicitamente configurado e não abrir abas', async () => {
        vi.spyOn(printAgentClient, 'checkPrintAgentHealth').mockResolvedValue({ isOnline: false });
        const fallbackSpy = vi.spyOn(printFallbackHandler, 'executePrintFallback');

        const result = await printSalesOrder(mockOrder, { autoFallback: false });
        expect(result.success).toBe(false);
        expect(result.status).toBe('error');
        expect(fallbackSpy).not.toHaveBeenCalled();
    });

    it('deve rejeitar impressão de recibo se o cliente for anônimo ou inválido', async () => {
        const orderNoCustomer = { ...mockOrder, customerData: { fullName: 'Ao Consumidor' } as any };
        const result = await printReceipt(orderNoCustomer);
        expect(result.success).toBe(false);
        expect(result.message).toContain('Cliente não informado');
    });

    it('deve acionar fallback automaticamente no recibo quando o agente local estiver offline', async () => {
        vi.spyOn(printAgentClient, 'checkPrintAgentHealth').mockResolvedValue({ isOnline: false });
        const fallbackSpy = vi.spyOn(printFallbackHandler, 'executePrintFallback').mockReturnValue({
            success: true,
            status: 'fallback_browser',
            message: 'Aberto na janela de impressão do navegador'
        });

        const result = await printReceipt(mockOrder);
        expect(fallbackSpy).toHaveBeenCalledWith('receipt', mockOrder);
        expect(result.success).toBe(true);
        expect(result.status).toBe('fallback_browser');
    });

    it('deve acionar fallback automaticamente no DANFE quando o agente local estiver offline', async () => {
        vi.spyOn(printAgentClient, 'checkPrintAgentHealth').mockResolvedValue({ isOnline: false });
        const fallbackSpy = vi.spyOn(printFallbackHandler, 'executePrintFallback').mockReturnValue({
            success: true,
            status: 'fallback_browser',
            message: 'Aberto na janela de impressão do navegador'
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
            environment: 2
        };

        const result = await printDanfe(mockDanfeData);
        expect(fallbackSpy).toHaveBeenCalledWith('danfe', mockOrder, expect.any(String));
        expect(result.success).toBe(true);
        expect(result.status).toBe('fallback_browser');
    });

    it('deve enviar para o agente local e retornar sent_to_spooler quando o agente responder com sucesso', async () => {
        vi.spyOn(printAgentClient, 'checkPrintAgentHealth').mockResolvedValue({ isOnline: true, version: '1.0.0' });
        vi.spyOn(printAgentClient, 'sendDirectPrintJob').mockResolvedValue({
            success: true,
            status: 'sent_to_spooler',
            printer: 'EPSON L3250 Series'
        });

        const result = await printReceipt(mockOrder);
        expect(result.success).toBe(true);
        expect(result.status).toBe('sent_to_spooler');
        expect(result.printer).toBe('EPSON L3250 Series');
    });

    it('deve permitir impressão convencional explicitamente quando acionada', () => {
        const fallbackSpy = vi.spyOn(printFallbackHandler, 'executePrintFallback').mockReturnValue({
            success: true,
            status: 'fallback_browser',
            message: 'Aberto no navegador'
        });

        const result = printConventional('receipt', mockOrder);
        expect(fallbackSpy).toHaveBeenCalledWith('receipt', mockOrder, undefined);
        expect(result.status).toBe('fallback_browser');
    });
});
