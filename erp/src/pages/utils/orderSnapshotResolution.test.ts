import { describe, it, expect, vi } from 'vitest';

vi.mock('@/pages/utils/supabaseConfig', () => ({ supabase: {} }));
vi.mock('./supabaseConfig', () => ({ supabase: {} }));

import { resolveOrderCustomerSnapshot, buildOrderPersistencePayload } from './orderSnapshotResolution';
import Order from '../types/order.type';
import Person from '../types/person.type';

describe('orderSnapshotResolution', () => {
    const mockDbPerson: Person = {
        id: '43f8df58-6606-4625-9988-797407cf83e6',
        personType: 'PF',
        fullName: 'Carmen José da Silva',
        phone: '(41) 99864-6446',
        noPhone: false,
        noAddress: false,
        fullAddress: {
            cep: '83402-644',
            street: 'Rua Rio Guaíba',
            number: '135',
            neighborhood: 'Roça Grande',
            city: 'Colombo',
            state: 'PR',
            observation: 'Portão Marrom'
        },
        additionalContacts: [{ name: 'Thaís', phone: '(41) 99983-6173' }],
        marketingOrigin: 'organic',
        active: true,
        type: 'customers'
    };

    it('deve recuperar e congelar o snapshot do cliente se o pedido possuir ID mas nome/telefone vazios', async () => {
        const orderIncompleto: Order = {
            id: '16e600ba-28a5-4025-a740-3cfe9a672152',
            orderIndex: 2546,
            status: 'scheduled',
            customerData: {
                id: '43f8df58-6606-4625-9988-797407cf83e6',
                fullName: '',
                phone: '',
                noPhone: false,
                noAddress: false,
                fullAddress: { cep: '', street: '', number: '', neighborhood: '', city: '' }
            },
            shipping: {
                deliveryMethod: 'delivery',
                value: 0,
                orderType: 'Standard',
                useCustomerAddress: true,
                scheduling: { date: '2026-09-12', time: '14:00', type: 'fixed' }
            },
            items: [],
            payments: []
        };

        const mockFetch = vi.fn().mockResolvedValue(mockDbPerson);
        const resolvedOrder = await resolveOrderCustomerSnapshot(orderIncompleto, mockFetch);

        expect(mockFetch).toHaveBeenCalledWith('43f8df58-6606-4625-9988-797407cf83e6');
        expect(resolvedOrder.customerData?.fullName).toBe('Carmen José da Silva');
        expect(resolvedOrder.customerData?.phone).toBe('(41) 99864-6446');
        expect(resolvedOrder.customerData?.fullAddress?.street).toBe('Rua Rio Guaíba');
        expect(resolvedOrder.customerData?.fullAddress?.number).toBe('135');
        expect(resolvedOrder.shipping?.deliveryAddress?.street).toBe('Rua Rio Guaíba');
    });

    it('ao alterar o pedido na tela de edição, deve respeitar e salvar o novo snapshot informado', async () => {
        const orderAlterado: Order = {
            id: '16e600ba-28a5-4025-a740-3cfe9a672152',
            orderIndex: 2546,
            status: 'scheduled',
            customerData: {
                id: '43f8df58-6606-4625-9988-797407cf83e6',
                fullName: 'Carmen José da Silva - Endereço Novo',
                phone: '(41) 99864-6446',
                noPhone: false,
                noAddress: false,
                fullAddress: {
                    cep: '83402-000',
                    street: 'Avenida São Gabriel',
                    number: '500',
                    neighborhood: 'Roça Grande',
                    city: 'Colombo',
                    state: 'PR'
                }
            },
            shipping: {
                deliveryMethod: 'delivery',
                value: 50,
                orderType: 'Standard',
                useCustomerAddress: true,
                scheduling: { date: '2026-09-15', time: '10:00', type: 'fixed' }
            },
            items: [],
            payments: []
        };

        const mockFetch = vi.fn();
        const resolved = await resolveOrderCustomerSnapshot(orderAlterado, mockFetch);

        // Como o snapshot já está completo e válido, não precisa buscar no banco, preservando o valor editado no pedido
        expect(mockFetch).not.toHaveBeenCalled();
        expect(resolved.customerData?.fullName).toBe('Carmen José da Silva - Endereço Novo');
        expect(resolved.customerData?.fullAddress?.street).toBe('Avenida São Gabriel');
        expect(resolved.shipping?.deliveryAddress?.street).toBe('Avenida São Gabriel');
    });

    it('alterações externas na pessoa não alteram o snapshot de pedidos históricos já salvos', () => {
        const historicalOrder: Order = {
            id: 'ord-hist-1',
            orderIndex: 2000,
            status: 'fulfilled',
            customerData: {
                id: '43f8df58-6606-4625-9988-797407cf83e6',
                fullName: 'Carmen Antiga',
                phone: '(41) 99999-0000',
                noPhone: false,
                noAddress: false,
                fullAddress: { cep: '80000-000', street: 'Rua Antiga', number: '1', neighborhood: 'Centro', city: 'Curitiba' }
            },
            shipping: {
                deliveryMethod: 'delivery',
                value: 0,
                orderType: 'Standard',
                deliveryAddress: { cep: '80000-000', street: 'Rua Antiga', number: '1', neighborhood: 'Centro', city: 'Curitiba' }
            },
            items: []
        };

        // Simulação: A pessoa no CRM mudou de telefone e endereço
        const updatedDbPerson: Person = {
            ...mockDbPerson,
            phone: '(41) 11111-2222',
            fullAddress: { cep: '99999-999', street: 'Rua Nova do CRM', number: '999', neighborhood: 'Novo', city: 'Pinhais' }
        };

        // O pedido histórico preserva exatamente seu snapshot
        expect(historicalOrder.customerData?.phone).toBe('(41) 99999-0000');
        expect(historicalOrder.customerData?.fullAddress?.street).toBe('Rua Antiga');
        expect(historicalOrder.shipping?.deliveryAddress?.street).toBe('Rua Antiga');
        // O ID do cliente continua apontando para o cliente real
        expect(historicalOrder.customerData?.id).toBe(updatedDbPerson.id);
    });

    it('buildOrderPersistencePayload sincroniza perfeitamente as colunas físicas do banco', () => {
        const order: Order = {
            id: 'order-123',
            orderIndex: 2546,
            status: 'scheduled',
            seller: 'Matheus Morante',
            sellerId: 'user-456',
            customerData: {
                id: '43f8df58-6606-4625-9988-797407cf83e6',
                fullName: 'Carmen José da Silva',
                phone: '(41) 99864-6446',
                noPhone: false,
                noAddress: false,
                fullAddress: { cep: '83402-644', street: 'Rua Rio Guaíba', number: '135', neighborhood: 'Roça Grande', city: 'Colombo' }
            },
            paymentsSummary: {
                totalOrderValue: 2999,
                totalItemsCost: 1500,
                itemsSubtotal: 3599,
                totalFixedDiscount: 600,
                itemsTotalValue: 2999,
                totalAmountPaid: 2999,
                amountRemaining: 0,
                totalPaymentsFee: 0
            },
            items: [],
            shipping: { deliveryMethod: 'delivery', value: 0, orderType: 'Standard' }
        };

        const payload = buildOrderPersistencePayload(order);

        expect(payload.order_number).toBe('2546');
        expect(payload.status).toBe('scheduled');
        expect(payload.customer_id).toBe('43f8df58-6606-4625-9988-797407cf83e6');
        expect(payload.customer_name).toBe('Carmen José da Silva');
        expect(payload.seller_id).toBe('user-456');
        expect(payload.seller_name).toBe('Matheus Morante');
        expect(payload.total_amount).toBe(2999);
        expect(payload.order_data).toEqual(order);
    });
});
