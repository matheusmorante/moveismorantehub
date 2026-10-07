/** Persisted business decision. Environment release belongs to the emission policy. */
export type SimplesNormalSaleContribution = {
  scope?: {
    model?: string;
    operation?: string;
    issuerCrt?: string;
  };
  pis?: { cst?: string; base?: number; rate?: number; value?: number };
  cofins?: { cst?: string; base?: number; rate?: number; value?: number };
  confirmedAt?: string;
  confirmedBy?: string;
  sourceUrl?: string;
  /** Legacy deployment metadata; never determines tax values or model scope. */
  productionApproved?: boolean;
};

export type ValidSimplesNormalSaleContribution = {
  model: '55' | '65';
  decisionId: string;
  pis: { cst: '99'; base: 0; rate: 0; value: 0 };
  cofins: { cst: '99'; base: 0; rate: 0; value: 0 };
  confirmedAt: string;
  confirmedBy: string;
  sourceUrl?: string;
};

/**
 * Supported CRT 1 normal-sale treatment, recorded by the operator on 2026-09-30.
 * Portal Nacional NF-e, FAQ Simples Nacional, and Orientação de Preenchimento
 * v2.02 support CST 99 with zero PIS/COFINS. This is a business rule,
 * not an HML accommodation. Other contribution treatments need their own rule.
 * CFOP, CSOSN, NCM and product origin are deliberately absent from this decision.
 */
export function parseSimplesNormalSaleContribution(
  value: SimplesNormalSaleContribution
): ValidSimplesNormalSaleContribution {
  if (
    value?.scope?.operation !== 'normal_sale' ||
    value.scope.issuerCrt !== '1' ||
    (value.scope.model !== '55' && value.scope.model !== '65') ||
    'models' in value.scope ||
    typeof value.confirmedBy !== 'string' ||
    !value.confirmedBy.trim() ||
    typeof value.confirmedAt !== 'string' ||
    !Number.isFinite(Date.parse(value.confirmedAt)) ||
    value.pis?.cst !== '99' ||
    value.cofins?.cst !== '99' ||
    [value.pis, value.cofins].some((tax) => tax?.base !== 0 || tax.rate !== 0 || tax.value !== 0)
  )
    throw new Error('Decisão persistida de PIS/COFINS fora do cenário de venda normal CRT 1.');

  return {
    model: value.scope.model,
    decisionId: normalSaleContributionSettingsId(value.scope.model),
    pis: { cst: '99', base: 0, rate: 0, value: 0 },
    cofins: { cst: '99', base: 0, rate: 0, value: 0 },
    confirmedAt: value.confirmedAt,
    confirmedBy: value.confirmedBy,
    ...(typeof value.sourceUrl === 'string' && value.sourceUrl
      ? { sourceUrl: value.sourceUrl }
      : {}),
  };
}

export function assertContributionModelScope(
  decision: ValidSimplesNormalSaleContribution,
  model: '55' | '65'
): void {
  if (decision.model !== model)
    throw new Error(
      `A decisão persistida de PIS/COFINS não cobre o modelo ${model} (CONTRIBUTION_MODEL_SCOPE_REQUIRED).`
    );
}

export function normalSaleContributionSettingsId(model: '55' | '65'): string {
  return model === '55'
    ? 'fiscal_decision_simples_nfe55_normal_sale_v1'
    : 'fiscal_decision_simples_nfce65_normal_sale_v1';
}

/** Old immutable snapshots can use their original field only for its declared model. */
export function resolveNormalSaleContribution(
  inputs: Record<string, any>,
  model: '55' | '65'
): ValidSimplesNormalSaleContribution {
  const decision = inputs.contributionDecisions?.[model] ?? inputs.contributionDecision;
  if (!decision)
    throw new Error(
      `Decisão de PIS/COFINS do modelo ${model} indisponível (CONTRIBUTION_MODEL_SCOPE_REQUIRED).`
    );
  const parsed = parseSimplesNormalSaleContribution(decision);
  assertContributionModelScope(parsed, model);
  return parsed;
}
