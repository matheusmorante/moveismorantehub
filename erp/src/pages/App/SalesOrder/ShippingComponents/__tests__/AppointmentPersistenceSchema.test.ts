import { describe, expect, it } from 'vitest';
import { orderDraftFormSchema } from '../../../../../../../shared-utils/orderDomainValidation';

describe('persistência das operações de venda', () => {
  it('preserva endereço, frete, distância e avisos de cada operação no rascunho', () => {
    const source = {
      orderType: 'sale',
      status: 'draft',
      date: '2026-11-16',
      seller: '',
      items: [],
      payments: [],
      shipping: {
        deliveryMethod: 'delivery',
        value: 36,
        distance: 4,
        scheduling: {
          date: '',
          endDate: '',
          dateType: 'fixed',
          time: '',
          startTime: '',
          endTime: '',
          type: 'fixed',
          appointments: [{
            id: 'operation-delivery',
            itemIds: ['item-1'],
            itemQuantities: { 'item-1': 1 },
            deliveryMethod: 'delivery',
            useCustomerAddress: false,
            deliveryAddress: {
              street: 'Rua das Flores',
              number: '25',
              city: 'Colombo',
              state: 'PR',
              formattedAddress: 'Rua das Flores, 25, Colombo - PR',
            },
            freightValue: 36,
            distance: 4,
            notices: {
              callBeforeDelivery: true,
              bringCardMachine: false,
              callOnArrival: true,
            },
            scheduling: {
              date: '2026-11-20',
              endDate: '',
              dateType: 'fixed',
              time: '09:00 às 12:00',
              startTime: '09:00',
              endTime: '12:00',
              type: 'range',
            },
          }],
        },
      },
    };

    const parsed = orderDraftFormSchema.parse(source);
    const parsedScheduling = (parsed.shipping as unknown as {
      scheduling?: { appointments?: Array<Record<string, unknown>> };
    } | undefined)?.scheduling;
    expect(parsedScheduling?.appointments?.[0]).toMatchObject({
      useCustomerAddress: false,
      deliveryAddress: {
        street: 'Rua das Flores',
        number: '25',
        city: 'Colombo',
        formattedAddress: 'Rua das Flores, 25, Colombo - PR',
      },
      freightValue: 36,
      distance: 4,
      notices: {
        callBeforeDelivery: true,
        bringCardMachine: false,
        callOnArrival: true,
      },
    });
  });
});
