import { type FiscalCfopItemType, getCfopDefinition } from '../../../shared-utils/fiscalCfopModel';
import {
  diagnosticCriterionLabels,
  diagnosticFieldLabels,
  formatDiagnosticValue,
  recipientIndicatorValue,
} from './diagnosticFormatting';
import { INTERSTATE_OUTBOUND_FISCAL_MATRIX_RULES } from './rules';
import type { InterstateOutboundFiscalMatrixResolution } from './resolver';
import type {
  InterstateOutboundFiscalMatrixFacts,
  InterstateOutboundFiscalMatrixRule,
} from './types';

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

export type InterstateCfopCandidateDiagnosticParams = {
  facts: Partial<InterstateOutboundFiscalMatrixFacts>;
  candidateCfop: string;
  itemType?: FiscalCfopItemType;
  contextExtras?: InterstateCfopDiagnosticContext[];
  rules?: readonly InterstateOutboundFiscalMatrixRule[];
  resolution?: InterstateOutboundFiscalMatrixResolution;
};

type ResolveInterstateStRole = (
  params: Pick<
    InterstateOutboundFiscalMatrixFacts,
    'stRole' | 'hasSt' | 'ncm' | 'issuerUf' | 'destinationUf'
  >
) => { status: string; reason?: string };

/**
 * Gives each dropdown option a diagnostic from the exact same approved rules and
 * resolver used for backend validation. Candidate-rule criteria supply all vector
 * conflicts; catalog metadata supplies scope/type/model/origin/ST conflicts.
 */
export function buildInterstateOutboundCfopCandidateDiagnostic(
  params: InterstateCfopCandidateDiagnosticParams & {
    resolution: InterstateOutboundFiscalMatrixResolution;
    resolveStRole: ResolveInterstateStRole;
  }
): InterstateCfopCandidateDiagnostic {
  const {
    facts,
    candidateCfop,
    itemType = 'product',
    contextExtras = [],
    rules = INTERSTATE_OUTBOUND_FISCAL_MATRIX_RULES,
    resolution,
    resolveStRole,
  } = params;
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
    const stResult = resolveStRole({
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
