import { describe, expect, it } from 'vitest';
import {
  getFulfillmentLabels as getErpFulfillmentLabels,
  getOrderStatusLabel as getErpOrderStatusLabel,
} from '../orderStatusPresentation';
import {
  getFulfillmentLabels as getMobileFulfillmentLabels,
  getOrderStatusLabel as getMobileOrderStatusLabel,
} from '../../../../../mobile/src/features/orders/domain/orderStatusPresentation';

describe('apresentação do status fulfilled entre ERP e aplicativo', () => {
  const presentations = [
    ['ERP', getErpFulfillmentLabels, getErpOrderStatusLabel],
    ['Aplicativo', getMobileFulfillmentLabels, getMobileOrderStatusLabel],
  ] as const;

  it.each(presentations)('%s apresenta entregas como Entregue', (_name, getLabels, getStatusLabel) => {
    const order = { status: 'fulfilled', shipping: { deliveryMethod: 'delivery' } };

    expect(getLabels(order)).toMatchObject({
      status: 'Entregue',
      preFulfillmentStatus: 'Agendado',
      confirmAction: 'Confirmar entrega',
      correctionAction: 'Corrigir entrega',
      confirmationQuestion: 'A entrega já foi confirmada?',
      successMessage: 'Pedido entregue com sucesso.',
    });
    expect(getStatusLabel(order)).toBe('Entregue');
    expect(order.status).toBe('fulfilled');
  });

  it.each(presentations)('%s apresenta retiradas como Retirado', (_name, getLabels, getStatusLabel) => {
    const order = { status: 'fulfilled', shipping: { deliveryMethod: 'pickup' } };

    expect(getLabels(order)).toMatchObject({
      status: 'Retirado',
      preFulfillmentStatus: 'Aguardando retirada',
      confirmAction: 'Confirmar retirada',
      correctionAction: 'Corrigir retirada',
      confirmationQuestion: 'A retirada já foi confirmada?',
      successMessage: 'Pedido retirado com sucesso.',
    });
    expect(getStatusLabel(order)).toBe('Retirado');
    expect(order.status).toBe('fulfilled');
  });

  it.each(presentations)('%s mantém entrega agendada como Agendado', (_name, _getLabels, getStatusLabel) => {
    expect(
      getStatusLabel({ status: 'scheduled', shipping: { deliveryMethod: 'delivery' } }, 'Agendado')
    ).toBe('Agendado');
  });

  it.each(presentations)('%s apresenta retirada agendada como Aguardando retirada', (_name, _getLabels, getStatusLabel) => {
    expect(
      getStatusLabel({ status: 'scheduled', shipping: { deliveryMethod: 'pickup' } }, 'Agendado')
    ).toBe('Aguardando retirada');
  });

  it.each(presentations)('%s mantém pedidos antigos com status atendido legíveis', (_name, _getLabels, getStatusLabel) => {
    expect(
      getStatusLabel({ status: 'atendido', shipping: { deliveryMethod: 'delivery' } })
    ).toBe('Entregue');
    expect(
      getStatusLabel({ status: 'atendido', shipping: { deliveryMethod: 'pickup' } })
    ).toBe('Retirado');
  });

  it.each(presentations)('%s apresenta devoluções por coleta como Coletada', (_name, getLabels, getStatusLabel) => {
    const returnOrder = {
      status: 'fulfilled',
      orderType: 'return',
      returnMethod: 'store_collection',
    };

    expect(getLabels(returnOrder)).toMatchObject({ status: 'Coletada', confirmAction: 'Confirmar coleta' });
    expect(getStatusLabel(returnOrder)).toBe('Coletada');
  });

  it.each(presentations)('%s apresenta devolução trazida à loja como Recebida', (_name, getLabels, getStatusLabel) => {
    const order = { status: 'fulfilled', orderType: 'return', returnMethod: 'store_delivery' };
    expect(getLabels(order).status).toBe('Recebida');
    expect(getStatusLabel(order)).toBe('Recebida');
  });

  it.each(presentations)('%s apresenta coleta pendente como Aguardando coleta', (_name, _getLabels, getStatusLabel) => {
    expect(getStatusLabel({ status: 'scheduled', orderType: 'return', returnMethod: 'store_collection' })).toBe('Aguardando coleta');
  });
});
