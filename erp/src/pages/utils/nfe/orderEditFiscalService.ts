import type Order from '../../types/order.type';
import { supabase } from '../supabaseConfig';
import type { SourceDocument } from '../../App/FiscalDocuments/types/fiscalOperationDraft.types';

export type FiscalOrderEditChange = {
  field: string;
  expected: unknown;
  actual: unknown;
};

export type FiscalOrderEditDocument = {
  id: string;
  model: string;
  environment: 1 | 2;
  action: 'cancel' | 'estorno';
  changes: FiscalOrderEditChange[];
};

export type FiscalOrderEditReplacement = {
  id: string;
  status: 'awaiting_reversal' | 'ready_to_reissue' | 'replacement_prepared' | 'completed';
  action: 'cancel' | 'estorno';
  environment: 1 | 2;
  reversalConfirmed: boolean;
  draftId: string | null;
  replacementDocumentId: string | null;
  sourceDocument: SourceDocument;
};

export async function resumeFiscalOrderEdit(orderId: string) {
  const { response, result } = await authorizedPost('/api/nfe/audit-order-edit', { orderId, action: 'resume' });
  if (!response.ok) throw new Error(result.error || 'Não foi possível carregar a substituição fiscal.');
  return result as { order: Order; replacements: FiscalOrderEditReplacement[] };
}

export async function consultOrderEditOriginal(documentId: string) {
  const { response, result } = await authorizedPost('/api/nfe/consult', { documentId });
  if (!response.ok) throw new Error(result.error || 'Não foi possível consultar a situação fiscal.');
  return result;
}

export async function finalizeFiscalOrderEdit(input: { orderId: string; replacementId: string }) {
  const { response, result } = await authorizedPost('/api/nfe/audit-order-edit', {
    action: 'finalize', orderId: input.orderId, replacementId: input.replacementId,
  });
  if (!response.ok || result.success !== true)
    throw new Error(result.error || 'A reversão ainda não foi confirmada; o pedido permanece inalterado.');
  return result as { order: Order };
}

export async function confirmFiscalOrderEdit(input: {
  requestId: string; orderId: string; proposedOrder: Order; audit: FiscalOrderEditAudit;
}) {
  const { response, result } = await authorizedPost('/api/nfe/audit-order-edit', {
    action: 'confirm', requestId: input.requestId, orderId: input.orderId, proposedOrder: input.proposedOrder,
    orderUpdatedAt: input.audit.orderUpdatedAt,
    plans: input.audit.documents.map(({ id, action, environment }) => ({ id, action, environment })),
    productionConfirmed: input.audit.documents.some((document) => document.environment === 1),
  });
  if (!response.ok || result.success !== true)
    throw new Error(result.error || 'Não foi possível confirmar a edição e seus efeitos.');
  return result as { order: Order; replacements: FiscalOrderEditReplacement[] };
}

export type FiscalOrderEditAudit = {
  status: 'unchanged' | 'confirmation_required' | 'blocked';
  orderUpdatedAt?: string;
  error?: string;
  changes: FiscalOrderEditChange[];
  documents: FiscalOrderEditDocument[];
};

async function authorizedPost(path: string, body: Record<string, unknown>) {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session?.access_token)
    throw new Error('Faça login novamente para validar a edição fiscal do pedido.');

  const response = await fetch(path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${data.session.access_token}`,
    },
    body: JSON.stringify(body),
    cache: 'no-store',
  });
  const result = await response.json().catch(() => ({}));
  return { response, result };
}

export async function auditFiscalOrderEdit(orderId: string, proposedOrder: Order) {
  const { response, result } = await authorizedPost('/api/nfe/audit-order-edit', {
    orderId,
    proposedOrder,
  });
  if (!response.ok && result.status !== 'blocked')
    throw new Error(result.error || 'Não foi possível validar a edição fiscal do pedido.');

  return {
    status: result.status as FiscalOrderEditAudit['status'],
    orderUpdatedAt: typeof result.orderUpdatedAt === 'string' ? result.orderUpdatedAt : undefined,
    error: typeof result.error === 'string' ? result.error : undefined,
    changes: Array.isArray(result.changes) ? result.changes : [],
    documents: Array.isArray(result.documents) ? result.documents : [],
  } satisfies FiscalOrderEditAudit;
}

export async function cancelFiscalDocumentForOrderEdit(input: {
  documentId: string;
  orderId: string;
  replacementId: string;
  environment: 1 | 2;
}) {
  const { response, result } = await authorizedPost('/api/nfe/cancel', {
    documentId: input.documentId,
    reason: 'Alteração fiscal do pedido confirmada pelo operador responsável.',
    viaOrderEdit: true,
    orderId: input.orderId,
    replacementId: input.replacementId,
    productionConfirmed: input.environment === 1,
  });
  if (!response.ok || result.success !== true) {
    throw new Error(
      result.error ||
        (result.pending
          ? 'O resultado do cancelamento está pendente. Consulte o documento fiscal antes de continuar.'
          : 'A SEFAZ não confirmou o cancelamento. A proposta está salva e a substituição fiscal permanece pendente.')
    );
  }
  return result;
}
