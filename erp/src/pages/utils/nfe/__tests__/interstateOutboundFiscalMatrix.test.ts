import { describe, expect, it } from 'vitest';
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
} from '../../../../../../api/nfe/interstateOutboundFiscalMatrix';
import { resolveFiscalCfopOrderScope } from '../../../../../../shared-utils/fiscalCfopModel';
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

  it('estrutura a matriz em 6 cenários fundamentais (5 APPROVED, 1 BLOCKED por RV 696)', () => {
    expect(INTERSTATE_OUTBOUND_FISCAL_MATRIX_RULES).toHaveLength(6);
    expect(
      INTERSTATE_OUTBOUND_FISCAL_MATRIX_RULES.filter((rule) => rule.status === 'APPROVED')
    ).toHaveLength(5);
    expect(
      INTERSTATE_OUTBOUND_FISCAL_MATRIX_RULES.filter((rule) => rule.status === 'BLOCKED')
    ).toHaveLength(1);

    const expectedIds = [
      'INTERSTATE-TAXPAYER-NONFINAL-BASE',
      'INTERSTATE-TAXPAYER-FINAL-BASE',
      'INTERSTATE-EXEMPT-NONFINAL-BASE',
      'INTERSTATE-EXEMPT-FINAL-BASE',
      'INTERSTATE-NONTAXPAYER-FINAL-BASE',
      'INTERSTATE-NONTAXPAYER-NONFINAL-BASE',
    ];
    expect(INTERSTATE_OUTBOUND_FISCAL_MATRIX_RULES.map((r) => r.id)).toEqual(expectedIds);
    expect(hasApprovedInterstateOutboundRoute(facts)).toBe(true);
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

  it('valida aceitação de indIEDest=2 (Contribuinte Isento) pela UF de destino (MOC RV 805)', () => {
    // SC aceita isento
    const resultSc = resolveInterstateOutboundFiscalMatrix({
      ...facts,
      destinationUf: 'SC',
      recipientIeStatus: 'exempt',
      finalConsumer: false,
    });
    expect(resultSc).toMatchObject({
      status: 'approved',
      ruleId: 'INTERSTATE-EXEMPT-NONFINAL-BASE',
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

  it.each(['SC', 'RS'])(
    'PR→%s para PJ contribuinte resolve CFOP 6102 sem ST e sem DIFAL (cenário Pedido 4268)',
    (destinationUf) => {
      const input = {
        ...facts,
        destinationUf,
        recipientIeStatus: 'taxpayer' as const,
        finalConsumer: false,
      };
      expect(
        resolveFiscalCfopOrderScope({
          issuerUf: 'PR',
          deliveryMethod: 'delivery',
          shipping: { useCustomerAddress: false, deliveryAddress: { state: destinationUf } },
          customerAddress: { state: 'PR' },
        })
      ).toMatchObject({ scope: 'interstate', destination: '2' });
      expect(resolveInterstateOutboundFiscalMatrix(input)).toMatchObject({
        status: 'approved',
        ruleId: 'INTERSTATE-TAXPAYER-NONFINAL-BASE',
        treatment: expect.objectContaining({
          cfop: '6102',
          csosn: '102',
          st: expect.objectContaining({ applicable: false, responsibility: 'none' }),
          difal: expect.objectContaining({ applicable: false, responsibility: 'none' }),
        }),
      });
      expect(hasApprovedInterstateOutboundRoute(input)).toBe(true);
    }
  );

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
    const internal = makeInterstateFacts({ recipientUf: 'PR', cfop: '5102' });
    const internalRules = await createHmlNormalSaleRuleSet(
      internal,
      initialHmlCsosnConfiguration()
    );
    const base = resolveFiscalDocument(internal, internalRules);
    if (base.status !== 'ready') throw new Error('Fixture interna inválida');
    const selected = resolveInterstateOutboundFiscalMatrix(facts, [completeRule()]);
    if (selected.status !== 'approved') throw new Error('Fixture de seletor inválida');
    const version = 'TEST_ONLY_INTERSTATE';
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
      true
    );
  });
});
