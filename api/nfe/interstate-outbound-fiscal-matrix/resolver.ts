import { isBrazilianFiscalUf } from '../../../shared-utils/fiscalCfopModel';
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
// RESOLVEDORES DESACOPLADOS (ST, CSOSN e IE ISENTO)
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
 * Resolvedor Desacoplado de Substituição Tributária (ST) para saída interestadual.
 * Papéis:
 * - NONE: mercadoria não sujeita a ST. Segue fluxo base aprovado.
 * - SUBSTITUTE / SUBSTITUTED: como regras de acordos/protocolos interestaduais
 *   são específicas por NCM e UF, retornam DRAFT (não configurado) até parametrização explícita.
 */
export function resolveInterstateStRole(params: {
  stRole?: InterstateStRole;
  hasSt?: boolean;
  catalogCst?: string;
  itemFiscalCst?: string;
  ncm?: string;
  issuerUf?: string;
  destinationUf?: string;
}): {
  role: InterstateStRole;
  isSt: boolean;
  status: 'RESOLVED' | 'UNCONFIGURED';
  errorCode?: 'INTERSTATE_ST_RULE_NOT_CONFIGURED';
  reason?: string;
} {
  const { stRole, hasSt, catalogCst, itemFiscalCst, ncm, issuerUf, destinationUf } = params;

  let effectiveRole: InterstateStRole = 'NONE';
  if (stRole) {
    effectiveRole = stRole;
  } else if (hasSt === true || catalogCst === '500' || itemFiscalCst === '500') {
    effectiveRole = 'SUBSTITUTED';
  } else if (hasSt === false) {
    effectiveRole = 'NONE';
  }

  if (effectiveRole === 'NONE') {
    return {
      role: 'NONE',
      isSt: false,
      status: 'RESOLVED',
    };
  }

  return {
    role: effectiveRole,
    isSt: true,
    status: 'UNCONFIGURED',
    errorCode: 'INTERSTATE_ST_RULE_NOT_CONFIGURED',
    reason: `Regra de Substituição Tributária interestadual (papel ${effectiveRole}) ainda não parametrizada para NCM ${ncm || 'não informado'} e par ${issuerUf || 'origem'}→${destinationUf || 'destino'}.`,
  };
}

/**
 * Resolvedor Desacoplado de CSOSN para saída interestadual de emitente Simples Nacional (CRT 1).
 * Não amarra fixamente 101/102 na matriz: decide com base na permissão de crédito do adquirente.
 */
export function resolveInterstateCsosn(params: {
  issuerCrt: string;
  stRole: InterstateStRole;
  allowsIcmsCredit?: boolean;
  configuredHmlCsosn?: string;
  catalogCsosn?: string;
  manualOverride?: string;
}): {
  csosn: string;
  xmlGroup: string;
  framework: string;
  allowsCredit: boolean;
  status: 'RESOLVED' | 'UNRESOLVED';
  errorCode?: 'INTERSTATE_CSOSN_NOT_RESOLVED';
  reason?: string;
} {
  const { issuerCrt, stRole, allowsIcmsCredit, configuredHmlCsosn, catalogCsosn, manualOverride } =
    params;

  if (issuerCrt !== '1') {
    return {
      csosn: '900',
      xmlGroup: 'ICMSSN900',
      framework: 'Regime Normal ou outros regimes',
      allowsCredit: false,
      status: 'UNRESOLVED',
      errorCode: 'INTERSTATE_CSOSN_NOT_RESOLVED',
      reason: 'Apenas emitentes Simples Nacional (CRT 1) são cobertos por este resolvedor.',
    };
  }

  // Se houver ST retido anteriormente
  if (stRole === 'SUBSTITUTED') {
    return {
      csosn: '500',
      xmlGroup: 'ICMSSN500',
      framework: 'Simples Nacional - ICMS cobrado anteriormente por ST (Substituído)',
      allowsCredit: false,
      status: 'RESOLVED',
    };
  }

  // Se a operação permitir aproveitamento de crédito pelo destinatário contribuinte
  if (allowsIcmsCredit === true) {
    return {
      csosn: '101',
      xmlGroup: 'ICMSSN101',
      framework: 'Simples Nacional - Com permissão de crédito',
      allowsCredit: true,
      status: 'RESOLVED',
    };
  }

  // Sem permissão de crédito: usa CSOSN configurado no sistema (padrão 102 ou 103 para faixa de isenção)
  const candidate = manualOverride || configuredHmlCsosn || catalogCsosn || '102';
  const effectiveCsosn = ['102', '103', '300', '400'].includes(candidate) ? candidate : '102';
  return {
    csosn: effectiveCsosn,
    xmlGroup: 'ICMSSN102',
    framework:
      effectiveCsosn === '103'
        ? 'Simples Nacional - Isenção de ICMS por faixa de receita bruta'
        : 'Simples Nacional - Sem permissão de crédito',
    allowsCredit: false,
    status: 'RESOLVED',
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

/** Fast route-level gate so an absent route matrix blocks even before item detail parsing. */
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
      'Fatos fiscais obrigatórios ausentes ou inválidos.',
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
  const matchingApproved = rules.filter(
    (rule) =>
      rule.status === 'APPROVED' &&
      (!Number.isFinite(Date.parse(rule.effectiveFrom || '')) ||
        Date.parse(rule.effectiveFrom || '') <= effectiveAt) &&
      (!rule.effectiveUntil ||
        !Number.isFinite(Date.parse(rule.effectiveUntil)) ||
        Date.parse(rule.effectiveUntil) >= effectiveAt) &&
      matchesCompleteCriteria(facts as InterstateOutboundFiscalMatrixFacts, rule.criteria)
  );

  if (matchingApproved.length) {
    const invalid = matchingApproved.filter((rule) => !approvalIsComplete(rule));
    if (invalid.length) {
      return {
        status: 'invalid_approved_rule',
        code: 'HML_INTERSTATE_MATRIX_INVALID',
        ruleIds: invalid.map((rule) => rule.id),
      };
    }

    const specificity = (rule: InterstateOutboundFiscalMatrixRule): number[] => [
      ...(
        [
          'productId',
          'ncm',
          'cest',
          'destinationUf',
          'hasSt',
          'recipientIeStatus',
          'recipientPersonType',
          'finalConsumer',
          'productOrigin',
          'merchandiseOrigin',
        ] as const
      ).map((key) => (!isMissing(rule.criteria[key], key) ? 1 : 0)),
      rule.priority,
    ];

    const compare = (a: number[], b: number[]) => {
      for (let index = 0; index < a.length; index++) {
        if (a[index] !== b[index]) return b[index] - a[index];
      }
      return 0;
    };

    const ranked = matchingApproved
      .map((rule) => ({
        rule,
        specificity: specificity(rule),
      }))
      .sort((a, b) => compare(a.specificity, b.specificity));

    const [best, second] = ranked;
    if (second && compare(best.specificity, second.specificity) === 0) {
      return {
        status: 'ambiguous',
        code: 'HML_INTERSTATE_MATRIX_AMBIGUOUS',
        ruleIds: ranked
          .filter((item) => compare(item.specificity, best.specificity) === 0)
          .map((item) => item.rule.id),
      };
    }

    // Resolver CSOSN determinístico e compor tratamento final
    const csosnResult = resolveInterstateCsosn({
      issuerCrt: String(facts.issuerRegime || '1'),
      stRole: stResult.role,
      allowsIcmsCredit: facts.allowsIcmsCredit,
      catalogCsosn: undefined,
    });

    const treatment: InterstateTaxTreatment = {
      ...best.rule.treatment,
      csosn: csosnResult.csosn,
      icms: {
        ...best.rule.treatment.icms,
        xmlGroup: csosnResult.xmlGroup,
        framework: csosnResult.framework,
      },
    };

    return {
      status: 'approved',
      rule: best.rule,
      ruleId: best.rule.id,
      reason: `Regra aprovada vigente (${best.rule.id}) aplicada sem conflito.`,
      sources: [...best.rule.sourceReferences],
      normativeSources: [...best.rule.normativeSources],
      treatment,
    };
  }

  return notApproved('Nenhuma regra APPROVED completa e vigente corresponde aos fatos.');
}
