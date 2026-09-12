import { describe, it, expect } from 'vitest';
import { mapOrderFromDatabase, OrderDatabaseRow } from './orderMapper';

describe('Auditoria de Leitura Normalizada Estrita (Zero Dependência de order_data)', () => {
    it('deve mapear pedido perfeitamente sem campo order_data (order_data = null)', () => {
        const strictRow: OrderDatabaseRow = {
            id: 'ord-strict-101',
            order_number: '123456',
            order_index: 123456,
            status: 'scheduled',
            order_type: 'sale',
            customer_id: 'cust-uuid-1',
            customer_name: 'Ana Maria Ferreira',
            customer_phone: '45999887766',
            customer_email: 'ana@email.com',
            seller_id: 'sell-uuid-1',
            seller_name: 'Carlos Vendedor',
            total_amount: 3500.00,
            items_subtotal: 3400.00,
            total_discount: 100.00,
            total_cost: 1500.00,
            delivery_method: 'delivery',
            delivery_status: 'pending',
            scheduled_date: '2026-10-15',
            scheduled_start_time: '14:00',
            scheduled_end_time: '18:00',
            marketing_origin: 'instagram',
            stock_processed: true,
            is_stock_checked: true,
            is_registered_in_bling: false,
            deleted: false,
            deleted_at: null,
            notes: 'Entregar no período da tarde',
            created_at: '2026-09-12T10:00:00Z',
            updated_at: '2026-09-12T10:30:00Z',
            // LEGADO AUSENTE (PROVA DE DESACOPLAMENTO)
            order_data: null,
            items: [
                {
                    productId: 'prod-mesa-1',
                    code: 'MES-01',
                    description: 'Mesa de Madeira 6 Lugares',
                    quantity: 1,
                    unitPrice: 2500.00,
                    unitDiscount: 100.00,
                    handlingType: 'montagem_inclusa'
                },
                {
                    productId: 'prod-cadeira-1',
                    code: 'CAD-01',
                    description: 'Cadeira Estofada',
                    quantity: 4,
                    unitPrice: 250.00,
                    unitDiscount: 0,
                    handlingType: 'montagem_inclusa'
                }
            ],
            order_payments: [
                {
                    payment_index: 1,
                    payment_method: 'Pix',
                    amount: 1500.00,
                    fee: 0,
                    fee_type: 'fixed',
                    status: 'PAGO',
                    installments: 1
                },
                {
                    payment_index: 2,
                    payment_method: 'Cartão de Crédito',
                    amount: 2000.00,
                    fee: 60.00,
                    fee_type: 'percentage',
                    status: 'PAGO',
                    installments: 3
                }
            ]
        };

        const result = mapOrderFromDatabase(strictRow);

        // Asserções no Domínio
        expect(result.id).toBe('ord-strict-101');
        expect(result.orderIndex).toBe(123456);
        expect(result.orderNumber).toBe(123456);
        expect(result.status).toBe('scheduled');
        expect(result.customerData.fullName).toBe('Ana Maria Ferreira');
        expect(result.customerData.phone).toBe('45999887766');
        expect(result.seller).toBe('Carlos Vendedor');
        expect(result.sellerId).toBe('sell-uuid-1');
        expect(result.paymentsSummary.totalOrderValue).toBe(3500.00);
        expect(result.shipping.deliveryMethod).toBe('delivery');
        expect(result.shipping.scheduling?.date).toBe('2026-10-15');
        expect(result.shipping.scheduling?.startTime).toBe('14:00');
        expect(result.shipping.scheduling?.endTime).toBe('18:00');
        expect(result.items).toHaveLength(2);
        expect(result.items[0].description).toBe('MESA DE MADEIRA 6 LUGARES');
        expect(result.payments).toHaveLength(2);
        expect(result.payments[0].method).toBe('Pix');
        expect(result.payments[0].amount).toBe(1500.00);
        expect(result.payments[1].method).toBe('Cartão de Crédito');
        expect(result.payments[1].amount).toBe(2000.00);
        expect(result.observation).toBe('Entregar no período da tarde');
        expect(result.stockProcessed).toBe(true);
    });

    it('deve mapear itens perfeitamente da tabela normalizada order_items (zero row.items e zero order_data)', () => {
        const strictRowWithOrderItems: OrderDatabaseRow = {
            id: 'ord-relational-202',
            order_number: '654321',
            order_index: 654321,
            status: 'delivered',
            order_type: 'sale',
            customer_name: 'Roberto Silveira',
            seller_name: 'Vendedora Beatriz',
            total_amount: 1899.00,
            items_subtotal: 1899.00,
            total_discount: 0,
            total_cost: 950.00,
            order_data: null,
            items: null, // Zero coluna JSONB
            order_items: [
                {
                    id: 'item-uuid-1',
                    order_id: 'ord-relational-202',
                    item_index: 1,
                    product_id: 'prod-armario-1',
                    variation_id: 'var-freijo',
                    code: 'ARM-01',
                    description: 'Armário Multiuso 2 Portas',
                    quantity: '1.0000',
                    unit_price: '1899.00',
                    unit_discount: '0.00',
                    discount_type: 'fixed',
                    cost_price: '950.00',
                    condition: 'novo',
                    handling_type: 'De mostruário montado > Entregue montado',
                    observation: 'Cor freijó com espelho',
                    is_temporary_product: false,
                    item_snapshot: {
                        customProp: 'preserved'
                    }
                }
            ],
            order_payments: [
                {
                    payment_index: 1,
                    payment_method: 'Pix',
                    amount: 1899.00,
                    status: 'PAGO'
                }
            ]
        };

        const result = mapOrderFromDatabase(strictRowWithOrderItems);

        expect(result.id).toBe('ord-relational-202');
        expect(result.orderNumber).toBe(654321);
        expect(result.customerData.fullName).toBe('Roberto Silveira');
        expect(result.seller).toBe('Vendedora Beatriz');
        expect(result.items).toHaveLength(1);
        expect(result.items[0].productId).toBe('prod-armario-1');
        expect(result.items[0].variationId).toBe('var-freijo');
        expect(result.items[0].code).toBe('ARM-01');
        expect(result.items[0].description).toBe('ARMÁRIO MULTIUSO 2 PORTAS');
        expect(result.items[0].quantity).toBe(1);
        expect(result.items[0].unitPrice).toBe(1899.00);
        expect(result.items[0].costPrice).toBe(950.00);
        expect(result.items[0].handlingType).toBe('De mostruário montado > Entregue montado');
        expect(result.items[0].observation).toBe('Cor freijó com espelho');
        expect(result.items[0].isTemporaryProduct).toBe(false);
        expect((result.items[0] as any).customProp).toBe('preserved');
    });

    it('deve mapear com perfeição mesmo quando order_data for objeto vazio {} e items for array vazio [] (Zero Write Legado)', () => {
        const zeroLegacyRow: OrderDatabaseRow = {
            id: 'ord-zero-legacy-303',
            order_number: '778899',
            order_index: 778899,
            status: 'scheduled',
            order_type: 'sale',
            customer_name: 'Marcos de Oliveira',
            seller_name: 'Vendedor Pedro',
            total_amount: 2500.00,
            items_subtotal: 2500.00,
            total_discount: 0,
            total_cost: 1100.00,
            delivery_method: 'delivery',
            scheduled_date: '2026-10-20',
            scheduled_start_time: '14:00',
            scheduled_end_time: '17:00',
            // LEGADO 100% DESLIGADO / VAZIO:
            order_data: {},
            items: [],
            order_items: [
                {
                    item_index: 1,
                    code: 'COL-01',
                    description: 'Colchão Queen Size Molas Ensacadas',
                    quantity: '1.0000',
                    unit_price: '2500.00',
                    unit_discount: '0.00',
                    discount_type: 'fixed',
                    cost_price: '1100.00',
                    condition: 'novo',
                    handling_type: 'Na caixa > Entregue na caixa',
                    observation: 'Entrega piso térreo',
                    is_temporary_product: false
                }
            ],
            order_payments: [
                {
                    payment_index: 1,
                    payment_method: 'Cartão de Crédito',
                    amount: '2500.00',
                    fee: '75.00',
                    fee_type: 'fixed',
                    status: 'PAGO',
                    installments: 10
                }
            ]
        };

        const mapped = mapOrderFromDatabase(zeroLegacyRow);

        expect(mapped.id).toBe('ord-zero-legacy-303');
        expect(mapped.orderNumber).toBe(778899);
        expect(mapped.customerData.fullName).toBe('Marcos de Oliveira');
        expect(mapped.seller).toBe('Vendedor Pedro');
        expect(mapped.paymentsSummary.totalOrderValue).toBe(2500.00);
        expect(mapped.shipping.deliveryMethod).toBe('delivery');
        expect(mapped.shipping.scheduling?.date).toBe('2026-10-20');
        expect(mapped.items).toHaveLength(1);
        expect(mapped.items[0].description).toBe('COLCHÃO QUEEN SIZE MOLAS ENSACADAS');
        expect(mapped.items[0].unitPrice).toBe(2500.00);
        expect(mapped.payments).toHaveLength(1);
        expect(mapped.payments[0].method).toBe('Cartão de Crédito');
        expect(mapped.payments[0].amount).toBe(2500.00);
        expect(mapped.payments[0].installments).toBe(10);
    });
});
