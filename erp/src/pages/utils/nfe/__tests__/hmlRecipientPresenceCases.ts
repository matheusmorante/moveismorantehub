import { expect, it } from 'vitest';
import { createHmlNormalSaleRuleSet } from '../../../../../../api/nfe/hmlNormalSaleRuleSet';
import { initialHmlCsosnConfiguration } from '../../../../../../api/nfe/csosnPolicy';
import { resolveFiscalDocument, type FiscalSnapshotCandidate } from '../../../../../../api/nfe/fiscalSnapshot';
import { generateNfeAccessKey } from '../nfeAccessKey';
import { serializeFiscalDocument } from '../../../../../../api/nfe/fiscalXmlSerializer';

type HmlRecipientPresenceCaseDependencies = {
  makeFacts: () => FiscalSnapshotCandidate;
};

export function registerHmlRecipientPresenceCases({
  makeFacts,
}: HmlRecipientPresenceCaseDependencies): void {
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
}
