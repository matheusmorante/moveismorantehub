import { beforeAll, afterAll, describe, it, expect, vi } from 'vitest';
import { createHmlNormalSaleRuleSet } from '../../../../../../api/nfe/hmlNormalSaleRuleSet';
import { initialHmlCsosnConfiguration } from '../../../../../../api/nfe/csosnPolicy';
import {
  resolveFiscalDocument,
  parseFiscalEmissionCommand,
  type FiscalSnapshotCandidate,
} from '../../../../../../api/nfe/fiscalSnapshot';
import { generateNfeAccessKey } from '../nfeAccessKey';
import { serializeFiscalDocument } from '../../../../../../api/nfe/fiscalXmlSerializer';
import {
  resolveTransport,
  resolveDefaultTransport,
} from '../../../../../../shared-utils/fiscalTransportModel';

const makeFacts = (): FiscalSnapshotCandidate => ({
  schemaVersion: 1,
  capturedAt: '2026-09-30T13:00:00Z',
  order: {
    id: 'TEST_UNIT_TRANSPORT_FLOW',
    type: 'sale',
    status: 'fulfilled',
    deleted: false,
    version: 1,
    updatedAt: '2026-09-30T12:00:00Z',
    data: {
      shipping: { value: 30, deliveryMethod: 'delivery' },
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
      payments: [{ method: 'Pix', amount: 379 }],
    },
  },
  issuerProfile: {
    companyCnpj: '12345678000195',
    companyCRT: '1',
    companyUF: 'PR',
    companyName: 'EMPRESA TESTE UNITARIO',
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
    finalConsumer: true,
    hasTransport: true,
    transportResponsible: 'OWN_COMPANY',
    itemFiscalSelections: {
      '1': { ncm: '94034000', cfop: '5102', origem: '2', cest: '', csosn: '103' },
    },
  },
});

describe('Regras Centrais de Transporte e Transportador (NF-e 55 e NFC-e 65)', () => {
  beforeAll(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => [{ id: 4106902, nome: 'Curitiba' }],
      }))
    );
  });

  afterAll(() => {
    vi.unstubAllGlobals();
  });

  // 1. 65 + retirada → OFF / 9
  it('1. 65 + retirada: modFrete = 9, hasTransport = false, sem grupo transporta e edição travada', async () => {
    const res = resolveTransport({ fiscalModel: '65', deliveryMethod: 'pickup' });
    expect(res.hasTransport).toBe(false);
    expect(res.modFrete).toBe('9');
    expect(res.transportResponsible).toBe('NONE');
    expect(res.allowsEditHasTransport).toBe(false);
    expect(res.derivedReason).toBe('Definido automaticamente: pedido para retirada.');
    expect(res.requiresTransporterData).toBe(false);
    expect(res.isEmitterTransporter).toBe(false);

    const facts = makeFacts();
    facts.emissionRequest.finalConsumer = true;
    facts.order.data.shipping = { value: 0, deliveryMethod: 'pickup' };
    facts.order.data.payments = [{ method: 'Pix', amount: 349 }];
    facts.emissionRequest.hasTransport = false;

    const rules = await createHmlNormalSaleRuleSet(facts, initialHmlCsosnConfiguration());
    const result = resolveFiscalDocument(facts, rules);

    if (result.status !== 'ready') throw new Error(JSON.stringify(result.blockers));
    expect(result.document.model).toBe('65');
    expect(result.document.operation.freightMode).toBe('9');
    expect(result.document.operation.transporter).toBeUndefined();

    const key = generateNfeAccessKey({
      ufCode: '41',
      yearMonth: '2609',
      cnpj: '12345678000195',
      model: '65',
      series: '1',
      number: 201,
      emissionType: '1',
      randomCode: '12345678',
    }).accessKey;

    const xml = serializeFiscalDocument(facts, result.document, rules, {
      accessKey: key,
      series: 1,
      number: 201,
      issuedAt: '2026-09-30T10:00:00-03:00',
    });

    expect(xml).toContain('<modFrete>9</modFrete>');
    expect(xml).not.toContain('<transporta>');
  });

  // 2. 65 + entrega própria → ON / 3
  it('2. 65 + entrega própria: modFrete = 3 e sem dados fictícios de transportador', async () => {
    const res = resolveTransport({ fiscalModel: '65', deliveryMethod: 'delivery' });
    expect(res.hasTransport).toBe(true);
    expect(res.modFrete).toBe('3');
    expect(res.transportResponsible).toBe('OWN_COMPANY');
    expect(res.allowsEditHasTransport).toBe(false);
    expect(res.derivedReason).toBe('Definido automaticamente: pedido com entrega.');
    expect(res.isEmitterTransporter).toBe(true);

    const facts = makeFacts();
    facts.emissionRequest.finalConsumer = true;
    facts.emissionRequest.hasTransport = true;
    facts.emissionRequest.transportResponsible = 'OWN_COMPANY';
    facts.order.data.shipping = { value: 30, deliveryMethod: 'delivery' };

    const rules = await createHmlNormalSaleRuleSet(facts, initialHmlCsosnConfiguration());
    const result = resolveFiscalDocument(facts, rules);

    if (result.status !== 'ready') throw new Error(JSON.stringify(result.blockers));
    expect(result.document.model).toBe('65');
    expect(result.document.operation.freightMode).toBe('3');
    expect(result.document.operation.transporter).toBeUndefined();

    const key = generateNfeAccessKey({
      ufCode: '41',
      yearMonth: '2609',
      cnpj: '12345678000195',
      model: '65',
      series: '1',
      number: 202,
      emissionType: '1',
      randomCode: '12345678',
    }).accessKey;

    const xml = serializeFiscalDocument(facts, result.document, rules, {
      accessKey: key,
      series: 1,
      number: 202,
      issuedAt: '2026-09-30T10:00:00-03:00',
    });

    expect(xml).toContain('<modFrete>3</modFrete>');
    expect(xml).toContain('<transporta/>');
    expect(xml).not.toContain('<transporta><CNPJ>');
  });

  // 3. 55 + retirada própria do cliente → ON / 4
  it('3. 55 + retirada própria do cliente: modFrete = 4, hasTransport = true e sem grupo transporta', async () => {
    const res = resolveTransport({ fiscalModel: '55', deliveryMethod: 'pickup' });
    expect(res.hasTransport).toBe(true);
    expect(res.modFrete).toBe('4');
    expect(res.transportResponsible).toBe('CUSTOMER');
    expect(res.allowsEditHasTransport).toBe(false);
    expect(res.derivedReason).toBe('Definido automaticamente: pedido para retirada.');
    expect(res.isEmitterTransporter).toBe(false);
    expect(res.requiresTransporterData).toBe(false);

    const facts = makeFacts();
    facts.emissionRequest.finalConsumer = false; // Força modelo 55
    facts.order.data.shipping = { value: 0, deliveryMethod: 'pickup' };
    facts.order.data.payments = [{ method: 'Pix', amount: 349 }];
    facts.emissionRequest.hasTransport = true;
    facts.emissionRequest.transportResponsible = 'CUSTOMER';

    const rules = await createHmlNormalSaleRuleSet(facts, initialHmlCsosnConfiguration());
    const result = resolveFiscalDocument(facts, rules);

    if (result.status !== 'ready') throw new Error(JSON.stringify(result.blockers));
    expect(result.document.model).toBe('55');
    expect(result.document.operation.freightMode).toBe('4');
    expect(result.document.operation.transporter).toBeUndefined();

    const key = generateNfeAccessKey({
      ufCode: '41',
      yearMonth: '2609',
      cnpj: '12345678000195',
      model: '55',
      series: '1',
      number: 203,
      emissionType: '1',
      randomCode: '12345678',
    }).accessKey;

    const xml = serializeFiscalDocument(facts, result.document, rules, {
      accessKey: key,
      series: 1,
      number: 203,
      issuedAt: '2026-09-30T10:00:00-03:00',
    });

    expect(xml).toContain('<modFrete>4</modFrete>');
    expect(xml).not.toContain('<transporta>');
  });

  // 4. 55 + entrega própria → ON / 3
  it('4. 55 + entrega própria: modFrete = 3, hasTransport = true e transporta oficial do emitente', async () => {
    const res = resolveTransport({ fiscalModel: '55', deliveryMethod: 'delivery' });
    expect(res.hasTransport).toBe(true);
    expect(res.modFrete).toBe('3');
    expect(res.transportResponsible).toBe('OWN_COMPANY');
    expect(res.allowsEditHasTransport).toBe(false);
    expect(res.derivedReason).toBe('Definido automaticamente: pedido com entrega.');

    const facts = makeFacts();
    facts.emissionRequest.finalConsumer = false;
    facts.emissionRequest.hasTransport = true;
    facts.emissionRequest.transportResponsible = 'OWN_COMPANY';
    facts.order.data.shipping = { value: 30, deliveryMethod: 'delivery' };

    const rules = await createHmlNormalSaleRuleSet(facts, initialHmlCsosnConfiguration());
    const result = resolveFiscalDocument(facts, rules);

    if (result.status !== 'ready') throw new Error(JSON.stringify(result.blockers));
    expect(result.document.model).toBe('55');
    expect(result.document.operation.freightMode).toBe('3');
    expect(result.document.operation.transporter?.cnpj).toBe('12345678000195');

    const key = generateNfeAccessKey({
      ufCode: '41',
      yearMonth: '2609',
      cnpj: '12345678000195',
      model: '55',
      series: '1',
      number: 204,
      emissionType: '1',
      randomCode: '12345678',
    }).accessKey;

    const xml = serializeFiscalDocument(facts, result.document, rules, {
      accessKey: key,
      series: 1,
      number: 204,
      issuedAt: '2026-09-30T10:00:00-03:00',
    });

    expect(xml).toContain('<modFrete>3</modFrete>');
    expect(xml).toContain('<transporta>');
    expect(xml).toContain('<xNome>EMPRESA TESTE UNITARIO</xNome>');
  });

  // 5. Terceiro contratado pelo remetente → 0 (CIF)
  it('5. Terceiro contratado pelo remetente: modFrete = 0 e transporta do terceiro', async () => {
    const res = resolveTransport({
      fiscalModel: '55',
      deliveryMethod: 'delivery',
      hasTransport: true,
      transportResponsible: 'THIRD_PARTY',
      freightContractResponsible: 'SENDER',
    });
    expect(res.modFrete).toBe('0');
    expect(res.requiresTransporterData).toBe(true);

    const facts = makeFacts();
    facts.emissionRequest.finalConsumer = false;
    facts.emissionRequest.hasTransport = true;
    facts.emissionRequest.transportResponsible = 'THIRD_PARTY';
    facts.emissionRequest.freightContractResponsible = 'SENDER';
    facts.emissionRequest.transporter = {
      cnpj: '11222333000181',
      name: 'TRANSPORTADORA CIF LTDA',
      city: 'Curitiba',
      uf: 'PR',
    };

    const rules = await createHmlNormalSaleRuleSet(facts, initialHmlCsosnConfiguration());
    const result = resolveFiscalDocument(facts, rules);

    if (result.status !== 'ready') throw new Error(JSON.stringify(result.blockers));
    expect(result.document.operation.freightMode).toBe('0');
    expect(result.document.operation.transporter?.name).toBe('TRANSPORTADORA CIF LTDA');

    const key = generateNfeAccessKey({
      ufCode: '41',
      yearMonth: '2609',
      cnpj: '12345678000195',
      model: '55',
      series: '1',
      number: 205,
      emissionType: '1',
      randomCode: '12345678',
    }).accessKey;

    const xml = serializeFiscalDocument(facts, result.document, rules, {
      accessKey: key,
      series: 1,
      number: 205,
      issuedAt: '2026-09-30T10:00:00-03:00',
    });

    expect(xml).toContain('<modFrete>0</modFrete>');
    expect(xml).toContain('<xNome>TRANSPORTADORA CIF LTDA</xNome>');
  });

  // 6. Terceiro contratado pelo destinatário → 1 (FOB)
  it('6. Terceiro contratado pelo destinatário: modFrete = 1', () => {
    const res = resolveTransport({
      fiscalModel: '55',
      deliveryMethod: 'delivery',
      hasTransport: true,
      transportResponsible: 'THIRD_PARTY',
      freightContractResponsible: 'RECIPIENT',
    });
    expect(res.modFrete).toBe('1');
    expect(res.requiresTransporterData).toBe(true);
  });

  // 7. Terceiro contratado por terceiros → 2
  it('7. Terceiro contratado por terceiros: modFrete = 2', () => {
    const res = resolveTransport({
      fiscalModel: '55',
      deliveryMethod: 'delivery',
      hasTransport: true,
      transportResponsible: 'THIRD_PARTY',
      freightContractResponsible: 'THIRD_PARTY',
    });
    expect(res.modFrete).toBe('2');
    expect(res.requiresTransporterData).toBe(true);
  });

  // 8. Transporte OFF nunca mantém transporta (NFC-e 65 com retirada)
  it('8. Transporte OFF: modFrete = 9 e grupo transporta nunca é incluído', async () => {
    const facts = makeFacts();
    facts.emissionRequest.finalConsumer = true;
    facts.emissionRequest.hasTransport = false;
    facts.order.data.shipping = { value: 0, deliveryMethod: 'pickup' };
    facts.order.data.payments = [{ method: 'Pix', amount: 349 }];

    const rules = await createHmlNormalSaleRuleSet(facts, initialHmlCsosnConfiguration());
    const result = resolveFiscalDocument(facts, rules);

    if (result.status !== 'ready') throw new Error(JSON.stringify(result.blockers));
    expect(result.document.operation.freightMode).toBe('9');
    expect(result.document.operation.transporter).toBeUndefined();

    const key = generateNfeAccessKey({
      ufCode: '41',
      yearMonth: '2609',
      cnpj: '12345678000195',
      model: '65',
      series: '1',
      number: 208,
      emissionType: '1',
      randomCode: '12345678',
    }).accessKey;

    const xml = serializeFiscalDocument(facts, result.document, rules, {
      accessKey: key,
      series: 1,
      number: 208,
      issuedAt: '2026-09-30T10:00:00-03:00',
    });

    expect(xml).toContain('<modFrete>9</modFrete>');
    expect(xml).not.toContain('<transporta>');
  });

  // 9. Mudança dinâmica: entrega → retirada recalcula tudo
  it('9. Mudança entrega -> retirada recalcula para o padrão correto de cada modelo', () => {
    // Para 65: de entrega (3 / ON / OWN_COMPANY) -> retirada (9 / OFF / NONE)
    const def65Pickup = resolveDefaultTransport('65', 'pickup');
    expect(def65Pickup).toEqual({ hasTransport: false, transportResponsible: 'NONE' });
    const res65 = resolveTransport({ fiscalModel: '65', deliveryMethod: 'pickup' });
    expect(res65.hasTransport).toBe(false);
    expect(res65.modFrete).toBe('9');

    // Para 55: de entrega (3 / ON / OWN_COMPANY) -> retirada (4 / ON / CUSTOMER)
    const def55Pickup = resolveDefaultTransport('55', 'pickup');
    expect(def55Pickup).toEqual({ hasTransport: true, transportResponsible: 'CUSTOMER' });
    const res55 = resolveTransport({ fiscalModel: '55', deliveryMethod: 'pickup' });
    expect(res55.hasTransport).toBe(true);
    expect(res55.modFrete).toBe('4');
  });

  // 10. Mudança 55 → 65 recalcula transporte
  it('10. Mudança 55 -> 65: retirada muda de 4 (ON) para 9 (OFF)', () => {
    const t55 = resolveTransport({ fiscalModel: '55', deliveryMethod: 'pickup' });
    expect(t55.hasTransport).toBe(true);
    expect(t55.modFrete).toBe('4');

    const t65 = resolveTransport({ fiscalModel: '65', deliveryMethod: 'pickup' });
    expect(t65.hasTransport).toBe(false);
    expect(t65.modFrete).toBe('9');
  });

  // 11. Mudança 65 → 55 recalcula transporte
  it('11. Mudança 65 -> 55: retirada muda de 9 (OFF) para 4 (ON)', () => {
    const t65 = resolveTransport({ fiscalModel: '65', deliveryMethod: 'pickup' });
    expect(t65.hasTransport).toBe(false);
    expect(t65.modFrete).toBe('9');

    const t55 = resolveTransport({ fiscalModel: '55', deliveryMethod: 'pickup' });
    expect(t55.hasTransport).toBe(true);
    expect(t55.modFrete).toBe('4');
  });

  // 12. Backend rejeita combinações impossíveis
  it('12. Backend parseFiscalEmissionCommand rejeita estados incoerentes', () => {
    // 12.1 Transporte OFF com transportador informado
    const cmd1 = parseFiscalEmissionCommand({
      orderId: 'ORDER-1',
      environment: 2,
      emissionRequestId: 'f19b3e63-6f84-45ea-8c5f-39476d709a3d',
      hasTransport: false,
      transporter: { name: 'TRANSPORTE INVALIDO', cnpj: '12345678000195' },
    });
    expect(cmd1).toHaveProperty('error');
    expect((cmd1 as any).error).toContain('Transporte desligado não admite dados de transportador');

    // 12.2 Transporte OFF com modFrete != 9
    const cmd2 = parseFiscalEmissionCommand({
      orderId: 'ORDER-1',
      environment: 2,
      emissionRequestId: 'f19b3e63-6f84-45ea-8c5f-39476d709a3d',
      hasTransport: false,
      freightMode: '3',
    });
    expect(cmd2).toHaveProperty('error');
    expect((cmd2 as any).error).toContain('Transporte desligado exige modalidade 9');

    // 12.3 Transporte OFF com transportResponsible informado
    const cmd3 = parseFiscalEmissionCommand({
      orderId: 'ORDER-1',
      environment: 2,
      emissionRequestId: 'f19b3e63-6f84-45ea-8c5f-39476d709a3d',
      hasTransport: false,
      transportResponsible: 'OWN_COMPANY',
    });
    expect(cmd3).toHaveProperty('error');
    expect((cmd3 as any).error).toContain('Transporte desligado não admite responsável');
  });

  // 13. Serializer gera XML correto
  it('13. Serializer gera tags transp e transporta estritamente corretas', async () => {
    // Teste com NF-e 55 + retirada (modFrete = 4)
    const facts55 = makeFacts();
    facts55.emissionRequest.finalConsumer = false;
    facts55.emissionRequest.hasTransport = true;
    facts55.emissionRequest.transportResponsible = 'CUSTOMER';
    facts55.order.data.shipping = { value: 0, deliveryMethod: 'pickup' };
    facts55.order.data.payments = [{ method: 'Pix', amount: 349 }];

    const rules55 = await createHmlNormalSaleRuleSet(facts55, initialHmlCsosnConfiguration());
    const res55 = resolveFiscalDocument(facts55, rules55);
    if (res55.status !== 'ready') throw new Error(JSON.stringify(res55.blockers));

    const key55 = generateNfeAccessKey({
      ufCode: '41',
      yearMonth: '2609',
      cnpj: '12345678000195',
      model: '55',
      series: '1',
      number: 213,
      emissionType: '1',
      randomCode: '12345678',
    }).accessKey;

    const xml55 = serializeFiscalDocument(facts55, res55.document, rules55, {
      accessKey: key55,
      series: 1,
      number: 213,
      issuedAt: '2026-09-30T10:00:00-03:00',
    });

    expect(xml55).toContain('<transp><modFrete>4</modFrete></transp>');
    expect(xml55).not.toContain('<transporta>');
  });

  // 14. Nenhum dado antigo escondido é enviado quando transporte é desligado (NFC-e 65 com retirada)
  it('14. Nenhum dado de transportador é enviado quando transporte é desligado', async () => {
    const facts = makeFacts();
    facts.emissionRequest.finalConsumer = true;
    facts.emissionRequest.hasTransport = false;
    // Tenta injetar dados residuais
    facts.order.data.shipping = {
      value: 0,
      deliveryMethod: 'pickup',
      transporter: { name: 'RESIDUAL', cnpj: '11111111000111' },
    };
    facts.order.data.payments = [{ method: 'Pix', amount: 349 }];

    const rules = await createHmlNormalSaleRuleSet(facts, initialHmlCsosnConfiguration());
    const res = resolveFiscalDocument(facts, rules);
    if (res.status !== 'ready') throw new Error(JSON.stringify(res.blockers));

    expect(res.document.operation.freightMode).toBe('9');
    expect(res.document.operation.transporter).toBeUndefined();
  });

  // 15. Campos do transportador terceiro só aparecem e são exigidos quando realmente selecionado
  it('15. Exige dados de transportador apenas quando THIRD_PARTY for explicitamente selecionado', async () => {
    const facts = makeFacts();
    facts.emissionRequest.hasTransport = true;
    facts.emissionRequest.transportResponsible = 'THIRD_PARTY';
    // Sem transporter
    delete (facts.emissionRequest as any).transporter;
    delete (facts.order.data.shipping as any).transporter;

    await expect(createHmlNormalSaleRuleSet(facts, initialHmlCsosnConfiguration())).rejects.toThrow(
      'Identifique o transportador terceirizado'
    );
  });
});
