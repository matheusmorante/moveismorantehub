import { describe, expect, it } from 'vitest';
import { assertNoSeparateFulfillments } from '../orderMutation/orderUpdateSchema';

describe('conclusão de pedido com agendamentos', () => {
  const items = [{ orderItemId: 'i', quantity: 2 }];
  const appointment = { id: 'a', itemIds: ['i'], itemQuantities: { i: 2 } };
  const order = { orderType: 'sale', items, shipping: { scheduling: { appointments: [appointment] } } } as any;

  it('permite conclusão do pedido simples e cadastro de pedido com vários agendamentos', () => {
    expect(() => assertNoSeparateFulfillments(order, 'fulfilled')).not.toThrow();
    const multiple = { ...order, shipping: { scheduling: { appointments: [appointment, { ...appointment, id: 'b' }] } } };
    expect(() => assertNoSeparateFulfillments(multiple, 'scheduled')).not.toThrow();
    expect(() => assertNoSeparateFulfillments(multiple, 'fulfilled')).toThrow('conclusão individual');
  });

  it('impede concluir quando parte das unidades não está no agendamento', () => {
    const partial = { ...order, shipping: { scheduling: { appointments: [{ ...appointment, itemQuantities: { i: 1 } }] } } };
    expect(() => assertNoSeparateFulfillments(partial, 'fulfilled')).toThrow('conclusão individual');
  });
});
