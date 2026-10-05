import { beforeAll, afterAll, describe, it, expect, vi } from 'vitest';
import { createHmlNormalSaleRuleSet } from '../../../../../../api/nfe/hmlNormalSaleRuleSet';
import { initialHmlCsosnConfiguration } from '../../../../../../api/nfe/csosnPolicy';
import {
  resolveFiscalDocument,
  type FiscalSnapshotCandidate,
} from '../../../../../../api/nfe/fiscalSnapshot';
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
      scope: { model: '55', operation: 'normal_sale', issuerCrt: '1' },
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
  it.each(['pickup', 'delivery'])(
    'gera NFC-e %s para PF/PJ com QR Code v3 e XSD após assinatura',
    async (method) => {
      const pair = forge.pki.rsa.generateKeyPair({ bits: 2048, workers: 0 });
      for (const cpfCnpj of ['12345678909', '12345678000195']) {
        const facts = makeFacts();
        facts.emissionRequest.finalConsumer = true;
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
          expect(xml.match(/<CEP>/g)).toHaveLength(1); // Only the emitter has a CEP.
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
    expect(result.document.totals.invoice).toBe(569);
  });
  it('valida o documento opcional informado e não aceita CPF/CNPJ incompatível com PF/PJ', async () => {
    const facts = makeFacts();
    facts.emissionRequest.finalConsumer = true;
    facts.order.data.shipping = { value: 0, deliveryMethod: 'pickup' };
    (facts.order.data.items as any)[0].unitPrice = 569;
    (facts.order.data.payments as any)[0].amount = 569;
    (facts.fiscalInputs!.customer as any).cpfCnpj = '';
    (facts.fiscalInputs!.customer as any).address = '{}';
    facts.emissionRequest.recipientTaxId = '11111111111';
    await expect(createHmlNormalSaleRuleSet(facts, initialHmlCsosnConfiguration())).rejects.toThrow(
      'CPF/CNPJ do destinatário inválido'
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
  it('exige identificação para NFC-e não presencial abaixo de R$ 10.000', async () => {
    const facts = makeFacts();
    facts.emissionRequest.finalConsumer = true;
    facts.order.data.shipping = { value: 0, deliveryMethod: 'pickup' };
    facts.order.data.fiscalContext = { presence: '2' };
    (facts.fiscalInputs!.customer as any).cpfCnpj = '';
    facts.emissionRequest.recipientTaxId = '';

    await expect(createHmlNormalSaleRuleSet(facts, initialHmlCsosnConfiguration())).rejects.toThrow(
      'CPF do destinatário é obrigatório para esta operação fiscal.'
    );
  });
  it('serializa entrega própria NFC-e com CPF/endereço, indPres=4 e modFrete=3 sem dados de terceiro', async () => {
    const facts = makeFacts();
    facts.emissionRequest.finalConsumer = true;
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
    if (caseName === 'cpf') (facts.fiscalInputs!.customer as any).cpfCnpj = '11111111111';
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
});
