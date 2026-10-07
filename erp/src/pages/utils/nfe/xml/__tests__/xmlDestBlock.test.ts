import { describe, expect, it } from 'vitest';
import { buildDestXml } from '../xmlDestBlock';
import type Order from '@/pages/types/order.type';

function createOrderWithCustomer(customerData: Partial<Order['customerData']>, fiscalContext?: Order['fiscalContext']): Order {
  return {
    id: 'ord-123',
    date: '2026-10-06',
    customerData: {
      fullName: 'Cliente de Teste',
      personType: 'PJ',
      cpfCnpj: '12345678000195',
      fullAddress: {
        street: 'Rua das Flores',
        number: '123',
        neighborhood: 'Centro',
        city: 'Curitiba',
        state: 'PR',
        cep: '80000000',
        cityCode: '4106902',
      },
      ...customerData,
    },
    fiscalContext,
    shipping: {
      deliveryMethod: 'delivery',
      freightMode: '9',
    },
    items: [],
    payments: [],
    paymentsSummary: {
      totalOrderValue: 200,
      totalPaymentsFee: 0,
      totalAmountPaid: 200,
      amountRemaining: 0,
    },
    observation: '',
  };
}

describe('buildDestXml - Tratamento de Inscrição Estadual e indIEDest', () => {
  it('gera indIEDest=1 e tag IE para destinatário contribuinte do ICMS', () => {
    const order = createOrderWithCustomer(
      { personType: 'PJ', ie: '9012345678', ieIndicator: '1' },
      { recipientIeIndicator: '1' }
    );
    const xml = buildDestXml(order, false, '55');

    expect(xml).toContain('<indIEDest>1</indIEDest>');
    expect(xml).toContain('<IE>9012345678</IE>');
  });

  it('gera indIEDest=2 e NENHUMA tag IE para destinatário contribuinte isento', () => {
    const order = createOrderWithCustomer(
      { personType: 'PJ', ie: '', ieIndicator: '2' },
      { recipientIeIndicator: '2' }
    );
    const xml = buildDestXml(order, false, '55');

    expect(xml).toContain('<indIEDest>2</indIEDest>');
    expect(xml).not.toContain('<IE>');
  });

  it('gera indIEDest=9 e nenhuma tag IE para não contribuinte sem IE', () => {
    const order = createOrderWithCustomer(
      { personType: 'PJ', ie: '', ieIndicator: '9' },
      { recipientIeIndicator: '9' }
    );
    const xml = buildDestXml(order, false, '55');

    expect(xml).toContain('<indIEDest>9</indIEDest>');
    expect(xml).not.toContain('<IE>');
  });

  it('gera indIEDest=9 com tag IE se não contribuinte possuir IE informada', () => {
    const order = createOrderWithCustomer(
      { personType: 'PJ', ie: '12345678', ieIndicator: '9' },
      { recipientIeIndicator: '9' }
    );
    const xml = buildDestXml(order, false, '55');

    expect(xml).toContain('<indIEDest>9</indIEDest>');
    expect(xml).toContain('<IE>12345678</IE>');
  });

  it('lança erro se destinatário for contribuinte (indIEDest=1) mas não possuir IE', () => {
    const order = createOrderWithCustomer(
      { personType: 'PJ', ie: '', ieIndicator: '1' },
      { recipientIeIndicator: '1' }
    );
    expect(() => buildDestXml(order, false, '55')).toThrow(
      'Destinatário contribuinte do ICMS exige Inscrição Estadual.'
    );
  });
});
