/** Persisted business decision. Environment release belongs to the emission policy. */
export type FiscalModel = '55' | '65';

export type SimplesNormalSaleContribution = {
  scope?: {
    /** Legacy snapshots only; a new decision uses the explicit models list. */
    model?: string;
    models?: string[];
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
  models: readonly FiscalModel[];
  decisionId: string;
  pis: { cst: '99'; base: 0; rate: 0; value: 0 };
  cofins: { cst: '99'; base: 0; rate: 0; value: 0 };
  confirmedAt: string;
  confirmedBy: string;
  sourceUrl?: string;
};

export type ResolvedSimplesNormalSaleContribution = ValidSimplesNormalSaleContribution & {
  model: FiscalModel;
};

const SUPPORTED_MODELS = ['55', '65'] as const satisfies readonly FiscalModel[];
const SHARED_DECISION_ID = 'fiscal_decision_simples_normal_sale_v1';

/**
 * The CST 99/zero tax values were confirmed on 2026-09-30. On 2026-10-07 the
 * model scope was reviewed against official NF-e/NFC-e documentation: model 65
 * makes the PIS/COFINS XML groups optional but does not create a different
 * contribution treatment for this CRT 1 normal-sale scenario.
 * This does not authorize other operations, CRTs, services, or returns.
 */
export function parseSimplesNormalSaleContribution(
  value: SimplesNormalSaleContribution
): ValidSimplesNormalSaleContribution {
  const scope = value?.scope;
  const declaredModels = scope?.models;
  const legacyModel = scope?.model;
  const hasSharedScope =
    legacyModel === undefined &&
    Array.isArray(declaredModels) &&
    declaredModels.length === SUPPORTED_MODELS.length &&
    SUPPORTED_MODELS.every((model) => declaredModels.includes(model));
  const hasLegacyScope =
    declaredModels === undefined && (legacyModel === '55' || legacyModel === '65');

  if (
    scope?.operation !== 'normal_sale' ||
    scope.issuerCrt !== '1' ||
    (!hasSharedScope && !hasLegacyScope) ||
    typeof value.confirmedBy !== 'string' ||
    !value.confirmedBy.trim() ||
    typeof value.confirmedAt !== 'string' ||
    !Number.isFinite(Date.parse(value.confirmedAt)) ||
    value.pis?.cst !== '99' ||
    value.cofins?.cst !== '99' ||
    [value.pis, value.cofins].some((tax) => tax?.base !== 0 || tax.rate !== 0 || tax.value !== 0)
  )
    throw new Error('Decisão persistida de PIS/COFINS fora do cenário de venda normal CRT 1.');

  const models: readonly FiscalModel[] = hasSharedScope
    ? SUPPORTED_MODELS
    : [legacyModel as FiscalModel];

  return {
    models,
    decisionId: hasSharedScope
      ? SHARED_DECISION_ID
      : legacyModel === '55'
        ? 'fiscal_decision_simples_nfe55_normal_sale_v1'
        : 'fiscal_decision_simples_nfce65_normal_sale_v1',
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
  model: FiscalModel
): void {
  if (!decision.models.includes(model))
    throw new Error(
      `A decisão persistida de PIS/COFINS não cobre o modelo ${model} (CONTRIBUTION_MODEL_SCOPE_REQUIRED).`
    );
}

export function normalSaleContributionSettingsId(): string {
  return SHARED_DECISION_ID;
}

/** Old immutable snapshots can use their original field only within its saved model scope. */
export function resolveNormalSaleContribution(
  inputs: Record<string, any>,
  model: FiscalModel
): ResolvedSimplesNormalSaleContribution {
  const decision = inputs.contributionDecision ?? inputs.contributionDecisions?.[model];
  if (!decision)
    throw new Error(
      `Decisão de PIS/COFINS do modelo ${model} indisponível (CONTRIBUTION_MODEL_SCOPE_REQUIRED).`
    );
  const parsed = parseSimplesNormalSaleContribution(decision);
  assertContributionModelScope(parsed, model);
  return { ...parsed, model };
}
