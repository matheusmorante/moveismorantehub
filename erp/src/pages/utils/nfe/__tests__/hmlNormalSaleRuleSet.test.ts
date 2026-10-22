import { beforeAll, afterAll, describe, it, expect, vi } from 'vitest';
import { createHmlNormalSaleRuleSet } from '../../../../../../api/nfe/hmlNormalSaleRuleSet';
import { createNormalSaleRuleSet } from '../../../../../../api/nfe/normalSaleRuleSet';
import { initialHmlCsosnConfiguration } from '../../../../../../api/nfe/csosnPolicy';
import {
  resolveFiscalDocument,
  type FiscalSnapshotCandidate,
} from '../../../../../../api/nfe/fiscalSnapshot';
import { assertFiscalDocumentMatchesCommercialSnapshot } from '../../../../../../api/nfe/fiscalXmlAudit';
import { generateNfeAccessKey } from '../nfeAccessKey';
import { serializeFiscalDocument } from '../../../../../../api/nfe/fiscalXmlSerializer';
import {
  validateUnsignedNfeStructure,
  validateNfeAgainstOfficialSchema,
} from '../../../../../../api/nfe/schemaValidator';
import { signNfeXml } from '../../../../../../api/nfe/nfeSigner';
import forge from 'node-forge';
const makeFacts = (): FiscalSnapshotCandidate => ({
  schemaVersion: 1,
  capturedAt: '2026-09-30T13:00:00Z',
  order: {
    id: 'TEST_UNIT_REAL_FLOW',
    type: 'sale',
    status: 'fulfilled',
    deleted: false,
    version: 1,
    updatedAt: '2026-09-30T12:00:00Z',
    data: {
      shipping: { value: 30, deliveryMethod: 'pickup' },
      customerData: {
        fullAddress: JSON.stringify({
          street: 'RUA TESTE',
          number: '10',
          neighborhood: 'CENTRO',
          city: 'Curitiba',
          state: 'PR',
          cep: '80010000',
        }),
      },
      items: [
        {
          productId: 'P-1',
          quantity: 1,
          description: 'BALCÃO TESTE UNITÁRIO',
          unitPrice: 349,
          unitDiscount: 0,
          discountType: 'fixed',
        },
      ],
      payments: [{ method: 'Cartão de Crédito 10x', amount: 379 }],
    },
  },
  issuerProfile: {
    companyCnpj: '12345678000195',
    companyCRT: '1',
    companyUF: 'PR',
    companyName: 'EMPRESA TESTE UNITÁRIO',
    companyIE: '1234567890',
    companyLogradouro: 'RUA TESTE',
    companyNumero: '10',
    companyBairro: 'CENTRO',
    companyCMun: '4105805',
    companyXMun: 'COLOMBO',
    companyCEP: '83410270',
  },
  fiscalInputs: {
    products: { 'P-1': { ncm: '94036000' } },
    customer: {
      id: 'TEST_UNIT_CUSTOMER',
      fullName: 'CLIENTE TESTE UNITÁRIO',
      personType: 'PF',
      cpfCnpj: '12345678909',
      address: JSON.stringify({
        street: 'RUA TESTE',
        number: '10',
        neighborhood: 'CENTRO',
        city: 'Curitiba',
        state: 'PR',
        cep: '80010000',
      }),
    },
    contributionDecision: {
      scope: { models: ['55', '65'], operation: 'normal_sale', issuerCrt: '1' },
      pis: { cst: '99', base: 0, rate: 0, value: 0 },
      cofins: { cst: '99', base: 0, rate: 0, value: 0 },
      confirmedAt: '2026-09-01T00:00:00Z',
      confirmedBy: 'TEST_UNIT_APPROVED',
      productionApproved: false,
    },
  },
  emissionRequest: {
    id: 'f19b3e63-6f84-45ea-8c5f-39476d709a3d',
    environment: 2,
    finalConsumer: false,
    recipientIeIndicator: '1',
    recipientIe: '1234567890',
    itemFiscalSelections: {
      '1': { ncm: '94034000', cfop: '5102', origem: '2', cest: '', csosn: '103' },
    },
  },
});

describe('pedido real no fluxo normal de homologação (fatos unitários controlados)', () => {
  beforeAll(() =>
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: true, json: async () => [{ id: 4106902, nome: 'Curitiba' }] }))
    )
  );
  afterAll(() => vi.unstubAllGlobals());
  it.each([
    { model: '55', environment: 1 },
    { model: '55', environment: 2 },
    { model: '65', environment: 1 },
    { model: '65', environment: 2 },
  ] as const)('reconcilia R$ 799 mais R$ 19,96 de taxa no modelo $model e ambiente $environment', async ({ model, environment }) => {
    const facts = makeFacts();
    facts.emissionRequest.environment = environment;
    facts.emissionRequest.hasTransport = false;
    facts.emissionRequest.cardNotIntegrated = true;
    facts.order.data.shipping = { value: 0, deliveryMethod: 'pickup' };
    facts.order.data.items = [
      { productId: 'P-1', quantity: 1, description: 'ITEM TESTE', unitPrice: 799, unitDiscount: 0, discountType: 'fixed' },
    ];
    facts.order.data.payments = [
      { method: 'Cartão de Crédito', status: 'Pago', amount: 499, fee: 4, feeType: 'percentage', installments: 1 },
      { method: 'Verificar', status: 'Pendente', amount: 300, fee: 0, feeType: 'fixed', installments: 1 },
    ];
    facts.order.data.paymentsSummary = {
      totalPaymentsFee: 19.96,
      totalOrderValue: 818.96,
      totalAmountPaid: 518.96,
      amountRemaining: 300,
    };
    facts.fiscalInputs!.contributionDecision = {
      ...(facts.fiscalInputs!.contributionDecision as Record<string, any>),
      productionApproved: environment === 1,
    };
    if (model === '65') {
      facts.emissionRequest.finalConsumer = true;
      facts.emissionRequest.recipientIeIndicator = '9';
      facts.emissionRequest.recipientIe = '';
      facts.emissionRequest.recipientTaxId = '';
      facts.fiscalInputs!.customer = {};
    }
    const frozenFacts = structuredClone(facts);
    const rules = await createNormalSaleRuleSet(facts);
    const result = resolveFiscalDocument(facts, rules);
    if (result.status !== 'ready') throw new Error(JSON.stringify(result.blockers));
    expect(result.document.model).toBe(model);
    expect(result.document.items[0].product).toMatchObject({ gross: 799, otherExpenses: 19.96 });
    expect(result.document.totals).toMatchObject({ products: 799, otherExpenses: 19.96, invoice: 818.96, payment: 818.96 });
    expect(result.document.payments.map((payment) => payment.amount)).toEqual([518.96, 300]);
    expect(result.document.additionalInformation).toContain(`O valor total desta ${model === '65' ? 'NFC-e' : 'NF-e'} inclui R$ 19,96`);
    expect(result.document.additionalInformation).toContain('As taxas de maquininha foram rateadas proporcionalmente ao valor líquido dos produtos');
    expect(() => assertFiscalDocumentMatchesCommercialSnapshot(facts, result.document)).not.toThrow();
    expect(facts).toEqual(frozenFacts);

    const accessKey = generateNfeAccessKey({
      ufCode: '41', yearMonth: '2609', cnpj: '12345678000195', model,
      series: 900, number: 911, emissionType: '1', randomCode: '12345678',
    }).accessKey;
    const xml = serializeFiscalDocument(facts, result.document, rules, {
      accessKey, series: 900, number: 911, issuedAt: '2026-09-30T10:00:00-03:00',
    });
    expect(xml).toContain(`<tpAmb>${environment}</tpAmb>`);
    expect(xml.match(/<vOutro>19.96<\/vOutro>/g)).toHaveLength(2);
    expect(xml).toContain('<vNF>818.96</vNF>');
    expect(xml).toContain('<vPag>518.96</vPag>');
    expect(xml).toContain('<vPag>300.00</vPag>');
    const pair = forge.pki.rsa.generateKeyPair({ bits: 2048, workers: 0 });
    const signed = signNfeXml(xml, forge.pki.privateKeyToPem(pair.privateKey), Buffer.from('certificado sintético').toString('base64'));
    await expect(validateNfeAgainstOfficialSchema(signed)).resolves.toBeUndefined();
  });
  it('rateia taxas mistas por pagamento em centavos e conserva vProd, vNF, vPag, infCpl e XSD', async () => {
    const facts = makeFacts();
    facts.order.data.shipping = { value: 0, deliveryMethod: 'pickup' };
    facts.order.data.items = [
      { productId: 'P-1', quantity: 1, description: 'ITEM A', unitPrice: 333.33, unitDiscount: 0, discountType: 'fixed' },
      { productId: 'P-2', quantity: 1, description: 'ITEM B', unitPrice: 333.33, unitDiscount: 0, discountType: 'fixed' },
      { productId: 'P-3', quantity: 1, description: 'ITEM C', unitPrice: 333.34, unitDiscount: 0, discountType: 'fixed' },
    ];
    facts.order.data.payments = [
      { method: 'Cartão de Crédito', status: 'Pago', amount: 500, fee: 0.01, feeType: 'fixed', installments: 3 },
      { method: 'Cartão de Débito', status: 'Pago', amount: 300, fee: 0.01, feeType: 'fixed', installments: 1 },
      { method: 'Dinheiro', status: 'Pago', amount: 200, fee: 0, feeType: 'fixed', installments: 1 },
    ];
    facts.order.data.paymentsSummary = {
      totalPaymentsFee: 0.02,
      totalOrderValue: 1000.02,
      totalAmountPaid: 1000.02,
      amountRemaining: 0,
    };
    facts.emissionRequest.itemFiscalSelections = {
      '1': { ncm: '94034000', cfop: '5102', origem: '2', cest: '', csosn: '103' },
      '2': { ncm: '94036000', cfop: '5102', origem: '2', cest: '', csosn: '103' },
      '3': { ncm: '94039000', cfop: '5102', origem: '2', cest: '', csosn: '103' },
    };

    const rules = await createHmlNormalSaleRuleSet(facts, initialHmlCsosnConfiguration());
    const result = resolveFiscalDocument(facts, rules);
    if (result.status !== 'ready') throw new Error(JSON.stringify(result.blockers));
    expect(result.document.model).toBe('55');
    expect(result.document.items.map((item) => item.product.gross)).toEqual([333.33, 333.33, 333.34]);
    expect(result.document.items.map((item) => item.product.otherExpenses)).toEqual([0.01, 0, 0.01]);
    expect(result.document.totals).toMatchObject({
      products: 1000,
      otherExpenses: 0.02,
      invoice: 1000.02,
      payment: 1000.02,
    });
    expect(result.document.payments.map((payment) => payment.amount)).toEqual([500.01, 300.01, 200]);
    expect(result.document.additionalInformation).toContain('R$ 0,02 em acréscimos');
    expect(result.document.additionalInformation).toContain('condições de parcelamento escolhidas');
    expect(result.document.additionalInformation).toContain('cartão de débito');
    expect(result.document.additionalInformation).toContain('As taxas de maquininha foram rateadas proporcionalmente ao valor líquido dos produtos');
    expect(result.document.additionalInformation).not.toContain('dinheiro');
    expect(() => assertFiscalDocumentMatchesCommercialSnapshot(facts, result.document)).not.toThrow();

    const key = generateNfeAccessKey({
      ufCode: '41', yearMonth: '2610', cnpj: '12345678000195', model: '55',
      series: 900, number: 910, emissionType: '1', randomCode: '12345678',
    }).accessKey;
    const xml = serializeFiscalDocument(facts, result.document, rules, {
      accessKey: key, series: 900, number: 910, issuedAt: '2026-10-01T10:00:00-03:00',
    });
    expect(xml).toContain('<tpAmb>2</tpAmb>');
    expect(xml).toContain('<vProd>333.33</vProd>');
    expect(xml).toContain('<vOutro>0.01</vOutro>');
    expect(xml.match(/<vOutro>0.01<\/vOutro>/g)).toHaveLength(2);
    expect(xml).toContain('<vNF>1000.02</vNF>');
    expect(xml).toContain('<vPag>500.01</vPag>');
    expect(xml).toContain('<vPag>300.01</vPag>');
    expect(xml).toContain('<vPag>200.00</vPag>');
    expect(xml).toContain('<infCpl>O valor total desta NF-e inclui R$ 0,02');
    await expect(validateUnsignedNfeStructure(xml)).resolves.toBeUndefined();
    const pair = forge.pki.rsa.generateKeyPair({ bits: 2048, workers: 0 });
    const signed = signNfeXml(
      xml,
      forge.pki.privateKeyToPem(pair.privateKey),
      Buffer.from('certificado sintético').toString('base64')
    );
    await expect(validateNfeAgainstOfficialSchema(signed)).resolves.toBeUndefined();
  });
  it('explica taxa de cartão em parcela única sem mencionar parcelamento', async () => {
    const facts = makeFacts();
    facts.order.data.payments = [
      { method: 'Cartão de Crédito', status: 'Pago', amount: 379, fee: 10, feeType: 'fixed', installments: 1 },
    ];
    facts.order.data.paymentsSummary = {
      totalPaymentsFee: 10,
      totalOrderValue: 389,
      totalAmountPaid: 389,
      amountRemaining: 0,
    };
    const rules = await createHmlNormalSaleRuleSet(facts, initialHmlCsosnConfiguration());
    const result = resolveFiscalDocument(facts, rules);
    if (result.status !== 'ready') throw new Error(JSON.stringify(result.blockers));
    expect(result.document.totals).toMatchObject({ products: 349, otherExpenses: 10, invoice: 389, payment: 389 });
    expect(result.document.payments[0].amount).toBe(389);
    expect(result.document.additionalInformation).toContain('processamento do cartão de crédito');
    expect(result.document.additionalInformation).not.toContain('parcelamento');
  });
  it('arredonda taxa percentual pela base comercial e reconcilia o consolidado do pedido', async () => {
    const facts = makeFacts();
    facts.order.data.payments = [
      { method: 'Cartão de Crédito', status: 'Pago', amount: 379, fee: 2.7, feeType: 'percentage', installments: 1 },
    ];
    facts.order.data.paymentsSummary = {
      totalPaymentsFee: 10.233,
      totalOrderValue: 389.233,
      totalAmountPaid: 389.233,
      amountRemaining: 0,
    };
    const rules = await createHmlNormalSaleRuleSet(facts, initialHmlCsosnConfiguration());
    const result = resolveFiscalDocument(facts, rules);
    if (result.status !== 'ready') throw new Error(JSON.stringify(result.blockers));
    expect(result.document.items[0].product.gross).toBe(349);
    expect(result.document.items[0].product.otherExpenses).toBe(10.23);
    expect(result.document.totals).toMatchObject({ otherExpenses: 10.23, invoice: 389.23, payment: 389.23 });
    expect(result.document.payments[0].amount).toBe(389.23);
  });
  it('preserva o bloqueio quando falta a decisão tributária da venda normal', async () => {
    const facts = makeFacts();
    facts.order.data.shipping = { value: 0, deliveryMethod: 'pickup' };
    facts.order.data.payments = [{ method: 'Cartão de Crédito', amount: 349, fee: 10, feeType: 'fixed' }];
    facts.order.data.paymentsSummary = { totalPaymentsFee: 10, totalOrderValue: 359, totalAmountPaid: 359, amountRemaining: 0 };
    delete facts.fiscalInputs!.contributionDecision;
    await expect(createNormalSaleRuleSet(facts)).rejects.toThrow('CONTRIBUTION_MODEL_SCOPE_REQUIRED');
  });
  it('bloqueia taxa quando o resumo do pedido diverge das linhas de pagamento', async () => {
    const facts = makeFacts();
    facts.emissionRequest.environment = 1;
    facts.order.data.shipping = { value: 0, deliveryMethod: 'pickup' };
    facts.order.data.payments = [{ method: 'Cartão de Crédito', amount: 349, fee: 10, feeType: 'fixed' }];
    facts.order.data.paymentsSummary = { totalPaymentsFee: 9, totalOrderValue: 358, totalAmountPaid: 358, amountRemaining: 0 };
    await expect(createNormalSaleRuleSet(facts)).rejects.toThrow('não reconciliam');
  });
  it('bloqueia taxa de pagamento sem origem de cartão correspondente', async () => {
    const facts = makeFacts();
    facts.order.data.shipping = { value: 0, deliveryMethod: 'pickup' };
    facts.order.data.payments = [{ method: 'Pix', amount: 349, fee: 10, feeType: 'fixed' }];
    facts.order.data.paymentsSummary = { totalPaymentsFee: 10, totalOrderValue: 359, totalAmountPaid: 359, amountRemaining: 0 };
    await expect(createNormalSaleRuleSet(facts)).rejects.toThrow('não está vinculada a uma modalidade de cartão');
  });
  it('bloqueia tipo de taxa inválido na NFC-e 65', async () => {
    const facts = makeFacts();
    facts.emissionRequest.finalConsumer = true;
    facts.emissionRequest.recipientIeIndicator = '9';
    facts.emissionRequest.recipientIe = '';
    facts.order.data.payments = [{ method: 'Cartão de Crédito', amount: 379, fee: 10, feeType: 'desconhecido' }];
    facts.order.data.paymentsSummary = { totalPaymentsFee: 10, totalOrderValue: 389, totalAmountPaid: 389, amountRemaining: 0 };
    await expect(createNormalSaleRuleSet(facts)).rejects.toThrow('Tipo da taxa do pagamento 1 inválido');
  });
  it.each([
    [{ method: 'Pix', status: 'Pendente', amount: 379 }],
    [
      { method: 'Pix', status: 'Pendente', amount: 200, dueDate: '2026-10-05' },
      { method: 'Dinheiro', status: 'Pendente', amount: 179 },
    ],
    [{ method: 'Promissória', status: 'Pendente', amount: 379, installments: 3 }],
  ])('preserva pagamentos pendentes sem inventar duplicatas com datas incompletas (%j)', async (...payments) => {
    const facts = makeFacts();
    facts.order.data.payments = payments;
    const original = structuredClone(facts);
    const rules = await createNormalSaleRuleSet(facts);
    const result = resolveFiscalDocument(facts, rules);
    if (result.status !== 'ready') throw new Error(JSON.stringify(result.blockers));
    expect(result.document.model).toBe('55');
    expect(result.document.billingInstallments).toBeUndefined();
    expect(result.document.payments.every((payment) => payment.paymentIndicator === '1')).toBe(true);
    expect(result.document.payments.reduce((sum, payment) => sum + payment.amount, 0)).toBe(379);
    expect(facts).toEqual(original);
  });
  it('mantém toda a cobrança quando os vencimentos reais estão completos e ordena as parcelas', async () => {
    const facts = makeFacts();
    facts.order.data.payments = [
      { method: 'Pix', status: 'Pendente', amount: 179, dueDate: '2026-10-10' },
      { method: 'Dinheiro', status: 'Pendente', amount: 200, dueDate: '2026-10-05' },
    ];
    const rules = await createNormalSaleRuleSet(facts);
    const result = resolveFiscalDocument(facts, rules);
    if (result.status !== 'ready') throw new Error(JSON.stringify(result.blockers));
    expect(result.document.billingInstallments).toEqual([
      { number: '001', dueDate: '2026-10-05', amount: 200 },
      { number: '002', dueDate: '2026-10-10', amount: 179 },
    ]);
  });
  it('incorpora serviço avulso vinculado ao item agrupado em HML e Produção', async () => {
    const facts = makeFacts();
    facts.order.data.items = [
      {
        orderItemId: 'line-armario',
        productId: 'P-1',
        quantity: 2,
        description: 'ARMÁRIO AÉREO',
        unitPrice: 500,
        unitDiscount: 0,
        discountType: 'fixed',
      },
      {
        orderItemId: 'line-installation',
        itemType: 'service',
        linkedProductOrderItemIds: ['line-armario'],
        quantity: 1,
        description: 'Instalação de 1 armário',
        unitPrice: 100,
        unitDiscount: 0,
        discountType: 'fixed',
      },
    ];
    facts.order.data.shipping = { value: 0, deliveryMethod: 'pickup' };
    facts.order.data.payments = [{ method: 'Cartão de Crédito', amount: 1100 }];
    facts.emissionRequest.itemFiscalSelections = {
      '1': { ncm: '94034000', cfop: '5102', origem: '2', cest: '', csosn: '103' },
    };

    const rules = await createHmlNormalSaleRuleSet(facts, initialHmlCsosnConfiguration());
    const result = resolveFiscalDocument(facts, rules);
    if (result.status !== 'ready') throw new Error(JSON.stringify(result.blockers));
    expect(result.document.items).toHaveLength(1);
    expect(result.document.items[0].product).toMatchObject({
      quantity: 2,
      unitValue: 550,
      gross: 1100,
      otherExpenses: 0,
    });
    expect(result.document.totals).toMatchObject({ products: 1100, otherExpenses: 0, invoice: 1100, payment: 1100 });

    const key = generateNfeAccessKey({
      ufCode: '41',
      yearMonth: '2609',
      cnpj: '12345678000195',
      model: '55',
      series: 900,
      number: 702,
      emissionType: '1',
      randomCode: '12345678',
    }).accessKey;
    const xml = serializeFiscalDocument(facts, result.document, rules, {
      accessKey: key,
      series: 900,
      number: 702,
      issuedAt: '2026-09-30T10:00:00-03:00',
    });
    expect(xml).toContain('<tpAmb>2</tpAmb>');
    expect(xml).toContain('<qCom>2.0000</qCom><vUnCom>550.0000000000</vUnCom><vProd>1100.00</vProd>');
    expect(xml).toContain('<vOutro>0.00</vOutro>');
    expect(xml).toContain('<vNF>1100.00</vNF>');
    expect(xml).toContain('<infCpl>O valor fiscal do item');
    expect(xml).toContain('Instalação de 1 armário');
    expect(xml).toContain('rateio considera as quantidades dos produtos vinculados');
    expect(xml).toContain('não afirma que o serviço foi executado em cada unidade');
    await expect(validateUnsignedNfeStructure(xml)).resolves.toBeUndefined();
    const pair = forge.pki.rsa.generateKeyPair({ bits: 2048, workers: 0 });
    const signed = signNfeXml(
      xml,
      forge.pki.privateKeyToPem(pair.privateKey),
      Buffer.from('certificado sintético').toString('base64')
    );
    await expect(validateNfeAgainstOfficialSchema(signed)).resolves.toBeUndefined();

    facts.emissionRequest.environment = 1;
    const productionRules = await createNormalSaleRuleSet(facts);
    const productionResult = resolveFiscalDocument(facts, productionRules);
    if (productionResult.status !== 'ready')
      throw new Error(JSON.stringify(productionResult.blockers));
    expect(productionResult.document.items[0].product).toMatchObject({
      quantity: 2,
      unitValue: 550,
      gross: 1100,
      otherExpenses: 0,
    });
    const productionXml = serializeFiscalDocument(facts, productionResult.document, productionRules, {
      accessKey: key,
      series: 900,
      number: 702,
      issuedAt: '2026-09-30T10:00:00-03:00',
    });
    expect(productionXml).toContain('<tpAmb>1</tpAmb>');
    expect(productionXml).toContain('<qCom>2.0000</qCom><vUnCom>550.0000000000</vUnCom><vProd>1100.00</vProd>');
    expect(productionXml).toContain('<vOutro>0.00</vOutro>');
    expect(productionXml).toContain('<vNF>1100.00</vNF>');
    expect(productionXml).toContain('Instalação de 1 armário');
  });
  it('rateia serviço avulso entre vários produtos na NFC-e 65 e valida infCpl no XML de homologação', async () => {
    const facts = makeFacts();
    facts.emissionRequest.finalConsumer = true;
    facts.emissionRequest.recipientIeIndicator = '9';
    facts.emissionRequest.recipientIe = '';
    facts.order.data.items = [
      {
        orderItemId: 'line-armario',
        productId: 'P-1',
        quantity: 2,
        description: 'ARMÁRIO AÉREO',
        unitPrice: 500,
        unitDiscount: 0,
        discountType: 'fixed',
      },
      {
        orderItemId: 'line-balcony',
        productId: 'P-2',
        quantity: 1,
        description: 'BALCÃO',
        unitPrice: 300,
        unitDiscount: 0,
        discountType: 'fixed',
      },
      {
        orderItemId: 'line-installation',
        itemType: 'service',
        linkedProductOrderItemIds: ['line-armario', 'line-balcony'],
        quantity: 1,
        description: 'Instalação de 1 armário',
        unitPrice: 100,
        unitDiscount: 0,
        discountType: 'fixed',
      },
    ];
    facts.order.data.shipping = { value: 0, deliveryMethod: 'pickup' };
    facts.order.data.payments = [{ method: 'Pix', amount: 1400 }];
    facts.emissionRequest.itemFiscalSelections = {
      '1': { ncm: '94034000', cfop: '5102', origem: '2', cest: '', csosn: '103' },
      '2': { ncm: '94036000', cfop: '5102', origem: '2', cest: '', csosn: '103' },
    };

    const rules = await createHmlNormalSaleRuleSet(facts, initialHmlCsosnConfiguration());
    const result = resolveFiscalDocument(facts, rules);
    if (result.status !== 'ready') throw new Error(JSON.stringify(result.blockers));
    expect(result.document.model).toBe('65');
    expect(result.document.items).toHaveLength(2);
    expect(result.document.items[0].product).toMatchObject({
      quantity: 2,
      unitValue: 533.335,
      gross: 1066.67,
      otherExpenses: 0,
    });
    expect(result.document.items[1].product).toMatchObject({
      quantity: 1,
      unitValue: 333.33,
      gross: 333.33,
      otherExpenses: 0,
    });
    expect(result.document.totals).toMatchObject({ products: 1400, otherExpenses: 0, invoice: 1400, payment: 1400 });
    expect(result.document.additionalInformation).toContain('NFC-e');
    expect(result.document.additionalInformation).toContain('rateio considera as quantidades dos produtos vinculados');
    expect(result.document.additionalInformation).toContain('não afirma que o serviço foi executado em cada unidade');

    const key = generateNfeAccessKey({
      ufCode: '41', yearMonth: '2609', cnpj: '12345678000195', model: '65',
      series: '1', number: 705, emissionType: '1', randomCode: '12345678',
    }).accessKey;
    const xml = serializeFiscalDocument(facts, result.document, rules, {
      accessKey: key, series: 1, number: 705, issuedAt: '2026-09-30T10:00:00-03:00',
    });
    expect(xml).toContain('<mod>65</mod>');
    expect(xml).toContain('<qCom>2.0000</qCom><vUnCom>533.3350000000</vUnCom><vProd>1066.67</vProd>');
    expect(xml).toContain('<qCom>1.0000</qCom><vUnCom>333.3300000000</vUnCom><vProd>333.33</vProd>');
    expect(xml).toContain('<vOutro>0.00</vOutro>');
    expect(xml).toContain('<infCpl>O valor fiscal do item');
    expect(xml).toContain('Instalação de 1 armário');
    await expect(validateUnsignedNfeStructure(xml)).resolves.toBeUndefined();
    const pair = forge.pki.rsa.generateKeyPair({ bits: 2048, workers: 0 });
    const signed = signNfeXml(xml, forge.pki.privateKeyToPem(pair.privateKey), Buffer.from('certificado sintético').toString('base64'));
    await expect(validateNfeAgainstOfficialSchema(signed)).resolves.toBeUndefined();
  });
  it('classifica saldo vencível no dia da emissão como à vista e omite cobrança', async () => {
    const facts = makeFacts();
    facts.order.data.shipping = {
      value: 30,
      deliveryMethod: 'pickup',
      scheduling: { date: '2026-09-30', dateType: 'fixed' },
    };
    facts.order.data.payments = [{ method: 'Pix', status: 'Pendente', amount: 379 }];
    const rules = await createNormalSaleRuleSet(facts);
    const result = resolveFiscalDocument(facts, rules);
    if (result.status !== 'ready') throw new Error(JSON.stringify(result.blockers));

    expect(result.document.model).toBe('55');
    expect(result.document.payments[0].paymentIndicator).toBe('0');
    expect(result.document.payments[0].paymentDate).toBeUndefined();
    expect(result.document.billingInstallments).toBeUndefined();

    const key = generateNfeAccessKey({
      ufCode: '41',
      yearMonth: '2609',
      cnpj: '12345678000195',
      model: '55',
      series: 1,
      number: 702,
      emissionType: '1',
      randomCode: '12345678',
    });
    const xml = serializeFiscalDocument(facts, result.document, rules, {
      accessKey: key.accessKey,
      series: 1,
      number: 702,
      issuedAt: '2026-09-30T10:00:00-03:00',
    });
    expect(xml).toContain('<detPag><indPag>0</indPag><tPag>17</tPag>');
    expect(xml).not.toContain('<cobr>');
    await expect(validateUnsignedNfeStructure(xml)).resolves.toBeUndefined();

    const pair = forge.pki.rsa.generateKeyPair({ bits: 2048, workers: 0 });
    const signed = signNfeXml(
      xml,
      forge.pki.privateKeyToPem(pair.privateKey),
      Buffer.from('synthetic certificate').toString('base64')
    );
    await expect(validateNfeAgainstOfficialSchema(signed)).resolves.toBeUndefined();
  });
  it('bloqueia saída interna não final para destinatário não contribuinte antes de determinar a nota', async () => {
    const facts = makeFacts();
    facts.emissionRequest.recipientIeIndicator = '9';
    facts.emissionRequest.recipientIe = '';
    await expect(createNormalSaleRuleSet(facts)).rejects.toThrow('consumidor final');
  });
  it.each([false, true])('preserva CNPJ alfanumérico em XML assinado e XSD (consumidor final=%s)', async (finalConsumer) => {
    const facts = makeFacts();
    facts.issuerProfile.companyCnpj = '12ABC34501DE35';
    facts.emissionRequest.finalConsumer = finalConsumer;
    facts.emissionRequest.recipientIeIndicator = finalConsumer ? '9' : '1';
    facts.emissionRequest.recipientIe = finalConsumer ? '' : '1234567890';
    facts.emissionRequest.cardNotIntegrated = true;
    facts.emissionRequest.recipientTaxId = '12ABC34501DE35';
    (facts.fiscalInputs!.customer as any).personType = 'PJ';
    const rules = await createNormalSaleRuleSet(facts);
    const result = resolveFiscalDocument(facts, rules);
    if (result.status !== 'ready') throw new Error(JSON.stringify(result.blockers));
    const key = generateNfeAccessKey({ ufCode: '41', yearMonth: '2609', cnpj: '12ABC34501DE35', model: result.document.model, series: 1, number: 701, emissionType: '1', randomCode: '12345678' });
    const xml = serializeFiscalDocument(facts, result.document, rules, { accessKey: key.accessKey, series: 1, number: 701, issuedAt: '2026-09-30T10:00:00-03:00' });
    expect(xml).toContain(`<infNFe Id="NFe${key.accessKey}"`);
    expect(xml.match(/<CNPJ>12ABC34501DE35<\/CNPJ>/g)).toHaveLength(2);
    await expect(validateUnsignedNfeStructure(xml)).resolves.toBeUndefined();
    const pair = forge.pki.rsa.generateKeyPair({ bits: 2048, workers: 0 });
    const signed = signNfeXml(xml, forge.pki.privateKeyToPem(pair.privateKey), Buffer.from('synthetic certificate').toString('base64'));
    await expect(validateNfeAgainstOfficialSchema(signed)).resolves.toBeUndefined();
  });
  it.each([false, true])(
    'usa a mesma determinação de negócio em HML e Produção (consumidor final=%s)',
    async (finalConsumer) => {
      const determined = [];
      for (const environment of [1, 2] as const) {
        const facts = makeFacts();
        facts.emissionRequest.environment = environment;
        facts.emissionRequest.finalConsumer = finalConsumer;
    facts.emissionRequest.recipientIeIndicator = finalConsumer ? '9' : '1';
    facts.emissionRequest.recipientIe = finalConsumer ? '' : '1234567890';
        facts.emissionRequest.cardNotIntegrated = true;
        facts.emissionRequest.itemFiscalSelections!['1'].csosn = '102';
        const rules = await createNormalSaleRuleSet(facts);
        expect(rules.technicalHomologationOnly).toBeUndefined();
        const result = resolveFiscalDocument(facts, rules);
        if (result.status !== 'ready') throw new Error(JSON.stringify(result.blockers));
        expect(result.document).toMatchObject({ environment, model: finalConsumer ? '65' : '55' });
        expect(result.document.items[0].taxes[0].code).toBe('102');
        expect(result.document.decisions[0].result.contributionDecisionId).toBe(
          'fiscal_decision_simples_normal_sale_v1'
        );
        const xml = serializeFiscalDocument(facts, result.document, rules, {
          accessKey: generateNfeAccessKey({
            ufCode: '41', yearMonth: '2609', cnpj: '12345678000195',
            model: result.document.model, series: '1', number: 701,
            emissionType: '1', randomCode: '12345678',
          }).accessKey,
          series: 1, number: 701, issuedAt: '2026-09-30T10:00:00-03:00',
        });
        expect(xml).toContain(`<tpAmb>${environment}</tpAmb>`);
        await expect(validateUnsignedNfeStructure(xml)).resolves.toBeUndefined();
        determined.push({
          classification: result.document.items[0].classification,
          taxes: result.document.items[0].taxes,
          operation: result.document.operation,
          totals: result.document.totals,
        });
      }
      expect(determined[0]).toEqual(determined[1]);
    }
  );
  it('não amplia uma decisão legada 55 para a NFC-e 65, inclusive em homologação', async () => {
    const facts = makeFacts();
    facts.emissionRequest.finalConsumer = true;
    facts.emissionRequest.recipientIeIndicator = '9';
    facts.emissionRequest.recipientIe = '';
    facts.fiscalInputs!.contributionDecision = {
      scope: { model: '55', operation: 'normal_sale', issuerCrt: '1' },
      pis: { cst: '99', base: 0, rate: 0, value: 0 },
      cofins: { cst: '99', base: 0, rate: 0, value: 0 },
      confirmedAt: '2026-09-01T00:00:00Z',
      confirmedBy: 'TEST_UNIT_LEGACY_55',
    };
    await expect(createNormalSaleRuleSet(facts)).rejects.toThrow('CONTRIBUTION_MODEL_SCOPE_REQUIRED');
    await expect(
      createHmlNormalSaleRuleSet(facts, initialHmlCsosnConfiguration())
    ).rejects.toThrow('CONTRIBUTION_MODEL_SCOPE_REQUIRED');
  });
  it('não usa a configuração CSOSN HML como default da venda real', async () => {
    const facts = makeFacts();
    facts.emissionRequest.itemFiscalSelections!['1'].csosn = '102';
    const rules = await createHmlNormalSaleRuleSet(facts, initialHmlCsosnConfiguration());
    const result = resolveFiscalDocument(facts, rules);
    if (result.status !== 'ready') throw new Error(JSON.stringify(result.blockers));
    expect(result.document.items[0].taxes[0].code).toBe('102');
  });
  it.each(['pickup', 'delivery'])(
    'gera NFC-e %s para PF/PJ com QR Code v3 e XSD após assinatura',
    async (method) => {
      const pair = forge.pki.rsa.generateKeyPair({ bits: 2048, workers: 0 });
      for (const cpfCnpj of ['12345678909', '12345678000195']) {
        const facts = makeFacts();
        facts.emissionRequest.finalConsumer = true;
    facts.emissionRequest.recipientIeIndicator = '9';
    facts.emissionRequest.recipientIe = '';
        facts.emissionRequest.deliveryByIssuer = method === 'delivery';
        facts.emissionRequest.cardNotIntegrated = true;
        facts.order.data.shipping = { value: 30, deliveryMethod: method };
        (facts.fiscalInputs!.customer as any).cpfCnpj = cpfCnpj;
        (facts.fiscalInputs!.customer as any).personType = cpfCnpj.length === 11 ? 'PF' : 'PJ';
        const address = JSON.parse((facts.fiscalInputs!.customer as any).address);
        delete address.cep;
        (facts.fiscalInputs!.customer as any).address = JSON.stringify(address);
        const original = structuredClone(facts);
        const rules = await createHmlNormalSaleRuleSet(facts, initialHmlCsosnConfiguration());
        const result = resolveFiscalDocument(facts, rules);
        if (result.status !== 'ready') throw new Error(JSON.stringify(result.blockers));
        expect(result.document).toMatchObject({
          model: '65',
          operation: { finalConsumer: '1', presence: method === 'delivery' ? '4' : '1' },
        });
        const key = generateNfeAccessKey({
          ufCode: '41',
          yearMonth: '2609',
          cnpj: '12345678000195',
          model: '65',
          series: '1',
          number: 700,
          emissionType: '1',
          randomCode: '12345678',
        }).accessKey;
        const xml = serializeFiscalDocument(facts, result.document, rules, {
          accessKey: key,
          series: 1,
          number: 700,
          issuedAt: '2026-09-30T10:00:00-03:00',
        });
        expect(xml).toContain(`<mod>65</mod>`);
        expect(xml).toContain(`<tpImp>4</tpImp>`);
        expect(xml).toContain(`${key}|3|2]]>`);
        if (method === 'delivery') {
          expect(xml).toContain('<enderDest>');
          expect(xml).toContain('<modFrete>3</modFrete><transporta/>');
          expect(xml).not.toContain('<transporta><CNPJ>');
          expect(xml.match(/<CEP>/g)).toHaveLength(2); // Emissor e endereço de entrega.
        } else expect(xml).not.toContain('<enderDest>');
        const signed = signNfeXml(
          xml,
          forge.pki.privateKeyToPem(pair.privateKey),
          Buffer.from('certificado sintético').toString('base64')
        );
        expect(signed.indexOf('<Signature')).toBeGreaterThan(signed.indexOf('</infNFeSupl>'));
        await expect(validateNfeAgainstOfficialSchema(signed)).resolves.toBeUndefined();
        expect(facts).toEqual(original);
        expect(
          resolveFiscalDocument(facts, {
            ...rules,
            determine: (snapshot, hash) => ({ ...rules.determine(snapshot, hash), model: '55' }),
          }).status
        ).toBe('blocked');
      }
    }
  );
  it('permite NFC-e de entrega própria sem cadastrar transportadora terceirizada', async () => {
    const facts = makeFacts();
    facts.emissionRequest.finalConsumer = true;
    facts.emissionRequest.recipientIeIndicator = '9';
    facts.emissionRequest.recipientIe = '';
    facts.emissionRequest.cardNotIntegrated = true;
    facts.order.data.shipping = { value: 30, deliveryMethod: 'delivery' };
    facts.emissionRequest.recipientTaxId = '12345678909';
    const rules = await createHmlNormalSaleRuleSet(facts, initialHmlCsosnConfiguration());
    const result = resolveFiscalDocument(facts, rules);
    expect(result.status).toBe('ready');
    if (result.status !== 'ready') throw new Error(JSON.stringify(result.blockers));
    expect(result.document.operation).toMatchObject({ presence: '4', freightMode: '3' });
    expect(result.document.operation.transporter).toBeUndefined();
  });
  it('destinatário anônimo é permitido apenas em retirada presencial abaixo do limite de identificação', async () => {
    const facts = makeFacts();
    facts.emissionRequest.finalConsumer = true;
    facts.emissionRequest.recipientIeIndicator = '9';
    facts.emissionRequest.recipientIe = '';
    facts.order.data.shipping = { value: 30, deliveryMethod: 'pickup' };
    facts.order.data.payments = [{ method: 'pix', amount: 379 }];
    (facts.fiscalInputs!.customer as any).cpfCnpj = '';
    (facts.fiscalInputs!.customer as any).address = '{}';
    const rules = await createHmlNormalSaleRuleSet(facts, initialHmlCsosnConfiguration());
    expect(resolveFiscalDocument(facts, rules)).toMatchObject({
      status: 'ready',
      document: { model: '65', recipient: { cpfCnpj: '' } },
    });
    facts.order.data.shipping = { value: 30, deliveryMethod: 'delivery' };
    await expect(
      createHmlNormalSaleRuleSet(facts, initialHmlCsosnConfiguration())
    ).rejects.toThrow();
  });
  it('preserva escolhas, preços, frete e cartão acentuado até XML validado sem mudar os fatos', async () => {
    const facts = makeFacts();
    const original = structuredClone(facts);
    const rules = await createHmlNormalSaleRuleSet(facts, initialHmlCsosnConfiguration());
    const result = resolveFiscalDocument(facts, rules);
    expect(result.status).toBe('ready');
    if (result.status !== 'ready') throw new Error(JSON.stringify(result.blockers));
    expect(result.document.totals).toMatchObject({
      products: 349,
      freight: 30,
      invoice: 379,
      payment: 379,
    });
    expect(result.document.payments[0]).toMatchObject({ methodCode: '03', amount: 379 });
    const key = generateNfeAccessKey({
      ufCode: '41',
      yearMonth: '2609',
      cnpj: '12345678000195',
      model: '55',
      series: '900',
      number: 700,
      emissionType: '1',
      randomCode: '12345678',
    }).accessKey;
    const xml = serializeFiscalDocument(facts, result.document, rules, {
      accessKey: key,
      series: 900,
      number: 700,
      issuedAt: '2026-09-30T10:00:00-03:00',
    });
    await expect(validateUnsignedNfeStructure(xml)).resolves.toBeUndefined();
    expect(xml).toContain('<NCM>94034000</NCM>');
    expect(xml).toContain('<orig>2</orig><CSOSN>103</CSOSN>');
    expect(xml).toContain('<vFrete>30.00</vFrete>');
    expect(facts).toEqual(original);
  });
  it('não usa saldo físico como requisito para emissão fiscal normal', async () => {
    const facts = makeFacts();
    const product = (facts.order.data.items as Array<Record<string, any>>)[0];
    product.stock = 0;
    product.stockQuantity = 0;
    product.availableStock = 0;

    const rules = await createHmlNormalSaleRuleSet(facts, initialHmlCsosnConfiguration());
    const result = resolveFiscalDocument(facts, rules);

    expect(result.status).toBe('ready');
    if (result.status !== 'ready') throw new Error(JSON.stringify(result.blockers));
    expect(result.document.items).toHaveLength(1);
    expect(product).toMatchObject({ stock: 0, stockQuantity: 0, availableStock: 0 });
  });
  it('exige identificação válida do destinatário em NF-e 55 antes de produzir o documento fiscal', async () => {
    const facts = makeFacts();
    (facts.fiscalInputs!.customer as any).cpfCnpj = '';
    await expect(createHmlNormalSaleRuleSet(facts, initialHmlCsosnConfiguration())).rejects.toThrow(
      'CPF do destinatário é obrigatório para esta operação fiscal.'
    );
  });
  it('bloqueia NFC-e 65 de entrega em domicílio sem CPF/CNPJ mesmo abaixo de R$ 10.000', async () => {
    const facts = makeFacts();
    facts.emissionRequest.finalConsumer = true;
    facts.emissionRequest.recipientIeIndicator = '9';
    facts.emissionRequest.recipientIe = '';
    facts.emissionRequest.deliveryByIssuer = true;
    facts.emissionRequest.cardNotIntegrated = true;
    facts.order.data.shipping = { value: 30, deliveryMethod: 'delivery' };
    (facts.fiscalInputs!.customer as any).cpfCnpj = '';
    facts.emissionRequest.recipientTaxId = '';

    await expect(createHmlNormalSaleRuleSet(facts, initialHmlCsosnConfiguration())).rejects.toThrow(
      'CPF do destinatário é obrigatório para esta operação fiscal.'
    );
  });
  it('exige CPF/CNPJ para NFC-e 65 quando valor total for igual ou superior a R$ 10.000', async () => {
    const facts = makeFacts();
    facts.emissionRequest.finalConsumer = true;
    facts.emissionRequest.recipientIeIndicator = '9';
    facts.emissionRequest.recipientIe = '';
    facts.emissionRequest.deliveryByIssuer = false;
    facts.order.data.shipping = { value: 0, deliveryMethod: 'pickup' };
    (facts.order.data.items as any)[0].unitPrice = 10000;
    facts.order.data.payments = [{ method: 'Pix', amount: 10000 }];
    (facts.fiscalInputs!.customer as any).cpfCnpj = '';
    facts.emissionRequest.recipientTaxId = '';

    await expect(createHmlNormalSaleRuleSet(facts, initialHmlCsosnConfiguration())).rejects.toThrow(
      'CPF do destinatário é obrigatório para esta operação fiscal.'
    );
  });
  it('permite NFC-e 65 de retirada por R$ 569 sem CPF', async () => {
    const facts = makeFacts();
    facts.emissionRequest.finalConsumer = true;
    facts.emissionRequest.recipientIeIndicator = '9';
    facts.emissionRequest.recipientIe = '';
    facts.order.data.shipping = { value: 0, deliveryMethod: 'pickup' };
    facts.order.data.fiscalContext = { presence: '4' };
    facts.order.data.items = [
      {
        productId: 'P-1',
        quantity: 1,
        description: 'ITEM TESTE',
        unitPrice: 569,
        unitDiscount: 0,
        discountType: 'fixed',
      },
    ];
    facts.order.data.payments = [{ method: 'Pix', amount: 569 }];
    (facts.fiscalInputs!.customer as any).cpfCnpj = '';
    (facts.fiscalInputs!.customer as any).address = '{}';
    const rules = await createHmlNormalSaleRuleSet(facts, initialHmlCsosnConfiguration());
    const result = resolveFiscalDocument(facts, rules);
    expect(result.status).toBe('ready');
    if (result.status !== 'ready') throw new Error(JSON.stringify(result.blockers));
    expect(result.document).toMatchObject({
      model: '65',
      recipient: { cpfCnpj: '' },
      operation: { presence: '1' },
    });
    expect(result.document.payments[0]).toMatchObject({
      methodCode: '17',
      amount: 569,
      card: { integrationType: '2' },
    });
    expect(result.document.totals.invoice).toBe(569);
    const accessKey = generateNfeAccessKey({
      ufCode: '41',
      yearMonth: '2610',
      cnpj: '12345678000195',
      model: '65',
      series: '1',
      number: 620,
      emissionType: '1',
      randomCode: '12345678',
    }).accessKey;
    const xml = serializeFiscalDocument(facts, result.document, rules, {
      accessKey,
      series: 1,
      number: 620,
      issuedAt: '2026-10-05T18:55:03-03:00',
    });
    expect(xml).toContain('<detPag><indPag>0</indPag><tPag>17</tPag><vPag>569.00</vPag><card><tpIntegra>2</tpIntegra></card></detPag>');
  });
  it('converte presença de entrega em presencial quando o transporte é desligado só para esta NFC-e', async () => {
    const facts = makeFacts();
    facts.emissionRequest.finalConsumer = true;
    facts.emissionRequest.recipientIeIndicator = '9';
    facts.emissionRequest.recipientIe = '';
    facts.emissionRequest.hasTransport = false;
    facts.emissionRequest.freightMode = '9';
    facts.order.data.shipping = {
      value: 0,
      deliveryMethod: 'delivery',
      deliveryAddress: { city: 'Curitiba', state: 'PR' },
    };
    facts.order.data.fiscalContext = { presence: '4' };
    facts.order.data.items = [
      {
        productId: 'P-1',
        quantity: 1,
        description: 'ITEM TESTE',
        unitPrice: 569,
        unitDiscount: 0,
        discountType: 'fixed',
      },
    ];
    facts.order.data.payments = [{ method: 'Pix', amount: 569 }];
    (facts.fiscalInputs!.customer as any).cpfCnpj = '';
    facts.emissionRequest.recipientTaxId = '';

    const rules = await createHmlNormalSaleRuleSet(facts, initialHmlCsosnConfiguration());
    const result = resolveFiscalDocument(facts, rules);

    if (result.status !== 'ready') throw new Error(JSON.stringify(result.blockers));
    expect(result.status).toBe('ready');
    expect(result.document).toMatchObject({
      model: '65',
      recipient: { cpfCnpj: '' },
      operation: { presence: '1', freightMode: '9' },
    });
  });
  it('rejeita CPF com dígitos verificadores inválidos e rejeita CPF/CNPJ incompatível com PF/PJ', async () => {
    const facts = makeFacts();
    facts.emissionRequest.finalConsumer = true;
    facts.emissionRequest.recipientIeIndicator = '9';
    facts.emissionRequest.recipientIe = '';
    facts.order.data.shipping = { value: 0, deliveryMethod: 'pickup' };
    (facts.order.data.items as any)[0].unitPrice = 569;
    (facts.order.data.payments as any)[0].amount = 569;
    (facts.fiscalInputs!.customer as any).cpfCnpj = '';
    (facts.fiscalInputs!.customer as any).address = '{}';
    facts.emissionRequest.recipientTaxId = '11111111111';
    await expect(createHmlNormalSaleRuleSet(facts, initialHmlCsosnConfiguration())).rejects.toThrow(
      'CPF/CNPJ do destinatário inválido para esta operação fiscal.'
    );

    facts.emissionRequest.recipientTaxId = '11.222.333/0001-81';
    await expect(createHmlNormalSaleRuleSet(facts, initialHmlCsosnConfiguration())).rejects.toThrow(
      'CPF/CNPJ do destinatário inválido para o tipo PF'
    );

    facts.emissionRequest.recipientTaxId = '123.456.789-09';
    facts.emissionRequest.cardNotIntegrated = true;
    const rules = await createHmlNormalSaleRuleSet(facts, initialHmlCsosnConfiguration());
    const result = resolveFiscalDocument(facts, rules);
    expect(result).toMatchObject({
      status: 'ready',
      document: { model: '65', recipient: { cpfCnpj: '12345678909' } },
    });
  });
  it('permite NFC-e de retirada presencial sem CPF abaixo do limite de identificação', async () => {
    const facts = makeFacts();
    facts.emissionRequest.finalConsumer = true;
    facts.emissionRequest.recipientIeIndicator = '9';
    facts.emissionRequest.recipientIe = '';
    facts.order.data.shipping = { value: 0, deliveryMethod: 'pickup' };
    facts.order.data.fiscalContext = { presence: '2' };
    facts.order.data.payments = [{ method: 'Cartão de Crédito', amount: 349 }];
    facts.emissionRequest.cardNotIntegrated = true;
    (facts.fiscalInputs!.customer as any).cpfCnpj = '';
    facts.emissionRequest.recipientTaxId = '';

    const rules = await createHmlNormalSaleRuleSet(facts, initialHmlCsosnConfiguration());
    expect(resolveFiscalDocument(facts, rules)).toMatchObject({
      status: 'ready',
      document: { model: '65', operation: { presence: '1' }, recipient: { cpfCnpj: '' } },
    });
  });
  it('serializa entrega própria NFC-e com CPF/endereço, indPres=4 e modFrete=3 sem dados de terceiro', async () => {
    const facts = makeFacts();
    facts.emissionRequest.finalConsumer = true;
    facts.emissionRequest.recipientIeIndicator = '9';
    facts.emissionRequest.recipientIe = '';
    facts.emissionRequest.cardNotIntegrated = true;
    facts.order.data.shipping = { value: 30, deliveryMethod: 'delivery' };
    facts.emissionRequest.recipientTaxId = '12345678909';
    const rules = await createHmlNormalSaleRuleSet(facts, initialHmlCsosnConfiguration());
    const result = resolveFiscalDocument(facts, rules);
    expect(result.status).toBe('ready');
    if (result.status !== 'ready') throw new Error(JSON.stringify(result.blockers));
    expect(result.document.operation).toMatchObject({ presence: '4', freightMode: '3' });
    expect(result.document.operation.transporter).toBeUndefined();
    const xml = serializeFiscalDocument(facts, result.document, rules, {
      accessKey: generateNfeAccessKey({
        ufCode: '41',
        yearMonth: '2609',
        cnpj: '12345678000195',
        model: '65',
        series: '1',
        number: 702,
        emissionType: '1',
        randomCode: '12345678',
      }).accessKey,
      series: 1,
      number: 702,
      issuedAt: '2026-09-30T10:00:00-03:00',
    });
    expect(xml).toContain('<indPres>4</indPres>');
    expect(xml).toContain('<transp><modFrete>3</modFrete><transporta/></transp>');
    expect(xml).toContain('<CPF>12345678909</CPF>');
    expect(xml).toContain('<enderDest>');
    expect(xml).not.toContain('<transporta><CNPJ>');
    expect(xml).not.toContain('<transporta><CPF>');
    expect(xml).not.toContain('<transporta><xNome>');
    expect(xml).not.toContain('<transporta><IE>');
    expect(xml).not.toContain('<transporta><xEnder>');
    expect(xml).not.toContain('<transporta><xMun>');
    expect(xml).not.toContain('<transporta><UF>');
  });
  it('força indPres=4 em pedido de entrega mesmo quando o contexto fiscal traz indPres=1', async () => {
    const facts = makeFacts();
    facts.emissionRequest.finalConsumer = true;
    facts.emissionRequest.recipientIeIndicator = '9';
    facts.emissionRequest.recipientIe = '';
    facts.emissionRequest.cardNotIntegrated = true;
    facts.emissionRequest.recipientTaxId = '12345678909';
    facts.order.data.shipping = { value: 30, deliveryMethod: 'delivery' };
    facts.order.data.fiscalContext = { presence: '1' };
    const rules = await createHmlNormalSaleRuleSet(facts, initialHmlCsosnConfiguration());
    const result = resolveFiscalDocument(facts, rules);
    expect(result.status).toBe('ready');
    if (result.status !== 'ready') throw new Error(JSON.stringify(result.blockers));
    expect(result.document.operation).toMatchObject({ presence: '4', freightMode: '3' });
    const xml = serializeFiscalDocument(facts, result.document, rules, {
      accessKey: generateNfeAccessKey({
        ufCode: '41',
        yearMonth: '2609',
        cnpj: '12345678000195',
        model: '65',
        series: '1',
        number: 703,
        emissionType: '1',
        randomCode: '12345678',
      }).accessKey,
      series: 1,
      number: 703,
      issuedAt: '2026-09-30T10:00:00-03:00',
    });
    expect(xml).toContain('<indPres>4</indPres>');
    expect(xml).not.toContain('<indPres>1</indPres>');
    expect(xml).toContain('<modFrete>3</modFrete>');
    expect(() =>
      serializeFiscalDocument(
        facts,
        { ...result.document, operation: { ...result.document.operation, presence: '1' } },
        rules,
        {
          accessKey: generateNfeAccessKey({
            ufCode: '41',
            yearMonth: '2609',
            cnpj: '12345678000195',
            model: '65',
            series: '1',
            number: 704,
            emissionType: '1',
            randomCode: '12345678',
          }).accessKey,
          series: 1,
          number: 704,
          issuedAt: '2026-09-30T10:00:00-03:00',
        }
      )
    ).toThrow('NFC-e com entrega em domicílio exige indPres=4.');
  });
  it.each([
    'cpf',
    'payment',
    'cfop',
    'tax-exception',
    'catalog-cfop',
    'catalog-rate',
    'csosn',
    'production',
  ])('bloqueia %s sem substituir campos', async (caseName) => {
    const facts = makeFacts();
    if (caseName === 'cpf') (facts.fiscalInputs!.customer as any).cpfCnpj = '1111111111';
    if (caseName === 'payment') (facts.order.data.payments as any)[0].amount = 378.99;
    if (caseName === 'cfop') facts.emissionRequest.itemFiscalSelections!['1'].cfop = '5405';
    if (caseName === 'tax-exception') (facts.fiscalInputs!.products as any)['P-1'].pisCst = '01';
    if (caseName === 'catalog-cfop') (facts.fiscalInputs!.products as any)['P-1'].cfop = '5405';
    if (caseName === 'catalog-rate') (facts.fiscalInputs!.products as any)['P-1'].icmsPercent = 18;
    if (caseName === 'csosn') {
      facts.emissionRequest.itemFiscalSelections!['1'].csosn = '500';
      facts.emissionRequest.itemCsosnOverrides = { '1': '500' };
    }
    if (caseName === 'production') facts.emissionRequest.environment = 1;
    try {
      const rules = await createHmlNormalSaleRuleSet(facts, initialHmlCsosnConfiguration());
      expect(resolveFiscalDocument(facts, rules).status).toBe('blocked');
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
    }
  });
  it('reconcilia múltiplos produtos, desconto percentual, fixo, frete e dois pagamentos', async () => {
    const facts = makeFacts();
    facts.order.data.items = [
      {
        productId: 'P-1',
        quantity: 2,
        description: 'TESTE A',
        unitPrice: 19.95,
        unitDiscount: 10,
        discountType: 'percentage',
      },
      {
        productId: 'P-2',
        quantity: 3,
        description: 'TESTE B',
        unitPrice: 10,
        unitDiscount: 1,
        discountType: 'fixed',
      },
    ];
    facts.order.data.shipping = { value: 5, deliveryMethod: 'pickup' };
    facts.order.data.payments = [
      { method: 'pix', amount: 30 },
      { method: 'Dinheiro', amount: 37.91 },
    ];
    facts.emissionRequest.itemFiscalSelections!['2'] = {
      ...facts.emissionRequest.itemFiscalSelections!['1'],
    };
    const rules = await createHmlNormalSaleRuleSet(facts, initialHmlCsosnConfiguration());
    const result = resolveFiscalDocument(facts, rules);
    expect(result.status).toBe('ready');
    if (result.status !== 'ready') throw new Error(JSON.stringify(result.blockers));
    expect(result.document.totals).toMatchObject({
      products: 69.9,
      discount: 6.99,
      freight: 5,
      invoice: 67.91,
      payment: 67.91,
    });
  });
  it('preserva CNPJ alfanumérico do destinatário no XML da NF-e e valida no XSD oficial', async () => {
    const facts = makeFacts();
    facts.emissionRequest.finalConsumer = false;
    facts.emissionRequest.recipientTaxId = '12.ABC.345/01DE-35';
    (facts.fiscalInputs!.customer as any).personType = 'PJ';
    (facts.fiscalInputs!.customer as any).cpfCnpj = '12ABC34501DE35';
    const rules = await createHmlNormalSaleRuleSet(facts, initialHmlCsosnConfiguration());
    const result = resolveFiscalDocument(facts, rules);
    expect(result.status).toBe('ready');
    if (result.status !== 'ready') throw new Error(JSON.stringify(result.blockers));
    expect(result.document.recipient).toMatchObject({
      cpfCnpj: '12ABC34501DE35',
      personType: 'PJ',
    });

    const xml = serializeFiscalDocument(facts, result.document, rules, {
      accessKey: generateNfeAccessKey({
        ufCode: '41',
        yearMonth: '2610',
        cnpj: '12345678000195',
        model: '55',
        series: '900',
        number: 701,
        emissionType: '1',
        randomCode: '87654321',
      }).accessKey,
      series: 900,
      number: 701,
      issuedAt: '2026-10-04T10:00:00-03:00',
    });
    expect(xml).toContain('<CNPJ>12ABC34501DE35</CNPJ>');
    await expect(validateUnsignedNfeStructure(xml)).resolves.toBeUndefined();
    const pair = forge.pki.rsa.generateKeyPair({ bits: 2048, workers: 0 });
    const signed = signNfeXml(
      xml,
      forge.pki.privateKeyToPem(pair.privateKey),
      Buffer.from('certificado sintético').toString('base64')
    );
    await expect(validateNfeAgainstOfficialSchema(signed)).resolves.toBeUndefined();
  });
  it('permite produtos do catálogo e do pedido com CST de PIS/COFINS 49 (saída Simples Nacional)', async () => {
    const facts = makeFacts();
    (facts.fiscalInputs!.products as any)['P-1'].pisCst = '49';
    (facts.fiscalInputs!.products as any)['P-1'].cofinsCst = '49';
    (facts.order.data.items as any)[0].fiscal = { pisCst: '49', cofinsCst: '49' };
    const rules = await createHmlNormalSaleRuleSet(facts, initialHmlCsosnConfiguration());
    const result = resolveFiscalDocument(facts, rules);
    expect(result.status).toBe('ready');
    if (result.status !== 'ready') throw new Error(JSON.stringify(result.blockers));
    expect(result.document.items[0].taxes).toContainEqual(
      expect.objectContaining({ group: 'PIS', code: '99' })
    );
    expect(result.document.items[0].taxes).toContainEqual(
      expect.objectContaining({ group: 'COFINS', code: '99' })
    );
  });
});

