import { getFiscalCancellationPolicy } from './fiscalCancellationPolicy';
import { parseNfeApiResponse } from './parseNfeApiResponse';
import { getAuthorizedAt } from './nfeEventRules';
import { supabase } from '../supabaseConfig';

/**
 * Avalia se o documento fiscal é elegível para cancelamento fiscal direto.
 * Regra: Cancelamento fiscal só é válido se a mercadoria NÃO circulou/saiu e dentro dos prazos da UF/Modelo.
 */
export function canCancelFiscalDocument(doc: {
  status?: string;
  modelo?: '55' | '65';
  chave_acesso?: string;
  created_at?: string;
  xml_protocolo?: string;
  ambiente?: 1 | 2;
  isMerchandiseDelivered?: boolean;
}): { canCancel: boolean; reason?: string } {
  if (!doc) return { canCancel: false, reason: 'Documento não informado' };
  if (
    !['autorizada', 'homologada'].includes(doc.status || '') ||
    (doc.status === 'homologada' && doc.ambiente !== 2)
  ) {
    return { canCancel: false, reason: 'Apenas notas autorizadas podem ser canceladas' };
  }
  const environment = doc.ambiente === 2 ? 2 : 1;
  const policy = getFiscalCancellationPolicy({
    model: String(doc.modelo || ''),
    authorizedAt: getAuthorizedAt(doc.xml_protocolo, ''),
    status: String(doc.status || ''),
    environment,
    goodsCirculated: Boolean(doc.isMerchandiseDelivered),
    operationDidNotOccur: true,
    issuerUf: String(doc.chave_acesso || '').slice(0, 2) === '41' ? 'PR' : '',
  });
  if (policy.action !== 'cancel') {
    return {
      canCancel: false,
      reason: policy.reason || 'A NF-e não está elegível para cancelamento.',
    };
  }
  return { canCancel: true };
}

export interface OrderCancellationFiscalEffectsResult {
  action: 'none' | 'cancel' | 'estorno' | 'reconcile' | 'batch';
  results?: Array<{
    documentId: string;
    environment?: number;
    model?: string;
    action: 'cancel' | 'estorno' | 'reconcile' | 'failed' | 'none';
    reconciliationState?: 'authorized' | 'pending' | 'unknown';
    error?: string;
    draftId?: string;
    reconciliationRequired?: boolean;
  }>;
  reconciliationState?: 'authorized' | 'pending' | 'unknown';
  error?: string;
  draftId?: string;
  cStat?: string;
  protocolNumber?: string;
  protocolDate?: string;
  xMotivo?: string;
  reconciliationRequired?: boolean;
}

/**
 * Processa os efeitos fiscais decorrentes do cancelamento de um pedido comercial.
 * Avalia política central, reconciliação pendente, lotes de notas ou rascunhos de estorno.
 */
export async function processOrderCancellationFiscalEffects(
  orderId: string,
  orderCode: string,
  options: {
    reason?: string;
    productionConfirmed?: boolean;
    confirmProduction?: () => boolean;
    documentId?: string;
  } = {}
): Promise<OrderCancellationFiscalEffectsResult> {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (sessionError || !token) throw new Error('Sessão inválida para processar o documento fiscal.');

  const reason =
    options.reason?.trim() ||
    `Pedido #${orderCode} cancelado; operação não realizada e mercadoria não circulou.`;
  const policyResponse = await fetch('/api/nfe/order-cancellation-policy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      orderId,
      ...(options.documentId ? { documentId: options.documentId } : {}),
    }),
  });
  const policy = await parseNfeApiResponse<{
    action:
      | 'none'
      | 'cancel'
      | 'estorno'
      | 'manual_review'
      | 'blocked'
      | 'pending'
      | 'reconcile'
      | 'return'
      | 'batch';
    documentId?: string;
    environment?: number;
    reason?: string;
    error?: string;
    operations?: Array<{
      action: string;
      documentId: string;
      environment?: number;
      model?: string;
      reason?: string;
    }>;
  }>(policyResponse, 'Não foi possível decidir o efeito fiscal.');
  if (!policyResponse.ok && policy.action !== 'reconcile')
    throw new Error(policy.error || 'Não foi possível decidir o efeito fiscal.');
  if (policy.action === 'batch') {
    const operations = policy.operations || [];
    const needsProductionConfirmation = operations.some(
      (operation) => operation.action === 'cancel' && operation.environment === 1
    );
    const productionConfirmed =
      !needsProductionConfirmation ||
      options.productionConfirmed === true ||
      options.confirmProduction?.() === true;
    const results = [] as NonNullable<OrderCancellationFiscalEffectsResult['results']>;
    for (const operation of operations) {
      if (operation.action === 'cancel' && operation.environment === 1 && !productionConfirmed) {
        results.push({
          documentId: operation.documentId,
          environment: operation.environment,
          model: operation.model,
          action: 'failed',
          error: 'Confirme explicitamente o cancelamento fiscal em Produção.',
        });
        continue;
      }
      if (!['cancel', 'estorno', 'reconcile'].includes(operation.action)) {
        results.push({
          documentId: operation.documentId,
          environment: operation.environment,
          model: operation.model,
          action: 'failed',
          error: operation.reason || 'Esta nota exige revisão fiscal.',
        });
        continue;
      }
      try {
        const result = await processOrderCancellationFiscalEffects(orderId, orderCode, {
          ...options,
          documentId: operation.documentId,
          productionConfirmed,
        });
        if (result.action === 'batch')
          throw new Error('A consulta de um documento retornou um lote fiscal inesperado.');
        results.push({
          documentId: operation.documentId,
          environment: operation.environment,
          model: operation.model,
          ...result,
          action: result.action,
        });
      } catch (error) {
        results.push({
          documentId: operation.documentId,
          environment: operation.environment,
          model: operation.model,
          action: 'failed',
          error: error instanceof Error ? error.message : 'Falha na tentativa de cancelamento fiscal.',
        });
      }
    }
    return { action: 'batch', results };
  }
  if (policy.action === 'none') return { action: 'none' };
  if (policy.action === 'reconcile') {
    if (!policy.documentId)
      throw new Error(
        policy.reason || 'Não foi possível identificar o documento para reconciliação.'
      );
    const consultResponse = await fetch('/api/nfe/consult', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ documentId: policy.documentId }),
    });
    const consultation = await parseNfeApiResponse<{
      success?: boolean;
      state?: 'authorized' | 'cancelled' | 'unknown' | 'not_found';
      pending?: boolean;
      cancellationAttemptState?: 'not_registered' | 'registered' | 'unknown';
      reconciliationRequired?: boolean;
      cStat?: string;
      protocolNumber?: string;
      protocolDate?: string;
      xMotivo?: string;
      error?: string;
    }>(consultResponse, 'Não foi possível consultar a situação fiscal na SEFAZ.');
    if (consultation.state === 'cancelled' && consultation.success === true) {
      return {
        action: 'cancel',
        cStat: consultation.cStat,
        protocolNumber: consultation.protocolNumber,
        protocolDate: consultation.protocolDate,
        xMotivo: consultation.xMotivo,
        reconciliationRequired: consultation.reconciliationRequired === true,
      };
    }
    if (consultation.state === 'authorized') {
      return {
        action: 'reconcile',
        reconciliationState:
          consultation.cancellationAttemptState === 'not_registered' ? 'authorized' : 'unknown',
        reconciliationRequired: consultation.reconciliationRequired === true,
        error: consultation.error,
      };
    }
    if (consultation.pending || consultation.state === 'unknown') {
      return {
        action: 'reconcile',
        reconciliationState: 'pending',
        reconciliationRequired: true,
        error: consultation.error,
      };
    }
    throw new Error(
      consultation.error ||
        'A consulta não confirmou a situação fiscal; nenhuma nova tentativa foi enviada.'
    );
  }
  if (policy.action !== 'cancel' && policy.action !== 'estorno')
    throw new Error(
      policy.reason || 'A situação comercial ou fiscal bloqueia a aplicação automática do efeito.'
    );

  const productionConfirmed =
    options.productionConfirmed === true ||
    (policy.environment === 1 && options.confirmProduction?.() === true);
  if (policy.action === 'cancel' && policy.environment === 1 && !productionConfirmed)
    throw new Error('Confirme explicitamente o cancelamento fiscal no ambiente de Produção.');

  const endpoint = policy.action === 'cancel' ? '/api/nfe/cancel' : '/api/nfe/operation-drafts';
  const body =
    policy.action === 'cancel'
      ? {
          documentId: policy.documentId,
          reason,
          productionConfirmed,
          viaOrderCancellation: true,
        }
      : {
          kind: 'estorno',
          originalDocumentId: policy.documentId,
          environment: policy.environment,
          reason,
          operationDidNotOccur: true,
          goodsDidNotCirculate: true,
          viaOrderCancellation: true,
        };
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  const result = await parseNfeApiResponse<{
    success?: boolean;
    error?: string;
    draftId?: string;
    cStat?: string;
    protocolNumber?: string;
    protocolDate?: string;
    xMotivo?: string;
    reconciliationRequired?: boolean;
  }>(response, 'Não foi possível aplicar o efeito fiscal do pedido.');
  if (!response.ok || result.success === false)
    throw new Error(result.error || 'Não foi possível aplicar o efeito fiscal do pedido.');
  return policy.action === 'estorno'
    ? { action: 'estorno', draftId: String(result.draftId || '') }
    : {
        action: 'cancel',
        cStat: typeof result.cStat === 'string' ? result.cStat : undefined,
        protocolNumber:
          typeof result.protocolNumber === 'string' ? result.protocolNumber : undefined,
        protocolDate: typeof result.protocolDate === 'string' ? result.protocolDate : undefined,
        xMotivo: typeof result.xMotivo === 'string' ? result.xMotivo : undefined,
        reconciliationRequired: result.reconciliationRequired === true,
      };
}
