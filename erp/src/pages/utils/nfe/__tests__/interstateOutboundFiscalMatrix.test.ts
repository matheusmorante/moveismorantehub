import { describe, expect, it, vi } from 'vitest';
import { initialHmlCsosnConfiguration } from '../../../../../../api/nfe/csosnPolicy';
import { resolveFiscalDocument } from '../../../../../../api/nfe/fiscalSnapshot';
import { serializeFiscalDocument } from '../../../../../../api/nfe/fiscalXmlSerializer';
import { createHmlNormalSaleRuleSet } from '../../../../../../api/nfe/hmlNormalSaleRuleSet';
import {
  hasApprovedInterstateOutboundRoute,
  INTERSTATE_OUTBOUND_FISCAL_MATRIX_RULES,
  type InterstateOutboundFiscalMatrixFacts,
  type InterstateOutboundFiscalMatrixRule,
  resolveInterstateOutboundFiscalMatrix,
  resolveInterstateStRole,
} from '../../../../../../api/nfe/interstateOutboundFiscalMatrix';
import {
  createNormalSaleRuleSet,
  NORMAL_SALE_RULESET_VERSION,
} from '../../../../../../api/nfe/normalSaleRuleSet';
import { resolveFiscalCfopOrderScope } from '../../../../../../shared-utils/fiscalCfopModel';
import { resolveOrderFiscalModel } from '../../../../../../shared-utils/fiscalDocumentModel';
import { generateNfeAccessKey } from '../nfeAccessKey';
import { makeInterstateFacts } from './fixtures/fiscalCfopMatrix.fixtures';

describe('Matriz de Decisão Fiscal Interestadual de Saída server-side', () => {
  const facts: InterstateOutboundFiscalMatrixFacts = {
    environment: 2,
    model: '55',
    issuerRegime: '1',
    issuerUf: 'PR',
    destinationUf: 'SC',
    destinationScope: 'INTERSTATE',
    operationType: 'sale',
    purpose: '1',
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

  const completeRule = (id = 'APPROVED-TEST'): InterstateOutboundFiscalMatrixRule => ({
    id,
    normativeScope: 'NATIONAL',
    status: 'APPROVED',
    criteria: { ...facts },
    priority: 1,
    treatment: {
      cfop: '6102',
      csosn: '102',
      icms: {
        xmlGroup: 'ICMSSN102',
        framework: 'TEST',
        ratePercent: 0,
        baseMethod: 'TEST',
        reductionPercent: 0,
      },
      st: {
        responsibility: 'none',
        applicable: false,
        agreementOrProtocol: 'not_applicable',
        baseMethod: 'none',
        ratePercent: 0,
      },
      difal: {
        responsibility: 'none',
        applicable: false,
        internalRatePercent: 0,
        interstateRatePercent: 0,
        destinationSharePercent: 0,
      },
      fcp: { applicable: false, ratePercent: 0 },
      fcpSt: { applicable: false, ratePercent: 0 },
    },
    candidateCfops: [],
    pendingReview: [],
    sourceReferences: ['TEST_ONLY'],
    normativeSources: [{ id: 'TEST', scope: 'NATIONAL', url: 'TEST_ONLY' }],
    approvedBy: 'TEST_ONLY',
    approvedAt: '2026-10-01T00:00:00Z',
    effectiveFrom: '2026-10-01T00:00:00Z',
    xmlEvidence: 'TEST_ONLY: synthetic serializer coverage, not fiscal approval',
    testEvidence: 'TEST_ONLY: selector fixture',
  });

  const interstateEmissionFacts = (
    destinationUf: string,
    finalConsumer: boolean,
    recipientIeIndicator: '1' | '9'
  ) => {
    const cfop = recipientIeIndicator === '1' ? '6102' : '6108';
    const input = makeInterstateFacts({ recipientUf: destinationUf, cfop });
    input.capturedAt = facts.effectiveAt;
    input.emissionRequest.finalConsumer = finalConsumer;
    input.emissionRequest.recipientIeIndicator = recipientIeIndicator;
    input.emissionRequest.recipientTaxId = '11222333000181';
    if (recipientIeIndicator === '1') input.emissionRequest.recipientIe = '123456789';
    const customer = input.fiscalInputs!.customer as Record<string, unknown>;
    input.fiscalInputs!.customer = {
      ...customer,
      personType: 'PJ',
      cpfCnpj: '11222333000181',
      ieIndicator: recipientIeIndicator,
      ...(recipientIeIndicator === '1' ? { ie: '123456789' } : {}),
    };
    const products = input.fiscalInputs!.products as Record<string, Record<string, unknown>>;
    products['PROD-MOVEL-1'] = { ...products['PROD-MOVEL-1'], hasSt: false };
    input.order.data.fiscalContext = {
      recipientIeIndicator,
      acquisitionPurpose: finalConsumer ? 'use_consumption' : 'resale',
      finalConsumer,
      purpose: '1',
    };
    return input;
  };

  it('mantém somente as seis famílias gerais, sem aprovação fiscal interestadual', () => {
    expect(INTERSTATE_OUTBOUND_FISCAL_MATRIX_RULES).toHaveLength(6);
    expect(
      INTERSTATE_OUTBOUND_FISCAL_MATRIX_RULES.filter((rule) => rule.status === 'APPROVED')
    ).toHaveLength(0);
    expect(
      INTERSTATE_OUTBOUND_FISCAL_MATRIX_RULES.filter((rule) => rule.status === 'BLOCKED')
    ).toHaveLength(1);
    expect(
      INTERSTATE_OUTBOUND_FISCAL_MATRIX_RULES.filter((rule) => rule.status === 'DRAFT')
    ).toHaveLength(5);

    const generalFamilies = INTERSTATE_OUTBOUND_FISCAL_MATRIX_RULES.filter(
      (rule) => rule.id.endsWith('-BASE') && rule.candidateCfops.length > 0
    );
    expect(generalFamilies).toHaveLength(5);
    expect(generalFamilies.every((rule) => rule.status === 'DRAFT')).toBe(true);
    expect(generalFamilies.every((rule) => rule.pendingReview.length > 0)).toBe(true);
    expect(generalFamilies.map((rule) => rule.treatment.csosn)).toEqual([
      '103',
      '103',
      '103',
      '103',
      '103',
    ]);
    expect(generalFamilies.every((rule) => rule.criteria.destinationUf === null)).toBe(true);
    expect(
      generalFamilies.every((rule) =>
        rule.pendingReview.some((item) => item.includes('sem override por estado'))
      )
    ).toBe(true);
    expect(
      generalFamilies.every(
        (rule) =>
          !rule.approvedBy &&
          !rule.approvedAt &&
          !rule.effectiveFrom &&
          !rule.reviewedWildcards?.length &&
          !rule.xmlEvidence &&
          !rule.testEvidence
      )
    ).toBe(true);

    const expectedIds = [
      'INTERSTATE-TAXPAYER-NONFINAL-BASE',
      'INTERSTATE-TAXPAYER-FINAL-BASE',
      'INTERSTATE-EXEMPT-NONFINAL-BASE',
      'INTERSTATE-EXEMPT-FINAL-BASE',
      'INTERSTATE-NONTAXPAYER-FINAL-BASE',
      'INTERSTATE-NONTAXPAYER-NONFINAL-BASE',
    ];
    expect(INTERSTATE_OUTBOUND_FISCAL_MATRIX_RULES.map((r) => r.id)).toEqual(expectedIds);
    expect(hasApprovedInterstateOutboundRoute(facts)).toBe(false);
  });

  it('bloqueia operação com ST não configurada (INTERSTATE_ST_RULE_NOT_CONFIGURED)', () => {
    const withSt = { ...facts, stRole: 'SUBSTITUTE' as const };
    expect(resolveInterstateOutboundFiscalMatrix(withSt)).toMatchObject({
      status: 'not_approved',
      code: 'INTERSTATE_ST_RULE_NOT_CONFIGURED',
      reason: expect.stringContaining('Substituição Tributária interestadual'),
    });
  });

  it('bloqueia quando faltam fatos obrigatórios do perfil fiscal', () => {
    const incomplete = { ...facts, recipientIeStatus: undefined };
    expect(resolveInterstateOutboundFiscalMatrix(incomplete)).toMatchObject({
      status: 'not_approved',
      code: 'INTERSTATE_TAX_PROFILE_INCOMPLETE',
      missingFacts: expect.arrayContaining(['recipientIeStatus']),
    });
  });

  it('não interpreta hasSt ausente como false', () => {
    const withoutSt = { ...facts };
    delete withoutSt.hasSt;
    expect(resolveInterstateOutboundFiscalMatrix(withoutSt)).toMatchObject({
      status: 'not_approved',
      code: 'INTERSTATE_TAX_PROFILE_INCOMPLETE',
      missingFacts: expect.arrayContaining(['hasSt']),
      reason: expect.stringContaining('CEST vazio ou ausente'),
    });
    expect(
      resolveInterstateOutboundFiscalMatrix({
        ...facts,
        hasSt: undefined,
      })
    ).toMatchObject({ status: 'not_approved', missingFacts: expect.arrayContaining(['hasSt']) });
  });

  it('o resolvedor ST também preserva estado desconhecido quando hasSt não foi informado', () => {
    expect(
      resolveInterstateStRole({
        ncm: '85165000',
        issuerUf: 'PR',
        destinationUf: 'SC',
      })
    ).toMatchObject({
      role: null,
      isSt: null,
      status: 'UNCONFIGURED',
      errorCode: 'INTERSTATE_TAX_PROFILE_INCOMPLETE',
    });
  });

  it('só permite resolução sintética com regra APPROVED completa e sem conflito', () => {
    expect(hasApprovedInterstateOutboundRoute(facts, [completeRule()])).toBe(true);
    expect(resolveInterstateOutboundFiscalMatrix(facts, [completeRule()])).toMatchObject({
      status: 'approved',
      rule: { id: 'APPROVED-TEST' },
    });
    expect(
      resolveInterstateOutboundFiscalMatrix(facts, [completeRule(), completeRule('DUPLICATE')])
    ).toMatchObject({
      status: 'ambiguous',
      code: 'HML_INTERSTATE_MATRIX_AMBIGUOUS',
    });
  });

  it('rejeita registro APPROVED incompleto em vez de usar seus valores parciais', () => {
    const incomplete = completeRule('INCOMPLETE');
    incomplete.treatment.difal.applicable = null;
    expect(resolveInterstateOutboundFiscalMatrix(facts, [incomplete])).toMatchObject({
      status: 'invalid_approved_rule',
      code: 'HML_INTERSTATE_MATRIX_INVALID',
    });
  });

  it('separa validação técnica de indIEDest=2 da aprovação do tratamento tributário', () => {
    // SC não consta na lista de UFs bloqueadas pela RV 805, mas a família tributária segue DRAFT.
    const resultSc = resolveInterstateOutboundFiscalMatrix({
      ...facts,
      destinationUf: 'SC',
      recipientIeStatus: 'exempt',
      finalConsumer: false,
    });
    expect(resultSc).toMatchObject({
      status: 'not_approved',
      matchingDraftRuleIds: ['INTERSTATE-EXEMPT-NONFINAL-BASE'],
    });

    // SP NÃO aceita isento em operação interestadual (RV 805 / E16a-30)
    const resultSp = resolveInterstateOutboundFiscalMatrix({
      ...facts,
      destinationUf: 'SP',
      recipientIeStatus: 'exempt',
      finalConsumer: false,
    });
    expect(resultSp).toMatchObject({
      status: 'not_approved',
      code: 'INTERSTATE_EXEMPT_IE_NOT_ALLOWED',
      reason: expect.stringContaining('não permite destinatário como contribuinte isento'),
    });
  });

  it('bloqueia não contribuinte não final pela RV 696 (BLOCKED)', () => {
    const input = { ...facts, recipientIeStatus: 'non_taxpayer' as const, finalConsumer: false };
    expect(resolveInterstateOutboundFiscalMatrix(input)).toMatchObject({
      status: 'not_approved',
      code: 'INTERSTATE_RULE_INVALID_COMBINATION',
      reason: expect.stringContaining('696'),
    });
  });

  const genericRule = (): InterstateOutboundFiscalMatrixRule => {
    const rule = completeRule('GENERIC-TEST');
    delete rule.criteria.ncm;
    delete rule.criteria.cest;
    delete rule.criteria.effectiveAt;
    rule.reviewedWildcards = ['ncm', 'cest'];
    return rule;
  };

  const anyDestinationRule = (): InterstateOutboundFiscalMatrixRule => {
    const rule = genericRule();
    rule.criteria.destinationUf = null;
    rule.reviewedWildcards = [...rule.reviewedWildcards!, 'destinationUf'];
    return rule;
  };

  it('uma regra APPROVED mais específica pode vencer um DRAFT mais amplo', () => {
    const broadDraft = anyDestinationRule();
    broadDraft.status = 'DRAFT';
    broadDraft.priority = 999;
    broadDraft.pendingReview = ['DRAFT amplo de teste'];
    const specificApproved = completeRule('APPROVED-SPECIFIC');
    specificApproved.priority = 1;

    expect(
      resolveInterstateOutboundFiscalMatrix(facts, [broadDraft, specificApproved])
    ).toMatchObject({ status: 'approved', ruleId: specificApproved.id });
  });

  it('PR→RS para PJ contribuinte continua bloqueado enquanto a família geral estiver DRAFT', () => {
    const input = {
      ...facts,
      destinationUf: 'RS',
      recipientIeStatus: 'taxpayer' as const,
      finalConsumer: false,
    };
    expect(
      resolveFiscalCfopOrderScope({
        issuerUf: 'PR',
        deliveryMethod: 'delivery',
        shipping: { useCustomerAddress: false, deliveryAddress: { state: 'RS' } },
        customerAddress: { state: 'PR' },
      })
    ).toMatchObject({ scope: 'interstate', destination: '2' });
    expect(resolveInterstateOutboundFiscalMatrix(input)).toMatchObject({
      status: 'not_approved',
      matchingDraftRuleIds: ['INTERSTATE-TAXPAYER-NONFINAL-BASE'],
    });
  });

  it('PR→SC usa a mesma família geral DRAFT, sem regra de destino específica', () => {
    const result = resolveInterstateOutboundFiscalMatrix(facts);
    expect(result).toMatchObject({
      status: 'not_approved',
      matchingDraftRuleIds: ['INTERSTATE-TAXPAYER-FINAL-BASE'],
    });
    expect(INTERSTATE_OUTBOUND_FISCAL_MATRIX_RULES.some((rule) => rule.id.includes('PR-SC'))).toBe(
      false
    );
  });

  it('mantém bloqueadas todas as 26 UFs de destino pela matriz geral sem APPROVED', () => {
    const interstateUfs = [
      'AC',
      'AL',
      'AP',
      'AM',
      'BA',
      'CE',
      'DF',
      'ES',
      'GO',
      'MA',
      'MT',
      'MS',
      'MG',
      'PA',
      'PB',
      'PE',
      'PI',
      'RJ',
      'RN',
      'RS',
      'RO',
      'RR',
      'SC',
      'SP',
      'SE',
      'TO',
    ];
    for (const destinationUf of interstateUfs) {
      const routeFacts = {
        ...facts,
        destinationUf,
        recipientIeStatus: 'taxpayer' as const,
        finalConsumer: false,
      };
      expect(hasApprovedInterstateOutboundRoute(routeFacts)).toBe(false);
      expect(resolveInterstateOutboundFiscalMatrix(routeFacts)).toMatchObject({
        status: 'not_approved',
        matchingDraftRuleIds: ['INTERSTATE-TAXPAYER-NONFINAL-BASE'],
      });
    }
  });

  it('bloqueia PR→SC antes de chamar o serializer quando nenhuma família está aprovada', async () => {
    const input = interstateEmissionFacts('SC', true, '1');
    const serializer = vi.fn();
    const prepareThenSerialize = async () => {
      const ruleSet = await createNormalSaleRuleSet(input);
      const resolved = resolveFiscalDocument(input, ruleSet);
      if (resolved.status !== 'ready') throw new Error(JSON.stringify(resolved.blockers));
      return serializer(resolved.document);
    };

    await expect(prepareThenSerialize()).rejects.toThrow('HML_INTERSTATE_MATRIX_NOT_APPROVED');
    expect(serializer).not.toHaveBeenCalled();
  });

  it.each([1, 2] as const)(
    'exige finalidade persistida antes da matriz no ambiente %s',
    async (environment) => {
      const input = interstateEmissionFacts('SC', true, '1');
      input.emissionRequest.environment = environment;
      delete (input.order.data.fiscalContext as Record<string, unknown>).acquisitionPurpose;
      await expect(createNormalSaleRuleSet(input)).rejects.toThrow('ACQUISITION_PURPOSE_REQUIRED');
    }
  );

  it.each([
    ['resale', true],
    ['use_consumption', false],
    ['fixed_asset', false],
  ])(
    'rejeita indFinal incompatível com finalidade %s persistida',
    async (acquisitionPurpose, finalConsumer) => {
      const input = interstateEmissionFacts('SC', finalConsumer as boolean, '1');
      (input.order.data.fiscalContext as Record<string, unknown>).acquisitionPurpose =
        acquisitionPurpose;
      await expect(createNormalSaleRuleSet(input)).rejects.toThrow('ACQUISITION_PURPOSE_MISMATCH');
    }
  );

  it('bloqueia cenário interestadual antes do serializer sem depender de um status tributário candidato', async () => {
    const input = interstateEmissionFacts('RS', false, '9');
    const serializer = vi.fn();
    const prepareThenSerialize = async () => {
      const ruleSet = await createNormalSaleRuleSet(input);
      const resolved = resolveFiscalDocument(input, ruleSet);
      if (resolved.status !== 'ready') throw new Error(JSON.stringify(resolved.blockers));
      return serializer(resolved.document);
    };

    await expect(prepareThenSerialize()).rejects.toThrow('HML_INTERSTATE_MATRIX_NOT_APPROVED');
    expect(serializer).not.toHaveBeenCalled();
  });

  it('mantém a família bloqueada mesmo se o usuário escolher um CSOSN candidato', async () => {
    const input = interstateEmissionFacts('RS', true, '1');
    input.emissionRequest.itemFiscalSelections!['1'].csosn = '103';
    const serializer = vi.fn();
    const prepareThenSerialize = async () => {
      const ruleSet = await createNormalSaleRuleSet(input);
      const resolved = resolveFiscalDocument(input, ruleSet);
      if (resolved.status !== 'ready') throw new Error(JSON.stringify(resolved.blockers));
      return serializer(resolved.document);
    };

    await expect(prepareThenSerialize()).rejects.toThrow('HML_INTERSTATE_MATRIX_NOT_APPROVED');
    expect(input.emissionRequest.itemFiscalSelections!['1'].csosn).toBe('103');
    expect(serializer).not.toHaveBeenCalled();
  });

  it('PR→PR segue interno e não casa com wildcard interestadual mesmo em fixture APPROVED', () => {
    const input = { ...facts, destinationUf: 'PR' };
    expect(
      resolveFiscalCfopOrderScope({
        issuerUf: 'PR',
        deliveryMethod: 'delivery',
        shipping: { useCustomerAddress: false, deliveryAddress: { state: 'PR' } },
        customerAddress: { state: 'SC' },
      })
    ).toMatchObject({ scope: 'internal', destination: '1' });
    expect(hasApprovedInterstateOutboundRoute(input, [anyDestinationRule()])).toBe(false);
    expect(resolveInterstateOutboundFiscalMatrix(input, [anyDestinationRule()])).toMatchObject({
      status: 'not_approved',
    });
  });

  it('retirada usa o estabelecimento ou endereço efetivo da retirada, não a UF cadastral', () => {
    const input = { issuerUf: 'PR', deliveryMethod: 'pickup', customerAddress: { state: 'SC' } };
    expect(resolveFiscalCfopOrderScope(input)).toMatchObject({
      scope: 'internal',
      operationUf: 'PR',
    });
    expect(
      resolveFiscalCfopOrderScope({ ...input, shipping: { pickupAddress: { state: 'RS' } } })
    ).toMatchObject({ scope: 'interstate', operationUf: 'RS' });
  });

  it.each(['EX', 'ZZ', '', 'PR'])(
    'wildcard só aceita destino brasileiro diferente da origem: %s',
    (destinationUf) => {
      expect(
        resolveInterstateOutboundFiscalMatrix({ ...facts, destinationUf }, [anyDestinationRule()])
      ).toMatchObject({ status: 'not_approved' });
      expect(
        hasApprovedInterstateOutboundRoute({ ...facts, destinationUf }, [anyDestinationRule()])
      ).toBe(false);
    }
  );

  it('mesma base sintética aceita todos os outros 26 destinos e não atende outra origem/finalidade/modelo', () => {
    const rule = anyDestinationRule();
    for (const destinationUf of [
      'AC',
      'AL',
      'AP',
      'AM',
      'BA',
      'CE',
      'DF',
      'ES',
      'GO',
      'MA',
      'MT',
      'MS',
      'MG',
      'PA',
      'PB',
      'PE',
      'PI',
      'RJ',
      'RN',
      'RS',
      'RO',
      'RR',
      'SC',
      'SP',
      'SE',
      'TO',
    ]) {
      expect(
        resolveInterstateOutboundFiscalMatrix({ ...facts, destinationUf }, [rule])
      ).toMatchObject({ status: 'approved', ruleId: rule.id });
      expect(hasApprovedInterstateOutboundRoute({ ...facts, destinationUf }, [rule])).toBe(true);
    }
    for (const change of [
      { issuerUf: 'SP' },
      { purpose: '4' as const },
      { model: '65' as const },
    ]) {
      expect(resolveInterstateOutboundFiscalMatrix({ ...facts, ...change }, [rule])).toMatchObject({
        status: 'not_approved',
      });
      expect(hasApprovedInterstateOutboundRoute({ ...facts, ...change }, [rule])).toBe(false);
    }
  });

  it('override sintético SC ganha somente em SC; SP e RS permanecem na regra geral', () => {
    const general = anyDestinationRule();
    general.priority = 999;
    const sc = genericRule();
    sc.id = 'INTERSTATE-SC-TEST';
    sc.normativeScope = 'DESTINATION_STATE';
    sc.normativeSources = [
      { id: 'SC-TEST', scope: 'DESTINATION_STATE', destinationUf: 'SC', url: 'TEST_SC' },
    ];
    sc.sourceReferences = ['TEST_SC'];
    for (const rules of [
      [general, sc],
      [sc, general],
    ]) {
      expect(resolveInterstateOutboundFiscalMatrix(facts, rules)).toMatchObject({
        status: 'approved',
        ruleId: sc.id,
        normativeSources: [
          expect.objectContaining({ scope: 'DESTINATION_STATE', destinationUf: 'SC' }),
        ],
      });
      for (const destinationUf of ['SP', 'RS'])
        expect(
          resolveInterstateOutboundFiscalMatrix({ ...facts, destinationUf }, rules)
        ).toMatchObject({ status: 'approved', ruleId: general.id });
    }
    expect(
      resolveInterstateOutboundFiscalMatrix({ ...facts, destinationUf: 'SP' }, [sc])
    ).toMatchObject({ status: 'not_approved' });
  });

  it('produto/NCM prevalece sobre override de destino; destino null/omitido tem a mesma especificidade', () => {
    const general = anyDestinationRule();
    const omitted = {
      ...anyDestinationRule(),
      id: 'OMITTED-TEST',
      criteria: { ...general.criteria },
    };
    delete omitted.criteria.destinationUf;
    expect(resolveInterstateOutboundFiscalMatrix(facts, [general, omitted])).toMatchObject({
      status: 'ambiguous',
    });
    const sc = genericRule();
    sc.id = 'SC-OVERRIDE-TEST';
    sc.priority = 999;
    const product = completeRule('PRODUCT-TEST');
    product.criteria.destinationUf = null;
    product.criteria.productId = 'PRODUCT-1';
    product.reviewedWildcards = ['destinationUf'];
    product.normativeScope = 'PRODUCT_SPECIFIC';
    product.normativeSources = [
      { id: 'PRODUCT', scope: 'PRODUCT_SPECIFIC', productId: 'PRODUCT-1', url: 'TEST_ONLY' },
    ];
    expect(
      resolveInterstateOutboundFiscalMatrix({ ...facts, productId: 'PRODUCT-1' }, [
        sc,
        product,
        general,
      ])
    ).toMatchObject({ status: 'approved', ruleId: product.id });
  });

  it.each([
    { id: 'SC', scope: 'DESTINATION_STATE' as const, destinationUf: 'SC', url: 'TEST_ONLY' },
    {
      id: 'PAIR',
      scope: 'ORIGIN_DESTINATION_PAIR' as const,
      issuerUf: 'PR',
      destinationUf: 'SC',
      url: 'TEST_ONLY',
    },
    { id: 'PRODUCT', scope: 'PRODUCT_SPECIFIC' as const, ncm: '94035000', url: 'TEST_ONLY' },
    { id: 'ORIGIN', scope: 'ORIGIN_STATE' as const, issuerUf: 'SP', url: 'TEST_ONLY' },
  ])('impede fonte específica %s de fundamentar aprovação fora de seus critérios', (source) => {
    const rule = anyDestinationRule();
    rule.normativeSources = [source];
    expect(resolveInterstateOutboundFiscalMatrix(facts, [rule])).toMatchObject({
      status: 'invalid_approved_rule',
    });
    expect(hasApprovedInterstateOutboundRoute(facts, [rule])).toBe(false);
  });

  it('aprovação exige fontes classificadas e revisão explícita do wildcard geográfico', () => {
    const rule = anyDestinationRule();
    rule.normativeSources = [];
    expect(resolveInterstateOutboundFiscalMatrix(facts, [rule])).toMatchObject({
      status: 'invalid_approved_rule',
    });
    const unreviewed = anyDestinationRule();
    unreviewed.reviewedWildcards = ['ncm', 'cest'];
    expect(resolveInterstateOutboundFiscalMatrix(facts, [unreviewed])).toMatchObject({
      status: 'invalid_approved_rule',
    });
  });

  it('escopo e finalidade permanecem fatos obrigatórios sem inferência pela UF ou CFOP', () => {
    const result = resolveInterstateOutboundFiscalMatrix(
      { ...facts, destinationScope: undefined, purpose: undefined },
      [anyDestinationRule()]
    );
    expect(result).toMatchObject({
      status: 'not_approved',
      missingFacts: expect.arrayContaining(['destinationScope', 'purpose']),
    });
  });

  it('aceita fontes sintéticas de origem/par somente com seus vínculos explícitos', () => {
    const origin = anyDestinationRule();
    origin.normativeScope = 'ORIGIN_STATE';
    origin.normativeSources = [
      { id: 'PR-TEST', scope: 'ORIGIN_STATE', issuerUf: 'PR', url: 'TEST_ONLY' },
    ];
    expect(
      resolveInterstateOutboundFiscalMatrix({ ...facts, destinationUf: 'SP' }, [origin])
    ).toMatchObject({ status: 'approved' });
    const pair = genericRule();
    pair.normativeScope = 'ORIGIN_DESTINATION_PAIR';
    pair.normativeSources = [
      {
        id: 'PAIR-TEST',
        scope: 'ORIGIN_DESTINATION_PAIR',
        issuerUf: 'PR',
        destinationUf: 'SC',
        url: 'TEST_ONLY',
      },
    ];
    expect(resolveInterstateOutboundFiscalMatrix(facts, [pair])).toMatchObject({
      status: 'approved',
    });
    expect(
      resolveInterstateOutboundFiscalMatrix({ ...facts, destinationUf: 'RS' }, [pair])
    ).toMatchObject({ status: 'not_approved' });
  });

  it('seleciona NCM específico sobre genérico, devolvendo ID, motivo e fontes', () => {
    const generic = genericRule();
    generic.priority = 999;
    const specific = completeRule('NCM-TEST');
    expect(resolveInterstateOutboundFiscalMatrix(facts, [generic, specific])).toMatchObject({
      status: 'approved',
      ruleId: 'NCM-TEST',
      reason: expect.any(String),
      sources: ['TEST_ONLY'],
    });
    expect(resolveInterstateOutboundFiscalMatrix(facts, [specific, generic])).toMatchObject({
      status: 'approved',
      ruleId: 'NCM-TEST',
    });
  });

  it.each([{ effectiveFrom: '2026-10-07T00:00:00Z' }, { effectiveUntil: '2026-10-06T11:59:59Z' }])(
    'ignora regra específica fora da vigência antes de selecionar a genérica: %j',
    (validity) => {
      const specific = { ...completeRule('OUTSIDE-TEST'), ...validity };
      expect(resolveInterstateOutboundFiscalMatrix(facts, [specific, genericRule()])).toMatchObject(
        { status: 'approved', ruleId: 'GENERIC-TEST' }
      );
      expect(resolveInterstateOutboundFiscalMatrix(facts, [specific])).toMatchObject({
        status: 'not_approved',
        code: 'HML_INTERSTATE_MATRIX_NOT_APPROVED',
      });
    }
  );

  it('inclui ambos os instantes exatos da vigência e rejeita intervalos invertidos', () => {
    const rule = completeRule();
    delete rule.criteria.effectiveAt;
    rule.effectiveUntil = facts.effectiveAt;
    expect(
      resolveInterstateOutboundFiscalMatrix({ ...facts, effectiveAt: rule.effectiveFrom }, [rule])
    ).toMatchObject({ status: 'approved' });
    expect(resolveInterstateOutboundFiscalMatrix(facts, [rule])).toMatchObject({
      status: 'approved',
    });
    rule.effectiveUntil = '2026-09-01T00:00:00Z';
    expect(hasApprovedInterstateOutboundRoute(facts, [rule])).toBe(false);
  });

  it('empates genéricos bloqueiam e wildcard não revisado não amplia aprovação', () => {
    const generic = genericRule();
    expect(
      resolveInterstateOutboundFiscalMatrix(facts, [generic, { ...generic, id: 'TIE' }])
    ).toMatchObject({ status: 'ambiguous', ruleIds: ['GENERIC-TEST', 'TIE'] });
    generic.reviewedWildcards = [];
    expect(resolveInterstateOutboundFiscalMatrix(facts, [generic])).toMatchObject({
      status: 'invalid_approved_rule',
    });
  });

  it.each(['fcpSt', 'st', 'difal'] as const)(
    'não converte incidência desconhecida de %s em falso',
    (tax) => {
      const rule = completeRule();
      rule.treatment[tax].applicable = null;
      expect(resolveInterstateOutboundFiscalMatrix(facts, [rule])).toMatchObject({
        status: 'invalid_approved_rule',
      });
      expect(hasApprovedInterstateOutboundRoute(facts, [rule])).toBe(false);
    }
  );

  it('exige evidência de XML e testes antes de considerar APPROVED utilizável', () => {
    const rule = completeRule();
    delete rule.xmlEvidence;
    expect(resolveInterstateOutboundFiscalMatrix(facts, [rule])).toMatchObject({
      status: 'invalid_approved_rule',
    });
  });

  it('prova FiscalContext → resolução sintética → XML sem promover regra interestadual real', async () => {
    const input = makeInterstateFacts({ recipientUf: 'SC', cfop: '6102' });
    input.capturedAt = facts.effectiveAt;
    input.emissionRequest.recipientTaxId = '11222333000181';
    input.fiscalInputs!.customer = {
      ...(input.fiscalInputs!.customer as Record<string, unknown>),
      personType: 'PJ',
      cpfCnpj: '11222333000181',
    };
    input.order.data.fiscalContext = {
      recipientIeIndicator: '1',
      finalConsumer: true,
      purpose: '1',
    };
    const interstateModelDecision = resolveOrderFiscalModel(input.order.data, {
      issuerUf: 'PR',
      finalConsumer: true,
      recipientAddress: { state: 'SC' },
    });
    if (interstateModelDecision.status !== 'ready')
      throw new Error('Fixture interestadual exige NF-e.');
    const internal = makeInterstateFacts({ recipientUf: 'PR', cfop: '5102' });
    internal.fiscalInputs!.contributionDecisions = {
      '65': {
        scope: { model: '65', operation: 'normal_sale', issuerCrt: '1' },
        pis: { cst: '99', base: 0, rate: 0, value: 0 },
        cofins: { cst: '99', base: 0, rate: 0, value: 0 },
        confirmedAt: '2026-09-01T00:00:00Z',
        confirmedBy: 'TEST_UNIT_NFCE65_DECISION',
      },
    };
    const internalRules = await createHmlNormalSaleRuleSet(
      internal,
      initialHmlCsosnConfiguration()
    );
    const base = resolveFiscalDocument(internal, internalRules);
    if (base.status !== 'ready') throw new Error('Fixture interna inválida');
    const selected = resolveInterstateOutboundFiscalMatrix(facts, [completeRule()]);
    if (selected.status !== 'approved') throw new Error('Fixture de seletor inválida');
    const version = NORMAL_SALE_RULESET_VERSION;
    const traces = base.document.decisions.map((trace) => ({
      ...trace,
      ruleSetVersion: version,
      reason: `TEST_ONLY ${selected.ruleId}`,
      approver: 'TEST_ONLY',
    }));
    const rules = {
      ...internalRules,
      version,
      approvedBy: 'TEST_ONLY',
      determine: (_snapshot: unknown, hash: string) => ({
        ...base.document,
        model: '55' as const,
        snapshotHash: hash,
        ruleSetVersion: version,
        modelDecision: interstateModelDecision,
        recipient: {
          ...base.document.recipient,
          personType: 'PJ' as const,
          cpfCnpj: '11222333000181',
          ieIndicator: '1',
          ie: '123456789',
          address: {
            ...base.document.recipient.address!,
            uf: 'SC',
            municipalityCode: '4209102',
            municipality: 'Joinville',
          },
        },
        operation: { ...base.document.operation, destination: '2', finalConsumer: '1' as const },
        decisions: traces,
        payments: base.document.payments.map((payment) => ({
          ...payment,
          decision: { ...payment.decision, ruleSetVersion: version, approver: 'TEST_ONLY' },
        })),
        items: base.document.items.map((item) => ({
          ...item,
          classification: {
            ...item.classification,
            cfop: selected.rule.treatment.cfop!,
            origin: facts.productOrigin,
          },
          taxes: item.taxes.map((tax) =>
            tax.group === 'ICMS' ? { ...tax, code: selected.rule.treatment.csosn! } : tax
          ),
          decisions: item.decisions.map((trace) => ({
            ...trace,
            ruleSetVersion: version,
            approver: 'TEST_ONLY',
          })),
        })),
      }),
    };
    const resolved = resolveFiscalDocument(input, rules);
    if (resolved.status !== 'ready') throw new Error(JSON.stringify(resolved.blockers));
    const key = generateNfeAccessKey({
      ufCode: '41',
      yearMonth: '2610',
      cnpj: '44512248000107',
      model: '55',
      series: 1,
      number: 1,
      emissionType: '1',
      randomCode: '12345678',
    });
    const xml = serializeFiscalDocument(input, resolved.document, rules, {
      accessKey: key.accessKey,
      series: 1,
      number: 1,
      issuedAt: '2026-10-06T09:00:00-03:00',
    });
    for (const value of [
      '<idDest>2</idDest>',
      '<indFinal>1</indFinal>',
      '<indIEDest>1</indIEDest>',
      '<CFOP>6102</CFOP>',
      '<ICMSSN102><orig>0</orig><CSOSN>102</CSOSN>',
    ])
      expect(xml).toContain(value);
    for (const value of ['<ICMSUFDest>', '<vICMSST>', '<pFCP>', '<pFCPST>'])
      expect(xml).not.toContain(value);
    expect(INTERSTATE_OUTBOUND_FISCAL_MATRIX_RULES.some((rule) => rule.status === 'APPROVED')).toBe(
      false
    );
  });
});
