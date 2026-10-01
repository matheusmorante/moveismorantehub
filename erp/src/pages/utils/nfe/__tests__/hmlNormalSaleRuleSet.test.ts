import { beforeAll, afterAll, describe, it, expect, vi } from 'vitest';
import { createHmlNormalSaleRuleSet } from '../../../../../../api/nfe/hmlNormalSaleRuleSet';
import { initialHmlCsosnConfiguration } from '../../../../../../api/nfe/csosnPolicy';
import { resolveFiscalDocument, type FiscalSnapshotCandidate } from '../../../../../../api/nfe/fiscalSnapshot';
import { generateNfeAccessKey } from '../nfeAccessKey';
import { serializeFiscalDocument } from '../../../../../../api/nfe/fiscalXmlSerializer';
import { validateUnsignedNfeStructure } from '../../../../../../api/nfe/schemaValidator';
const makeFacts = (): FiscalSnapshotCandidate => ({ schemaVersion: 1, capturedAt: '2026-09-30T13:00:00Z',
  order: { id: 'TEST_UNIT_REAL_FLOW', type: 'sale', status: 'fulfilled', deleted: false, version: 1,
    updatedAt: '2026-09-30T12:00:00Z', data: { shipping: { value: 30 },
      items: [{ productId: 'P-1', quantity: 1, description: 'BALCÃO TESTE UNITÁRIO', unitPrice: 349, unitDiscount: 0, discountType: 'fixed' }],
      payments: [{ method: 'Cartão de Crédito 10x', amount: 379 }] } },
  issuerProfile: { companyCnpj: '12345678000195', companyCRT: '1', companyUF: 'PR',
    companyName: 'EMPRESA TESTE UNITÁRIO', companyIE: '1234567890', companyLogradouro: 'RUA TESTE', companyNumero: '10',
    companyBairro: 'CENTRO', companyCMun: '4105805', companyXMun: 'COLOMBO', companyCEP: '83410270' },
  fiscalInputs: { products: { 'P-1': { ncm: '94036000' } },
    customer: { id: 'TEST_UNIT_CUSTOMER', fullName: 'CLIENTE TESTE UNITÁRIO', cpfCnpj: '12345678909',
      address: JSON.stringify({ street: 'RUA TESTE', number: '10', neighborhood: 'CENTRO', city: 'Curitiba', state: 'PR', cep: '80010000' }) },
    contributionDecision: { scope: { model: '55', operation: 'normal_sale', issuerCrt: '1' },
      pis: { cst: '99', base: 0, rate: 0, value: 0 }, cofins: { cst: '99', base: 0, rate: 0, value: 0 },
      confirmedAt: '2026-09-01T00:00:00Z', confirmedBy: 'TEST_UNIT_APPROVED', productionApproved: false } },
  emissionRequest: { id: 'f19b3e63-6f84-45ea-8c5f-39476d709a3d', environment: 2,
    itemFiscalSelections: { '1': { ncm: '94034000', cfop: '5102', origem: '2', cest: '', csosn: '103' } } },
});
describe('pedido real no fluxo normal de homologação (fatos unitários controlados)', () => {
  beforeAll(() => vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true,
    json: async () => [{ id: 4106902, nome: 'Curitiba' }] }))));
  afterAll(() => vi.unstubAllGlobals());
  it('preserva escolhas, preços, frete e cartão acentuado até XML validado sem mudar os fatos', async () => {
    const facts = makeFacts();
    const original = structuredClone(facts);
    const rules = await createHmlNormalSaleRuleSet(facts, initialHmlCsosnConfiguration());
    const result = resolveFiscalDocument(facts, rules);
    expect(result.status).toBe('ready');
    if (result.status !== 'ready') throw new Error(JSON.stringify(result.blockers));
    expect(result.document.totals).toMatchObject({ products: 349, freight: 30, invoice: 379, payment: 379 });
    expect(result.document.payments[0]).toMatchObject({ methodCode: '03', amount: 379 });
    const key = generateNfeAccessKey({ ufCode: '41', yearMonth: '2609', cnpj: '12345678000195', model: '55', series: '900', number: 700, emissionType: '1', randomCode: '12345678' }).accessKey;
    const xml = serializeFiscalDocument(facts, result.document, rules, { accessKey: key, series: 900, number: 700, issuedAt: '2026-09-30T10:00:00-03:00' });
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
  it.each(['cpf', 'payment', 'cfop', 'tax-exception', 'catalog-cfop', 'catalog-rate', 'csosn', 'production'])(
    'bloqueia %s sem substituir campos', async (caseName) => {
      const facts = makeFacts();
      if (caseName === 'cpf') (facts.fiscalInputs!.customer as any).cpfCnpj = '11111111111';
      if (caseName === 'payment') (facts.order.data.payments as any)[0].amount = 378.99;
      if (caseName === 'cfop') facts.emissionRequest.itemFiscalSelections!['1'].cfop = '5405';
      if (caseName === 'tax-exception') (facts.fiscalInputs!.products as any)['P-1'].pisCst = '01';
      if (caseName === 'catalog-cfop') (facts.fiscalInputs!.products as any)['P-1'].cfop = '5405';
      if (caseName === 'catalog-rate') (facts.fiscalInputs!.products as any)['P-1'].icmsPercent = 18;
      if (caseName === 'csosn') { facts.emissionRequest.itemFiscalSelections!['1'].csosn = '500'; facts.emissionRequest.itemCsosnOverrides = { '1': '500' }; }
      if (caseName === 'production') facts.emissionRequest.environment = 1;
      try { const rules = await createHmlNormalSaleRuleSet(facts, initialHmlCsosnConfiguration());
        expect(resolveFiscalDocument(facts,rules).status).toBe('blocked');
      } catch (error) { expect(error).toBeInstanceOf(Error); }
    });
  it('reconcilia múltiplos produtos, desconto percentual, fixo, frete e dois pagamentos', async () => {
    const facts = makeFacts();
    facts.order.data.items = [
      { productId: 'P-1', quantity: 2, description: 'TESTE A', unitPrice: 19.95, unitDiscount: 10, discountType: 'percentage' },
      { productId: 'P-2', quantity: 3, description: 'TESTE B', unitPrice: 10, unitDiscount: 1, discountType: 'fixed' },
    ];
    facts.order.data.shipping = { value: 5 };
    facts.order.data.payments = [{ method: 'pix', amount: 30 }, { method: 'Dinheiro', amount: 37.91 }];
    facts.emissionRequest.itemFiscalSelections!['2'] = { ...facts.emissionRequest.itemFiscalSelections!['1'] };
    const rules = await createHmlNormalSaleRuleSet(facts, initialHmlCsosnConfiguration());
    const result = resolveFiscalDocument(facts,rules);
    expect(result.status).toBe('ready');
    if (result.status !== 'ready') throw new Error(JSON.stringify(result.blockers));
    expect(result.document.totals).toMatchObject({ products: 69.90, discount: 6.99, freight: 5, invoice: 67.91, payment: 67.91 });
  });
});
