/**
 * Server-side interstate fiscal matrix. CFOP candidates below are research labels
 * only; DRAFT/BLOCKED records never supply an emission decision or tax treatment.
 * Normative findings and product-dependent branches: docs/fiscal/matriz-interestadual-pr-sc.md.
 */
export type InterstateMatrixStatus = 'DRAFT' | 'APPROVED' | 'BLOCKED' | 'DEPRECATED';
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
  productId?: string;
  effectiveAt: string;
};

export type InterstateTaxTreatment = {
  cfop: string | null;
  csosn: string | null;
  icms: {
    xmlGroup: string | null;
    framework: string | null;
    ratePercent: number | null;
    baseMethod: string | null;
    reductionPercent: number | null;
  };
  st: {
    responsibility: 'none' | 'substitute' | 'substituted' | null;
    applicable: boolean | null;
    agreementOrProtocol: string | null;
    baseMethod: string | null;
    ratePercent: number | null;
  };
  difal: {
    responsibility: 'none' | 'sender' | 'recipient' | null;
    applicable: boolean | null;
    internalRatePercent: number | null;
    interstateRatePercent: number | null;
    destinationSharePercent: number | null;
  };
  fcp: {
    applicable: boolean | null;
    ratePercent: number | null;
  };
  fcpSt: { applicable: boolean | null; ratePercent: number | null };
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
  /** An omitted criterion is a wildcard only after explicit review of that axis. */
  reviewedWildcards?: Array<keyof InterstateFiscalMatrixFacts>;
  xmlEvidence?: string;
  testEvidence?: string;
};

const emptyTreatment = (): InterstateTaxTreatment => ({
  cfop: null,
  csosn: null,
  icms: { xmlGroup: null, framework: null, ratePercent: null, baseMethod: null, reductionPercent: null },
  st: { responsibility: null, applicable: null, agreementOrProtocol: null, baseMethod: null, ratePercent: null },
  difal: {
    applicable: null,
    responsibility: null,
    internalRatePercent: null,
    interstateRatePercent: null,
    destinationSharePercent: null,
  },
  fcp: { applicable: null, ratePercent: null },
  fcpSt: { applicable: null, ratePercent: null },
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
  status: recipientIeStatus === 'non_taxpayer' && !finalConsumer ? 'BLOCKED' : 'DRAFT',
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
    'FCP-ST: incidência, base, alíquota e recolhimento',
    'Benefícios/faixa de receita do emitente, regime do adquirente e direito ao crédito',
    'Vigência executável e cobertura do serializer/testes por produto',
    ...(recipientIeStatus === 'non_taxpayer' && !finalConsumer
      ? ['MOC E16a-40: venda de saída com indIEDest=9 e indFinal=0 é rejeitada (696)']
      : []),
    ...pendingReview,
  ],
  sourceReferences: [
    'https://www.confaz.fazenda.gov.br/legislacao/arquivo-manuais/moc7-anexo-i-leiaute-e-rv.pdf',
    'https://www.confaz.fazenda.gov.br/legislacao/ajustes/sinief/cfop_cvsn_1-6.24',
    'https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp123.htm',
    'https://www.sefanet.pr.gov.br/dados/SEFADOCUMENTOS/102202405144.pdf',
    'https://www.confaz.fazenda.gov.br/legislacao/convenios/2018/CV142_18',
    'https://legislacao.sef.sc.gov.br/html/regulamentos/icms/ricms_01_00.htm',
    'https://legislacao.sef.sc.gov.br/html/regulamentos/icms/ricms_01_03.htm',
  ],
});

/**
 * PR → SC scenario inventory: 20 DRAFT and four combinations BLOCKED by E16a-40.
 * Source references record research; they do not constitute approval of tax outputs.
 */
const initialScenarios: InterstateFiscalMatrixRule[] = [
  draft('PR-SC-PJ-TAXPAYER-NONFINAL-NO-ST', 'PJ', 'taxpayer', false, false, ['6102'], []),
  draft('PR-SC-PJ-TAXPAYER-NONFINAL-ST', 'PJ', 'taxpayer', false, true, [], ['CFOP conforme papel de substituto/substituído']),
  draft('PR-SC-PJ-TAXPAYER-FINAL-NO-ST', 'PJ', 'taxpayer', true, false, ['6102'], []),
  draft('PR-SC-PJ-TAXPAYER-FINAL-ST', 'PJ', 'taxpayer', true, true, [], ['CFOP conforme papel de substituto/substituído']),
  draft('PR-SC-PJ-EXEMPT-FINAL-NO-ST', 'PJ', 'exempt', true, false, ['6102'], ['Isento de IE continua contribuinte; confirmar enquadramento em SC']),
  draft('PR-SC-PJ-EXEMPT-FINAL-ST', 'PJ', 'exempt', true, true, [], ['CFOP conforme condição de IE isenta e tratamento de ST']),
  draft('PR-SC-PJ-NONTAXPAYER-FINAL-NO-ST', 'PJ', 'non_taxpayer', true, false, ['6108'], ['Validar DIFAL/FCP e responsabilidade do remetente']),
  draft('PR-SC-PJ-NONTAXPAYER-FINAL-ST', 'PJ', 'non_taxpayer', true, true, ['6108', '6404'], ['Distinguir retenção anterior no PR e tratamento da saída PR-SC; não copiar consulta de outra UF']),
  draft('PR-SC-PF-NONTAXPAYER-FINAL-NO-ST', 'PF', 'non_taxpayer', true, false, ['6108'], ['Validar DIFAL/FCP e responsabilidade do remetente']),
  draft('PR-SC-PF-NONTAXPAYER-FINAL-ST', 'PF', 'non_taxpayer', true, true, ['6108', '6404'], ['Distinguir retenção anterior no PR e tratamento da saída PR-SC; não copiar consulta de outra UF']),
];

// Preserve the ten original IDs; enumerate independent PF/PJ × IE × finality × ST axes.
const addedScenarios: InterstateFiscalMatrixRule[] = [];
for (const person of ['PJ', 'PF'] as const) {
  for (const ie of ['taxpayer', 'exempt', 'non_taxpayer'] as const) {
    for (const final of [false, true]) {
      for (const st of [false, true]) {
        if (initialScenarios.some((rule) => rule.criteria.recipientPersonType === person &&
          rule.criteria.recipientIeStatus === ie && rule.criteria.finalConsumer === final &&
          rule.criteria.hasSt === st)) continue;
        const ieLabel = ie === 'non_taxpayer' ? 'NONTAXPAYER' : ie.toUpperCase();
        addedScenarios.push(draft(
          `PR-SC-${person}-${ieLabel}-${final ? 'FINAL' : 'NONFINAL'}-${st ? 'ST' : 'NO-ST'}`,
          person, ie, final, st,
          ie === 'non_taxpayer' && !final ? [] : st ? [] : [ie === 'non_taxpayer' ? '6108' : '6102'],
          []
        ));
      }
    }
  }
}
export const INTERSTATE_FISCAL_MATRIX_RULES: readonly InterstateFiscalMatrixRule[] = [
  ...initialScenarios, ...addedScenarios,
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
  Boolean(treatment.icms.xmlGroup?.trim()) &&
  validPercent(treatment.icms.ratePercent) &&
  Boolean(treatment.icms.baseMethod?.trim()) &&
  validPercent(treatment.icms.reductionPercent) &&
  treatment.st.applicable !== null &&
  treatment.st.responsibility !== null &&
  (treatment.st.applicable ? treatment.st.responsibility !== 'none' : treatment.st.responsibility === 'none') &&
  Boolean(treatment.st.agreementOrProtocol?.trim()) &&
  Boolean(treatment.st.baseMethod?.trim()) &&
  validPercent(treatment.st.ratePercent) &&
  treatment.difal.applicable !== null &&
  treatment.difal.responsibility !== null &&
  (treatment.difal.applicable ? treatment.difal.responsibility !== 'none' : treatment.difal.responsibility === 'none') &&
  validPercent(treatment.difal.internalRatePercent) &&
  validPercent(treatment.difal.interstateRatePercent) &&
  validPercent(treatment.difal.destinationSharePercent) &&
  treatment.fcp.applicable !== null &&
  validPercent(treatment.fcp.ratePercent) &&
  treatment.fcpSt.applicable !== null && validPercent(treatment.fcpSt.ratePercent) &&
  (treatment.fcp.applicable || treatment.fcp.ratePercent === 0) &&
  (treatment.fcpSt.applicable || treatment.fcpSt.ratePercent === 0);

const approvalIsComplete = (rule: InterstateFiscalMatrixRule): boolean =>
  Boolean(
    rule.approvedBy?.trim() &&
      rule.approvedAt &&
      Number.isFinite(Date.parse(rule.approvedAt)) &&
      rule.effectiveFrom &&
      Number.isFinite(Date.parse(rule.effectiveFrom)) &&
      (!rule.effectiveUntil || (Number.isFinite(Date.parse(rule.effectiveUntil)) &&
        Date.parse(rule.effectiveUntil) >= Date.parse(rule.effectiveFrom))) &&
      requiredFacts
        .filter((key) => key !== 'effectiveAt')
        .every((key) => Object.prototype.hasOwnProperty.call(rule.criteria, key) ||
          rule.reviewedWildcards?.includes(key)) &&
      Boolean(rule.xmlEvidence?.trim()) && Boolean(rule.testEvidence?.trim()) &&
      rule.sourceReferences.length > 0 &&
      rule.sourceReferences.every((source) => Boolean(source.trim())) &&
      rule.pendingReview.length === 0 &&
      treatmentIsComplete(rule.treatment)
  );

export type InterstateFiscalMatrixResolution =
  | { status: 'approved'; rule: InterstateFiscalMatrixRule; ruleId: string; reason: string; sources: string[] }
  | {
      status: 'not_approved';
      code: 'HML_INTERSTATE_MATRIX_NOT_APPROVED';
      matchingDraftRuleIds: string[];
      missingFacts: Array<keyof InterstateFiscalMatrixFacts>;
      matchingBlockedRuleIds: string[];
      reason: string;
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
      rule.status === 'APPROVED' && approvalIsComplete(rule) &&
      (['environment', 'model', 'issuerRegime', 'issuerUf', 'destinationUf', 'operationType'] as const)
        .every((key) => rule.criteria[key] === facts[key] || rule.reviewedWildcards?.includes(key))
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
  const matchingBlockedRuleIds = rules
    .filter((rule) => rule.status === 'BLOCKED' && matchesKnownCriteria(facts, rule.criteria))
    .map((rule) => rule.id);
  const notApproved = (reason: string): InterstateFiscalMatrixResolution => ({
    status: 'not_approved', code: 'HML_INTERSTATE_MATRIX_NOT_APPROVED',
    matchingDraftRuleIds, matchingBlockedRuleIds, missingFacts, reason,
  });
  if (missingFacts.length) return notApproved('Fatos fiscais obrigatórios ausentes ou data inválida.');
  if (facts.recipientIeStatus === 'non_taxpayer' && facts.finalConsumer === false)
    return notApproved('MOC E16a-40: indIEDest=9 e indFinal=0 em venda de saída (rejeição 696).');
  const effectiveAt = Date.parse(String(facts.effectiveAt));
  const matchingApproved = rules.filter(
    (rule) =>
      rule.status === 'APPROVED' &&
      // Invalid/missing dates remain visible to the completeness gate. Valid future/expired
      // rules are excluded BEFORE ranking so they cannot shadow a current rule.
      (!Number.isFinite(Date.parse(rule.effectiveFrom || '')) ||
        Date.parse(rule.effectiveFrom || '') <= effectiveAt) &&
      (!rule.effectiveUntil || !Number.isFinite(Date.parse(rule.effectiveUntil)) ||
        Date.parse(rule.effectiveUntil) >= effectiveAt) &&
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
    // Lexicographic tiers, never the incidental number/order of object keys.
    const specificity = (rule: InterstateFiscalMatrixRule): number[] => [
      ...(['productId', 'ncm', 'cest', 'destinationUf', 'hasSt', 'recipientIeStatus',
        'recipientPersonType', 'finalConsumer', 'productOrigin', 'merchandiseOrigin'] as const)
        .map((key) => Object.prototype.hasOwnProperty.call(rule.criteria, key) ? 1 : 0),
      rule.priority,
    ];
    const compare = (a: number[], b: number[]) => {
      for (let index = 0; index < a.length; index++) if (a[index] !== b[index]) return b[index] - a[index];
      return 0;
    };
    const ranked = matchingApproved
      .map((rule) => ({
        rule,
        specificity: specificity(rule),
      }))
      .sort((a, b) => compare(a.specificity, b.specificity));
    const [best, second] = ranked;
    if (
      second &&
      compare(best.specificity, second.specificity) === 0
    )
      return {
        status: 'ambiguous',
        code: 'HML_INTERSTATE_MATRIX_AMBIGUOUS',
        ruleIds: ranked
          .filter(
            (item) =>
              compare(item.specificity, best.specificity) === 0
          )
          .map((item) => item.rule.id),
      };
    return { status: 'approved', rule: best.rule, ruleId: best.rule.id,
      reason: `Regra vigente de maior especificidade (${best.specificity.join(',')}); sem empate.`,
      sources: [...best.rule.sourceReferences] };
  }
  return notApproved('Nenhuma regra APPROVED completa e vigente corresponde aos fatos.');
}
