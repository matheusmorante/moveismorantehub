import type { FiscalSnapshotCandidate } from '../../../../../../../api/nfe/fiscalSnapshot';
export const makeInterstateFacts = (options?: {
  recipientUf?: string;
  deliveryMethod?: 'delivery' | 'pickup';
  cfop?: string;
  isService?: boolean;
}): FiscalSnapshotCandidate => {
  const uf = options?.recipientUf || 'SC';
  const method = options?.deliveryMethod || 'delivery';
  const cfop = options?.cfop || (method === 'pickup' || uf === 'PR' ? '5102' : '6102');
  const cityName = uf === 'PR' ? 'Curitiba' : uf === 'SP' ? 'São Paulo' : 'Joinville';
  const zipCode = uf === 'PR' ? '80010000' : uf === 'SP' ? '01001000' : '89201000';

  return {
    schemaVersion: 1,
    capturedAt: '2026-09-30T13:00:00Z',
    order: {
      id: 'TEST_ORDER_INTERSTATE_CFOP',
      type: 'sale',
      status: 'fulfilled',
      deleted: false,
      version: 1,
      updatedAt: '2026-09-30T12:00:00Z',
      data: {
        shipping: {
          value: 50,
          deliveryMethod: method,
          deliveryAddress: {
            street: 'Rua das Flores',
            number: '123',
            neighborhood: 'Centro',
            city: cityName,
            state: uf,
            zipCode,
          },
        },
        items: [
          {
            productId: 'PROD-MOVEL-1',
            quantity: 1,
            description: 'ROUPEIRO CASAL 6 PORTAS',
            unitPrice: 1200,
            unitDiscount: 0,
            discountType: 'fixed',
            itemType: options?.isService ? 'service' : 'product',
          },
        ],
        payments: [{ method: 'PIX', amount: 1250 }],
      },
    },
    issuerProfile: {
      companyCnpj: '44512248000107',
      companyCRT: '1',
      companyUF: 'PR',
      companyName: 'MOVEIS MORANTE LTDA',
      companyIE: '9091234567',
      companyLogradouro: 'R. Cascavel',
      companyNumero: '306',
      companyBairro: 'Guaraituba',
      companyCMun: '4105805',
      companyXMun: 'Colombo',
      companyCEP: '83410270',
    },
    fiscalInputs: {
      products: {
        'PROD-MOVEL-1': {
          ncm: '94035000',
          cfop: '5102', // Cadastro interno padrão no catálogo
        },
      },
      customer: {
        id: 'CUST-SC-01',
        fullName: 'CLIENTE SANTA CATARINA',
        personType: 'PF',
        cpfCnpj: '12345678909',
        address: JSON.stringify({
          street: 'Rua das Flores',
          number: '123',
          neighborhood: 'Centro',
          city: cityName,
          state: uf,
          zipCode,
        }),
      },
      contributionDecision: {
        scope: { model: '55', operation: 'normal_sale', issuerCrt: '1' },
        pis: { cst: '99', base: 0, rate: 0, value: 0 },
        cofins: { cst: '99', base: 0, rate: 0, value: 0 },
        confirmedAt: '2026-09-01T00:00:00Z',
        confirmedBy: 'TEST_UNIT_APPROVED',
        productionApproved: false,
      },
    },
    emissionRequest: {
      id: 'em-req-interstate-1',
      environment: 2,
      finalConsumer: true,
      deliveryByIssuer: method === 'delivery',
      cardNotIntegrated: true,
      recipientTaxId: '12345678909',
      itemCsosnOverrides: { '1': '102' },
      itemFiscalSelections: {
        '1': {
          ncm: '94035000',
          cfop,
          origem: '0',
          cest: '',
          csosn: '102',
        },
      },
    },
  };
};
