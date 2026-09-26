// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import Order from '@/pages/types/order.type';
import { buildSalesOrderHtml, buildReceiptHtml } from '@/pages/utils/printing/printHtmlBuilder';
import { buildDeliveryMessage, buildCustomerOrderMessage } from '@/pages/utils/whatsappTemplates';

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

vi.mock('@/pages/utils/settingsService', () => ({
    getSettings: () => ({
        deliveryHandlingOptions: [{ label: 'Entrega Padrão' }],
        pickupHandlingOptions: [{ label: 'Retirada na Loja' }],
        whatsappTemplates: {
            deliveryInfo: 'Pedido para {{customerName}}\nItens:\n{{items}}\nTotal: {{totalValue}}',
            orderConfirmation: 'Olá {{customerName}}, seu pedido foi confirmado!\n{{items}}\nTotal: {{totalValue}}'
        }
    })
}));

describe('Serviços como itens normais no Recibo, Pedido Impresso e WhatsApp', () => {
    const mockOrder: Order = {
        id: 'ord-123',
        orderNumber: 1001,
        date: '2026-09-25T19:00:00.000Z',
        status: 'pending',
        orderType: 'sale',
        customerData: {
            fullName: 'Carlos Alberto',
            phone: '41999998888',
            fullAddress: {
                street: 'Rua das Flores',
                number: '123',
                neighborhood: 'Centro',
                city: 'Curitiba'
            }
        },
        items: [
            {
                description: 'Guarda-Roupa Casal 6 Portas',
                quantity: 1,
                unitPrice: 1200,
                unitDiscount: 0,
                discountType: 'fixed',
                handlingType: 'Entrega Padrão',
                itemType: 'product'
            },
            {
                description: 'Serviço de Montagem e Fixação',
                quantity: 1,
                unitPrice: 150,
                unitDiscount: 0,
                discountType: 'fixed',
                handlingType: '',
                itemType: 'service'
            }
        ],
        itemsSummary: {
            totalQuantity: 2,
            itemsSubtotal: 1350,
            totalFixedDiscount: 0,
            itemsTotalValue: 1350,
            totalItemsCost: 700
        },
        shipping: {
            deliveryMethod: 'delivery',
            value: 50,
            scheduling: {
                date: '2026-09-26'
            }
        },
        payments: [
            {
                method: 'PIX',
                value: 1400,
                status: 'paid'
            }
        ],
        paymentsSummary: {
            totalOrderValue: 1400,
            totalAmountPaid: 1400,
            amountRemaining: 0,
            change: 0,
            totalPaymentsFee: 0
        },
        seller: 'Matheus'
    };

    it('deve incluir o serviço na tabela de itens do Pedido de Venda impresso', () => {
        const html = buildSalesOrderHtml(mockOrder);
        expect(html).toContain('Guarda-Roupa Casal 6 Portas');
        expect(html).toContain('Serviço de Montagem e Fixação');
        expect(html).toContain('DESC. PRODUTO/SERVIÇO');
    });

    it('deve incluir o serviço na tabela de itens do Recibo impresso', () => {
        const html = buildReceiptHtml(mockOrder);
        expect(html).toContain('Guarda-Roupa Casal 6 Portas');
        expect(html).toContain('Serviço de Montagem e Fixação');
    });

    it('deve incluir o serviço na mensagem do WhatsApp de entrega e confirmação', () => {
        const deliveryMsg = buildDeliveryMessage(mockOrder);
        expect(deliveryMsg).toContain('Guarda-Roupa Casal 6 Portas');
        expect(deliveryMsg).toContain('Serviço de Montagem e Fixação');

        const customerMsg = buildCustomerOrderMessage(mockOrder);
        expect(customerMsg).toContain('Guarda-Roupa Casal 6 Portas');
        expect(customerMsg).toContain('Serviço de Montagem e Fixação');
    });
});
