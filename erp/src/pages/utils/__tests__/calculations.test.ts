import { describe, it, expect } from 'vitest';
import {
    calcItemTotalValue,
    calcItemsTotalValue,
    calcItemsSummary,
    calcPaymentTotalValue,
    calcPaymentsSummary,
    getFixedDiscount,
    getFixedFee
} from '../calculations';
import { Item } from '../../types/items.type';
import { Payment } from '../../types/payments.type';

describe('Etapa 1.5: Cálculos financeiros do pedido [TESTE_AUT]', () => {
    describe('Descontos em itens (R$ e %)', () => {
        it('deve calcular desconto fixo em R$ corretamente', () => {
            const item: Item = {
                description: 'Cadeira Gamer',
                quantity: 2,
                unitPrice: 500,
                unitDiscount: 50,
                discountType: 'fixed',
                handlingType: ''
            };

            expect(getFixedDiscount(item)).toBe(50);
            expect(calcItemTotalValue(item)).toBe(900); // (500 - 50) * 2
        });

        it('deve calcular desconto percentual (%) corretamente', () => {
            const item: Item = {
                description: 'Mesa de Jantar',
                quantity: 1,
                unitPrice: 1000,
                unitDiscount: 15, // 15%
                discountType: 'percentage',
                handlingType: ''
            };

            expect(getFixedDiscount(item)).toBe(150); // 15% de 1000
            expect(calcItemTotalValue(item)).toBe(850);
        });

        it('não deve permitir valor líquido negativo no item', () => {
            const item: Item = {
                description: 'Produto com desconto abusivo',
                quantity: 1,
                unitPrice: 100,
                unitDiscount: 150,
                discountType: 'fixed',
                handlingType: ''
            };

            expect(calcItemTotalValue(item)).toBe(0);
        });
    });

    describe('Resumo dos Itens (calcItemsSummary)', () => {
        it('deve calcular subtotal, descontos totais e custo total dos itens', () => {
            const items: Item[] = [
                {
                    description: 'Item 1',
                    quantity: 2,
                    unitPrice: 100,
                    unitDiscount: 10,
                    discountType: 'fixed',
                    costPrice: 50,
                    handlingType: ''
                },
                {
                    description: 'Item 2',
                    quantity: 1,
                    unitPrice: 200,
                    unitDiscount: 10, // 10% de 200 = 20
                    discountType: 'percentage',
                    costPrice: 100,
                    handlingType: ''
                }
            ];

            const summary = calcItemsSummary(items);
            expect(summary.totalQuantity).toBe(3);
            expect(summary.totalFixedDiscount).toBe(40); // (10 * 2) + 20
            expect(summary.itemsTotalValue).toBe(360); // (90 * 2) + 180
            expect(summary.itemsSubtotal).toBe(400); // 360 + 40
            expect(summary.totalItemsCost).toBe(200); // (50 * 2) + (100 * 1)
        });
    });

    describe('Resumo financeiro do Pedido e Pagamentos (calcPaymentsSummary)', () => {
        const mockItemsSummary = {
            totalQuantity: 2,
            itemsSubtotal: 1000,
            totalFixedDiscount: 100,
            itemsTotalValue: 900,
            totalItemsCost: 400
        };

        it('deve compor total do pedido somando itens líquidos, frete e taxas de pagamento', () => {
            const shipping = 50;
            const payments: Payment[] = [
                { method: 'Cartão de Crédito', amount: 500, fee: 10, feeType: 'fixed', status: 'pending' },
                { method: 'Cartão de Débito', amount: 450, fee: 2, feeType: 'percentage', status: 'pending' } // 2% de 450 = 9
            ];

            const summary = calcPaymentsSummary(payments, mockItemsSummary, shipping);

            // totalPaymentsFee = 10 + 9 = 19
            expect(summary.totalPaymentsFee).toBe(19);
            // totalOrderValue = 900 (itens) + 50 (frete) + 19 (taxas) = 969
            expect(summary.totalOrderValue).toBe(969);
            // totalAmountPaid = (500 + 10) + (450 + 9) = 969
            expect(summary.totalAmountPaid).toBe(969);
            // Saldo restante zerado e sem troco
            expect(summary.amountRemaining).toBe(0);
            expect(summary.change).toBe(0);
        });

        it('deve calcular saldo restante pendente quando o valor pago for inferior', () => {
            const shipping = 100;
            const payments: Payment[] = [
                { method: 'Dinheiro', amount: 500, fee: 0, feeType: 'fixed', status: 'pending' }
            ];

            // totalOrderValue = 900 + 100 = 1000
            // totalAmountPaid = 500
            const summary = calcPaymentsSummary(payments, mockItemsSummary, shipping);
            expect(summary.amountRemaining).toBe(500);
            expect(summary.change).toBe(0);
        });

        it('deve calcular Troco (change) com precisão quando o valor pago exceder o total do pedido', () => {
            const shipping = 0;
            // totalOrderValue = 900
            // Cliente pagou 1000 em dinheiro
            const payments: Payment[] = [
                { method: 'Dinheiro', amount: 1000, fee: 0, feeType: 'fixed', status: 'pending' }
            ];

            const summary = calcPaymentsSummary(payments, mockItemsSummary, shipping);
            expect(summary.amountRemaining).toBe(0);
            expect(summary.change).toBe(100);
        });
    });
});
