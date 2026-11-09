import { expect, it } from 'vitest';
import { createHmlNormalSaleRuleSet } from '../../../../../../api/nfe/hmlNormalSaleRuleSet';
import { createNormalSaleRuleSet } from '../../../../../../api/nfe/normalSaleRuleSet';
import { initialHmlCsosnConfiguration } from '../../../../../../api/nfe/csosnPolicy';
import { resolveFiscalDocument, type FiscalSnapshotCandidate } from '../../../../../../api/nfe/fiscalSnapshot';
import { assertFiscalDocumentMatchesCommercialSnapshot } from '../../../../../../api/nfe/fiscalXmlAudit';
import { generateNfeAccessKey } from '../nfeAccessKey';
import { serializeFiscalDocument } from '../../../../../../api/nfe/fiscalXmlSerializer';
import { validateUnsignedNfeStructure, validateNfeAgainstOfficialSchema } from '../../../../../../api/nfe/schemaValidator';
import { signNfeXml } from '../../../../../../api/nfe/nfeSigner';
import forge from 'node-forge';

type HmlNormalSalePaymentFeeCaseDependencies = {
  makeFacts: () => FiscalSnapshotCandidate;
};

export function registerHmlNormalSalePaymentFeeCases({ makeFacts }: HmlNormalSalePaymentFeeCaseDependencies): void {
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
}
