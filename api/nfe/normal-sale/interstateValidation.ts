import { parseFiscalItemSelections } from '../../../shared-utils/fiscalItemSelections';
import type { FiscalCfopOrderScope } from '../../../shared-utils/fiscalCfopModel';
import type { FiscalModelDecision } from '../../../shared-utils/fiscalDocumentModel';
import { hasFiscalItemSnapshot } from '../../../shared-utils/orderItemFiscalSnapshot';
import type { FiscalSnapshotCandidate } from '../fiscalSnapshot';
import {
  hasApprovedInterstateOutboundRoute,
  type InterstateOutboundFiscalMatrixFacts,
  type InterstateRecipientIeStatus,
  resolveInterstateOutboundFiscalMatrix,
} from '../interstateOutboundFiscalMatrix';
import { obj } from './values';

type ReadyFiscalModelDecision = Extract<FiscalModelDecision, { status: 'ready' }>;

export function resolveInterstateFinalConsumer(
  operationScope: FiscalCfopOrderScope,
  contextData: Record<string, any>,
  requestFinalConsumer?: boolean
): boolean | undefined {
  if (operationScope.scope !== 'interstate') {
    return requestFinalConsumer;
  }

  const acquisitionPurpose = contextData.acquisitionPurpose;
  if (
    acquisitionPurpose !== 'resale' &&
    acquisitionPurpose !== 'use_consumption' &&
    acquisitionPurpose !== 'fixed_asset'
  ) {
    throw new Error(
      'ACQUISITION_PURPOSE_REQUIRED: registre no pedido se a compra é para revenda, uso/consumo ou ativo imobilizado.'
    );
  }

  const finalConsumer = acquisitionPurpose !== 'resale';
  if (requestFinalConsumer !== finalConsumer) {
    throw new Error(
      'ACQUISITION_PURPOSE_MISMATCH: o indFinal enviado não corresponde à finalidade persistida no pedido.'
    );
  }

  return finalConsumer;
}

export function validateInterstateNormalSaleMatrix(params: {
  facts: FiscalSnapshotCandidate;
  operationScope: FiscalCfopOrderScope;
  modelDecision: ReadyFiscalModelDecision;
  initialComposition: { products: Array<{ item: Record<string, any> }> };
  customer: Record<string, any>;
  ieIndicator: string;
  finalConsumer?: boolean;
  ruleSetVersion: string;
}): void {
  const {
    facts,
    operationScope,
    modelDecision,
    initialComposition,
    customer,
    ieIndicator,
    finalConsumer,
    ruleSetVersion,
  } = params;

  if (operationScope.scope !== 'interstate') {
    return;
  }

  if (modelDecision.model !== '55') {
    throw new Error('NFC-e modelo 65 não pode ser usada em operação interestadual.');
  }

  const routeFacts = {
    environment: facts.emissionRequest.environment,
    model: modelDecision.model,
    issuerRegime: String(facts.issuerProfile.companyCRT || ''),
    issuerUf: operationScope.issuerUf || '',
    destinationUf: operationScope.operationUf || '',
    destinationScope: 'INTERSTATE' as const,
    operationType: 'sale' as const,
    purpose: '1' as const,
    effectiveAt: facts.capturedAt,
  };

  if (!hasApprovedInterstateOutboundRoute(routeFacts)) {
    throw new Error(
      `Operação interestadual não está coberta pela matriz ${ruleSetVersion} (HML_INTERSTATE_MATRIX_NOT_APPROVED). A Matriz de Decisão Fiscal Interestadual de Saída não contém regra APPROVED utilizável; CFOP candidato não define CSOSN, ICMS, ST, DIFAL ou FCP.`
    );
  }

  const selections = parseFiscalItemSelections(facts.emissionRequest.itemFiscalSelections);
  const inputs = obj(facts.fiscalInputs);
  const productCatalog = obj(inputs.products);
  const recipientIeStatus: InterstateRecipientIeStatus =
    ieIndicator === '1' ? 'taxpayer' : ieIndicator === '2' ? 'exempt' : 'non_taxpayer';

  const explicitBoolean = (...values: unknown[]): boolean | undefined =>
    values.find((value): value is boolean => typeof value === 'boolean');

  const merchandiseOrigin = (item: Record<string, any>, fiscal: Record<string, any>) => {
    const source = item.merchandiseOrigin ?? fiscal.merchandiseOrigin;
    if (source === 'third_party' || source === 'own_production') return source;
    const isOwnProduction = explicitBoolean(item.isOwnProduction, fiscal.isOwnProduction);
    return isOwnProduction === undefined
      ? 'third_party'
      : isOwnProduction
        ? 'own_production'
        : 'third_party';
  };

  const matrixResults = initialComposition.products.map(({ item }, index) => {
    const selected = selections[String(index + 1)];
    const itemRecord = item as Record<string, any>;
    const itemFiscal =
      itemRecord.fiscal && typeof itemRecord.fiscal === 'object'
        ? (itemRecord.fiscal as Record<string, any>)
        : {};
    const productFiscalRaw = hasFiscalItemSnapshot(itemRecord)
      ? itemFiscal
      : itemRecord.productId
        ? productCatalog[itemRecord.productId]
        : undefined;
    const productFiscal =
      productFiscalRaw && typeof productFiscalRaw === 'object'
        ? (productFiscalRaw as Record<string, any>)
        : {};
    const matrixFacts: Partial<InterstateOutboundFiscalMatrixFacts> = {
      environment: facts.emissionRequest.environment,
      model: modelDecision.model,
      issuerRegime: String(facts.issuerProfile.companyCRT || ''),
      issuerUf: operationScope.issuerUf || '',
      destinationUf: operationScope.operationUf || '',
      destinationScope: 'INTERSTATE',
      operationType: 'sale',
      purpose: '1',
      recipientPersonType:
        customer.personType === 'PF' || customer.personType === 'PJ'
          ? customer.personType
          : undefined,
      recipientIeStatus,
      finalConsumer,
      merchandiseOrigin: merchandiseOrigin(itemRecord, productFiscal),
      productOrigin: selected?.origem,
      ncm: selected?.ncm,
      cest: selected?.cest,
      hasSt: explicitBoolean(
        itemFiscal.hasSt,
        itemFiscal.isSt,
        productFiscal.hasSt,
        productFiscal.isSt
      ),
      productId: typeof itemRecord.productId === 'string' ? itemRecord.productId : undefined,
      effectiveAt: facts.capturedAt,
    };
    const matrixResult = resolveInterstateOutboundFiscalMatrix(matrixFacts);
    if (matrixResult.status === 'approved') {
      const approvedTreatment = matrixResult.treatment;
      if (selected?.cfop === '6933' || selected?.cfop === '5933') {
        throw new Error(
          `CFOP ${selected.cfop} pertence a prestação de serviço (ISSQN) e não pode ser aplicado a venda de mercadoria.`
        );
      }
      if (selected?.cfop && selected.cfop !== approvedTreatment.cfop) {
        throw new Error(
          `CFOP escolhido diverge do tratamento aprovado pela matriz (esperado ${approvedTreatment.cfop} para operação interestadual); nenhuma escolha foi substituída.`
        );
      }
      if (selected?.csosn !== approvedTreatment.csosn) {
        throw new Error(
          `CSOSN ${selected?.csosn || 'não informado'} diverge do tratamento aprovado pela matriz (esperado ${approvedTreatment.csosn}); nenhuma escolha foi substituída.`
        );
      }
    }
    return matrixResult;
  });

  const nonApproved = matrixResults.find((result) => result.status !== 'approved');
  if (!matrixResults.length || nonApproved) {
    const code =
      nonApproved && 'code' in nonApproved
        ? nonApproved.code
        : 'HML_INTERSTATE_MATRIX_NOT_APPROVED';
    const reason = nonApproved && 'reason' in nonApproved ? nonApproved.reason : '';
    throw new Error(
      `Operação interestadual não está coberta pela matriz ${ruleSetVersion} (${code}). ${reason || 'A Matriz de Decisão Fiscal Interestadual de Saída não contém regra APPROVED utilizável; CFOP candidato não define CSOSN, ICMS, ST, DIFAL ou FCP.'}`
    );
  }
}
