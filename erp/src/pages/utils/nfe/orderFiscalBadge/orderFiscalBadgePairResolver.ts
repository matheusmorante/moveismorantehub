import type {
  FiscalDocumentStatusRow,
  FiscalOperationDraftStatusRow,
  FiscalOrderEditReplacementRow,
  OrderFiscalBadgeStatuses,
  OutboundFiscalBadgeItem,
} from './orderFiscalBadgeRules.types';
import { isFiscalRegularizationBlockingStatus } from './orderFiscalBadgeRules.types';
import {
  isAuthorizedFiscalDocument,
  isOutboundFiscalDocument,
} from './fiscalDocumentPredicates';
import {
  resolveOrderFiscalDevolucaoBadge,
  resolveOrderFiscalEstornoBadge,
} from './operationBadgeRules';
import {
  buildFiscalSituationContext,
  getEstornoConfirmedDocumentIds,
  resolveEnvironmentBadge,
  resolveOrderFiscalBadgeStatus,
} from './orderFiscalSituationClassifier';
import {
  findDocumentIdByStatus,
  resolveCancellationDocuments,
  resolveOrderCancellationState,
} from './orderFiscalCancellationRules';

const isOutbound = isOutboundFiscalDocument;
const isAuthorized = isAuthorizedFiscalDocument;

export const resolveOrderFiscalBadgePair = (
  documents: readonly FiscalDocumentStatusRow[],
  operationDrafts: readonly FiscalOperationDraftStatusRow[] = [],
  orderCancelled = false,
  now = Date.now(),
  orderEditReplacements: readonly FiscalOrderEditReplacementRow[] = []
): OrderFiscalBadgeStatuses => {
  // Estornos and devoluções have their own badges and cannot replace NF/NFH status.
  const outboundDocs = documents.filter(isOutbound);
  const prodDocs = outboundDocs.filter((doc) => doc.ambiente !== 2);
  const hmlDocs = outboundDocs.filter((doc) => doc.ambiente === 2);

  // Compute which original document IDs have a confirmed estorno (authorized draft).
  const estornoConfirmedIds = getEstornoConfirmedDocumentIds(documents, operationDrafts);
  const situationContext = buildFiscalSituationContext(
    documents,
    operationDrafts,
    orderCancelled,
    orderEditReplacements
  );

  const productionResolution = resolveEnvironmentBadge(
    prodDocs,
    resolveOrderFiscalBadgeStatus(prodDocs, estornoConfirmedIds),
    situationContext
  );
  const homologationResolution = resolveEnvironmentBadge(
    hmlDocs,
    resolveOrderFiscalBadgeStatus(hmlDocs, estornoConfirmedIds),
    situationContext
  );
  const production = productionResolution.status;
  const homologation = homologationResolution.status;

  const cancellationState = resolveOrderCancellationState(
    outboundDocs,
    operationDrafts,
    orderCancelled,
    now
  );
  const cancellationDocuments = resolveCancellationDocuments(
    outboundDocs,
    operationDrafts,
    orderCancelled,
    now
  );

  // readyToReissue: estorno confirmed, but no replacement outbound doc emitted yet.
  const replacementOutboundDocs = documents.filter(
    (d) => isOutbound(d) && isAuthorized(d) && !estornoConfirmedIds.has(d.id || '')
  );
  const hasReplacementHml = replacementOutboundDocs.some((d) => d.ambiente === 2);
  const hasReplacementProd = replacementOutboundDocs.some((d) => d.ambiente !== 2);
  const hasConfirmedEstornoHml = hmlDocs.some((d) => d.id && estornoConfirmedIds.has(d.id));
  const hasConfirmedEstornoProd = prodDocs.some((d) => d.id && estornoConfirmedIds.has(d.id));

  const hmlOutboundDocs = outboundDocs
    .filter((d) => d.ambiente === 2)
    .sort((a, b) => String(a.created_at || '').localeCompare(String(b.created_at || '')));

  const homologationBadges: OutboundFiscalBadgeItem[] = hmlOutboundDocs.map((doc, index) => {
    const isReversed = Boolean(doc.id && estornoConfirmedIds.has(doc.id));
    const seq = index + 1;
    const label = seq === 1 ? 'NFH' : `NFH ${seq}`;
    return {
      id: doc.id,
      status: isReversed ? 'reversed' : resolveOrderFiscalBadgeStatus([doc]),
      sequenceNumber: seq,
      label,
    };
  });

  if (hasConfirmedEstornoHml && !hasReplacementHml) {
    homologationBadges.push({
      status: 'not_issued',
      sequenceNumber: hmlOutboundDocs.length + 1,
      label: `NFH ${hmlOutboundDocs.length + 1}`,
    });
  }

  const prodOutboundDocs = outboundDocs
    .filter((d) => d.ambiente !== 2)
    .sort((a, b) => String(a.created_at || '').localeCompare(String(b.created_at || '')));

  const productionBadges: OutboundFiscalBadgeItem[] = prodOutboundDocs.map((doc, index) => {
    const isReversed = Boolean(doc.id && estornoConfirmedIds.has(doc.id));
    const seq = index + 1;
    const label = seq === 1 ? 'NF' : `NF ${seq}`;
    return {
      id: doc.id,
      status: isReversed ? 'reversed' : resolveOrderFiscalBadgeStatus([doc]),
      sequenceNumber: seq,
      label,
    };
  });

  if (prodOutboundDocs.length === 0) {
    productionBadges.push({
      status: production,
      sequenceNumber: 1,
      label: 'NF',
    });
  } else if (hasConfirmedEstornoProd && !hasReplacementProd) {
    productionBadges.push({
      status: 'not_issued',
      sequenceNumber: prodOutboundDocs.length + 1,
      label: `NF ${prodOutboundDocs.length + 1}`,
    });
  }

  const prodDocId =
    productionResolution.documentId ?? findDocumentIdByStatus(prodDocs, production, estornoConfirmedIds);
  const hmlDocId =
    homologationResolution.documentId ?? findDocumentIdByStatus(hmlDocs, homologation, estornoConfirmedIds);

  // Regularização anterior sem confirmação bloqueia a nova emissão (inclusive a reemissão pronta).
  const productionBlocked = isFiscalRegularizationBlockingStatus(production);
  const homologationBlocked = isFiscalRegularizationBlockingStatus(homologation);

  return {
    production,
    homologation,
    ...(production !== 'not_issued' && prodDocId ? { productionDocumentId: prodDocId } : {}),
    ...(homologation !== 'not_issued' && hmlDocId ? { homologationDocumentId: hmlDocId } : {}),
    ...(productionBadges.some((b) => b.status !== 'not_issued' || b.sequenceNumber > 1)
      ? { productionBadges }
      : {}),
    ...(homologationBadges.length > 0 ? { homologationBadges } : {}),
    ...(cancellationState ? { cancellationState } : {}),
    ...(cancellationDocuments.length ? { cancellationDocuments } : {}),
    ...resolveOrderFiscalEstornoBadge(documents, operationDrafts),
    ...resolveOrderFiscalDevolucaoBadge(documents, operationDrafts),
    ...(hasConfirmedEstornoHml && !hasReplacementHml && !homologationBlocked
      ? { readyToReissueHml: true }
      : {}),
    ...(hasConfirmedEstornoProd && !hasReplacementProd && !productionBlocked
      ? { readyToReissueProd: true }
      : {}),
  };
};
