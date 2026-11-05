import { isBrazilianFiscalUf } from '../../../shared-utils/fiscalCfopModel';
import type {
  InterstateOutboundFiscalMatrixCriteria,
  InterstateOutboundFiscalMatrixFacts,
  InterstateOutboundFiscalMatrixRule,
  InterstateOutboundNormativeScope,
  InterstateTaxTreatment,
} from './types';
export const requiredFacts: Array<keyof InterstateOutboundFiscalMatrixFacts> = [
  'environment',
  'model',
  'issuerRegime',
  'issuerUf',
  'destinationUf',
  'destinationScope',
  'operationType',
  'purpose',
  'recipientIeStatus',
  'finalConsumer',
  'hasSt',
  'merchandiseOrigin',
  'productOrigin',
  'ncm',
  'effectiveAt',
];

export const isMissing = (value: unknown, key?: keyof InterstateOutboundFiscalMatrixFacts): boolean =>
  value === undefined || value === null || (value === '' && key !== 'cest');

export const matchesKnownCriteria = (
  facts: Partial<InterstateOutboundFiscalMatrixFacts>,
  criteria: InterstateOutboundFiscalMatrixCriteria
): boolean =>
  Object.entries(criteria).every(([key, expected]) => {
    if (key === 'destinationUf' && expected == null) return true;
    const actual = facts[key as keyof InterstateOutboundFiscalMatrixFacts];
    return (
      isMissing(actual, key as keyof InterstateOutboundFiscalMatrixFacts) || actual === expected
    );
  });

export const matchesCompleteCriteria = (
  facts: InterstateOutboundFiscalMatrixFacts,
  criteria: InterstateOutboundFiscalMatrixCriteria
): boolean =>
  Object.entries(criteria).every(([key, expected]) => {
    if (key === 'destinationUf' && expected == null) return true;
    const actual = facts[key as keyof InterstateOutboundFiscalMatrixFacts];
    return (
      !isMissing(actual, key as keyof InterstateOutboundFiscalMatrixFacts) && actual === expected
    );
  });

const validPercent = (value: number | null): boolean =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100;

const treatmentIsComplete = (treatment: InterstateTaxTreatment): boolean =>
  treatment.cfop !== null &&
  /^6\d{3}$/.test(treatment.cfop) &&
  treatment.csosn !== null &&
  (
    {
      '101': 'ICMSSN101',
      '102': 'ICMSSN102',
      '103': 'ICMSSN102',
      '201': 'ICMSSN201',
      '202': 'ICMSSN202',
      '203': 'ICMSSN202',
      '300': 'ICMSSN102',
      '400': 'ICMSSN102',
      '500': 'ICMSSN500',
      '900': 'ICMSSN900',
    } as Record<string, string>
  )[treatment.csosn] === treatment.icms.xmlGroup &&
  Boolean(treatment.icms.framework?.trim()) &&
  Boolean(treatment.icms.xmlGroup?.trim()) &&
  validPercent(treatment.icms.ratePercent) &&
  Boolean(treatment.icms.baseMethod?.trim()) &&
  validPercent(treatment.icms.reductionPercent) &&
  treatment.st.applicable !== null &&
  treatment.st.responsibility !== null &&
  (treatment.st.applicable
    ? treatment.st.responsibility !== 'none'
    : treatment.st.responsibility === 'none') &&
  Boolean(treatment.st.agreementOrProtocol?.trim()) &&
  Boolean(treatment.st.baseMethod?.trim()) &&
  validPercent(treatment.st.ratePercent) &&
  treatment.difal.applicable !== null &&
  treatment.difal.responsibility !== null &&
  (treatment.difal.applicable
    ? treatment.difal.responsibility !== 'none'
    : treatment.difal.responsibility === 'none') &&
  validPercent(treatment.difal.internalRatePercent) &&
  validPercent(treatment.difal.interstateRatePercent) &&
  validPercent(treatment.difal.destinationSharePercent) &&
  treatment.fcp.applicable !== null &&
  validPercent(treatment.fcp.ratePercent) &&
  treatment.fcpSt.applicable !== null &&
  validPercent(treatment.fcpSt.ratePercent) &&
  (treatment.fcp.applicable || treatment.fcp.ratePercent === 0) &&
  (treatment.fcpSt.applicable || treatment.fcpSt.ratePercent === 0);

const scopeMatchesCriteria = (
  scope: InterstateOutboundNormativeScope,
  criteria: InterstateOutboundFiscalMatrixCriteria
): boolean => {
  switch (scope) {
    case 'NATIONAL':
      return true;
    case 'ORIGIN_STATE':
      return isBrazilianFiscalUf(criteria.issuerUf);
    case 'DESTINATION_STATE':
      return isBrazilianFiscalUf(criteria.destinationUf);
    case 'ORIGIN_DESTINATION_PAIR':
      return isBrazilianFiscalUf(criteria.issuerUf) && isBrazilianFiscalUf(criteria.destinationUf);
    case 'PRODUCT_SPECIFIC':
      return Boolean(criteria.productId || criteria.ncm || criteria.cest);
    default:
      return false;
  }
};

const normativeSourcesAreScoped = (rule: InterstateOutboundFiscalMatrixRule): boolean =>
  scopeMatchesCriteria(rule.normativeScope, rule.criteria) &&
  Array.isArray(rule.normativeSources) &&
  rule.normativeSources.length > 0 &&
  rule.sourceReferences.every((url) =>
    rule.normativeSources.some((source) => source.url === url)
  ) &&
  rule.normativeSources.every((source) => {
    if (
      !source ||
      typeof source.id !== 'string' ||
      !source.id.trim() ||
      typeof source.url !== 'string' ||
      !source.url.trim() ||
      !rule.sourceReferences.includes(source.url) ||
      !scopeMatchesCriteria(source.scope, rule.criteria)
    )
      return false;
    if (
      (source.scope === 'ORIGIN_STATE' || source.scope === 'ORIGIN_DESTINATION_PAIR') &&
      !isBrazilianFiscalUf(source.issuerUf)
    )
      return false;
    if (
      (source.scope === 'DESTINATION_STATE' || source.scope === 'ORIGIN_DESTINATION_PAIR') &&
      !isBrazilianFiscalUf(source.destinationUf)
    )
      return false;
    if (source.scope === 'PRODUCT_SPECIFIC' && !(source.productId || source.ncm || source.cest))
      return false;
    return (['issuerUf', 'destinationUf', 'productId', 'ncm', 'cest'] as const).every(
      (key) =>
        source[key] === undefined ||
        (!isMissing(source[key], key) && source[key] === rule.criteria[key])
    );
  });

export const isInterstateOutboundRoute = (
  facts: Pick<
    Partial<InterstateOutboundFiscalMatrixFacts>,
    'issuerUf' | 'destinationUf' | 'destinationScope'
  >
): boolean =>
  facts.destinationScope === 'INTERSTATE' &&
  isBrazilianFiscalUf(facts.issuerUf) &&
  isBrazilianFiscalUf(facts.destinationUf) &&
  facts.issuerUf !== facts.destinationUf;

export const approvalIsComplete = (rule: InterstateOutboundFiscalMatrixRule): boolean =>
  Boolean(
    rule.approvedBy?.trim() &&
      rule.criteria.destinationScope === 'INTERSTATE' &&
      rule.approvedAt &&
      Number.isFinite(Date.parse(rule.approvedAt)) &&
      rule.effectiveFrom &&
      Number.isFinite(Date.parse(rule.effectiveFrom)) &&
      (!rule.effectiveUntil ||
        (Number.isFinite(Date.parse(rule.effectiveUntil)) &&
          Date.parse(rule.effectiveUntil) >= Date.parse(rule.effectiveFrom))) &&
      requiredFacts
        .filter((key) => key !== 'effectiveAt')
        .every((key) =>
          key === 'destinationUf' && rule.criteria.destinationUf == null
            ? rule.reviewedWildcards?.includes(key)
            : Object.hasOwn(rule.criteria, key) || rule.reviewedWildcards?.includes(key)
        ) &&
      Boolean(rule.xmlEvidence?.trim()) &&
      Boolean(rule.testEvidence?.trim()) &&
      rule.sourceReferences.length > 0 &&
      rule.sourceReferences.every((source) => Boolean(source.trim())) &&
      normativeSourcesAreScoped(rule) &&
      rule.pendingReview.length === 0 &&
      treatmentIsComplete(rule.treatment)
  );
