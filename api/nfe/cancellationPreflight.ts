import type { SupabaseClient } from '@supabase/supabase-js';
import { ACCESS_KEY_PATTERN } from '../../shared-utils/fiscalIdentifiers.js';
import { getGoodsCirculationState } from '../../erp/src/pages/utils/nfe/cancellationEligibility';
import { getFiscalCancellationPolicy } from '../../erp/src/pages/utils/nfe/fiscalCancellationPolicy';
import { getAuthorizedAt } from '../../erp/src/pages/utils/nfe/nfeEventRules';
import {
  assertAuthorizedFiscalSnapshot,
  findFiscalOrderEditChanges,
  hasPotentialFiscalOrderEdit,
  projectOrderDataForFiscalEdit,
  type AuthorizedFiscalDocumentForEdit,
} from './orderEditFiscalAudit';
import type { FiscalSnapshotCandidate } from './fiscalSnapshot';

export interface PreflightValidationResult {
  ok: boolean;
  status?: number;
  error?: string;
  doc?: Record<string, any>;
  linkedOrder?: Record<string, any>;
  proposedOrder?: any;
  orderEditVersion?: string;
}

export async function recordCancellationPreflightFailure(params: {
  supabase: SupabaseClient;
  documentId: string;
  attemptNumber: number;
  environment: number;
  reason: string;
  errorMessage: string;
  userId?: string;
}): Promise<void> {
  try {
    await params.supabase.from('nfe_document_events').insert({
      document_id: params.documentId,
      event_type: '110111',
      event_sequence: 1,
      attempt_number: params.attemptNumber,
      environment: params.environment,
      status: 'rejected',
      justification: params.reason,
      signed_xml: '',
      xmotivo: `Falha local antes do envio à SEFAZ: ${params.errorMessage}`.slice(0, 1000),
      requested_by: params.userId,
    });
  } catch (err) {
    console.error('[NF-e Cancel] Erro ao registrar preflight failure:', err);
  }
}

export async function validateCancellationDocument(params: {
  supabase: SupabaseClient;
  documentId: string;
  productionConfirmed: boolean;
}): Promise<PreflightValidationResult> {
  const { supabase, documentId, productionConfirmed } = params;
  const { data: doc, error: docError } = await supabase
    .from('nfe_documents')
    .select('*')
    .eq('id', documentId)
    .maybeSingle();

  if (docError || !doc)
    return { ok: false, status: 404, error: 'Documento fiscal não encontrado.' };

  return validateCancellationDocumentRecord(doc, productionConfirmed);
}

/** Shared record checks for execution and read-only eligibility. */
export function validateCancellationDocumentRecord(
  doc: Record<string, any>,
  productionConfirmed: boolean
): PreflightValidationResult {

  if (!['outbound', 'return', 'estorno'].includes(String(doc.document_type)))
    return {
      ok: false,
      status: 409,
      error: 'Somente uma NF-e de saída, devolução ou estorno pode receber este evento de cancelamento.',
    };

  if (['return', 'estorno'].includes(String(doc.document_type)) && String(doc.modelo) !== '55')
    return {
      ok: false,
      status: 409,
      error: 'Cancelamento fiscal de NF-e de devolução ou estorno exige modelo 55.',
    };

  if (!['autorizada', 'homologada'].includes(doc.status))
    return {
      ok: false,
      status: 409,
      error: 'Somente documento autorizado pode receber evento de cancelamento.',
    };

  if (
    !['55', '65'].includes(String(doc.modelo)) ||
    ![1, 2].includes(Number(doc.ambiente)) ||
    doc.status !== (Number(doc.ambiente) === 2 ? 'homologada' : 'autorizada') ||
    !ACCESS_KEY_PATTERN.test(String(doc.chave_acesso || ''))
  ) {
    return {
      ok: false,
      status: 409,
      error: 'Modelo, ambiente ou chave de acesso do documento inválidos.',
    };
  }

  if (Number(doc.ambiente) === 1 && !productionConfirmed) {
    return {
      ok: false,
      status: 400,
      error: 'Confirme explicitamente o cancelamento em Produção.',
    };
  }

  if (!/^\d{15}$/.test(String(doc.numero_protocolo || '')) || !doc.xml_nfe) {
    return {
      ok: false,
      status: 409,
      error:
        'A nota não contém XML autorizado e protocolo original válidos para referenciar o evento.',
    };
  }

  return { ok: true, doc };
}

/** Operation-document checks only; never writes an audit/event or commercial state. */
export async function validateOperationCancellationContext(params: {
  supabase: SupabaseClient;
  doc: Record<string, any>;
  viaOrderEdit: boolean;
  now?: number;
}): Promise<PreflightValidationResult & { auditFailure?: boolean }> {
  const { supabase, doc, viaOrderEdit } = params;
  if (!['return', 'estorno'].includes(String(doc.document_type)) || String(doc.modelo) !== '55') {
    return { ok: false, status: 409, error: 'Esta validação exige NF-e modelo 55 de devolução ou estorno.' };
  }
  if (viaOrderEdit) return { ok: false, status: 409,
    error: 'Substituição por edição de pedido aplica-se apenas à NF-e de venda original.' };
  if (!doc.original_document_id) return { ok: false, status: 409,
    error: 'A NF-e de devolução ou estorno não possui vínculo com o documento fiscal original.' };
  if (doc.document_type === 'return') {
    if (!doc.related_return_order_id) return { ok: false, status: 409,
      error: 'A NF-e de devolução não possui vínculo com o pedido de devolução comercial.' };
    const { data: returnOrder, error } = await supabase.from('orders')
      .select('id,status,order_type,linked_order_id,order_data').eq('id', doc.related_return_order_id).maybeSingle();
    if (error || !returnOrder || String(returnOrder.order_type || '').toLowerCase() !== 'return') {
      return { ok: false, status: 409,
        error: 'Não foi possível validar o pedido de devolução comercial vinculado à NF-e de devolução.' };
    }
  }
  if (doc.document_type === 'estorno') {
    const { data: activeReplacement, error } = await supabase.from('nfe_order_edit_replacements')
      .select('id,status').eq('original_document_id', doc.original_document_id).eq('environment', doc.ambiente)
      .eq('reversal_kind', 'estorno').in('status', ['ready_to_reissue', 'replacement_prepared', 'completed']).maybeSingle();
    if (error) return { ok: false, status: 503,
      error: 'Não foi possível verificar substituições fiscais vinculadas ao estorno.' };
    if (activeReplacement) return { ok: false, status: 409, auditFailure: true,
      error: 'Esta NF-e de estorno já compõe uma substituição fiscal de edição aplicada ou concluída e não pode ser cancelada isoladamente.' };
  }
  const policy = getFiscalCancellationPolicy({
    model: '55', authorizedAt: getAuthorizedAt(String(doc.xml_protocolo || ''), ''),
    status: String(doc.status), environment: Number(doc.ambiente) as 1 | 2,
    goodsCirculated: false, operationDidNotOccur: true,
    issuerUf: String(doc.chave_acesso || '').slice(0, 2) === '41' ? 'PR' : '', now: params.now,
  });
  if (policy.action !== 'cancel') return { ok: false, status: 409, auditFailure: true,
    error: policy.reason || 'Prazo de cancelamento da NF-e (168 horas no Paraná) ultrapassado.' };
  return { ok: true };
}

export async function validateCancellationOrderAndCirculation(params: {
  supabase: SupabaseClient;
  doc: Record<string, any>;
  userId: string;
  reason: string;
  attemptNumber: number;
  viaOrderEdit: boolean;
  orderEditOrderId?: string;
  orderEditVersion?: string;
  proposedOrder?: any;
  replacementId?: string;
}): Promise<PreflightValidationResult> {
  const { supabase, doc, userId, reason, attemptNumber, viaOrderEdit } = params;
  let orderEditVersion = params.orderEditVersion;
  let proposedOrder = params.proposedOrder;
  const replacementId = params.replacementId;

  if (doc.document_type === 'return' || doc.document_type === 'estorno') {
    const validation = await validateOperationCancellationContext({ supabase, doc, viaOrderEdit });
    if (!validation.ok && validation.auditFailure) {
      await recordCancellationPreflightFailure({
        supabase, documentId: doc.id, attemptNumber, environment: Number(doc.ambiente),
        reason, errorMessage: validation.error!, userId,
      });
    }
    return validation;
  }

  if (!doc.order_id) {
    return {
      ok: false,
      status: 409,
      error:
        'Documento sem vínculo com o pedido; não é possível comprovar se a mercadoria circulou.',
    };
  }

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select(
      'id,status,updated_at,delivery_status,delivery_started_at,delivery_arrived_at,delivery_finished_at,delivery_method,order_type,order_data'
    )
    .eq('id', doc.order_id)
    .maybeSingle();

  if (orderError || !order) {
    return {
      ok: false,
      status: 503,
      error: 'Não foi possível verificar a circulação da mercadoria.',
    };
  }

  const linkedOrder = order as Record<string, any>;
  const commercialOrderStatus = String(order?.status || '').toLowerCase();
  const circulationState = getGoodsCirculationState(order);
  const physicalCirculationConfirmed = circulationState === 'completed';

  if (circulationState === 'in_progress') {
    return {
      ok: false,
      status: 409,
      error:
        'A entrega ou retirada ainda não foi confirmada. Aguarde o registro de entrega, recusa ou retorno antes de cancelar a nota.',
    };
  }

  const orderType = String(order?.order_type || order?.order_data?.orderType || 'sale').toLowerCase();
  if (!['sale', 'showroom'].includes(orderType)) {
    return {
      ok: false,
      status: 409,
      error: 'O pedido vinculado não é uma venda elegível para este cancelamento fiscal.',
    };
  }

  if (viaOrderEdit && (!linkedOrder || params.orderEditOrderId !== String(doc.order_id))) {
    return {
      ok: false,
      status: 409,
      error: 'A edição fiscal não corresponde ao pedido vinculado à nota.',
    };
  }

  if (viaOrderEdit && !replacementId) {
    return {
      ok: false,
      status: 409,
      error: 'Registre a substituição fiscal antes de cancelar a nota por edição.',
    };
  }

  if (viaOrderEdit && replacementId) {
    const { data: replacement, error } = await supabase
      .from('nfe_order_edit_replacements')
      .select('id,edited_order_data,expected_updated_at,original_order_data')
      .eq('id', replacementId)
      .eq('order_id', doc.order_id)
      .eq('original_document_id', doc.id)
      .eq('environment', doc.ambiente)
      .eq('reversal_kind', 'cancel')
      .eq('status', 'awaiting_reversal')
      .maybeSingle();

    if (
      error ||
      !replacement ||
      linkedOrder?.status !== 'scheduled' ||
      new Date(linkedOrder.updated_at).getTime() !==
        new Date(replacement.expected_updated_at).getTime()
    ) {
      return {
        ok: false,
        status: 409,
        error: 'Substituição fiscal não registrada ou pedido indisponível.',
      };
    }
    proposedOrder = replacement.edited_order_data;
    orderEditVersion = replacement.expected_updated_at;
  }

  if (viaOrderEdit) {
    if (String(linkedOrder?.updated_at || '') !== orderEditVersion) {
      return {
        ok: false,
        status: 409,
        error:
          'O pedido foi alterado desde a conferência. Confira novamente os dados antes de cancelar a nota.',
      };
    }

    const currentOrderData = (linkedOrder?.order_data || {}) as Record<string, any>;
    const proposedOrderData = projectOrderDataForFiscalEdit(
      currentOrderData,
      proposedOrder as Record<string, any>
    );

    if (!replacementId && !hasPotentialFiscalOrderEdit(currentOrderData, proposedOrderData)) {
      return {
        ok: false,
        status: 409,
        error: 'A edição proposta não altera dados fiscais; a nota não será cancelada.',
      };
    }

    const { data: pendingDocuments, error: pendingDocumentsError } = await supabase
      .from('nfe_documents')
      .select('id,status')
      .eq('order_id', doc.order_id)
      .in('status', ['processando', 'pendente', 'unknown', 'transmitting']);

    if (pendingDocumentsError) {
      return {
        ok: false,
        status: 503,
        error: 'Não foi possível verificar tentativas fiscais em andamento para o pedido.',
      };
    }

    if (pendingDocuments?.length) {
      return {
        ok: false,
        status: 409,
        error:
          'Existe uma tentativa fiscal sem resultado confirmado. Consulte a SEFAZ antes de alterar o pedido.',
      };
    }

    const { data: snapshotRow, error: snapshotError } = await supabase
      .from('nfe_fiscal_snapshots')
      .select('snapshot_data')
      .eq('emission_request_id', doc.emission_request_id)
      .eq('order_id', doc.order_id)
      .maybeSingle();

    if (snapshotError || !snapshotRow?.snapshot_data) {
      return {
        ok: false,
        status: 409,
        error:
          'Não existe fotografia fiscal imutável para validar o cancelamento desta edição.',
      };
    }

    try {
      const snapshot = snapshotRow.snapshot_data as FiscalSnapshotCandidate;
      const fiscalDocument = assertAuthorizedFiscalSnapshot(
        snapshot,
        doc as AuthorizedFiscalDocumentForEdit
      );
      const changes = findFiscalOrderEditChanges(snapshot, proposedOrderData, fiscalDocument);
      if (!changes.length) {
        return {
          ok: false,
          status: 409,
          error:
            'O pedido proposto corresponde ao XML autorizado; a nota não será cancelada.',
        };
      }
    } catch (error) {
      return {
        ok: false,
        status: 409,
        error:
          error instanceof Error
            ? error.message
            : 'Não foi possível validar a edição contra o XML autorizado.',
      };
    }
  }

  if (physicalCirculationConfirmed) {
    const errorMsg =
      'Há confirmação de circulação/entrega. A NF-e original deve permanecer válida; siga o fluxo fiscal de devolução.';
    await recordCancellationPreflightFailure({
      supabase,
      documentId: doc.id,
      attemptNumber,
      environment: Number(doc.ambiente),
      reason,
      errorMessage: errorMsg,
      userId,
    });
    return { ok: false, status: 409, error: errorMsg };
  }

  if (
    !viaOrderEdit &&
    doc.order_id &&
    !['cancelled', 'cancelado'].includes(commercialOrderStatus || '')
  ) {
    const errorMsg =
      'A operação comercial do pedido vinculado ainda não foi cancelada; nenhum evento fiscal foi transmitido.';
    await recordCancellationPreflightFailure({
      supabase,
      documentId: doc.id,
      attemptNumber,
      environment: Number(doc.ambiente),
      reason,
      errorMessage: errorMsg,
      userId,
    });
    return { ok: false, status: 409, error: errorMsg };
  }

  const authorizedAt = getAuthorizedAt(String(doc.xml_protocolo || ''), '');
  const cancellationPolicy = getFiscalCancellationPolicy({
    model: String(doc.modelo),
    authorizedAt,
    status: String(doc.status),
    environment: Number(doc.ambiente) as 1 | 2,
    goodsCirculated: physicalCirculationConfirmed,
    operationDidNotOccur: true,
    issuerUf: String(doc.chave_acesso || '').slice(0, 2) === '41' ? 'PR' : '',
  });

  if (cancellationPolicy.action !== 'cancel') {
    const policyReason =
      cancellationPolicy.reason ||
      (String(doc.modelo) === '65'
        ? 'Prazo de cancelamento da NFC-e (30 minutos no Paraná) ultrapassado.'
        : 'Prazo de cancelamento da NF-e (168 horas no Paraná) ultrapassado.');
    await recordCancellationPreflightFailure({
      supabase,
      documentId: doc.id,
      attemptNumber,
      environment: Number(doc.ambiente),
      reason,
      errorMessage: policyReason,
      userId,
    });
    return { ok: false, status: 409, error: policyReason };
  }

  return { ok: true, linkedOrder, proposedOrder, orderEditVersion };
}
