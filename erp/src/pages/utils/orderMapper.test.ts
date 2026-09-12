import { describe, it, expect } from 'vitest';
import { mapOrderFromDatabase, OrderDatabaseRow } from './orderMapper';

describe('orderMapper - Normalização e Fallback Seguro', () => {
    it('deve priorizar colunas físicas normalizadas como Master quando preenchidas', () => {
        const row: OrderDatabaseRow = {
            id: 'ord-001',
            order_number: 1050,
            status: 'scheduled',
            order_type: 'sale',
            customer_name: 'Maria Silva Normalizada',
            customer_phone: '45999990000',
            total_amount: 1500.50,
            scheduled_date: '2026-09-20T14:00:00.000Z',
            order_data: {
                status: 'legacy_draft',
                total: 100,
                customerData: {
                    fullName: 'Maria Silva Legada',
                    phone: '45888880000'
                }
            }
        };

        const result = mapOrderFromDatabase(row);

        expect(result.id).toBe('ord-001');
        expect(result.orderIndex).toBe(1050);
        expect(result.status).toBe('scheduled');
        expect(result.orderType).toBe('sale');
        expect(result.customerData.fullName).toBe('Maria Silva Normalizada');
        expect(result.customerData.phone).toBe('45999990000');
        expect(result.paymentsSummary?.totalOrderValue).toBe(1500.50);
        expect(result.shipping?.scheduling?.date).toBe('2026-09-20T14:00:00.000Z');
    });

    it('deve ativar fallback seguro em order_data quando a coluna física estiver nula', () => {
        const row: OrderDatabaseRow = {
            id: 'ord-002',
            status: null,
            order_type: null,
            total_amount: null,
            customer_name: null,
            order_data: {
                status: 'completed',
                orderType: 'budget',
                total: 890.00,
                customerData: {
                    fullName: 'João Santos Legado',
                    phone: '45991112222'
                },
                shipping: {
                    scheduling: {
                        date: '2026-09-15'
                    }
                }
            }
        };

        const result = mapOrderFromDatabase(row);

        expect(result.id).toBe('ord-002');
        expect(result.status).toBe('completed');
        expect(result.orderType).toBe('budget');
        expect(result.customerData.fullName).toBe('João Santos Legado');
        expect(result.paymentsSummary?.totalOrderValue).toBe(890.00);
        expect(result.shipping?.scheduling?.date).toBe('2026-09-15');
    });

    it('deve preservar snapshots operacionais e itens originais intactos', () => {
        const row: OrderDatabaseRow = {
            id: 'ord-003',
            status: 'delivered',
            order_data: {
                items: [
                    { productId: 'p1', description: 'Cadeira Gamer', quantity: 2, unitPrice: 400 }
                ],
                observation: 'Entregar de tarde'
            }
        };

        const result = mapOrderFromDatabase(row);

        expect(result.status).toBe('delivered');
        expect(result.items).toHaveLength(1);
        expect(result.items[0].description).toBe('CADEIRA GAMER');
        expect(result.observation).toBe('Entregar de tarde');
    });

    it('deve priorizar pagamentos da tabela normalizada order_payments', () => {
        const row: OrderDatabaseRow = {
            id: 'ord-004',
            status: 'completed',
            order_payments: [
                {
                    payment_index: 1,
                    payment_method: 'Pix Normalizado',
                    amount: '1250.00',
                    fee: '0.00',
                    fee_type: 'fixed',
                    status: 'PAGO',
                    installments: 1
                }
            ],
            order_data: {
                payments: [
                    { method: 'Dinheiro Legado', amount: 500 }
                ]
            }
        };

        const result = mapOrderFromDatabase(row);

        expect(result.payments).toHaveLength(1);
        expect(result.payments[0].method).toBe('Pix Normalizado');
        expect(result.payments[0].amount).toBe(1250);
        expect(result.payments[0].status).toBe('PAGO');
    });

    it('deve acionar fallback para order_data.payments quando order_payments estiver vazio', () => {
        const row: OrderDatabaseRow = {
            id: 'ord-005',
            status: 'completed',
            order_payments: [],
            order_data: {
                payments: [
                    { method: 'Cartão Legado 3x', amount: 600, status: 'PAGO' }
                ]
            }
        };

        const result = mapOrderFromDatabase(row);

        expect(result.payments).toHaveLength(1);
        expect(result.payments[0].method).toBe('Cartão Legado 3x');
        expect(result.payments[0].amount).toBe(600);
    });
});
