import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import {
  isCfopActive,
  isCfopValid,
  isCfopApplicableToModel,
  validateItemCfopMatch,
  determineSaleCfop,
  listActiveCfopOptions,
  resolveFiscalCfopOrderScope,
} from '../../../../../../shared-utils/fiscalCfopModel';
import { createHmlNormalSaleRuleSet } from '../../../../../../api/nfe/hmlNormalSaleRuleSet';
import { initialHmlCsosnConfiguration } from '../../../../../../api/nfe/csosnPolicy';
import {
  resolveFiscalDocument,
  type FiscalSnapshotCandidate,
} from '../../../../../../api/nfe/fiscalSnapshot';
import { generateNfeAccessKey } from '../nfeAccessKey';
import { serializeFiscalDocument } from '../../../../../../api/nfe/fiscalXmlSerializer';
import {
  INTERSTATE_FISCAL_MATRIX_RULES,
  hasApprovedInterstateRoute,
  resolveInterstateFiscalMatrix,
  type InterstateFiscalMatrixFacts,
  type InterstateFiscalMatrixRule,
} from '../../../../../../api/nfe/interstateTaxMatrix';

const makeInterstateFacts = (options?: {
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

describe('Auditoria Completa da Matriz de CFOPs e Regras Tributárias (NF-e/NFC-e)', () => {
  beforeAll(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (url.includes('/localidades/estados/41/municipios') || url.includes('/estados/PR/municipios')) {
          return { ok: true, json: async () => [{ id: 4106902, nome: 'Curitiba' }] };
        }
        if (url.includes('/localidades/estados/42/municipios') || url.includes('/estados/SC/municipios')) {
          return { ok: true, json: async () => [{ id: 4209102, nome: 'Joinville' }] };
        }
        if (url.includes('/localidades/estados/35/municipios') || url.includes('/estados/SP/municipios')) {
          return { ok: true, json: async () => [{ id: 3550308, nome: 'São Paulo' }] };
        }
        return { ok: true, json: async () => [{ id: 4106902, nome: 'Curitiba' }] };
      })
    );
  });

  afterAll(() => {
    vi.unstubAllGlobals();
  });

  // 1. PR → PR, mercadoria adquirida de terceiros → expectativa de 5.102 quando aplicável
  it('1. PR → PR, mercadoria adquirida de terceiros: determina e valida CFOP 5.102', async () => {
    expect(determineSaleCfop({ destination: '1', itemType: 'product' })).toBe('5102');

    const facts = makeInterstateFacts({ recipientUf: 'PR', deliveryMethod: 'delivery', cfop: '5102' });
    const rules = await createHmlNormalSaleRuleSet(facts, initialHmlCsosnConfiguration());
    const result = resolveFiscalDocument(facts, rules);

    expect(result.status).toBe('ready');
    if (result.status !== 'ready') return;

    expect(result.document.operation.destination).toBe('1');
    expect(result.document.items[0].classification.cfop).toBe('5102');

    const key = generateNfeAccessKey({
      ufCode: '41',
      yearMonth: '2609',
      cnpj: '44512248000107',
      model: result.document.model,
      series: '1',
      number: 101,
      emissionType: '1',
      randomCode: '12345678',
    }).accessKey;

    const xml = serializeFiscalDocument(facts, result.document, rules, {
      accessKey: key,
      series: 1,
      number: 101,
      issuedAt: '2026-09-30T10:00:00-03:00',
    });

    expect(xml).toContain('<idDest>1</idDest>');
    expect(xml).toContain('<CFOP>5102</CFOP>');
    expect(xml).toContain('<CSOSN>102</CSOSN>');
  });

  // 2. CFOP 6102 identifies interstate sales, but it does not approve their tax matrix.
  it('2. PR → outra UF (SC): bloqueia sem uma matriz HML interestadual aprovada', async () => {
    expect(() => determineSaleCfop({ destination: '2', itemType: 'product' })).toThrow(
      /CFOP 6102 não autoriza a emissão/
    );

    const facts = makeInterstateFacts({ recipientUf: 'SC', deliveryMethod: 'delivery', cfop: '6102' });
    await expect(
      createHmlNormalSaleRuleSet(facts, initialHmlCsosnConfiguration())
    ).rejects.toThrow(/HML_INTERSTATE_MATRIX_NOT_APPROVED/);
  });

  // 3. Operação interestadual não deve escolher 6.933 só porque o destino está fora do estado
  it('3. Operação interestadual não deve utilizar 6.933 para venda de móveis/mercadorias', async () => {
    const checkProduct = validateItemCfopMatch({
      cfop: '6933',
      destination: '2',
      model: '55',
      itemType: 'product',
    });
    expect(checkProduct.valid).toBe(false);
    expect(checkProduct.reason).toContain('ISSQN');

    // Sem uma matriz HML interestadual aprovada, o backend bloqueia antes da serialização.
    const facts = makeInterstateFacts({ recipientUf: 'SC', deliveryMethod: 'delivery', cfop: '6933' });
    await expect(
      createHmlNormalSaleRuleSet(facts, initialHmlCsosnConfiguration())
    ).rejects.toThrow(/HML_INTERSTATE_MATRIX_NOT_APPROVED/);
  });

  // 4. Serviço interestadual deve continuar separado da venda de mercadoria
  it('4. Serviço interestadual deve continuar separado da venda de mercadoria', () => {
    // A matriz HML de venda de mercadoria não cobre prestação de serviço.
    expect(() => determineSaleCfop({ destination: '2', itemType: 'service' })).toThrow(
      /Prestação de serviço exige uma matriz fiscal específica aprovada/
    );
    expect(() => determineSaleCfop({ destination: '1', itemType: 'service' })).toThrow(
      /Prestação de serviço exige uma matriz fiscal específica aprovada/
    );

    // Serviço não pode receber 6102
    const checkService = validateItemCfopMatch({
      cfop: '6102',
      destination: '2',
      model: '55',
      itemType: 'service',
    });
    expect(checkService.valid).toBe(false);
    expect(checkService.reason).toContain('venda de mercadoria e não pode ser utilizado para prestação de serviço');
  });

  // 5. CFOP inexistente/incompatível deve bloquear emissão
  it('5. CFOP inexistente ou incompatível com o modelo/destino bloqueia emissão', () => {
    // Inexistente
    expect(isCfopValid('9999')).toBe(false);
    const checkUnknown = validateItemCfopMatch({
      cfop: '9999',
      destination: '1',
      model: '55',
    });
    expect(checkUnknown.valid).toBe(false);
    expect(checkUnknown.reason).toContain('não existe no catálogo oficial');

    // Incompatível com NFC-e (modelo 65 não aceita 6xxx)
    expect(isCfopApplicableToModel('6102', '65')).toBe(false);
    const checkNfceInterstate = validateItemCfopMatch({
      cfop: '6102',
      destination: '2',
      model: '65',
    });
    expect(checkNfceInterstate.valid).toBe(false);
    expect(checkNfceInterstate.reason).toContain('NFC-e (modelo 65) não permite operação interestadual');

    // Incompatível com destino: CFOP 6102 em operação interna (idDest=1)
    const checkInterstateInInternal = validateItemCfopMatch({
      cfop: '6102',
      destination: '1',
      model: '55',
    });
    expect(checkInterstateInInternal.valid).toBe(false);
    expect(checkInterstateInInternal.reason).toContain('incompatível com operação interna (idDest=1)');

    // Incompatível com destino: CFOP 5102 em operação interestadual (idDest=2)
    const checkInternalInInterstate = validateItemCfopMatch({
      cfop: '5102',
      destination: '2',
      model: '55',
    });
    expect(checkInternalInInterstate.valid).toBe(false);
    expect(checkInternalInInterstate.reason).toContain(
      'incompatível com operação interestadual (idDest=2)'
    );
  });

  // 6. CFOP desativado não deve aparecer para seleção
  it('6. CFOP desativado não deve constar na listagem ativa e bloqueia emissão se forçado', () => {
    const activeOptions = listActiveCfopOptions();
    expect(activeOptions.every((opt) => isCfopActive(opt.value))).toBe(true);

    // Testar que uma definição inativa é barrada por validateItemCfopMatch
    expect(isCfopActive('0000')).toBe(false);
  });

  // 7. O CFOP interestadual não amplia o escopo da matriz HML doméstica.
  it('7. A seleção 6102 não libera a matriz doméstica para outra UF', async () => {
    const facts = makeInterstateFacts({ recipientUf: 'SP', deliveryMethod: 'delivery', cfop: '6102' });
    await expect(
      createHmlNormalSaleRuleSet(facts, initialHmlCsosnConfiguration())
    ).rejects.toThrow(/HML_INTERSTATE_MATRIX_NOT_APPROVED/);
  });

  // 8. Uma regra aprovada é necessária antes de produzir XML interestadual.
  it('8. Não gera XML interestadual com a matriz HML doméstica', async () => {
    const facts = makeInterstateFacts({ recipientUf: 'SC', deliveryMethod: 'delivery', cfop: '6102' });
    await expect(
      createHmlNormalSaleRuleSet(facts, initialHmlCsosnConfiguration())
    ).rejects.toThrow(/HML_INTERSTATE_MATRIX_NOT_APPROVED/);
  });

  // 9. Divergência entre CFOP do frontend e regra server-side deve ser rejeitada de forma explícita
  it('9. Divergência entre CFOP do frontend e regra server-side é rejeitada com erro explícito', async () => {
    // Nenhum CFOP escolhido libera a operação sem sua matriz aprovada.
    const factsMismatched = makeInterstateFacts({ recipientUf: 'SC', deliveryMethod: 'delivery', cfop: '5102' });
    await expect(
      createHmlNormalSaleRuleSet(factsMismatched, initialHmlCsosnConfiguration())
    ).rejects.toThrow(/HML_INTERSTATE_MATRIX_NOT_APPROVED/);

    // Pedido para PR (interno), mas frontend tenta submeter com 6102
    const factsInternalMismatched = makeInterstateFacts({ recipientUf: 'PR', deliveryMethod: 'delivery', cfop: '6102' });
    const rulesInternal = await createHmlNormalSaleRuleSet(factsInternalMismatched, initialHmlCsosnConfiguration());
    const resInternal = resolveFiscalDocument(factsInternalMismatched, rulesInternal);
    expect(resInternal.status).toBe('blocked');
    if (resInternal.status === 'blocked') {
      expect(resInternal.blockers[0].message).toMatch(
        /esperado CFOP 5102 para operação interna/
      );
    }
    expect(() => rulesInternal.determine(factsInternalMismatched, 'hash')).toThrow(
      /esperado CFOP 5102 para operação interna/
    );
  });

  // 10. Nenhum fallback silencioso para 5.102, 6.102 ou qualquer outro CFOP
  it('10. Nenhum fallback silencioso para CFOP quando a combinação fiscal for desconhecida', () => {
    expect(() =>
      determineSaleCfop({
        destination: '3', // Exterior
        itemType: 'product',
      })
    ).toThrow(/Determinação fiscal de CFOP para destino idDest=3 não suportada/);

    expect(() =>
      determineSaleCfop({
        destination: '3',
        itemType: 'service',
      })
    ).toThrow(/Prestação de serviço exige uma matriz fiscal específica aprovada/);
  });

  // 11. Venda presencial / retirada (pickup): mesmo que o cliente resida em outra UF, circulação ocorre no PR
  it('11. Cliente de outra UF com modalidade retirada (pickup): operação física ocorre no PR e utiliza CFOP 5.102', async () => {
    // Cliente mora em SC, mas comprou com retirada no balcão no Paraná
    const factsPickup = makeInterstateFacts({ recipientUf: 'SC', deliveryMethod: 'pickup', cfop: '5102' });
    const rules = await createHmlNormalSaleRuleSet(factsPickup, initialHmlCsosnConfiguration());
    const result = resolveFiscalDocument(factsPickup, rules);

    expect(result.status).toBe('ready');
    if (result.status === 'ready') {
      expect(result.document.operation.destination).toBe('1');
      expect(result.document.items[0].classification.cfop).toBe('5102');
    }
  });

  // 12. Mercadorias com ST e Produção Própria exigem matriz específica
  it('12. Bloqueia ST e Produção Própria sem matriz específica aprovada', () => {
    expect(() => determineSaleCfop({ destination: '1', isSt: true })).toThrow(
      /Mercadoria com ST ou de produção própria exige matriz fiscal específica aprovada/
    );
    expect(() => determineSaleCfop({ destination: '2', isSt: true })).toThrow(
      /Operação interestadual não está coberta por matriz fiscal aprovada/
    );
    expect(() => determineSaleCfop({ destination: '1', isOwnProduction: true })).toThrow(
      /Mercadoria com ST ou de produção própria exige matriz fiscal específica aprovada/
    );
    expect(() => determineSaleCfop({ destination: '2', isOwnProduction: true })).toThrow(
      /Operação interestadual não está coberta por matriz fiscal aprovada/
    );
  });

  it('classifica 6102 e 6108 separadamente e conserva ST condicional como candidata', () => {
    const nonTaxpayerOptions = listActiveCfopOptions({
      direction: 'outbound',
      scope: 'interstate',
      model: '55',
      itemType: 'product',
      operationType: 'sale_to_non_taxpayer',
      merchandiseOrigin: 'third_party',
      isSt: true,
    });
    expect(nonTaxpayerOptions.map((option) => option.value)).toContain('6108');
    expect(nonTaxpayerOptions.find((option) => option.value === '6108')?.stApplicability).toBe(
      'scenario_dependent'
    );
    const taxpayerStOptions = listActiveCfopOptions({
      direction: 'outbound',
      scope: 'interstate',
      model: '55',
      itemType: 'product',
      operationType: 'sale',
      merchandiseOrigin: 'third_party',
      isSt: true,
    });
    expect(taxpayerStOptions.map((option) => option.value)).not.toContain('6102');
    expect(taxpayerStOptions.map((option) => option.value)).toContain('6404');
    expect(
      validateItemCfopMatch({
        cfop: '6108',
        destination: '2',
        model: '55',
        operationType: 'sale_to_non_taxpayer',
        merchandiseOrigin: 'third_party',
        isSt: true,
      }).valid
    ).toBe(true);
    expect(
      validateItemCfopMatch({
        cfop: '6102',
        destination: '2',
        model: '55',
        operationType: 'sale',
        merchandiseOrigin: 'own_production',
      }).valid
    ).toBe(false);
    expect(
      validateItemCfopMatch({
        cfop: '6102',
        destination: '2',
        model: '55',
        operationType: 'sale',
        merchandiseOrigin: 'third_party',
        isSt: true,
      })
    ).toMatchObject({ valid: false, reason: 'CFOP 6102 não se aplica a item sujeito a ST.' });
  });

  it('determina destino pela entrega física selecionada e pela UF do emitente na retirada', () => {
    expect(
      resolveFiscalCfopOrderScope({
        issuerUf: 'PR',
        deliveryMethod: 'delivery',
        shipping: {
          deliveryMethod: 'delivery',
          useCustomerAddress: false,
          deliveryAddress: { state: 'SC' },
        },
        customerAddress: { state: 'PR' },
      })
    ).toMatchObject({ scope: 'interstate', operationUf: 'SC', destination: '2' });
    expect(
      resolveFiscalCfopOrderScope({
        issuerUf: 'PR',
        deliveryMethod: 'pickup',
        shipping: { deliveryMethod: 'pickup' },
        customerAddress: { state: 'SC' },
      })
    ).toMatchObject({ scope: 'internal', operationUf: 'PR', destination: '1' });
  });
});

describe('matriz fiscal interestadual server-side', () => {
  const facts: InterstateFiscalMatrixFacts = {
    environment: 2,
    model: '55',
    issuerRegime: '1',
    issuerUf: 'PR',
    destinationUf: 'SC',
    operationType: 'sale',
    recipientPersonType: 'PJ',
    recipientIeStatus: 'taxpayer',
    finalConsumer: true,
    merchandiseOrigin: 'third_party',
    productOrigin: '0',
    ncm: '94035000',
    cest: '',
    hasSt: false,
    effectiveAt: '2026-10-06T12:00:00Z',
  };

  const completeRule = (id = 'APPROVED-TEST'): InterstateFiscalMatrixRule => ({
    id,
    status: 'APPROVED',
    criteria: { ...facts },
    priority: 1,
    treatment: {
      cfop: '6102',
      csosn: '102',
      icms: { xmlGroup: 'ICMSSN102', framework: 'TEST', ratePercent: 0, baseMethod: 'TEST', reductionPercent: 0 },
      st: { responsibility: 'none', applicable: false, agreementOrProtocol: 'not_applicable', baseMethod: 'none', ratePercent: 0 },
      difal: { responsibility: 'none', applicable: false, internalRatePercent: 0, interstateRatePercent: 0, destinationSharePercent: 0 },
      fcp: { applicable: false, ratePercent: 0 },
      fcpSt: { applicable: false, ratePercent: 0 },
    },
    candidateCfops: [],
    pendingReview: [],
    sourceReferences: ['TEST_ONLY'],
    approvedBy: 'TEST_ONLY',
    approvedAt: '2026-10-01T00:00:00Z',
    effectiveFrom: '2026-10-01T00:00:00Z',
    xmlEvidence: 'TEST_ONLY: synthetic serializer coverage, not fiscal approval',
    testEvidence: 'TEST_ONLY: selector fixture',
  });

  it('preserva os dez IDs e expande para 24 combinações independentes, sem aprovar tributos', () => {
    expect(INTERSTATE_FISCAL_MATRIX_RULES).toHaveLength(24);
    expect(INTERSTATE_FISCAL_MATRIX_RULES.filter((rule) => rule.status === 'DRAFT')).toHaveLength(20);
    expect(INTERSTATE_FISCAL_MATRIX_RULES.filter((rule) => rule.status === 'BLOCKED')).toHaveLength(4);
    expect(INTERSTATE_FISCAL_MATRIX_RULES.slice(0, 10).every((rule) => rule.status === 'DRAFT')).toBe(true);
    expect(
      INTERSTATE_FISCAL_MATRIX_RULES.every(
        (rule) => rule.treatment.cfop === null && rule.treatment.csosn === null
      )
    ).toBe(true);
    expect(hasApprovedInterstateRoute(facts)).toBe(false);
  });

  it('não resolve CFOP candidato de um cenário DRAFT como regra de emissão', () => {
    expect(resolveInterstateFiscalMatrix(facts)).toMatchObject({
      status: 'not_approved',
      code: 'HML_INTERSTATE_MATRIX_NOT_APPROVED',
      matchingDraftRuleIds: ['PR-SC-PJ-TAXPAYER-FINAL-NO-ST'],
      missingFacts: [],
    });
  });

  it('bloqueia quando faltam condição de IE ou classificação explícita de ST', () => {
    const incomplete = { ...facts, recipientIeStatus: undefined, hasSt: undefined };
    expect(resolveInterstateFiscalMatrix(incomplete)).toMatchObject({
      status: 'not_approved',
      missingFacts: expect.arrayContaining(['recipientIeStatus', 'hasSt']),
    });
  });

  it('só permite resolução sintética com regra APPROVED completa e sem conflito', () => {
    expect(hasApprovedInterstateRoute(facts, [completeRule()])).toBe(true);
    expect(resolveInterstateFiscalMatrix(facts, [completeRule()])).toMatchObject({
      status: 'approved',
      rule: { id: 'APPROVED-TEST' },
    });
    expect(resolveInterstateFiscalMatrix(facts, [completeRule(), completeRule('DUPLICATE')])).toMatchObject({
      status: 'ambiguous',
      code: 'HML_INTERSTATE_MATRIX_AMBIGUOUS',
    });
  });

  it('rejeita registro APPROVED incompleto em vez de usar seus valores parciais', () => {
    const incomplete = completeRule('INCOMPLETE');
    incomplete.treatment.difal.applicable = null;
    expect(resolveInterstateFiscalMatrix(facts, [incomplete])).toMatchObject({
      status: 'invalid_approved_rule',
      code: 'HML_INTERSTATE_MATRIX_INVALID',
    });
  });

  it('mantém isento/PF e consumidor final como dimensões independentes', () => {
    const result = resolveInterstateFiscalMatrix({ ...facts, recipientPersonType: 'PF', recipientIeStatus: 'exempt', finalConsumer: false });
    expect(result).toMatchObject({ status: 'not_approved', missingFacts: [], matchingDraftRuleIds: ['PR-SC-PF-EXEMPT-NONFINAL-NO-ST'] });
  });

  it('bloqueia não contribuinte não final pela RV 696 sem corrigir os fatos', () => {
    const input = { ...facts, recipientIeStatus: 'non_taxpayer' as const, finalConsumer: false };
    expect(resolveInterstateFiscalMatrix(input, [completeRule()])).toMatchObject({ status: 'not_approved', reason: expect.stringContaining('696') });
    expect(input.finalConsumer).toBe(false);
  });

  const genericRule = (): InterstateFiscalMatrixRule => {
    const rule = completeRule('GENERIC-TEST');
    delete rule.criteria.ncm;
    delete rule.criteria.cest;
    delete rule.criteria.effectiveAt;
    rule.reviewedWildcards = ['ncm', 'cest'];
    return rule;
  };

  it('seleciona NCM específico sobre genérico, devolvendo ID, motivo e fontes', () => {
    const generic = genericRule();
    generic.priority = 999;
    const specific = completeRule('NCM-TEST');
    expect(resolveInterstateFiscalMatrix(facts, [generic, specific])).toMatchObject({ status: 'approved', ruleId: 'NCM-TEST', reason: expect.any(String), sources: ['TEST_ONLY'] });
    expect(resolveInterstateFiscalMatrix(facts, [specific, generic])).toMatchObject({ status: 'approved', ruleId: 'NCM-TEST' });
  });

  it.each([
    { effectiveFrom: '2026-10-07T00:00:00Z' },
    { effectiveUntil: '2026-10-06T11:59:59Z' },
  ])('ignora regra específica fora da vigência antes de selecionar a genérica: %j', (validity) => {
    const specific = { ...completeRule('OUTSIDE-TEST'), ...validity };
    expect(resolveInterstateFiscalMatrix(facts, [specific, genericRule()])).toMatchObject({ status: 'approved', ruleId: 'GENERIC-TEST' });
    expect(resolveInterstateFiscalMatrix(facts, [specific])).toMatchObject({ status: 'not_approved', code: 'HML_INTERSTATE_MATRIX_NOT_APPROVED' });
  });

  it('inclui ambos os instantes exatos da vigência e rejeita intervalos invertidos', () => {
    const rule = completeRule();
    delete rule.criteria.effectiveAt;
    rule.effectiveUntil = facts.effectiveAt;
    expect(resolveInterstateFiscalMatrix({ ...facts, effectiveAt: rule.effectiveFrom }, [rule])).toMatchObject({ status: 'approved' });
    expect(resolveInterstateFiscalMatrix(facts, [rule])).toMatchObject({ status: 'approved' });
    rule.effectiveUntil = '2026-09-01T00:00:00Z';
    expect(hasApprovedInterstateRoute(facts, [rule])).toBe(false);
  });

  it('empates genéricos bloqueiam e wildcard não revisado não amplia aprovação', () => {
    const generic = genericRule();
    expect(resolveInterstateFiscalMatrix(facts, [generic, { ...generic, id: 'TIE' }])).toMatchObject({ status: 'ambiguous', ruleIds: ['GENERIC-TEST', 'TIE'] });
    generic.reviewedWildcards = [];
    expect(resolveInterstateFiscalMatrix(facts, [generic])).toMatchObject({ status: 'invalid_approved_rule' });
  });

  it.each(['fcpSt', 'st', 'difal'] as const)('não converte incidência desconhecida de %s em falso', (tax) => {
    const rule = completeRule();
    rule.treatment[tax].applicable = null;
    expect(resolveInterstateFiscalMatrix(facts, [rule])).toMatchObject({ status: 'invalid_approved_rule' });
    expect(hasApprovedInterstateRoute(facts, [rule])).toBe(false);
  });

  it('exige evidência de XML e testes antes de considerar APPROVED utilizável', () => {
    const rule = completeRule();
    delete rule.xmlEvidence;
    expect(resolveInterstateFiscalMatrix(facts, [rule])).toMatchObject({ status: 'invalid_approved_rule' });
  });
});
