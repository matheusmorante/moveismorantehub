import { describe, expect, it } from 'vitest';
import { validateOrderForNfe } from '../nfeValidator';

const settings = {
  companyCnpj: '44512248000107',
  companyName: 'Morante Móveis',
  companyIE: '123',
  companyCRT: '1',
  companyLogradouro: 'Rua A',
  companyNumero: '10',
  companyBairro: 'Centro',
  companyCEP: '83410000',
  companyCMun: '4105805',
  companyXMun: 'Colombo',
  companyUF: 'PR',
} as any;

function orderWithNcm(ncm: string) {
  return {
    items: [{ description: 'Produto avulso', quantity: 1, unitPrice: 100, fiscal: { ncm } }],
    shipping: { deliveryMethod: 'pickup' },
    paymentsSummary: { totalOrderValue: 100 },
  } as any;
}

describe('outbound fiscal preflight', () => {
  it('accepts a manually entered eight-digit NCM for an unregistered order item', () => {
    const validation = validateOrderForNfe(orderWithNcm('94035000'), settings);
    expect(validation.errors.some((error) => error.includes('NCM'))).toBe(false);
  });

  it('identifies a missing NCM by item before transmission', () => {
    const validation = validateOrderForNfe(orderWithNcm(''), settings);
    expect(validation.errors).toContain(
      'Item 1 (Produto avulso): informe um NCM válido de 8 dígitos antes da emissão.'
    );
  });

  it('does not infer indFinal from a legacy boolean when interstate purpose is missing', () => {
    const order = orderWithNcm('85165000');
    order.shipping = { deliveryMethod: 'delivery', value: 0 } as any;
    order.customerData = { fullAddress: { state: 'SC' } } as any;
    order.fiscalContext = { finalConsumer: true };

    const validation = validateOrderForNfe(order, settings);

    expect(validation.errors).toContain(
      'Registre no pedido se a compra é para revenda, uso/consumo ou ativo imobilizado.'
    );
    expect(validation.errors).toContain('Informe se o adquirente é consumidor final.');
  });
});
