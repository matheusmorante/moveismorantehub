import { describe, expect, it } from 'vitest';
import type { FiscalDocument, FiscalSnapshotCandidate } from '../../../../../../api/nfe/fiscalSnapshot';
import { findFiscalOrderEditChanges } from '../../../../../../api/nfe/orderEditFiscalAudit';

const originalOrderData: Record<string, any> = {
  items: [
    {
      orderItemId: 'item-sofa',
      productId: 'product-sofa',
      code: 'SOFA-01',
      description: 'Sofá',
      quantity: 1,
      unitPrice: 2000,
      unitDiscount: 0,
      discountType: 'fixed',
      itemType: 'product',
    },
  ],
  shipping: { deliveryMethod: 'pickup', value: 0, useCustomerAddress: true },
  payments: [{ method: 'Dinheiro', amount: 2000, status: 'Pago', fee: 0, feeType: 'fixed' }],
  paymentsSummary: { totalOrderValue: 2000, totalAmountPaid: 2000 },
  customerData: {
    id: 'customer-internal-1',
    fullName: 'CLIENTE TESTE',
    cpfCnpj: '12345678909',
    ie: '',
    ieIndicator: '9',
    fullAddress: {
      street: 'Rua Teste',
      number: '10',
      neighborhood: 'Centro',
      city: 'Colombo',
      state: 'PR',
      cep: '83400000',
    },
  },
  fiscalContext: {},
};

const fiscalDocument: FiscalDocument = {
  snapshotHash: 'a'.repeat(64),
  ruleSetVersion: 'NORMAL_SALE_V1',
  model: '65',
  environment: 2,
  issuer: {
    cnpj: '44512248000107',
    name: 'MORANTE TESTE',
    ie: '123456789',
    crt: '1',
    municipalityCode: '4105805',
    address: {
      street: 'Rua Emitente',
      number: '1',
      district: 'Centro',
      municipalityCode: '4105805',
      municipality: 'Colombo',
      uf: 'PR',
      postalCode: '83400000',
    },
  },
  recipient: {
    name: 'CLIENTE TESTE',
    cpfCnpj: '12345678909',
    personType: 'PF',
    ieIndicator: '9',
    address: {
      street: 'Rua Teste',
      number: '10',
      district: 'Centro',
      municipalityCode: '4105805',
      municipality: 'Colombo',
      uf: 'PR',
      postalCode: '83400000',
    },
  },
  operation: {
    natureOfOperation: 'VENDA',
    direction: 'outbound',
    purpose: '1',
    destination: '1',
    presence: '1',
    finalConsumer: '1',
    freightMode: '9',
  },
  items: [
    {
      itemNumber: 1,
      product: {
        code: 'SOFA-01',
        description: 'Sofá',
        gtin: 'SEM GTIN',
        quantity: 1,
        unitValue: 2000,
        gross: 2000,
        discount: 0,
        freight: 0,
        insurance: 0,
        otherExpenses: 0,
      },
      classification: { ncm: '94016100', cest: '2806000', origin: '0', cfop: '5102', unit: 'UN' },
      taxes: [],
      decisions: [],
    },
  ],
  payments: [{ methodCode: '01', amount: 2000, paymentIndicator: '0', decision: {} as any }],
  totals: {
    icmsBase: 0,
    products: 2000,
    discount: 0,
    freight: 0,
    insurance: 0,
    otherExpenses: 0,
    icms: 0,
    icmsExempt: 0,
    fcp: 0,
    icmsStBase: 0,
    icmsSt: 0,
    fcpSt: 0,
    fcpStRetained: 0,
    ii: 0,
    ipi: 0,
    ipiReturned: 0,
    pis: 0,
    cofins: 0,
    invoice: 2000,
    payment: 2000,
    change: 0,
  },
  decisions: [],
};

function createSnapshot(): FiscalSnapshotCandidate {
  return {
    schemaVersion: 1,
    capturedAt: '2026-10-09T12:00:00.000Z',
    order: {
      id: 'order-1',
      type: 'sale',
      status: 'scheduled',
      version: 1,
      updatedAt: '2026-10-09T11:59:00.000Z',
      data: structuredClone(originalOrderData),
    },
    issuerProfile: {},
    fiscalInputs: {},
    resolvedDocument: fiscalDocument,
    emissionRequest: {
      id: 'emission-1',
      requestedModel: '65',
      environment: 2,
      series: '1',
      number: 123,
      modelDecision: {
        status: 'ready',
        model: '65',
        finalConsumer: true,
        policyVersion: 'PR_RETAIL_2026_10',
      } as any,
    },
  };
}

describe('auditoria fiscal de edição do pedido', () => {
  it('não pede cancelamento para mudanças exclusivamente administrativas', () => {
    const proposed = structuredClone(originalOrderData);
    proposed.scheduledDate = '2026-10-15';
    proposed.scheduledTime = '14:00';
    proposed.seller = 'VENDEDOR TESTE';
    proposed.observation = 'Aguardar cliente ligar';

    expect(findFiscalOrderEditChanges(createSnapshot(), proposed, fiscalDocument)).toEqual([]);
  });

  it('identifica quantidade e total divergentes do XML autorizado', () => {
    const proposed = structuredClone(originalOrderData);
    proposed.items[0].quantity = 2;
    proposed.paymentsSummary.totalOrderValue = 4000;

    const changes = findFiscalOrderEditChanges(createSnapshot(), proposed, fiscalDocument);
    expect(changes.map((change) => change.field)).toContain('itens[1].quantidade');
    expect(changes.map((change) => change.field)).toContain('total.valorPedidoCalculado');
  });

  it('identifica cliente e endereço diferentes do destinatário autorizado', () => {
    const proposed = structuredClone(originalOrderData);
    proposed.customerData.cpfCnpj = '98765432100';
    proposed.customerData.fullAddress.number = '22';

    const changes = findFiscalOrderEditChanges(createSnapshot(), proposed, fiscalDocument);
    expect(changes.map((change) => change.field)).toContain('dest.CNPJ/CPF');
    expect(changes.map((change) => change.field)).toContain('dest.enderDest.numero');
  });

  it('só pede cancelamento por pagamento quando o XML fiscal projetado muda', () => {
    const proposed = structuredClone(originalOrderData);
    proposed.payments = [
      { method: 'PIX', amount: 2000, status: 'Pago', fee: 0, feeType: 'fixed' },
    ];

    const changes = findFiscalOrderEditChanges(createSnapshot(), proposed, fiscalDocument);
    expect(changes.map((change) => change.field)).toContain('pag.detPag[1].tPag');
  });

  it('compara CST de PIS e COFINS com os grupos tributários autorizados', () => {
    const proposed = structuredClone(originalOrderData);
    proposed.items[0].fiscal = { pisCst: '01', cofinsCst: '01' };
    const document = structuredClone(fiscalDocument);
    document.items[0].taxes = [
      { group: 'PIS', codeSystem: 'CST', code: '01', values: {}, decisionId: 'pis' },
      { group: 'COFINS', codeSystem: 'CST', code: '01', values: {}, decisionId: 'cofins' },
    ];

    const snapshot = createSnapshot();
    snapshot.order.data.items[0].fiscal = { pisCst: '01', cofinsCst: '01' } as any;
    proposed.items[0].fiscal.pisCst = '99';

    const changes = findFiscalOrderEditChanges(snapshot, proposed, document);
    expect(changes.map((change) => change.field)).toContain('det[1].imposto.PIS.CST');
  });

  it('reconfere escolhas fiscais que podem mudar o modelo ou a finalidade da nota', () => {
    const proposed = structuredClone(originalOrderData);
    proposed.fiscalContext.requiresTaxCredit = true;
    proposed.fiscalContext.publicAdministrationRequirement = true;

    const changes = findFiscalOrderEditChanges(createSnapshot(), proposed, fiscalDocument);
    expect(changes.map((change) => change.field)).toContain('fiscalContext.requiresTaxCredit');
    expect(changes.map((change) => change.field)).toContain(
      'fiscalContext.publicAdministrationRequirement'
    );
  });
});
