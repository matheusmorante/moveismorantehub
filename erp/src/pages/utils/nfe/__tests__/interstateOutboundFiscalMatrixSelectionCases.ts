import { expect, it } from 'vitest';
import {
  hasApprovedInterstateOutboundRoute,
  resolveInterstateOutboundFiscalMatrix,
  type InterstateOutboundFiscalMatrixFacts,
  type InterstateOutboundFiscalMatrixRule,
} from '../../../../../../api/nfe/interstateOutboundFiscalMatrix';

type InterstateOutboundFiscalMatrixSelectionDependencies = {
  facts: InterstateOutboundFiscalMatrixFacts;
  completeRule: (id?: string) => InterstateOutboundFiscalMatrixRule;
  genericRule: () => InterstateOutboundFiscalMatrixRule;
  anyDestinationRule: () => InterstateOutboundFiscalMatrixRule;
};

export function registerInterstateOutboundFiscalMatrixSelectionCases({
  facts,
  completeRule,
  genericRule,
  anyDestinationRule,
}: InterstateOutboundFiscalMatrixSelectionDependencies): void {
  it('regra do par PR→SC prevalece sobre regra de destino e não vaza para outras rotas', () => {
    const destination = genericRule();
    destination.id = 'DESTINATION-SC-TEST';
    delete destination.criteria.issuerUf;
    destination.criteria.destinationUf = 'SC';
    destination.reviewedWildcards = [...destination.reviewedWildcards!, 'issuerUf'];
    destination.normativeScope = 'DESTINATION_STATE';
    destination.normativeSources = [
      { id: 'SC-TEST', scope: 'DESTINATION_STATE', destinationUf: 'SC', url: 'TEST_SC' },
    ];
    destination.sourceReferences = ['TEST_SC'];
    destination.criteria.recipientTaxRegime = 'TEST_REGIME';
    destination.priority = 999;

    const pair = genericRule();
    pair.id = 'PAIR-PR-SC-TEST';
    pair.criteria.destinationUf = 'SC';
    pair.normativeScope = 'ORIGIN_DESTINATION_PAIR';
    pair.normativeSources = [
      {
        id: 'PR-SC-TEST',
        scope: 'ORIGIN_DESTINATION_PAIR',
        issuerUf: 'PR',
        destinationUf: 'SC',
        url: 'TEST_PR_SC',
      },
    ];
    pair.sourceReferences = ['TEST_PR_SC'];
    pair.priority = 1;

    const scFacts = { ...facts, recipientTaxRegime: 'TEST_REGIME' };
    expect(resolveInterstateOutboundFiscalMatrix(scFacts, [destination, pair])).toMatchObject({
      status: 'approved',
      ruleId: pair.id,
    });
    expect(
      resolveInterstateOutboundFiscalMatrix({ ...scFacts, issuerUf: 'SP' }, [destination, pair])
    ).toMatchObject({ status: 'approved', ruleId: destination.id });
    expect(
      resolveInterstateOutboundFiscalMatrix({ ...facts, destinationUf: 'SP' }, [pair])
    ).toMatchObject({ status: 'not_approved' });
  });

  it('regra específica de SP não é selecionada para uma operação destinada a SC', () => {
    const sp = genericRule();
    sp.id = 'DESTINATION-SP-TEST';
    sp.criteria.destinationUf = 'SP';
    sp.normativeScope = 'DESTINATION_STATE';
    sp.normativeSources = [
      { id: 'SP-TEST', scope: 'DESTINATION_STATE', destinationUf: 'SP', url: 'TEST_SP' },
    ];
    sp.sourceReferences = ['TEST_SP'];

    expect(resolveInterstateOutboundFiscalMatrix(facts, [sp])).toMatchObject({
      status: 'not_approved',
    });
  });

  it('regra por CEST prevalece somente quando o CEST informado corresponde', () => {
    const general = anyDestinationRule();
    general.priority = 999;
    const cest = anyDestinationRule();
    cest.id = 'CEST-TEST';
    cest.criteria.cest = '1234567';
    cest.reviewedWildcards = cest.reviewedWildcards!.filter((key) => key !== 'cest');
    cest.normativeScope = 'PRODUCT_SPECIFIC';
    cest.normativeSources = [
      { id: 'CEST-SOURCE', scope: 'PRODUCT_SPECIFIC', cest: '1234567', url: 'TEST_CEST' },
    ];
    cest.sourceReferences = ['TEST_CEST'];
    cest.priority = 1;

    expect(
      resolveInterstateOutboundFiscalMatrix({ ...facts, cest: '1234567' }, [general, cest])
    ).toMatchObject({ status: 'approved', ruleId: cest.id });
    expect(
      resolveInterstateOutboundFiscalMatrix({ ...facts, cest: '7654321' }, [general, cest])
    ).toMatchObject({ status: 'approved', ruleId: general.id });
  });

  it('bloqueia regras igualmente específicas com decisões diferentes, mesmo com prioridade distinta', () => {
    const first = genericRule();
    const second = genericRule();
    second.id = 'HIGH-PRIORITY-ALTERNATIVE';
    second.priority = 999;
    second.treatment.csosn = '103';

    expect(resolveInterstateOutboundFiscalMatrix(facts, [first, second])).toMatchObject({
      status: 'ambiguous',
      ruleIds: [first.id, second.id],
    });
  });

  it.each(['DRAFT', 'BLOCKED'] as const)(
    'regra mais específica %s impede fallback para a regra geral APPROVED',
    (status) => {
      const general = anyDestinationRule();
      general.priority = 999;
      const specific = genericRule();
      specific.id = `${status}-SC-TEST`;
      specific.criteria.destinationUf = 'SC';
      specific.priority = 1;
      specific.status = status;
      specific.pendingReview = [`Regra ${status} para revisão`];

      expect(resolveInterstateOutboundFiscalMatrix(facts, [general, specific])).toMatchObject({
        status: 'not_approved',
        ...(status === 'DRAFT'
          ? { matchingDraftRuleIds: [specific.id] }
          : { matchingBlockedRuleIds: [specific.id] }),
      });
    }
  );

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

}
