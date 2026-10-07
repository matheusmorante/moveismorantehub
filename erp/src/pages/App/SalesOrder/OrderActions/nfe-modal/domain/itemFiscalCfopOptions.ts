import {
  getCfopDefinition,
  listActiveCfopOptions,
} from '../../../../../../../../shared-utils/fiscalCfopModel';
import {
  diagnoseInterstateOutboundCfopCandidate,
  resolveInterstateOutboundFiscalMatrix,
  resolveInterstateStRole,
  type InterstateCfopCandidateDiagnostic,
  type InterstateCfopDiagnosticContext,
} from '../../../../../../../../api/nfe/interstate-outbound-fiscal-matrix/resolver';
import type {
  InterstateOutboundFiscalMatrixFacts,
  InterstateRecipientIeStatus,
} from '../../../../../../../../api/nfe/interstate-outbound-fiscal-matrix/types';
import type { RecipientIeIndicator } from '../../../../../../../../shared-utils/recipientIeIndicator';

export interface NfeItemCfopDiagnostic {
  source: 'matrix' | 'rule';
  context: Array<{ label: string; value: string }>;
  conflicts: string[];
  recommendedCfop?: string;
  recommendedCsosn?: string;
  ruleId?: string;
}

export interface NfeItemCfopOption {
  value: string;
  label: string;
  disabled?: boolean;
  disabledReason?: string;
  diagnostic?: NfeItemCfopDiagnostic;
}

type OperationScope = {
  scope: string | null;
  destination?: string | null;
  issuerUf?: string | null;
  operationUf?: string | null;
  locationSource?: string | null;
  reason?: string;
};

type ResolveOptionsParams = {
  item: {
    itemType?: 'product' | 'service';
    productId?: string;
    merchandiseOrigin?: 'third_party' | 'own_production' | 'not_applicable';
    isOwnProduction?: boolean;
    fiscal: {
      ncm?: string;
      cest?: string;
      cfop?: string;
      cst?: string;
      origem?: string;
      merchandiseOrigin?: 'third_party' | 'own_production' | 'not_applicable';
      isOwnProduction?: boolean;
      hasSt?: boolean;
      isSt?: boolean;
    };
  };
  operationScope: OperationScope;
  environment: 1 | 2;
  model: '55' | '65';
  issuerRegime: string;
  recipientIeIndicator: RecipientIeIndicator;
  recipientIe?: string;
  finalConsumer: boolean;
  recipientPersonType?: 'PF' | 'PJ';
  presence?: string;
  effectiveAt: string;
};

const recipientStatusForMatrix: Record<RecipientIeIndicator, InterstateRecipientIeStatus> = {
  '1': 'taxpayer',
  '2': 'exempt',
  '9': 'non_taxpayer',
};

const formatUf = (value: string | null | undefined) =>
  value?.trim().toUpperCase() || 'não informada';

const formatRecipientIndicator = (indicator: RecipientIeIndicator) => {
  if (indicator === '1') return 'contribuinte do ICMS';
  if (indicator === '2') return 'contribuinte isento';
  return 'não contribuinte do ICMS';
};

const formatMerchandiseOrigin = (value: string) => {
  if (value === 'own_production') return 'produção própria';
  if (value === 'third_party') return 'adquirida de terceiros';
  return 'não aplicável';
};

const formatBoolean = (value: boolean | undefined) =>
  value === undefined ? 'não informado' : value ? 'sim' : 'não';

const toDiagnostic = (diagnostic: InterstateCfopCandidateDiagnostic): NfeItemCfopDiagnostic => ({
  source: 'matrix',
  context: diagnostic.context,
  conflicts: diagnostic.conflicts,
  ...(diagnostic.recommendedCfop ? { recommendedCfop: diagnostic.recommendedCfop } : {}),
  ...(diagnostic.recommendedCsosn ? { recommendedCsosn: diagnostic.recommendedCsosn } : {}),
  ...(diagnostic.ruleId ? { ruleId: diagnostic.ruleId } : {}),
});

export function resolveNfeItemCfopOptions(params: ResolveOptionsParams) {
  const {
    item,
    operationScope,
    environment,
    model,
    issuerRegime,
    recipientIeIndicator,
    recipientIe,
    finalConsumer,
    recipientPersonType,
    presence,
    effectiveAt,
  } = params;
  const itemType = item.itemType === 'service' ? 'service' : 'product';
  const fiscal = item.fiscal;
  const merchandiseSource = item.merchandiseOrigin ?? fiscal.merchandiseOrigin;
  const ownProduction = item.isOwnProduction ?? fiscal.isOwnProduction;
  const merchandiseOrigin =
    merchandiseSource === 'own_production' || ownProduction === true
      ? 'own_production'
      : merchandiseSource === 'third_party' || ownProduction === false
        ? 'third_party'
        : 'third_party';
  const rawHasSt = fiscal.hasSt ?? fiscal.isSt;
  const stDecision = resolveInterstateStRole({
    hasSt: rawHasSt,
    ncm: fiscal.ncm,
    issuerUf: operationScope.issuerUf || undefined,
    destinationUf: operationScope.operationUf || undefined,
  });
  const hasSt = rawHasSt;
  const catalogScope =
    operationScope.scope === 'internal' || operationScope.scope === 'interstate'
      ? operationScope.scope
      : undefined;
  const candidates = listActiveCfopOptions({
    direction: 'outbound',
    ...(catalogScope ? { scope: catalogScope as 'internal' | 'interstate' } : {}),
    itemType,
  });
  const commonContext: InterstateCfopDiagnosticContext[] = [
    { label: 'Ambiente fiscal', value: environment === 1 ? 'Produção (1)' : 'Homologação (2)' },
    { label: 'Modelo fiscal', value: `NF-e ${model}` },
    { label: 'Operação', value: 'Venda' },
    { label: 'Finalidade', value: 'Normal (1)' },
    {
      label: 'Destino',
      value:
        operationScope.scope === 'interstate'
          ? 'interestadual'
          : operationScope.scope === 'internal'
            ? 'interno'
            : operationScope.scope,
    },
    { label: 'UF de origem', value: formatUf(operationScope.issuerUf) },
    { label: 'UF de destino', value: formatUf(operationScope.operationUf) },
    {
      label: 'Destinatário',
      value: formatRecipientIndicator(recipientIeIndicator),
    },
    { label: 'indIEDest', value: recipientIeIndicator },
    ...(recipientIe?.trim()
      ? [{ label: 'IE informada', value: recipientIe.trim() }]
      : []),
    { label: 'Consumidor final / indFinal', value: formatBoolean(finalConsumer) },
    ...(presence ? [{ label: 'Presença / indPres', value: presence }] : []),
    {
      label: 'Produção própria ou terceiros',
      value: merchandiseOrigin ? formatMerchandiseOrigin(merchandiseOrigin) : 'não informado',
    },
    { label: 'Origem no ICMS / origem NF-e', value: fiscal.origem || 'não informada' },
    { label: 'CRT do emitente', value: issuerRegime || 'não informado' },
    { label: 'CSOSN/CST atual', value: fiscal.cst || 'não informado' },
    { label: 'NCM', value: fiscal.ncm || 'não informado' },
    { label: 'CEST', value: fiscal.cest || 'não informado' },
    { label: 'Mercadoria sujeita a ST', value: formatBoolean(hasSt) },
    { label: 'Papel na substituição tributária', value: stDecision.role },
    { label: 'Produto', value: item.productId || 'não vinculado ao cadastro' },
  ];

  if (operationScope.scope === 'interstate' && itemType === 'product') {
    const facts: Partial<InterstateOutboundFiscalMatrixFacts> = {
      environment,
      model,
      issuerRegime,
      issuerUf: formatUf(operationScope.issuerUf) === 'não informada' ? '' : formatUf(operationScope.issuerUf),
      destinationUf:
        formatUf(operationScope.operationUf) === 'não informada' ? '' : formatUf(operationScope.operationUf),
      destinationScope: 'INTERSTATE',
      operationType: 'sale',
      purpose: '1',
      ...(recipientPersonType ? { recipientPersonType } : {}),
      recipientIeStatus: recipientStatusForMatrix[recipientIeIndicator],
      finalConsumer,
      ...(merchandiseOrigin ? { merchandiseOrigin } : {}),
      productOrigin: fiscal.origem || '',
      ncm: (fiscal.ncm || '').replace(/\D/g, ''),
      cest: fiscal.cest ? fiscal.cest.replace(/[^0-9]/g, '') : '',
      ...(hasSt !== undefined ? { hasSt } : {}),
      ...(item.productId ? { productId: item.productId } : {}),
      effectiveAt,
    };
    const resolution = resolveInterstateOutboundFiscalMatrix(facts);
    const contextExtras = commonContext.filter(
      ({ label }) =>
        label === 'IE informada' ||
        label === 'Presença / indPres' ||
        label === 'Produção própria ou terceiros' ||
        label === 'CSOSN/CST atual' ||
        label === 'Mercadoria sujeita a ST' ||
        label === 'Papel na substituição tributária'
    );
    const options = candidates.map((candidate) => {
      const diagnostic = toDiagnostic(
        diagnoseInterstateOutboundCfopCandidate({
          facts,
          candidateCfop: candidate.value,
          itemType: 'product',
          contextExtras,
          resolution,
        })
      );
      return {
        ...candidate,
        disabled: diagnostic.conflicts.length > 0,
        disabledReason: diagnostic.conflicts.join(' '),
        diagnostic,
      };
    });
    const recommendedCfop =
      resolution.status === 'approved' ? resolution.treatment.cfop || '' : '';
    const reason =
      resolution.status === 'approved'
        ? ''
        : resolution.status === 'not_approved'
          ? resolution.reason
          : resolution.status === 'ambiguous'
            ? `A matriz encontrou regras aprovadas ambíguas: ${resolution.ruleIds.join(', ')}.`
            : `A matriz contém regras aprovadas inválidas: ${resolution.ruleIds.join(', ')}.`;
    return {
      options,
      defaultCfop: recommendedCfop,
      reason,
    };
  }

  const internalRuleAllowed =
    operationScope.scope === 'internal' &&
    itemType === 'product' &&
    issuerRegime === '1' &&
    merchandiseOrigin === 'third_party' &&
    hasSt !== true;
  const expectedCfop = internalRuleAllowed ? '5102' : '';
  const internalReason = internalRuleAllowed
    ? ''
    : `A regra de venda normal interna não aprova CFOP para CRT=${issuerRegime || 'não informado'}, origem=${merchandiseOrigin ? formatMerchandiseOrigin(merchandiseOrigin) : 'não informada'} e ST=${formatBoolean(hasSt)}.`;
  const options = candidates.map((candidate) => {
    const definition = getCfopDefinition(candidate.value);
    const conflicts: string[] = [];
    if (definition && definition.direction !== 'outbound') {
      conflicts.push('O CFOP é de entrada, mas a operação atual é uma saída.');
    }
    if (definition && definition.scope !== operationScope.scope) {
      conflicts.push(`O CFOP é de destino ${definition.scope}, mas o destino atual é ${operationScope.scope}.`);
    }
    if (definition && !definition.allowedModels.includes(model)) {
      conflicts.push(`O CFOP não permite o modelo fiscal NF-e ${model}.`);
    }
    if (definition && definition.operationType !== 'sale') {
      conflicts.push(`O CFOP é de ${definition.operationType}, mas a operação atual é venda.`);
    }
    if (
      definition &&
      definition.merchandiseOrigin !== 'not_applicable' &&
      merchandiseOrigin &&
      definition.merchandiseOrigin !== merchandiseOrigin
    ) {
      conflicts.push(
        `O CFOP exige origem ${formatMerchandiseOrigin(definition.merchandiseOrigin)}, mas a mercadoria é ${formatMerchandiseOrigin(merchandiseOrigin)}.`
      );
    }
    if (definition?.stApplicability === 'required' && !hasSt) {
      conflicts.push('O CFOP exige mercadoria sujeita a ST, mas o cenário atual não informa ST.');
    }
    if (definition?.stApplicability === 'not_required' && hasSt) {
      conflicts.push('O CFOP é para mercadoria sem ST, mas o cenário atual informa ST.');
    }
    if (!internalRuleAllowed) conflicts.push(internalReason);
    else if (candidate.value !== expectedCfop) {
      conflicts.push(`A regra aprovada para esta combinação seleciona CFOP ${expectedCfop}.`);
    }
    const diagnostic: NfeItemCfopDiagnostic = {
      source: 'rule',
      context: [
        ...commonContext,
        { label: 'CFOP analisado', value: candidate.value },
        ...(expectedCfop ? [{ label: 'CFOP recomendado pela matriz', value: expectedCfop }] : []),
      ],
      conflicts,
      ...(expectedCfop ? { recommendedCfop: expectedCfop } : {}),
    };
    return {
      ...candidate,
      disabled: conflicts.length > 0,
      disabledReason: conflicts.join(' '),
      diagnostic,
    };
  });

  return {
    options,
    defaultCfop: expectedCfop,
    reason: internalReason || operationScope.reason || '',
  };
}
