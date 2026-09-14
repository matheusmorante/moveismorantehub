import { describe, expect, it } from 'vitest';
import { capitalizeOrder } from './formatters';

describe('capitalizeOrder', () => {
    it('formata um pedido sem depender de variável global', () => {
        const order = capitalizeOrder({
            id: 'order-test',
            customerData: {
                fullName: 'MARIA DA SILVA',
                fullAddress: { street: 'RUA DAS FLORES', city: 'CURITIBA' },
            },
            items: [],
        } as any);

        expect(order.customerData.fullName).toBe('Maria da Silva');
        expect(order.customerData.fullAddress.street).toBe('Rua das Flores');
    });
});
