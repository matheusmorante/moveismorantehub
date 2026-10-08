import {
  type FiscalCfopItemType,
  getCfopDefinition,
  isBrazilianFiscalUf,
} from '../../../shared-utils/fiscalCfopModel';
import { EXEMPT_IE_DISALLOWED_UFS, INTERSTATE_OUTBOUND_FISCAL_MATRIX_RULES } from './rules';
import type {
  InterstateOutboundErrorCode,
  InterstateOutboundFiscalMatrixCriteria,
  InterstateOutboundFiscalMatrixFacts,
  InterstateOutboundFiscalMatrixRule,
  InterstateOutboundNormativeScope,
  InterstateOutboundNormativeSource,
  InterstateRecipientIeStatus,
  InterstateStRole,
  InterstateTaxTreatment,
} from './types';

const requiredFacts: Array<keyof InterstateOutboundFiscalMatrixFacts> = [
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

const isMissing = (value: unknown, key?: keyof InterstateOutboundFiscalMatrixFacts): boolean =>
  value === undefined || value === null || (value === '' && key !== 'cest');

const matchesKnownCriteria = (
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

const matchesCompleteCriteria = (
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

const isInterstateOutboundRoute = (
  facts: Pick<
    Partial<InterstateOutboundFiscalMatrixFacts>,
    'issuerUf' | 'destinationUf' | 'destinationScope'
  >
): boolean =>
  facts.destinationScope === 'INTERSTATE' &&
  isBrazilianFiscalUf(facts.issuerUf) &&
  isBrazilianFiscalUf(facts.destinationUf) &&
  facts.issuerUf !== facts.destinationUf;

const approvalIsComplete = (rule: InterstateOutboundFiscalMatrixRule): boolean =>
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

// ============================================================================
// RESOLVEDORES DESACOPLADOS (ST e IE ISENTO)
// ============================================================================

/**
 * Validação de indIEDest=2 (Contribuinte Isento de Inscrição Estadual) por UF de destino.
 * Conforme MOC RV E16a-30 (Rejeição 805).
 */
export function validateInterstateExemptIe(
  destinationUf: string | undefined,
  recipientIeStatus: InterstateRecipientIeStatus | undefined
): { valid: boolean; errorCode?: 'INTERSTATE_EXEMPT_IE_NOT_ALLOWED'; reason?: string } {
  if (recipientIeStatus === 'exempt' && destinationUf) {
    const ufUpper = destinationUf.toUpperCase().trim();
    if (EXEMPT_IE_DISALLOWED_UFS.includes(ufUpper)) {
      return {
        valid: false,
        errorCode: 'INTERSTATE_EXEMPT_IE_NOT_ALLOWED',
        reason: `A UF de destino ${ufUpper} não permite destinatário como contribuinte isento de inscrição estadual (indIEDest=2) em operações interestaduais (MOC RV 805 / E16a-30).`,
      };
    }
  }
  return { valid: true };
}

/**
 * Resolve apenas o papel explicitamente informado. hasSt/CST 500 indicam contexto
 * de ST, mas não bastam para decidir se o emitente é substituto ou substituído.
 * Papéis sujeitos a ST permanecem bloqueados até existir regra aprovada para o cenário.
 */
export function resolveInterstateStRole(params: {
  stRole?: InterstateStRole;
  hasSt?: boolean;
  catalogCst?: string;
  itemFiscalCst?: string;
  ncm?: string;
  issuerUf?: string;
  destinationUf?: string;
}):
  | { role: InterstateStRole; isSt: boolean; status: 'RESOLVED' }
  | {
      role: null;
      isSt: null;
      status: 'UNCONFIGURED';
      errorCode: 'INTERSTATE_TAX_PROFILE_INCOMPLETE';
      reason: string;
    }
  | {
      role: Exclude<InterstateStRole, 'NONE'>;
      isSt: true;
      status: 'UNCONFIGURED';
      errorCode: 'INTERSTATE_ST_RULE_NOT_CONFIGURED';
      reason: string;
    } {
  const { stRole, hasSt, catalogCst, itemFiscalCst, ncm, issuerUf, destinationUf } = params;
  const suggestsPriorSt = catalogCst === '500' || itemFiscalCst === '500';
  const incomplete = (reason: string) => ({
    role: null,
    isSt: null,
    status: 'UNCONFIGURED' as const,
    errorCode: 'INTERSTATE_TAX_PROFILE_INCOMPLETE' as const,
    reason,
  });

  if (stRole === undefined) {
    if (hasSt === false && !suggestsPriorSt)
      return {
        role: 'NONE',
        isSt: false,
        status: 'RESOLVED',
      };
    return incomplete(
      hasSt === true || suggestsPriorSt
        ? 'O produto indica contexto de ST, mas o papel do emitente na saída interestadual não foi informado; hasSt ou CST 500 não determinam substituto/substituído.'
        : 'O enquadramento de ST não foi informado; CEST vazio ou ausente no cadastro não comprova ausência de enquadramento.'
    );
  }

  if (stRole === 'NONE') {
    if (suggestsPriorSt)
      return incomplete(
        'CST 500 conflita com o papel NONE; revise o enquadramento fiscal do item.'
      );
    return {
      role: 'NONE',
      isSt: false,
      status: 'RESOLVED',
    };
  }

  if (hasSt === false)
    return incomplete(
      'O papel informado na ST conflita com hasSt=false; revise os fatos fiscais do item.'
    );

  return {
    role: stRole,
    isSt: true,
    status: 'UNCONFIGURED',
    errorCode: 'INTERSTATE_ST_RULE_NOT_CONFIGURED',
    reason: `Regra de Substituição Tributária interestadual (papel ${stRole}) ainda não parametrizada para NCM ${ncm || 'não informado'} e par ${issuerUf || 'origem'}→${destinationUf || 'destino'}.`,
  };
}

export type InterstateOutboundFiscalMatrixResolution =
  | {
      status: 'approved';
      rule: InterstateOutboundFiscalMatrixRule;
      ruleId: string;
      reason: string;
      sources: string[];
      normativeSources: InterstateOutboundNormativeSource[];
      treatment: InterstateTaxTreatment;
    }
  | {
      status: 'not_approved';
      code: InterstateOutboundErrorCode;
      matchingDraftRuleIds: string[];
      missingFacts: Array<keyof InterstateOutboundFiscalMatrixFacts>;
      matchingBlockedRuleIds: string[];
      reason: string;
    }
  | { status: 'ambiguous'; code: 'HML_INTERSTATE_MATRIX_AMBIGUOUS'; ruleIds: string[] }
  | { status: 'invalid_approved_rule'; code: 'HML_INTERSTATE_MATRIX_INVALID'; ruleIds: string[] };

/**
 * Fast route-level gate so an absent route matrix blocks before item parsing.
 * This does not approve the item's fiscal scenario; resolveInterstateOutboundFiscalMatrix
 * must still select its exact rule before fiscal preparation/serialization.
 */
export function hasApprovedInterstateOutboundRoute(
  facts: Pick<
    InterstateOutboundFiscalMatrixFacts,
    | 'environment'
    | 'model'
    | 'issuerRegime'
    | 'issuerUf'
    | 'destinationUf'
    | 'destinationScope'
    | 'operationType'
    | 'purpose'
  > &
    Pick<Partial<InterstateOutboundFiscalMatrixFacts>, 'effectiveAt'>,
  rules: readonly InterstateOutboundFiscalMatrixRule[] = INTERSTATE_OUTBOUND_FISCAL_MATRIX_RULES
): boolean {
  const effectiveAt = Date.parse(String(facts.effectiveAt || ''));
  if (!isInterstateOutboundRoute(facts)) return false;
  return rules.some(
    (rule) =>
      rule.status === 'APPROVED' &&
      approvalIsComplete(rule) &&
      Number.isFinite(effectiveAt) &&
      Date.parse(rule.effectiveFrom || '') <= effectiveAt &&
      (!rule.effectiveUntil || Date.parse(rule.effectiveUntil) >= effectiveAt) &&
      (
        [
          'environment',
          'model',
          'issuerRegime',
          'issuerUf',
          'destinationUf',
          'destinationScope',
          'operationType',
          'purpose',
        ] as const
      ).every(
        (key) =>
          rule.criteria[key] === facts[key] ||
          (rule.criteria[key] == null && rule.reviewedWildcards?.includes(key))
      )
  );
}

/** Resolves only complete APPROVED rules; DRAFT/BLOCKED data never supply tax results. */
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
    [
      'productOrigin',
      typeof facts.productOrigin === 'string' && /^[0-8]$/.test(facts.productOrigin),
    ],
  ] as const) {
    if (!valid && !missingFacts.includes(key as any)) missingFacts.push(key as any);
  }
  if (
    facts.effectiveAt &&
    !Number.isFinite(Date.parse(facts.effectiveAt)) &&
    !missingFacts.includes('effectiveAt')
  ) {
    missingFacts.push('effectiveAt');
  }

  const matchingDraftRuleIds = rules
    .filter((rule) => rule.status === 'DRAFT' && matchesKnownCriteria(facts, rule.criteria))
    .map((rule) => rule.id);
  const matchingBlockedRuleIds = rules
    .filter((rule) => rule.status === 'BLOCKED' && matchesKnownCriteria(facts, rule.criteria))
    .map((rule) => rule.id);

  const notApproved = (
    reason: string,
    code: InterstateOutboundErrorCode = 'HML_INTERSTATE_MATRIX_NOT_APPROVED'
  ): InterstateOutboundFiscalMatrixResolution => ({
    status: 'not_approved',
    code,
    matchingDraftRuleIds,
    matchingBlockedRuleIds,
    missingFacts,
    reason,
  });

  if (missingFacts.length) {
    return notApproved(
      missingFacts.includes('hasSt')
        ? 'Informe se o produto está sujeito à ST; CEST vazio ou ausente no cadastro não comprova ausência de enquadramento.'
        : 'Fatos fiscais obrigatórios ausentes ou inválidos.',
      'INTERSTATE_TAX_PROFILE_INCOMPLETE'
    );
  }
  if (!isInterstateOutboundRoute(facts)) {
    return notApproved(
      'A matriz de saída interestadual exige UFs brasileiras distintas e destinationScope=INTERSTATE.'
    );
  }

  // 1. Regra BLOCKED por RV E16a-40 (Rejeição 696): Não contribuinte com indFinal <> 1
  if (facts.recipientIeStatus === 'non_taxpayer' && facts.finalConsumer === false) {
    return notApproved(
      'MOC E16a-40: indIEDest=9 e indFinal=0 em venda de saída é rejeitado pela SEFAZ (rejeição 696).',
      'INTERSTATE_RULE_INVALID_COMBINATION'
    );
  }

  // 2. Validação de indIEDest=2 (Contribuinte Isento) pela UF de destino (MOC RV 805)
  const exemptCheck = validateInterstateExemptIe(facts.destinationUf, facts.recipientIeStatus);
  if (!exemptCheck.valid) {
    return notApproved(
      exemptCheck.reason || 'UF não permite contribuinte isento.',
      exemptCheck.errorCode!
    );
  }

  // 3. Validação Desacoplada de Substituição Tributária (ST)
  // Só aplica resolvedor de ST se os fatos tiverem hasSt ou stRole explicitado
  const stResult = resolveInterstateStRole({
    stRole: facts.stRole,
    hasSt: facts.hasSt,
    ncm: facts.ncm,
    issuerUf: facts.issuerUf,
    destinationUf: facts.destinationUf,
  });
  if (stResult.status === 'UNCONFIGURED') {
    return notApproved(stResult.reason || 'ST não configurada.', stResult.errorCode!);
  }

  const effectiveAt = Date.parse(String(facts.effectiveAt));
  const specificity = (rule: InterstateOutboundFiscalMatrixRule): number[] => {
    const criteria = rule.criteria;
    const specified = (key: keyof InterstateOutboundFiscalMatrixFacts) =>
      !isMissing(criteria[key], key);
    const routePairSpecific = specified('issuerUf') && specified('destinationUf');
    const operationCriteria = (
      [
        'environment',
        'model',
        'issuerRegime',
        'destinationScope',
        'operationType',
        'purpose',
        'recipientPersonType',
        'recipientIeStatus',
        'finalConsumer',
        'merchandiseOrigin',
        'productOrigin',
        'hasSt',
        'stRole',
        'allowsIcmsCredit',
        'recipientTaxRegime',
      ] as const
    ).filter((key) => specified(key)).length;

    return [
      Number(specified('productId')),
      Number(specified('ncm')),
      Number(specified('cest')),
      Number(routePairSpecific),
      Number(specified('destinationUf')),
      Number(specified('issuerUf')),
      operationCriteria,
    ];
  };

  const compare = (a: number[], b: number[]) => {
    for (let index = 0; index < a.length; index++) {
      if (a[index] !== b[index]) return b[index] - a[index];
    }
    return 0;
  };

  const ranked = rules
    .filter((rule) => {
      const effectiveFrom = Date.parse(rule.effectiveFrom || '');
      const effectiveUntil = Date.parse(rule.effectiveUntil || '');
      const active =
        (!Number.isFinite(effectiveFrom) || effectiveFrom <= effectiveAt) &&
        (!rule.effectiveUntil || !Number.isFinite(effectiveUntil) || effectiveUntil >= effectiveAt);
      if (!active || rule.status === 'DEPRECATED') return false;
      if (rule.status === 'APPROVED')
        return matchesCompleteCriteria(facts as InterstateOutboundFiscalMatrixFacts, rule.criteria);
      return matchesKnownCriteria(facts, rule.criteria);
    })
    .map((rule) => ({ rule, specificity: specificity(rule) }))
    .sort((a, b) => compare(a.specificity, b.specificity));

  if (ranked.length) {
    const bestSpecificity = ranked[0].specificity;
    const bestCandidates = ranked.filter(
      (candidate) => compare(candidate.specificity, bestSpecificity) === 0
    );
    const unresolved = bestCandidates.filter(
      ({ rule }) => rule.status === 'DRAFT' || rule.status === 'BLOCKED'
    );

    if (unresolved.length) {
      const details = unresolved
        .map(({ rule }) => {
          const review = rule.pendingReview.join(' ');
          return `${rule.id} (${rule.status})${review ? `: ${review}` : ''}`;
        })
        .join(' | ');
      return notApproved(
        `O cenário mais específico da matriz está pendente ou bloqueado; uma regra-base genérica não pode autorizá-lo. ${details}`
      );
    }

    const matchingApproved = bestCandidates.map(({ rule }) => rule);
    const invalid = matchingApproved.filter((rule) => !approvalIsComplete(rule));
    if (invalid.length) {
      return {
        status: 'invalid_approved_rule',
        code: 'HML_INTERSTATE_MATRIX_INVALID',
        ruleIds: invalid.map((rule) => rule.id),
      };
    }

    if (matchingApproved.length > 1) {
      return {
        status: 'ambiguous',
        code: 'HML_INTERSTATE_MATRIX_AMBIGUOUS',
        ruleIds: matchingApproved.map((rule) => rule.id),
      };
    }

    const best = matchingApproved[0];

    return {
      status: 'approved',
      rule: best,
      ruleId: best.id,
      reason: `Regra aprovada vigente (${best.id}) aplicada sem conflito.`,
      sources: [...best.sourceReferences],
      normativeSources: [...best.normativeSources],
      // A regra APPROVED é uma decisão completa. Não reescrever CSOSN ou
      // grupos de ICMS a partir de outro resolvedor depois da seleção.
      treatment: best.treatment,
    };
  }

  return notApproved('Nenhuma regra APPROVED completa e vigente corresponde aos fatos.');
}

export type InterstateCfopDiagnosticContext = {
  label: string;
  value: string;
};

export type InterstateCfopCandidateDiagnostic = {
  enabled: boolean;
  matrixStatus: InterstateOutboundFiscalMatrixResolution['status'];
  recommendedCfop?: string;
  recommendedCsosn?: string;
  ruleId?: string;
  context: InterstateCfopDiagnosticContext[];
  conflicts: string[];
};

const diagnosticFieldLabels: Partial<Record<keyof InterstateOutboundFiscalMatrixFacts, string>> = {
  environment: 'Ambiente fiscal',
  model: 'Modelo fiscal',
  issuerRegime: 'CRT do emitente',
  issuerUf: 'UF de origem',
  destinationUf: 'UF de destino',
  destinationScope: 'Destino',
  operationType: 'Operação',
  purpose: 'Finalidade',
  recipientPersonType: 'Tipo de destinatário',
  recipientIeStatus: 'Destinatário / indIEDest',
  finalConsumer: 'Consumidor final / indFinal',
  merchandiseOrigin: 'Origem da mercadoria',
  productOrigin: 'Origem no ICMS / origem NF-e',
  ncm: 'NCM',
  cest: 'CEST',
  hasSt: 'Mercadoria sujeita a ST',
  stRole: 'Papel na substituição tributária',
  allowsIcmsCredit: 'Permite crédito de ICMS',
  recipientTaxRegime: 'Regime tributário do destinatário',
  productId: 'Produto',
  effectiveAt: 'Data de vigência avaliada',
};

const diagnosticCriterionLabels: Partial<
  Record<keyof InterstateOutboundFiscalMatrixFacts, string>
> = {
  environment: 'ambiente fiscal',
  model: 'modelo fiscal',
  issuerRegime: 'CRT do emitente',
  issuerUf: 'UF de origem',
  destinationUf: 'UF de destino',
  destinationScope: 'tipo de destino',
  operationType: 'tipo de operação',
  purpose: 'finalidade',
  recipientPersonType: 'tipo de destinatário',
  recipientIeStatus: 'destinatário / indIEDest',
  finalConsumer: 'consumidor final / indFinal',
  merchandiseOrigin: 'origem da mercadoria',
  productOrigin: 'origem no ICMS / origem NF-e',
  ncm: 'NCM',
  cest: 'CEST',
  hasSt: 'mercadoria sujeita a ST',
  stRole: 'papel na substituição tributária',
  allowsIcmsCredit: 'permissão de crédito de ICMS',
  recipientTaxRegime: 'regime tributário do destinatário',
  productId: 'produto',
  effectiveAt: 'data de vigência',
};

const formatDiagnosticValue = (
  key: keyof InterstateOutboundFiscalMatrixFacts,
  value: unknown
): string => {
  if (value === undefined || value === null || value === '') return 'não informado';
  if (key === 'environment') return value === 1 ? 'Produção (1)' : 'Homologação (2)';
  if (key === 'model') return value === '55' ? 'NF-e 55' : 'NFC-e 65';
  if (key === 'issuerRegime') return `CRT ${String(value)}`;
  if (key === 'destinationScope') return value === 'INTERSTATE' ? 'interestadual' : String(value);
  if (key === 'operationType') {
    const operationLabels: Record<string, string> = {
      sale: 'venda',
      return: 'devolução',
      transfer: 'transferência',
      shipment: 'remessa',
    };
    return operationLabels[String(value)] || String(value);
  }
  if (key === 'purpose') {
    const purposeLabels: Record<string, string> = {
      '1': 'normal (1)',
      '2': 'complementar (2)',
      '3': 'ajuste (3)',
      '4': 'devolução (4)',
    };
    return purposeLabels[String(value)] || String(value);
  }
  if (key === 'recipientIeStatus') {
    const recipientLabels: Record<string, string> = {
      taxpayer: 'contribuinte do ICMS (indIEDest=1)',
      exempt: 'contribuinte isento (indIEDest=2)',
      non_taxpayer: 'não contribuinte do ICMS (indIEDest=9)',
    };
    return recipientLabels[String(value)] || String(value);
  }
  if (key === 'finalConsumer') return value ? 'sim (indFinal=1)' : 'não (indFinal=0)';
  if (key === 'merchandiseOrigin')
    return value === 'third_party' ? 'adquirida de terceiros' : 'produção própria';
  if (key === 'hasSt') return value ? 'sim' : 'não';
  if (key === 'stRole') {
    const stLabels: Record<string, string> = {
      NONE: 'sem ST',
      SUBSTITUTE: 'substituto tributário',
      SUBSTITUTED: 'substituído tributário',
    };
    return stLabels[String(value)] || String(value);
  }
  if (key === 'recipientPersonType') return value === 'PF' ? 'pessoa física' : 'pessoa jurídica';
  if (key === 'allowsIcmsCredit') return value ? 'sim' : 'não';
  return String(value);
};

const recipientIndicatorValue = (
  status: InterstateOutboundFiscalMatrixFacts['recipientIeStatus'] | undefined
): string =>
  status === 'taxpayer'
    ? '1'
    : status === 'exempt'
      ? '2'
      : status === 'non_taxpayer'
        ? '9'
        : 'não informado';

/**
 * Gives each dropdown option a diagnostic from the exact same approved rules and
 * resolver used for backend validation. Candidate-rule criteria supply all vector
 * conflicts; catalog metadata supplies scope/type/model/origin/ST conflicts.
 */
export function diagnoseInterstateOutboundCfopCandidate(params: {
  facts: Partial<InterstateOutboundFiscalMatrixFacts>;
  candidateCfop: string;
  itemType?: FiscalCfopItemType;
  contextExtras?: InterstateCfopDiagnosticContext[];
  rules?: readonly InterstateOutboundFiscalMatrixRule[];
  resolution?: InterstateOutboundFiscalMatrixResolution;
}): InterstateCfopCandidateDiagnostic {
  const {
    facts,
    candidateCfop,
    itemType = 'product',
    contextExtras = [],
    rules = INTERSTATE_OUTBOUND_FISCAL_MATRIX_RULES,
    resolution: existingResolution,
  } = params;
  const resolution = existingResolution || resolveInterstateOutboundFiscalMatrix(facts, rules);
  const recommendedCfop =
    resolution.status === 'approved' ? resolution.treatment.cfop || undefined : undefined;
  const recommendedCsosn =
    resolution.status === 'approved' ? resolution.treatment.csosn || undefined : undefined;
  const ruleId = resolution.status === 'approved' ? resolution.rule.id : undefined;
  const enabled =
    resolution.status === 'approved' &&
    candidateCfop === recommendedCfop &&
    resolution.rule.candidateCfops.includes(candidateCfop);
  const context: InterstateCfopDiagnosticContext[] = (
    Object.keys(diagnosticFieldLabels) as Array<keyof InterstateOutboundFiscalMatrixFacts>
  )
    .filter((key) => facts[key] !== undefined)
    .map((key) => ({
      label: key === 'recipientIeStatus' ? 'Destinatário' : diagnosticFieldLabels[key] || key,
      value: formatDiagnosticValue(key, facts[key]),
    }));
  context.splice(context.findIndex((item) => item.label === 'Destinatário') + 1, 0, {
    label: 'indIEDest',
    value: recipientIndicatorValue(facts.recipientIeStatus),
  });
  context.push({ label: 'CFOP analisado', value: candidateCfop });
  if (recommendedCfop)
    context.push({ label: 'CFOP recomendado pela matriz', value: recommendedCfop });
  if (recommendedCsosn)
    context.push({ label: 'CSOSN recomendado pela matriz', value: recommendedCsosn });
  context.push(...contextExtras);

  const conflicts: string[] = [];
  const addConflict = (message: string) => {
    if (message && !conflicts.includes(message)) conflicts.push(message);
  };
  const definition = getCfopDefinition(candidateCfop);
  if (!definition) {
    addConflict(`CFOP ${candidateCfop} não existe no catálogo fiscal ativo.`);
  } else {
    if (definition.direction !== 'outbound')
      addConflict(`O CFOP ${candidateCfop} é de entrada; a operação atual é uma saída.`);
    if (facts.destinationScope && definition.scope !== facts.destinationScope.toLowerCase())
      addConflict(
        'O CFOP ' +
          candidateCfop +
          ' é classificado para destino ' +
          definition.scope +
          ', mas o destino atual é ' +
          formatDiagnosticValue('destinationScope', facts.destinationScope) +
          '.'
      );
    if (definition.itemType !== itemType)
      addConflict(
        'O CFOP ' +
          candidateCfop +
          ' é destinado a ' +
          definition.itemType +
          ', mas o item atual é ' +
          itemType +
          '.'
      );
    if (facts.model && !definition.allowedModels.includes(facts.model))
      addConflict(
        'O CFOP ' +
          candidateCfop +
          ' não permite o modelo atual ' +
          formatDiagnosticValue('model', facts.model) +
          '.'
      );
    const operationTypeIsCompatible =
      facts.operationType === 'sale'
        ? definition.operationType.startsWith('sale')
        : !facts.operationType || definition.operationType === facts.operationType;
    if (facts.operationType && !operationTypeIsCompatible)
      addConflict(
        'O CFOP ' +
          candidateCfop +
          ' corresponde a ' +
          formatDiagnosticValue('operationType', definition.operationType) +
          ', mas a operação atual é ' +
          formatDiagnosticValue('operationType', facts.operationType) +
          '.'
      );
    if (
      facts.merchandiseOrigin &&
      definition.merchandiseOrigin !== 'not_applicable' &&
      definition.merchandiseOrigin !== facts.merchandiseOrigin
    )
      addConflict(
        'O CFOP ' +
          candidateCfop +
          ' exige origem ' +
          formatDiagnosticValue('merchandiseOrigin', definition.merchandiseOrigin) +
          ', mas a mercadoria é ' +
          formatDiagnosticValue('merchandiseOrigin', facts.merchandiseOrigin) +
          '.'
      );
    if (definition.stApplicability === 'required' && facts.hasSt !== true)
      addConflict(
        'O CFOP ' +
          candidateCfop +
          ' exige cenário com ST, mas o cadastro informa ST=' +
          formatDiagnosticValue('hasSt', facts.hasSt) +
          '.'
      );
    if (definition.stApplicability === 'not_required' && facts.hasSt === true)
      addConflict(
        `O CFOP ${candidateCfop} é para mercadoria sem ST, mas o cadastro informa ST=sim.`
      );
  }

  const candidateRules = rules.filter(
    (rule) => rule.status === 'APPROVED' && rule.candidateCfops.includes(candidateCfop)
  );
  if (candidateRules.length) {
    const criteriaKeys = new Set(
      candidateRules.flatMap((rule) => Object.keys(rule.criteria)) as Array<
        keyof InterstateOutboundFiscalMatrixFacts
      >
    );
    for (const key of criteriaKeys) {
      const values = candidateRules.map((rule) => rule.criteria[key]);
      if (values.some((value) => value === null)) continue;
      const acceptedValues = values.filter(
        (value): value is NonNullable<typeof value> => value !== undefined && value !== null
      );
      if (!acceptedValues.length) continue;
      const currentValue = facts[key];
      if (acceptedValues.some((value) => value === currentValue)) continue;
      const label = diagnosticCriterionLabels[key] || key;
      const current = formatDiagnosticValue(key, currentValue);
      const expected = [
        ...new Set(acceptedValues.map((value) => formatDiagnosticValue(key, value))),
      ].join(' ou ');
      addConflict(
        'A regra da matriz para CFOP ' +
          candidateCfop +
          ' exige ' +
          label +
          ': ' +
          expected +
          '; o valor atual é ' +
          current +
          '.'
      );
    }
  } else {
    addConflict(`Nenhuma regra APPROVED da matriz inclui o CFOP ${candidateCfop}.`);
  }

  if (resolution.status === 'approved' && !enabled) {
    addConflict(
      'A regra aprovada ' +
        resolution.rule.id +
        ' seleciona CFOP ' +
        resolution.treatment.cfop +
        ' para o cenário atual; ' +
        candidateCfop +
        ' não foi selecionado por essa regra.'
    );
  } else if (resolution.status === 'not_approved') {
    for (const missing of resolution.missingFacts) {
      addConflict(
        (diagnosticFieldLabels[missing] || missing) +
          ' não informado ou inválido; a matriz precisa desse vetor para decidir.'
      );
    }
    const blockedRules = rules.filter((rule) =>
      resolution.matchingBlockedRuleIds.includes(rule.id)
    );
    for (const rule of blockedRules) {
      for (const pendingReason of rule.pendingReview || []) addConflict(pendingReason);
    }
    if (resolution.reason) addConflict(`Resultado da matriz: ${resolution.reason}`);
    const stResult = resolveInterstateStRole({
      stRole: facts.stRole,
      hasSt: facts.hasSt,
      ncm: facts.ncm,
      issuerUf: facts.issuerUf,
      destinationUf: facts.destinationUf,
    });
    if (stResult.status === 'UNCONFIGURED' && stResult.reason)
      addConflict(`Substituição tributária: ${stResult.reason}`);
  } else if (resolution.status === 'ambiguous') {
    addConflict(`A matriz encontrou regras aprovadas ambíguas: ${resolution.ruleIds.join(', ')}.`);
  } else if (resolution.status === 'invalid_approved_rule') {
    addConflict(`A matriz contém regras aprovadas inválidas: ${resolution.ruleIds.join(', ')}.`);
  }

  return {
    enabled,
    matrixStatus: resolution.status,
    ...(recommendedCfop ? { recommendedCfop } : {}),
    ...(recommendedCsosn ? { recommendedCsosn } : {}),
    ...(ruleId ? { ruleId } : {}),
    context,
    conflicts,
  };
}
