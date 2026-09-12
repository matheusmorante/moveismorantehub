import { describe, it, expect } from 'vitest';
import { migrateOrderHandlings, resolveHandlingLabel } from './handlingMigration';

describe('handlingMigration - Preservação e Consistência de Manuseios', () => {
    it('deve preservar o manuseio individual de cada item sem sobrescrever com o shipping.orderType', () => {
        const order = {
            shipping: {
                deliveryMethod: 'delivery',
                orderType: 'Na caixa > Montagem no local da entrega'
            },
            items: [
                {
                    description: 'Sofá Retrátil',
                    handlingType: 'Item não necessita de montagem'
                },
                {
                    description: 'Mesa de Jantar',
                    handlingType: 'De mostruário montado > Entregue montado'
                },
                {
                    description: 'Painel TV',
                    handlingType: 'Na caixa > Montagem por conta do cliente'
                }
            ]
        };

        const migrated = migrateOrderHandlings(order);

        expect(migrated.items[0].handlingType).toBe('Item não necessita de montagem');
        expect(migrated.items[1].handlingType).toBe('De mostruário montado > Entregue montado');
        expect(migrated.items[2].handlingType).toBe('Na caixa > Montagem por conta do cliente');
        // O shipping.orderType deve refletir o primeiro item com manuseio
        expect(migrated.shipping.orderType).toBe('Item não necessita de montagem');
    });

    it('deve aplicar fallback apenas para itens que não possuem nenhum manuseio preenchido', () => {
        const order = {
            shipping: {
                deliveryMethod: 'delivery',
                orderType: 'Na caixa > Montagem no local da entrega'
            },
            items: [
                {
                    description: 'Guarda Roupa',
                    handlingType: ''
                },
                {
                    description: 'Cadeira',
                    handlingType: 'Item não necessita de montagem'
                }
            ]
        };

        const migrated = migrateOrderHandlings(order);

        expect(migrated.items[0].handlingType).toBe('Na caixa > Montagem no local da entrega');
        expect(migrated.items[1].handlingType).toBe('Item não necessita de montagem');
    });

    it('deve converter manuseios legados do Bling corretamente mantendo integridade', () => {
        const order = {
            shipping: {
                deliveryMethod: 'delivery',
                orderType: 'Montagem no Local'
            },
            items: [
                {
                    description: 'Armário',
                    handlingType: 'Montagem no Local'
                },
                {
                    description: 'Balcão',
                    handlingType: 'Na caixa com montagem'
                }
            ]
        };

        const migrated = migrateOrderHandlings(order);

        expect(migrated.items[0].handlingType).toBe('Na caixa > Montagem no local da entrega');
        expect(migrated.items[1].handlingType).toBe('Na caixa > Montagem no deposito > Entregue montado');
        expect(migrated.shipping.orderType).toBe('Na caixa > Montagem no local da entrega');
    });

    it('não deve alterar itens quando não há itens no pedido', () => {
        const order = {
            shipping: { deliveryMethod: 'delivery', orderType: 'Standard' },
            items: []
        };
        const migrated = migrateOrderHandlings(order);
        expect(migrated.items).toEqual([]);
    });
});
