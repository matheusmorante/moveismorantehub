/**
 * Server-side interstate fiscal matrix. CFOP candidates below are research labels
 * only; a DRAFT record never supplies an emission decision or tax treatment.
 */
export type InterstateMatrixStatus = 'DRAFT' | 'APPROVED' | 'DEPRECATED';
export type InterstateRecipientIeStatus = 'taxpayer' | 'exempt' | 'non_taxpayer';
export type InterstateMerchandiseOrigin = 'third_party' | 'own_production';

export type InterstateFiscalMatrixFacts = {
  environment: 1 | 2;
  model: '55' | '65';
  issuerRegime: string;
  issuerUf: string;
  destinationUf: string;
  operationType: 'sale';
  recipientPersonType: 'PF' | 'PJ';
  recipientIeStatus: InterstateRecipientIeStatus;
  finalConsumer: boolean;
  merchandiseOrigin: InterstateMerchandiseOrigin;
  productOrigin: string;
  ncm: string;
  cest: string;
  hasSt: boolean;
  effectiveAt: string;
};

export type InterstateTaxTreatment = {
  cfop: string | null;
  csosn: string | null;
  icms: {
    framework: string | null;
    ratePercent: number | null;
    baseMethod: string | null;
    reductionPercent: number | null;
  };
  st: {
    applicable: boolean | null;
    agreementOrProtocol: string | null;
    baseMethod: string | null;
    ratePercent: number | null;
  };
  difal: {
    applicable: boolean | null;
    internalRatePercent: number | null;
    interstateRatePercent: number | null;
    destinationSharePercent: number | null;
  };
  fcp: {
    applicable: boolean | null;
    ratePercent: number | null;
  };
};

export type InterstateFiscalMatrixRule = {
  id: string;
  status: InterstateMatrixStatus;
  criteria: Partial<InterstateFiscalMatrixFacts>;
  priority: number;
  treatment: InterstateTaxTreatment;
  /** CFOP candidates are informational and are never copied into treatment. */
  candidateCfops: string[];
  pendingReview: string[];
  sourceReferences: string[];
  approvedBy?: string;
  approvedAt?: string;
  effectiveFrom?: string;
  effectiveUntil?: string;
};

const emptyTreatment = (): InterstateTaxTreatment => ({
  cfop: null,
  csosn: null,
  icms: { framework: null, ratePercent: null, baseMethod: null, reductionPercent: null },
  st: { applicable: null, agreementOrProtocol: null, baseMethod: null, ratePercent: null },
  difal: {
    applicable: null,
    internalRatePercent: null,
    interstateRatePercent: null,
    destinationSharePercent: null,
  },
  fcp: { applicable: null, ratePercent: null },
});

const commonCriteria = {
  environment: 2 as const,
  model: '55' as const,
  issuerRegime: '1',
  issuerUf: 'PR',
  destinationUf: 'SC',
  operationType: 'sale' as const,
  merchandiseOrigin: 'third_party' as const,
};

const draft = (
  id: string,
  recipientPersonType: 'PF' | 'PJ',
  recipientIeStatus: InterstateRecipientIeStatus,
  finalConsumer: boolean,
  hasSt: boolean,
  candidateCfops: string[],
  pendingReview: string[]
): InterstateFiscalMatrixRule => ({
  id,
  status: 'DRAFT',
  criteria: {
    ...commonCriteria,
    recipientPersonType,
    recipientIeStatus,
    finalConsumer,
    hasSt,
  },
  priority: 0,
  treatment: emptyTreatment(),
  candidateCfops,
  pendingReview: [
    'NCM/CEST e origem fiscal do produto',
    'CSOSN e grupos/valores de ICMS',
    'ST: sujeição, responsabilidade e acordo/protocolo PR-SC',
    'DIFAL: incidência, responsável, base, alíquotas e partilha',
    'FCP: incidência, base, alíquota e recolhimento',
    ...pendingReview,
  ],
  sourceReferences: [],
});

/**
 * Scenario inventory for the requested initial PR → SC case. All rows remain
 * DRAFT until a fiscal reviewer defines and approves every tax output and source.
 */
export const INTERSTATE_FISCAL_MATRIX_RULES: readonly InterstateFiscalMatrixRule[] = [
  draft('PR-SC-PJ-TAXPAYER-NONFINAL-NO-ST', 'PJ', 'taxpayer', false, false, ['6102'], []),
  draft('PR-SC-PJ-TAXPAYER-NONFINAL-ST', 'PJ', 'taxpayer', false, true, [], ['CFOP conforme papel de substituto/substituído']),
  draft('PR-SC-PJ-TAXPAYER-FINAL-NO-ST', 'PJ', 'taxpayer', true, false, ['6102'], []),
  draft('PR-SC-PJ-TAXPAYER-FINAL-ST', 'PJ', 'taxpayer', true, true, [], ['CFOP conforme papel de substituto/substituído']),
  draft('PR-SC-PJ-EXEMPT-FINAL-NO-ST', 'PJ', 'exempt', true, false, [], ['CFOP conforme condição de IE isenta']),
  draft('PR-SC-PJ-EXEMPT-FINAL-ST', 'PJ', 'exempt', true, true, [], ['CFOP conforme condição de IE isenta e tratamento de ST']),
  draft('PR-SC-PJ-NONTAXPAYER-FINAL-NO-ST', 'PJ', 'non_taxpayer', true, false, ['6108'], ['Validar DIFAL/FCP e responsabilidade do remetente']),
  draft('PR-SC-PJ-NONTAXPAYER-FINAL-ST', 'PJ', 'non_taxpayer', true, true, ['6108'], ['Validar hipótese específica de ST e DIFAL/FCP']),
  draft('PR-SC-PF-NONTAXPAYER-FINAL-NO-ST', 'PF', 'non_taxpayer', true, false, ['6108'], ['Validar DIFAL/FCP e responsabilidade do remetente']),
  draft('PR-SC-PF-NONTAXPAYER-FINAL-ST', 'PF', 'non_taxpayer', true, true, ['6108'], ['Validar hipótese específica de ST e DIFAL/FCP']),
];

const requiredFacts: Array<keyof InterstateFiscalMatrixFacts> = [
  'environment',
  'model',
  'issuerRegime',
  'issuerUf',
  'destinationUf',
  'operationType',
  'recipientPersonType',
  'recipientIeStatus',
  'finalConsumer',
  'merchandiseOrigin',
  'productOrigin',
  'ncm',
  'cest',
  'hasSt',
  'effectiveAt',
];

const isMissing = (value: unknown, key?: keyof InterstateFiscalMatrixFacts): boolean =>
  value === undefined || value === null || (value === '' && key !== 'cest');
const matchesKnownCriteria = (
  facts: Partial<InterstateFiscalMatrixFacts>,
  criteria: Partial<InterstateFiscalMatrixFacts>
): boolean =>
  Object.entries(criteria).every(([key, expected]) => {
    const actual = facts[key as keyof InterstateFiscalMatrixFacts];
    return isMissing(actual, key as keyof InterstateFiscalMatrixFacts) || actual === expected;
  });

const matchesCompleteCriteria = (
  facts: InterstateFiscalMatrixFacts,
  criteria: Partial<InterstateFiscalMatrixFacts>
): boolean =>
  Object.entries(criteria).every(([key, expected]) => {
    const actual = facts[key as keyof InterstateFiscalMatrixFacts];
    return !isMissing(actual, key as keyof InterstateFiscalMatrixFacts) && actual === expected;
  });

const validPercent = (value: number | null): boolean =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100;

const treatmentIsComplete = (treatment: InterstateTaxTreatment): boolean =>
  treatment.cfop !== null &&
  /^6\d{3}$/.test(treatment.cfop) &&
  treatment.csosn !== null &&
  /^\d{3}$/.test(treatment.csosn) &&
  Boolean(treatment.icms.framework?.trim()) &&
  validPercent(treatment.icms.ratePercent) &&
  Boolean(treatment.icms.baseMethod?.trim()) &&
  validPercent(treatment.icms.reductionPercent) &&
  treatment.st.applicable !== null &&
  Boolean(treatment.st.agreementOrProtocol?.trim()) &&
  Boolean(treatment.st.baseMethod?.trim()) &&
  validPercent(treatment.st.ratePercent) &&
  treatment.difal.applicable !== null &&
  validPercent(treatment.difal.internalRatePercent) &&
  validPercent(treatment.difal.interstateRatePercent) &&
  validPercent(treatment.difal.destinationSharePercent) &&
  treatment.fcp.applicable !== null &&
  validPercent(treatment.fcp.ratePercent);

const approvalIsComplete = (rule: InterstateFiscalMatrixRule): boolean =>
  Boolean(
    rule.approvedBy?.trim() &&
      rule.approvedAt &&
      Number.isFinite(Date.parse(rule.approvedAt)) &&
      rule.effectiveFrom &&
      Number.isFinite(Date.parse(rule.effectiveFrom)) &&
      (!rule.effectiveUntil || Number.isFinite(Date.parse(rule.effectiveUntil))) &&
      requiredFacts
        .filter((key) => key !== 'effectiveAt')
        .every((key) => Object.prototype.hasOwnProperty.call(rule.criteria, key)) &&
      rule.sourceReferences.length > 0 &&
      rule.sourceReferences.every((source) => Boolean(source.trim())) &&
      rule.pendingReview.length === 0 &&
      treatmentIsComplete(rule.treatment)
  );

export type InterstateFiscalMatrixResolution =
  | { status: 'approved'; rule: InterstateFiscalMatrixRule }
  | {
      status: 'not_approved';
      code: 'HML_INTERSTATE_MATRIX_NOT_APPROVED';
      matchingDraftRuleIds: string[];
      missingFacts: Array<keyof InterstateFiscalMatrixFacts>;
    }
  | { status: 'ambiguous'; code: 'HML_INTERSTATE_MATRIX_AMBIGUOUS'; ruleIds: string[] }
  | { status: 'invalid_approved_rule'; code: 'HML_INTERSTATE_MATRIX_INVALID'; ruleIds: string[] };

/** Fast route-level gate so an absent route matrix blocks even before item detail parsing. */
export function hasApprovedInterstateRoute(
  facts: Pick<
    InterstateFiscalMatrixFacts,
    'environment' | 'model' | 'issuerRegime' | 'issuerUf' | 'destinationUf' | 'operationType'
  >,
  rules: readonly InterstateFiscalMatrixRule[] = INTERSTATE_FISCAL_MATRIX_RULES
): boolean {
  return rules.some(
    (rule) =>
      rule.status === 'APPROVED' &&
      (['environment', 'model', 'issuerRegime', 'issuerUf', 'destinationUf', 'operationType'] as const)
        .every((key) => rule.criteria[key] === facts[key])
  );
}

/** Resolves only complete APPROVED rules; DRAFT data never supplies tax results. */
export function resolveInterstateFiscalMatrix(
  facts: Partial<InterstateFiscalMatrixFacts>,
  rules: readonly InterstateFiscalMatrixRule[] = INTERSTATE_FISCAL_MATRIX_RULES
): InterstateFiscalMatrixResolution {
  const missingFacts = requiredFacts.filter((key) => isMissing(facts[key], key));
  if (facts.effectiveAt && !Number.isFinite(Date.parse(facts.effectiveAt)) && !missingFacts.includes('effectiveAt'))
    missingFacts.push('effectiveAt');
  const matchingDraftRuleIds = rules
    .filter((rule) => rule.status === 'DRAFT' && matchesKnownCriteria(facts, rule.criteria))
    .map((rule) => rule.id);
  const matchingApproved = rules.filter(
    (rule) =>
      rule.status === 'APPROVED' &&
      matchesCompleteCriteria(facts as InterstateFiscalMatrixFacts, rule.criteria)
  );
  if (matchingApproved.length) {
    const invalid = matchingApproved.filter((rule) => !approvalIsComplete(rule));
    if (invalid.length)
      return {
        status: 'invalid_approved_rule',
        code: 'HML_INTERSTATE_MATRIX_INVALID',
        ruleIds: invalid.map((rule) => rule.id),
      };
    if (missingFacts.length)
      return {
        status: 'not_approved',
        code: 'HML_INTERSTATE_MATRIX_NOT_APPROVED',
        matchingDraftRuleIds,
        missingFacts,
      };
    const ranked = matchingApproved
      .map((rule) => ({
        rule,
        specificity: Object.keys(rule.criteria).length,
      }))
      .sort((a, b) => b.specificity - a.specificity || b.rule.priority - a.rule.priority);
    const [best, second] = ranked;
    if (
      second &&
      best.specificity === second.specificity &&
      best.rule.priority === second.rule.priority
    )
      return {
        status: 'ambiguous',
        code: 'HML_INTERSTATE_MATRIX_AMBIGUOUS',
        ruleIds: ranked
          .filter(
            (item) =>
              item.specificity === best.specificity && item.rule.priority === best.rule.priority
          )
          .map((item) => item.rule.id),
      };
    const effectiveAt = Date.parse(String(facts.effectiveAt));
    if (
      Date.parse(best.rule.effectiveFrom || '') > effectiveAt ||
      (best.rule.effectiveUntil && Date.parse(best.rule.effectiveUntil) < effectiveAt)
    )
      return { status: 'not_approved', code: 'HML_INTERSTATE_MATRIX_NOT_APPROVED', matchingDraftRuleIds, missingFacts };
    return { status: 'approved', rule: best.rule };
  }
  return {
    status: 'not_approved',
    code: 'HML_INTERSTATE_MATRIX_NOT_APPROVED',
    matchingDraftRuleIds,
    missingFacts,
  };
}
