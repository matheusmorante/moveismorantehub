import type { SupabaseClient } from '@supabase/supabase-js';
import {
  resolveOrderFiscalBadgePair,
  type FiscalDocumentStatusRow,
  type FiscalOperationDraftStatusRow,
  type FiscalOrderEditReplacementRow,
  type OrderFiscalBadgeStatus,
  type OrderFiscalSituation,
} from '../../erp/src/pages/utils/nfe/orderFiscalBadgeRules';

const REPLACEMENT_SELECT = 'original_document_id,environment,reversal_kind,status,replacement_document_id';

/**
 * Lê as intenções fiscais de edição comercial. A tabela é restrita ao backend (service role).
 * Em caso de falha devolve `undefined`: o rótulo então não presume que a regularização veio de uma
 * edição, em vez de derrubar toda a consulta de badges por um drift de schema.
 */
export async function fetchOrderEditReplacements(
  db: SupabaseClient<any, any, any>,
  documentIds: readonly string[]
): Promise<FiscalOrderEditReplacementRow[] | undefined> {
  if (!documentIds.length) return [];
  const { data, error } = await db
    .from('nfe_order_edit_replacements')
    .select(REPLACEMENT_SELECT)
    .in('original_document_id', [...documentIds]);
  if (error) {
    console.warn('[Fiscal] Intenções de edição indisponíveis para o rótulo fiscal:', error.code || 'erro');
    return undefined;
  }
  return (data || []) as FiscalOrderEditReplacementRow[];
}

const extractXmlMotivo = (xml: unknown): string | null => {
  if (typeof xml !== 'string') return null;
  const match = /<xMotivo>([^<]{1,300})<\/xMotivo>/.exec(xml);
  return match ? match[1].trim() : null;
};

const joinReason = (cstat: unknown, motivo: unknown): string | null => {
  const text = typeof motivo === 'string' ? motivo.trim() : '';
  if (!text) return null;
  return cstat ? `${cstat} - ${text}` : text;
};

type DetailsDocument = {
  id: string;
  order_id: string | null;
  ambiente: number;
  document_type?: string | null;
  original_document_id?: string | null;
};

type DetailsEmission = FiscalDocumentStatusRow & { motivo_status?: string | null };

/**
 * Situação fiscal do pedido para o modal de detalhes, calculada pela mesma regra dos rótulos
 * (`resolveOrderFiscalBadgePair`), com os registros persistidos do pedido e do ambiente da nota.
 * Retorna `undefined` quando não há como comprovar a situação; nunca lança para não esconder a nota.
 */
export async function loadOrderFiscalSituation(
  db: SupabaseClient<any, any, any>,
  document: DetailsDocument,
  orderEmissions: readonly DetailsEmission[]
): Promise<OrderFiscalSituation | undefined> {
  const orderId = document.order_id;
  if (!orderId) return undefined;
  const docType = document.document_type || 'outbound';
  if (!['outbound', 'estorno', 'devolucao'].includes(docType)) return undefined;

  const environment: 1 | 2 = document.ambiente === 2 ? 2 : 1;

  const emissionIdSet = new Set<string>();
  for (const emission of orderEmissions) {
    if (emission.id) emissionIdSet.add(String(emission.id));
  }
  if (document.id) emissionIdSet.add(String(document.id));
  if (document.original_document_id) emissionIdSet.add(String(document.original_document_id));
  const emissionIds = [...emissionIdSet];
  if (!emissionIds.length) return undefined;

  try {
    const [orderResult, eventsResult, draftsResult, replacements] = await Promise.all([
      db.from('orders').select('id,status').eq('id', orderId).maybeSingle(),
      db
        .from('nfe_document_events')
        .select('document_id,status,attempt_number,requested_at,cstat,xmotivo')
        .in('document_id', emissionIds)
        .eq('event_type', '110111')
        .order('attempt_number', { ascending: false }),
      db
        .from('nfe_operation_drafts')
        .select('id,original_document_id,operation_kind,environment,status,created_at')
        .in('original_document_id', emissionIds)
        .eq('operation_kind', 'estorno')
        .order('created_at', { ascending: false }),
      fetchOrderEditReplacements(db, emissionIds),
    ]);
    if (orderResult.error || eventsResult.error || draftsResult.error) return undefined;

    const latestEvents = new Map<string, any>();
    for (const event of eventsResult.data || []) {
      if (!latestEvents.has(String(event.document_id))) latestEvents.set(String(event.document_id), event);
    }
    const latestDrafts = new Map<string, any>();
    for (const draft of draftsResult.data || []) {
      if (!latestDrafts.has(String(draft.original_document_id))) {
        latestDrafts.set(String(draft.original_document_id), draft);
      }
    }

    const allEmissionsMap = new Map<string, DetailsEmission>();
    for (const emission of orderEmissions) {
      if (emission.id) allEmissionsMap.set(String(emission.id), emission);
    }
    if (document.id && !allEmissionsMap.has(String(document.id))) {
      allEmissionsMap.set(String(document.id), document as any);
    }

    const statusRows: FiscalDocumentStatusRow[] = [...allEmissionsMap.values()].map((emission) => {
      const event = latestEvents.get(String(emission.id));
      return {
        id: String(emission.id),
        order_id: emission.order_id,
        status: emission.status,
        document_type: emission.document_type || 'outbound',
        ambiente: emission.ambiente,
        created_at: emission.created_at,
        cancellationEventStatus: event?.status,
        cancellationEventRequestedAt: event?.requested_at,
        original_document_id: (emission as any).original_document_id,
      };
    });
    const drafts: FiscalOperationDraftStatusRow[] = [...latestDrafts.values()].map((draft) => ({
      id: draft.id,
      original_document_id: draft.original_document_id,
      operation_kind: draft.operation_kind,
      environment: draft.environment,
      status: draft.status,
      created_at: draft.created_at,
    }));
    const orderCancelled = ['cancelled', 'cancelado'].includes(
      String(orderResult.data?.status || '').toLowerCase()
    );

    const pair = resolveOrderFiscalBadgePair(statusRows, drafts, orderCancelled, Date.now(), replacements || []);
    const status: OrderFiscalBadgeStatus = environment === 2 ? pair.homologation || 'not_issued' : pair.production;
    const documentId = environment === 2 ? pair.homologationDocumentId : pair.productionDocumentId;

    let reason: string | null = null;
    if (status === 'regularization_failed' || status === 'regularization_uncertain') {
      const failingEvent = documentId ? latestEvents.get(documentId) : undefined;
      reason = joinReason(failingEvent?.cstat, failingEvent?.xmotivo);
      const failingDraft = documentId ? latestDrafts.get(documentId) : undefined;
      if (!reason && failingDraft?.id) {
        const { data } = await db
          .from('nfe_operation_drafts')
          .select('sefaz_response_xml')
          .eq('id', failingDraft.id)
          .maybeSingle();
        reason = extractXmlMotivo(data?.sefaz_response_xml);
      }
    } else if (status === 'reissue_required') {
      const pending = orderEmissions
        .filter((emission) => !['autorizada', 'homologada', 'cancelada'].includes(String(emission.status)))
        .sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')))[0];
      reason = pending?.motivo_status ? String(pending.motivo_status) : null;
    }

    // Identifica nota fiscal anterior regularizada (origem da substituição)
    const activeReplacement = (replacements || []).find(
      (r) => (r.environment === environment || r.environment == null) && (r.status !== 'completed' || !r.replacement_document_id)
    ) || (replacements || [])[0];

    let previousDocumentId: string | null = null;
    let previousDocumentNumber: number | string | null = null;
    let previousDocumentClosure: 'estornada' | 'cancelada' | null = null;

    if (activeReplacement?.original_document_id) {
      previousDocumentId = activeReplacement.original_document_id;
      const originalDoc = orderEmissions.find((e) => String(e.id) === activeReplacement.original_document_id);
      previousDocumentNumber = (originalDoc as any)?.numero_nfe ?? null;
      previousDocumentClosure = activeReplacement.reversal_kind === 'cancel' ? 'cancelada' : 'estornada';
    } else if (document.original_document_id) {
      previousDocumentId = String(document.original_document_id);
      const originalDoc = orderEmissions.find((e) => String(e.id) === previousDocumentId);
      previousDocumentNumber = (originalDoc as any)?.numero_nfe ?? null;
      previousDocumentClosure = 'estornada';
    } else {
      const pastClosure = orderEmissions
        .filter((e) => e.ambiente === environment && ['cancelada'].includes(String(e.status).toLowerCase()))
        .sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')))[0];
      if (pastClosure) {
        previousDocumentId = String(pastClosure.id);
        previousDocumentNumber = (pastClosure as any)?.numero_nfe ?? null;
        previousDocumentClosure = 'cancelada';
      }
    }

    if (!previousDocumentNumber && (status === 'reissue_required' || status === 'regularization_failed' || status === 'regularization_uncertain')) {
      const targetId = previousDocumentId || document.id;
      const currentDocInEmissions = orderEmissions.find((e) => String(e.id) === targetId);
      if (currentDocInEmissions) {
        previousDocumentNumber = (currentDocInEmissions as any)?.numero_nfe ?? null;
        previousDocumentClosure = currentDocInEmissions.status === 'cancelada' ? 'cancelada' : 'estornada';
      }
    }

    // Determina a ação contextual específica da pendência
    let actionKind: import('../../erp/src/pages/utils/nfe/orderFiscalBadgeRules').ReplacementPendingAction | undefined;
    if (status === 'regularization_failed') {
      actionKind = 'prior_regularization_failed';
    } else if (status === 'regularization_uncertain') {
      actionKind = 'transmission_uncertain';
    } else if (status === 'reissue_required') {
      const replacementAttempts = orderEmissions
        .filter((e) => String(e.id) !== previousDocumentId && e.ambiente === environment)
        .sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));

      const latestAttempt = replacementAttempts[0];
      const attemptStatus = String(latestAttempt?.status || '').toLowerCase();

      if (attemptStatus === 'rejeitada' || attemptStatus === 'denegada') {
        actionKind = 'rejected';
      } else if (attemptStatus === 'transmitting' || attemptStatus === 'unknown') {
        actionKind = 'transmission_uncertain';
      } else if (activeReplacement?.status === 'replacement_prepared') {
        actionKind = 'draft';
      } else {
        actionKind = 'awaiting_new_invoice';
      }
    } else if (status === 'issued') {
      actionKind = 'authorized';
    }

    return {
      status,
      environment,
      orderCancelled,
      orderId: String(document.order_id),
      ...(documentId ? { documentId } : {}),
      ...(previousDocumentId ? { previousDocumentId } : {}),
      ...(previousDocumentNumber ? { previousDocumentNumber } : {}),
      ...(previousDocumentClosure ? { previousDocumentClosure } : {}),
      reason,
      ...(actionKind ? { actionKind } : {}),
    };
  } catch (error) {
    console.warn('[Fiscal] Situação fiscal do pedido indisponível nos detalhes:', error instanceof Error ? error.name : 'erro');
    return undefined;
  }
}
