import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { authorizeFiscalOperator } from './fiscalAuthorization';
import { getSupabaseSecretKey, getSupabaseUrl } from '../supabaseSecretKey';
import { FISCAL_PENDENCY_TYPE_CONFIG } from '../../erp/src/pages/App/FiscalDocuments/types/fiscalPendencies.types';

const PAGE_SIZE = 1000;
const ID_CHUNK_SIZE = 100;
const OPEN_ATTEMPT_STATUSES = ['rejeitada', 'denegada', 'transmitting', 'unknown', 'erro'];

class FiscalPendenciesDataError extends Error {}

function requireEnvironment(value: unknown): 1 | 2 {
  if (value === 1 || value === 2) return value;
  throw new FiscalPendenciesDataError('Ambiente fiscal inválido.');
}

function requireModel(value: unknown): '55' | '65' {
  if (value === '55' || value === '65') return value;
  throw new FiscalPendenciesDataError('Modelo fiscal inválido.');
}

function chunk<T>(items: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size));
  }
  return result;
}

async function readAllPages<T>(buildQuery: () => any): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await buildQuery().range(from, from + PAGE_SIZE - 1);
    if (error) throw new FiscalPendenciesDataError('Falha ao consultar dados fiscais.');
    const page = (data || []) as T[];
    rows.push(...page);
    if (page.length < PAGE_SIZE) return rows;
  }
}

async function readPagesById<T>(
  ids: string[],
  buildQuery: (idChunk: string[]) => any
): Promise<T[]> {
  const rows: T[] = [];
  for (const idChunk of chunk(ids, ID_CHUNK_SIZE)) {
    rows.push(...(await readAllPages<T>(() => buildQuery(idChunk))));
  }
  return rows;
}

function customerFromOrder(order: any) {
  const customerData = order.order_data?.customerData || {};
  return {
    customerName: String(customerData.fullName || customerData.name || 'Cliente não informado').trim(),
    customerDocument: String(customerData.cpfCnpj || customerData.document || '').trim(),
  };
}

function isCancelled(order: any): boolean {
  return ['cancelled', 'cancelado'].includes(String(order.status || '').toLowerCase());
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'OPTIONS,GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Método não permitido.' });
  }

  const supabaseUrl = getSupabaseUrl();
  const serviceKey = getSupabaseSecretKey() || '';
  if (!supabaseUrl || !serviceKey) {
    return res.status(503).json({ success: false, error: 'Backend fiscal indisponível.' });
  }

  const db = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const authorization = await authorizeFiscalOperator(db, req.headers.authorization);
  if (!authorization.ok) {
    return res.status(authorization.status).json({ success: false, error: authorization.message });
  }

  try {
    const replacements = await readAllPages<any>(() => db
      .from('nfe_order_edit_replacements')
      .select('id,order_id,original_document_id,environment,reversal_kind,status,replacement_document_id,operation_draft_id,created_at')
      .neq('status', 'completed')
      .order('created_at', { ascending: false })
      .order('id', { ascending: false }));

    // Falhas antigas continuam abertas até haver regularização comprovada.
    const attempts = await readAllPages<any>(() => db
      .from('nfe_documents')
      .select('id,order_id,numero_nfe,serie,modelo,ambiente,status,motivo_status,document_type,created_at,updated_at')
      .in('status', OPEN_ATTEMPT_STATUSES)
      .eq('document_type', 'outbound')
      .order('created_at', { ascending: false })
      .order('id', { ascending: false }));

    const candidateOrderIds = [...new Set<string>([
      ...replacements.map((row) => String(row.order_id || '')).filter(Boolean),
      ...attempts.map((row) => String(row.order_id || '')).filter(Boolean),
    ])];
    if (candidateOrderIds.length === 0) {
      return res.status(200).json({ success: true, pendencies: [], count: 0 });
    }

    const [orders, authorizedDocs] = await Promise.all([
      readPagesById<any>(candidateOrderIds, (ids) => db
        .from('orders')
        .select('id,order_index,status,order_type,order_data,created_at,updated_at')
        .in('id', ids)
        .order('id', { ascending: true })),
      readPagesById<any>(candidateOrderIds, (ids) => db
        .from('nfe_documents')
        .select('id,order_id,ambiente,status,document_type,created_at,numero_nfe')
        .in('order_id', ids)
        .in('status', ['autorizada', 'homologada'])
        .eq('document_type', 'outbound')
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })),
    ]);

    const ordersMap = new Map<string, any>(orders.map((order) => [String(order.id), order]));
    if (ordersMap.size !== candidateOrderIds.length) {
      throw new FiscalPendenciesDataError('Pedido associado a pendência fiscal não encontrado.');
    }

    const authorizedMap = new Map<string, any>();
    for (const doc of authorizedDocs) {
      const environment = requireEnvironment(doc.ambiente);
      const key = `${doc.order_id}:${environment}`;
      // Rows arrive newest first, so the first one is authoritative.
      if (!authorizedMap.has(key)) authorizedMap.set(key, doc);
    }

    const originalDocIds = [...new Set<string>(
      replacements.map((row) => String(row.original_document_id || '')).filter(Boolean)
    )];
    if (replacements.some((row) => !row.original_document_id)) {
      throw new FiscalPendenciesDataError('Substituição sem documento original.');
    }
    const originalDocs = await readPagesById<any>(originalDocIds, (ids) => db
      .from('nfe_documents')
      .select('id,numero_nfe,serie,modelo,ambiente,status')
      .in('id', ids)
      .order('id', { ascending: true }));
    const originalDocsMap = new Map<string, any>(originalDocs.map((doc) => [String(doc.id), doc]));
    if (originalDocsMap.size !== originalDocIds.length) {
      throw new FiscalPendenciesDataError('Documento original de substituição não encontrado.');
    }

    const pendenciesByKey = new Map<string, any>();

    for (const replacement of replacements) {
      const order = ordersMap.get(String(replacement.order_id));
      const environment = requireEnvironment(replacement.environment);
      const key = `${replacement.order_id}:${environment}`;
      if (pendenciesByKey.has(key)) continue;

      const originalDoc = originalDocsMap.get(String(replacement.original_document_id));
      const model = requireModel(originalDoc.modelo);
      if (requireEnvironment(originalDoc.ambiente) !== environment) {
        throw new FiscalPendenciesDataError('Ambiente da substituição diverge da nota original.');
      }

      const authorizedDoc = authorizedMap.get(key);
      if (authorizedDoc && new Date(authorizedDoc.created_at) > new Date(replacement.created_at)) continue;
      if (isCancelled(order) && replacement.status !== 'awaiting_reversal') continue;
      if (!['awaiting_reversal', 'ready_to_reissue', 'replacement_prepared'].includes(replacement.status)) {
        throw new FiscalPendenciesDataError('Estado de substituição fiscal inválido.');
      }

      let pendencyType: keyof typeof FISCAL_PENDENCY_TYPE_CONFIG = 'awaiting_new_invoice';
      let situationStatus = 'reissue_required';
      let reason: string | null = null;
      let currentAttempt: any = null;

      const matchingAttempt = attempts.find((attempt) =>
        String(attempt.order_id) === String(replacement.order_id) &&
        requireEnvironment(attempt.ambiente) === environment &&
        new Date(attempt.created_at) > new Date(replacement.created_at)
      );

      if (replacement.status === 'awaiting_reversal') {
        pendencyType = 'prior_regularization_failed';
        situationStatus = 'regularization_failed';
        reason = 'Aguardando confirmação do estorno ou cancelamento anterior';
      } else if (replacement.status === 'replacement_prepared') {
        pendencyType = 'draft';
      } else if (matchingAttempt) {
        currentAttempt = matchingAttempt;
        const status = String(matchingAttempt.status).toLowerCase();
        if (status === 'rejeitada' || status === 'denegada') {
          pendencyType = 'rejected';
          reason = matchingAttempt.motivo_status || 'Rejeição SEFAZ na tentativa de emissão';
        } else if (status === 'transmitting' || status === 'unknown') {
          pendencyType = 'transmission_uncertain';
          reason = 'Transmissão com resultado incerto aguardando reconciliação';
        } else if (status === 'erro') {
          pendencyType = 'processing';
          situationStatus = 'failed';
          reason = matchingAttempt.motivo_status || 'Falha na emissão fiscal';
        }
      }

      const config = FISCAL_PENDENCY_TYPE_CONFIG[pendencyType];
      const customer = customerFromOrder(order);
      pendenciesByKey.set(key, {
        id: `${replacement.order_id}-${environment}`,
        orderId: String(replacement.order_id),
        orderIndex: order.order_index ? `#${order.order_index}` : `#${String(order.id).slice(0, 8)}`,
        ...customer,
        pendencyType,
        environment,
        model,
        originalDocumentId: replacement.original_document_id,
        originalDocumentNumber: originalDoc.numero_nfe || null,
        originalDocumentClosure: replacement.reversal_kind === 'cancel' ? 'cancelada' : 'estornada',
        currentDocumentId: currentAttempt?.id || null,
        currentDocumentNumber: currentAttempt?.numero_nfe || null,
        currentAttemptStatus: currentAttempt?.status || null,
        draftId: replacement.operation_draft_id || null,
        identifiedAt: replacement.created_at,
        situationStatus,
        reason,
        actionKind: config.defaultAction.kind,
        actionLabel: config.defaultAction.label,
        actionIcon: config.defaultAction.icon,
      });
    }

    for (const attempt of attempts) {
      const environment = requireEnvironment(attempt.ambiente);
      const model = requireModel(attempt.modelo);
      const key = `${attempt.order_id}:${environment}`;
      if (pendenciesByKey.has(key)) continue;

      const order = ordersMap.get(String(attempt.order_id));
      const authorizedDoc = authorizedMap.get(key);
      if (authorizedDoc && new Date(authorizedDoc.created_at) >= new Date(attempt.created_at)) continue;
      if (isCancelled(order)) continue;

      const status = String(attempt.status).toLowerCase();
      let pendencyType: keyof typeof FISCAL_PENDENCY_TYPE_CONFIG = 'rejected';
      let situationStatus = 'rejected';
      if (status === 'transmitting' || status === 'unknown') {
        pendencyType = 'transmission_uncertain';
        situationStatus = 'regularization_uncertain';
      } else if (status === 'erro') {
        pendencyType = 'processing';
        situationStatus = 'failed';
      }

      const config = FISCAL_PENDENCY_TYPE_CONFIG[pendencyType];
      pendenciesByKey.set(key, {
        id: `${attempt.order_id}-${environment}`,
        orderId: String(attempt.order_id),
        orderIndex: order.order_index ? `#${order.order_index}` : `#${String(order.id).slice(0, 8)}`,
        ...customerFromOrder(order),
        pendencyType,
        environment,
        model,
        originalDocumentId: null,
        originalDocumentNumber: null,
        originalDocumentClosure: null,
        currentDocumentId: attempt.id,
        currentDocumentNumber: attempt.numero_nfe || null,
        currentAttemptStatus: attempt.status,
        draftId: null,
        identifiedAt: attempt.created_at,
        situationStatus,
        reason: attempt.motivo_status || 'Falha na emissão fiscal',
        actionKind: config.defaultAction.kind,
        actionLabel: config.defaultAction.label,
        actionIcon: config.defaultAction.icon,
      });
    }

    const pendencies = [...pendenciesByKey.values()].sort((a, b) =>
      new Date(b.identifiedAt).getTime() - new Date(a.identifiedAt).getTime()
    );
    return res.status(200).json({ success: true, pendencies, count: pendencies.length });
  } catch (error) {
    console.error('[Fiscal] Falha ao carregar pendências fiscais:', error instanceof FiscalPendenciesDataError ? error.message : 'erro de consulta');
    return res.status(503).json({
      success: false,
      error: 'Não foi possível confirmar a lista completa de pendências fiscais. Tente novamente.',
    });
  }
}
