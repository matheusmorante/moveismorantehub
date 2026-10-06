/**
 * Interstate Outbound Fiscal Matrix. CFOP candidates below are research labels
 * only; DRAFT/BLOCKED records never supply an emission decision or tax treatment.
 * Normative findings: docs/fiscal/matriz-saida-interestadual.md; destination findings: overrides/sc.md.
 */
import { isBrazilianFiscalUf } from '../../shared-utils/fiscalCfopModel';

export type InterstateMatrixStatus = 'DRAFT' | 'APPROVED' | 'BLOCKED' | 'DEPRECATED';
export type InterstateRecipientIeStatus = 'taxpayer' | 'exempt' | 'non_taxpayer';
export type InterstateMerchandiseOrigin = 'third_party' | 'own_production';

export type InterstateOutboundFiscalMatrixFacts = {
  environment: 1 | 2;
  model: '55' | '65';
  issuerRegime: string;
  issuerUf: string;
  destinationUf: string;
  destinationScope: 'INTERSTATE';
  operationType: 'sale';
  purpose: '1' | '2' | '3' | '4';
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

export type InterstateOutboundNormativeScope =
  | 'NATIONAL' | 'ORIGIN_STATE' | 'DESTINATION_STATE'
  | 'ORIGIN_DESTINATION_PAIR' | 'PRODUCT_SPECIFIC';

export type InterstateOutboundNormativeSource = {
  id: string;
  scope: InterstateOutboundNormativeScope;
  url: string;
  issuerUf?: string;
  destinationUf?: string;
  productId?: string;
  ncm?: string;
  cest?: string;
};

export type InterstateOutboundFiscalMatrixCriteria =
  Omit<Partial<InterstateOutboundFiscalMatrixFacts>, 'destinationUf'> & {
    /** null/omitted means any Brazilian destination DIFFERENT from the issuer. */
    destinationUf?: string | null;
  };

export const INTERSTATE_OUTBOUND_GENERAL_SOURCES: readonly InterstateOutboundNormativeSource[] = [
  { id: 'N1', scope: 'NATIONAL', url: 'https://www.confaz.fazenda.gov.br/legislacao/arquivo-manuais/moc7-anexo-i-leiaute-e-rv.pdf' },
  { id: 'N2', scope: 'NATIONAL', url: 'https://www.confaz.fazenda.gov.br/legislacao/ajustes/sinief/cfop_cvsn_1-6.24' },
  { id: 'N3', scope: 'NATIONAL', url: 'https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp123.htm' },
  { id: 'N4', scope: 'NATIONAL', url: 'https://www.confaz.fazenda.gov.br/legislacao/convenios/2018/CV142_18' },
  { id: 'N5-LC', scope: 'NATIONAL', url: 'https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp190.htm' },
  { id: 'N5-CV', scope: 'NATIONAL', url: 'https://www.confaz.fazenda.gov.br/legislacao/convenios/2021/CV236_21' },
  { id: 'PR1', scope: 'ORIGIN_STATE', issuerUf: 'PR', url: 'https://www.sefanet.pr.gov.br/dados/SEFADOCUMENTOS/102202405144.pdf' },
  { id: 'PR2', scope: 'ORIGIN_STATE', issuerUf: 'PR', url: 'https://www.fazenda.pr.gov.br/Pagina/ICMS-Substituicao-tributaria' },
  { id: 'PR3', scope: 'ORIGIN_STATE', issuerUf: 'PR', url: 'https://www.legislacao.pr.gov.br/legislacao/pesquisarAto.do?action=exibir&codAto=278020&codTipoAto=1&tipoVisualizacao=compilado' },
];

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

export type InterstateOutboundFiscalMatrixRule = {
  id: string;
  status: InterstateMatrixStatus;
  criteria: InterstateOutboundFiscalMatrixCriteria;
  normativeScope: InterstateOutboundNormativeScope;
  priority: number;
  treatment: InterstateTaxTreatment;
  /** CFOP candidates are informational and are never copied into treatment. */
  candidateCfops: string[];
  pendingReview: string[];
  sourceReferences: string[];
  normativeSources: readonly InterstateOutboundNormativeSource[];
  approvedBy?: string;
  approvedAt?: string;
  effectiveFrom?: string;
  effectiveUntil?: string;
  /** An omitted criterion is a wildcard only after explicit review of that axis. */
  reviewedWildcards?: Array<keyof InterstateOutboundFiscalMatrixFacts>;
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
  destinationScope: 'INTERSTATE' as const,
  destinationUf: null,
  operationType: 'sale' as const,
  purpose: '1' as const,
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
): InterstateOutboundFiscalMatrixRule => ({
  id,
  normativeScope: 'ORIGIN_STATE',
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
    'ST: sujeição, responsabilidade e acordo/protocolo vigente entre origem e destino',
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
  sourceReferences: INTERSTATE_OUTBOUND_GENERAL_SOURCES.map((source) => source.url),
  normativeSources: INTERSTATE_OUTBOUND_GENERAL_SOURCES,
});

/**
 * General outbound inventory: 20 DRAFT and four combinations BLOCKED by E16a-40.
 * Source references record research; they do not constitute approval of tax outputs.
 */
const initialScenarios: InterstateOutboundFiscalMatrixRule[] = [
  draft('INTERSTATE-PJ-TAXPAYER-NONFINAL-NO-ST', 'PJ', 'taxpayer', false, false, ['6102'], []),
  draft('INTERSTATE-PJ-TAXPAYER-NONFINAL-ST', 'PJ', 'taxpayer', false, true, [], ['CFOP conforme papel de substituto/substituído']),
  draft('INTERSTATE-PJ-TAXPAYER-FINAL-NO-ST', 'PJ', 'taxpayer', true, false, ['6102'], []),
  draft('INTERSTATE-PJ-TAXPAYER-FINAL-ST', 'PJ', 'taxpayer', true, true, [], ['CFOP conforme papel de substituto/substituído']),
  draft('INTERSTATE-PJ-EXEMPT-FINAL-NO-ST', 'PJ', 'exempt', true, false, ['6102'], ['Isento de IE continua contribuinte; confirmar enquadramento na UF fiscal de destino']),
  draft('INTERSTATE-PJ-EXEMPT-FINAL-ST', 'PJ', 'exempt', true, true, [], ['CFOP conforme condição de IE isenta e tratamento de ST']),
  draft('INTERSTATE-PJ-NONTAXPAYER-FINAL-NO-ST', 'PJ', 'non_taxpayer', true, false, ['6108'], ['Validar DIFAL/FCP e responsabilidade do remetente']),
  draft('INTERSTATE-PJ-NONTAXPAYER-FINAL-ST', 'PJ', 'non_taxpayer', true, true, ['6108', '6404'], ['Distinguir retenção anterior no PR e tratamento da saída interestadual; não copiar consulta de outra UF']),
  draft('INTERSTATE-PF-NONTAXPAYER-FINAL-NO-ST', 'PF', 'non_taxpayer', true, false, ['6108'], ['Validar DIFAL/FCP e responsabilidade do remetente']),
  draft('INTERSTATE-PF-NONTAXPAYER-FINAL-ST', 'PF', 'non_taxpayer', true, true, ['6108', '6404'], ['Distinguir retenção anterior no PR e tratamento da saída interestadual; não copiar consulta de outra UF']),
  {
    ...draft('INTERSTATE-PJ-TAXPAYER-FINAL-NO-ST-SC-MOCK', 'PJ', 'taxpayer', true, false, ['6102'], []),
    status: 'APPROVED',
    criteria: {
      ...commonCriteria,
      recipientPersonType: 'PJ',
      recipientIeStatus: 'taxpayer',
      finalConsumer: true,
      hasSt: false,
      destinationUf: 'SC',
    },
    priority: 10,
    pendingReview: [],
    treatment: {
      cfop: '6102',
      csosn: '102',
      icms: { xmlGroup: 'ICMSSN102', framework: '1', ratePercent: 0, baseMethod: '0', reductionPercent: 0 },
      st: { responsibility: 'none', applicable: false, agreementOrProtocol: 'NA', baseMethod: '0', ratePercent: 0 },
      difal: { applicable: false, responsibility: 'none', internalRatePercent: 0, interstateRatePercent: 0, destinationSharePercent: 0 },
      fcp: { applicable: false, ratePercent: 0 },
      fcpSt: { applicable: false, ratePercent: 0 },
    },
    approvedBy: 'User_Request_004268',
    approvedAt: '2023-01-01T00:00:00.000Z',
    effectiveFrom: '2023-01-01T00:00:00.000Z',
    xmlEvidence: 'HML-SC-MOCK',
    testEvidence: 'HML-SC-MOCK',
    reviewedWildcards: ['environment', 'model', 'issuerRegime', 'issuerUf', 'destinationScope', 'operationType', 'purpose', 'merchandiseOrigin', 'productOrigin', 'ncm', 'cest'],
    candidateCfops: ['6102'],
    normativeScope: 'DESTINATION_STATE',
    sourceReferences: ['https://mock-sc-rule'],
    normativeSources: [{ id: 'SC-MOCK', scope: 'DESTINATION_STATE', destinationUf: 'SC', url: 'https://mock-sc-rule' }]
  }
];

// Preserve scenario suffixes; enumerate independent PF/PJ × IE × finality × ST axes.
const addedScenarios: InterstateOutboundFiscalMatrixRule[] = [];
for (const person of ['PJ', 'PF'] as const) {
  for (const ie of ['taxpayer', 'exempt', 'non_taxpayer'] as const) {
    for (const final of [false, true]) {
      for (const st of [false, true]) {
        if (initialScenarios.some((rule) => rule.criteria.recipientPersonType === person &&
          rule.criteria.recipientIeStatus === ie && rule.criteria.finalConsumer === final &&
          rule.criteria.hasSt === st)) continue;
        const ieLabel = ie === 'non_taxpayer' ? 'NONTAXPAYER' : ie.toUpperCase();
        addedScenarios.push(draft(
          `INTERSTATE-${person}-${ieLabel}-${final ? 'FINAL' : 'NONFINAL'}-${st ? 'ST' : 'NO-ST'}`,
          person, ie, final, st,
          ie === 'non_taxpayer' && !final ? [] : st ? [] : [ie === 'non_taxpayer' ? '6108' : '6102'],
          []
        ));
      }
    }
  }
}
export const INTERSTATE_OUTBOUND_FISCAL_MATRIX_RULES: readonly InterstateOutboundFiscalMatrixRule[] = [
  ...initialScenarios, ...addedScenarios,
];

const requiredFacts: Array<keyof InterstateOutboundFiscalMatrixFacts> = [
  'environment',
  'model',
  'issuerRegime',
  'issuerUf',
  'destinationUf',
  'destinationScope',
  'operationType',
  'purpose',
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

const isMissing = (value: unknown, key?: keyof InterstateOutboundFiscalMatrixFacts): boolean =>
  value === undefined || value === null || (value === '' && key !== 'cest');
const matchesKnownCriteria = (
  facts: Partial<InterstateOutboundFiscalMatrixFacts>,
  criteria: InterstateOutboundFiscalMatrixCriteria
): boolean =>
  Object.entries(criteria).every(([key, expected]) => {
    if (key === 'destinationUf' && expected == null) return true;
    const actual = facts[key as keyof InterstateOutboundFiscalMatrixFacts];
    return isMissing(actual, key as keyof InterstateOutboundFiscalMatrixFacts) || actual === expected;
  });

const matchesCompleteCriteria = (
  facts: InterstateOutboundFiscalMatrixFacts,
  criteria: InterstateOutboundFiscalMatrixCriteria
): boolean =>
  Object.entries(criteria).every(([key, expected]) => {
    if (key === 'destinationUf' && expected == null) return true;
    const actual = facts[key as keyof InterstateOutboundFiscalMatrixFacts];
    return !isMissing(actual, key as keyof InterstateOutboundFiscalMatrixFacts) && actual === expected;
  });

const validPercent = (value: number | null): boolean =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100;

const treatmentIsComplete = (treatment: InterstateTaxTreatment): boolean =>
  treatment.cfop !== null &&
  /^6\d{3}$/.test(treatment.cfop) &&
  treatment.csosn !== null &&
  ({ '101': 'ICMSSN101', '102': 'ICMSSN102', '103': 'ICMSSN102', '201': 'ICMSSN201',
    '202': 'ICMSSN202', '203': 'ICMSSN202', '300': 'ICMSSN102', '400': 'ICMSSN102',
    '500': 'ICMSSN500', '900': 'ICMSSN900' } as Record<string, string>)[treatment.csosn] === treatment.icms.xmlGroup &&
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

const scopeMatchesCriteria = (
  scope: InterstateOutboundNormativeScope,
  criteria: InterstateOutboundFiscalMatrixCriteria
): boolean => {
  switch (scope) {
    case 'NATIONAL': return true;
    case 'ORIGIN_STATE': return isBrazilianFiscalUf(criteria.issuerUf);
    case 'DESTINATION_STATE': return isBrazilianFiscalUf(criteria.destinationUf);
    case 'ORIGIN_DESTINATION_PAIR':
      return isBrazilianFiscalUf(criteria.issuerUf) && isBrazilianFiscalUf(criteria.destinationUf);
    case 'PRODUCT_SPECIFIC':
      return Boolean(criteria.productId || criteria.ncm || criteria.cest);
    default: return false;
  }
};

/** A destination/product source cannot support an unrestricted approval. */
const normativeSourcesAreScoped = (rule: InterstateOutboundFiscalMatrixRule): boolean =>
  scopeMatchesCriteria(rule.normativeScope, rule.criteria) &&
  Array.isArray(rule.normativeSources) &&
  rule.normativeSources.length > 0 &&
  rule.sourceReferences.every((url) => rule.normativeSources.some((source) => source.url === url)) &&
  rule.normativeSources.every((source) => {
    if (!source || typeof source.id !== 'string' || !source.id.trim() ||
      typeof source.url !== 'string' || !source.url.trim() || !rule.sourceReferences.includes(source.url) ||
      !scopeMatchesCriteria(source.scope, rule.criteria)) return false;
    if ((source.scope === 'ORIGIN_STATE' || source.scope === 'ORIGIN_DESTINATION_PAIR') &&
      !isBrazilianFiscalUf(source.issuerUf)) return false;
    if ((source.scope === 'DESTINATION_STATE' || source.scope === 'ORIGIN_DESTINATION_PAIR') &&
      !isBrazilianFiscalUf(source.destinationUf)) return false;
    if (source.scope === 'PRODUCT_SPECIFIC' && !(source.productId || source.ncm || source.cest)) return false;
    // Additional geography on a product source also restricts its use.
    return (['issuerUf', 'destinationUf', 'productId', 'ncm', 'cest'] as const)
      .every((key) => source[key] === undefined ||
        (!isMissing(source[key], key) && source[key] === rule.criteria[key]));
  });

const isInterstateOutboundRoute = (
  facts: Pick<Partial<InterstateOutboundFiscalMatrixFacts>, 'issuerUf' | 'destinationUf' | 'destinationScope'>
): boolean => facts.destinationScope === 'INTERSTATE' &&
  isBrazilianFiscalUf(facts.issuerUf) && isBrazilianFiscalUf(facts.destinationUf) &&
  facts.issuerUf !== facts.destinationUf;

const approvalIsComplete = (rule: InterstateOutboundFiscalMatrixRule): boolean =>
  Boolean(
    rule.approvedBy?.trim() &&
      rule.criteria.destinationScope === 'INTERSTATE' &&
      rule.approvedAt &&
      Number.isFinite(Date.parse(rule.approvedAt)) &&
      rule.effectiveFrom &&
      Number.isFinite(Date.parse(rule.effectiveFrom)) &&
      (!rule.effectiveUntil || (Number.isFinite(Date.parse(rule.effectiveUntil)) &&
        Date.parse(rule.effectiveUntil) >= Date.parse(rule.effectiveFrom))) &&
      requiredFacts
        .filter((key) => key !== 'effectiveAt')
        .every((key) => (key === 'destinationUf' && rule.criteria.destinationUf == null)
          ? rule.reviewedWildcards?.includes(key)
          : Object.hasOwn(rule.criteria, key) || rule.reviewedWildcards?.includes(key)) &&
      Boolean(rule.xmlEvidence?.trim()) && Boolean(rule.testEvidence?.trim()) &&
      rule.sourceReferences.length > 0 &&
      rule.sourceReferences.every((source) => Boolean(source.trim())) &&
      normativeSourcesAreScoped(rule) &&
      rule.pendingReview.length === 0 &&
      treatmentIsComplete(rule.treatment)
  );

export type InterstateOutboundFiscalMatrixResolution =
  | { status: 'approved'; rule: InterstateOutboundFiscalMatrixRule; ruleId: string; reason: string;
      sources: string[]; normativeSources: InterstateOutboundNormativeSource[] }
  | {
      status: 'not_approved';
      code: 'HML_INTERSTATE_MATRIX_NOT_APPROVED';
      matchingDraftRuleIds: string[];
      missingFacts: Array<keyof InterstateOutboundFiscalMatrixFacts>;
      matchingBlockedRuleIds: string[];
      reason: string;
    }
  | { status: 'ambiguous'; code: 'HML_INTERSTATE_MATRIX_AMBIGUOUS'; ruleIds: string[] }
  | { status: 'invalid_approved_rule'; code: 'HML_INTERSTATE_MATRIX_INVALID'; ruleIds: string[] };

/** Fast route-level gate so an absent route matrix blocks even before item detail parsing. */
export function hasApprovedInterstateOutboundRoute(
  facts: Pick<
    InterstateOutboundFiscalMatrixFacts,
    'environment' | 'model' | 'issuerRegime' | 'issuerUf' | 'destinationUf' | 'destinationScope' | 'operationType' | 'purpose'
  > & Pick<Partial<InterstateOutboundFiscalMatrixFacts>, 'effectiveAt'>,
  rules: readonly InterstateOutboundFiscalMatrixRule[] = INTERSTATE_OUTBOUND_FISCAL_MATRIX_RULES
): boolean {
  const effectiveAt = Date.parse(String(facts.effectiveAt || ''));
  if (!isInterstateOutboundRoute(facts)) return false;
  return rules.some(
    (rule) =>
      rule.status === 'APPROVED' && approvalIsComplete(rule) &&
      Number.isFinite(effectiveAt) && Date.parse(rule.effectiveFrom || '') <= effectiveAt &&
      (!rule.effectiveUntil || Date.parse(rule.effectiveUntil) >= effectiveAt) &&
      (['environment', 'model', 'issuerRegime', 'issuerUf', 'destinationUf', 'destinationScope', 'operationType', 'purpose'] as const)
        .every((key) => rule.criteria[key] === facts[key] ||
          (rule.criteria[key] == null && rule.reviewedWildcards?.includes(key)))
  );
}

/** Resolves only complete APPROVED rules; DRAFT data never supplies tax results. */
export function resolveInterstateOutboundFiscalMatrix(
  facts: Partial<InterstateOutboundFiscalMatrixFacts>,
  rules: readonly InterstateOutboundFiscalMatrixRule[] = INTERSTATE_OUTBOUND_FISCAL_MATRIX_RULES
): InterstateOutboundFiscalMatrixResolution {
  const missingFacts = requiredFacts.filter((key) => isMissing(facts[key], key));
  for (const [key, valid] of [
    ['issuerUf', isBrazilianFiscalUf(facts.issuerUf)],
    ['destinationUf', isBrazilianFiscalUf(facts.destinationUf)],
    ['purpose', typeof facts.purpose === 'string' && /^[1-4]$/.test(facts.purpose)],
    ['ncm', typeof facts.ncm === 'string' && /^\d{8}$/.test(facts.ncm)],
    ['cest', typeof facts.cest === 'string' && (facts.cest === '' || /^\d{7}$/.test(facts.cest))],
    ['productOrigin', typeof facts.productOrigin === 'string' && /^[0-8]$/.test(facts.productOrigin)],
  ] as const) if (!valid && !missingFacts.includes(key)) missingFacts.push(key);
  if (facts.effectiveAt && !Number.isFinite(Date.parse(facts.effectiveAt)) && !missingFacts.includes('effectiveAt'))
    missingFacts.push('effectiveAt');
  const matchingDraftRuleIds = rules
    .filter((rule) => rule.status === 'DRAFT' && matchesKnownCriteria(facts, rule.criteria))
    .map((rule) => rule.id);
  const matchingBlockedRuleIds = rules
    .filter((rule) => rule.status === 'BLOCKED' && matchesKnownCriteria(facts, rule.criteria))
    .map((rule) => rule.id);
  const notApproved = (reason: string): InterstateOutboundFiscalMatrixResolution => ({
    status: 'not_approved', code: 'HML_INTERSTATE_MATRIX_NOT_APPROVED',
    matchingDraftRuleIds, matchingBlockedRuleIds, missingFacts, reason,
  });
  if (missingFacts.length) return notApproved('Fatos fiscais obrigatórios ausentes ou data inválida.');
  if (!isInterstateOutboundRoute(facts))
    return notApproved('A matriz de saída interestadual exige UFs brasileiras distintas e destinationScope=INTERSTATE.');
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
      matchesCompleteCriteria(facts as InterstateOutboundFiscalMatrixFacts, rule.criteria)
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
    const specificity = (rule: InterstateOutboundFiscalMatrixRule): number[] => [
      ...(['productId', 'ncm', 'cest', 'destinationUf', 'hasSt', 'recipientIeStatus',
        'recipientPersonType', 'finalConsumer', 'productOrigin', 'merchandiseOrigin'] as const)
        .map((key) => !isMissing(rule.criteria[key], key) ? 1 : 0),
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
      sources: [...best.rule.sourceReferences], normativeSources: [...best.rule.normativeSources] };
  }
  return notApproved('Nenhuma regra APPROVED completa e vigente corresponde aos fatos.');
}
