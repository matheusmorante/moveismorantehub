import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseSecretKey } from '../supabaseSecretKey';
import { getAuthorizedAt } from '../../erp/src/pages/utils/nfe/nfeEventRules';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const serviceKey = getSupabaseSecretKey() || '';
const anonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
const orderIdPattern = /^[A-Za-z0-9_-]{1,100}$/;
const documentSelect =
  'id,order_id,status,document_type,ambiente,created_at,numero_nfe,serie,modelo,valor_total';

type ReturnOrderRow = {
  id: string;
  linked_order_id?: string | null;
  legacy_parent_id?: string | null;
  order_index?: string | number | null;
  status?: string | null;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido.' });
  if (!supabaseUrl || !serviceKey || !anonKey)
    return res.status(503).json({ error: 'Backend fiscal indisponível.' });

  const authorizationHeader = Array.isArray(req.headers.authorization)
    ? req.headers.authorization[0]
    : req.headers.authorization;
  const accessToken = String(authorizationHeader || '').replace(/^Bearer\s+/i, '').trim();
  if (!accessToken) return res.status(401).json({ error: 'Autenticação necessária.' });

  const orderIds = Array.isArray(req.body?.orderIds)
    ? [...new Set((req.body.orderIds as unknown[]).map((id) => String(id)))]
    : [];
  if (
    orderIds.length === 0 ||
    orderIds.length > 30 ||
    orderIds.some((id) => !orderIdPattern.test(id))
  )
    return res.status(400).json({ error: 'Lista de pedidos inválida.' });

  const userDb = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
  const db = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const { data: visibleOrders, error: visibleOrdersError } = await userDb
    .from('orders')
    .select('id,status')
    .in('id', orderIds);
  if (visibleOrdersError)
    return res.status(503).json({ error: 'Não foi possível validar os pedidos visíveis.' });
  const visibleOrderIds = new Set((visibleOrders || []).map((order) => String(order.id)));
  if (orderIds.some((id) => !visibleOrderIds.has(id)))
    return res.status(403).json({ error: 'Um ou mais pedidos não estão disponíveis para esta sessão.' });

  const [linkedReturnsResult, legacyReturnsResult] = await Promise.all([
    userDb
      .from('orders')
      .select('id,linked_order_id,order_index,status')
      .eq('order_type', 'return')
      .in('linked_order_id', orderIds),
    userDb
      .from('orders')
      .select('id,linked_order_id,legacy_parent_id:order_data->>linkedOrderId,order_index,status')
      .eq('order_type', 'return')
      .in('order_data->>linkedOrderId', orderIds),
  ]);
  if (linkedReturnsResult.error || legacyReturnsResult.error)
    return res.status(503).json({ error: 'Não foi possível consultar as devoluções vinculadas.' });

  const returnOrdersById = new Map<string, ReturnOrderRow>();
  for (const row of [...(linkedReturnsResult.data || []), ...(legacyReturnsResult.data || [])])
    returnOrdersById.set(String(row.id), row as ReturnOrderRow);
  const returnOrders = Array.from(returnOrdersById.values());
  const scopedOrderIds = [...new Set([...orderIds, ...returnOrders.map((order) => String(order.id))])];
  const { data: documents, error: documentsError } = await userDb
    .from('nfe_documents')
    .select(documentSelect)
    .in('order_id', scopedOrderIds);
  if (documentsError)
    return res.status(503).json({ error: 'Não foi possível consultar os documentos fiscais.' });

  const returnDocumentIds = [
    ...new Set(
      (documents || [])
        .filter((document) => document.document_type === 'return' && document.id)
        .map((document) => String(document.id))
    ),
  ];
  let itemQuantityByDocumentId = new Map<string, number>();
  let authorizationXmlByDocumentId = new Map<string, string>();
  if (returnDocumentIds.length) {
    const [itemsResult, protocolResult] = await Promise.all([
      userDb
        .from('nfe_document_items')
        .select('document_id,billed_quantity')
        .in('document_id', returnDocumentIds),
      userDb
        .from('nfe_documents')
        .select('id,xml_protocolo')
        .in('id', returnDocumentIds),
    ]);
    const { data: items, error: itemsError } = itemsResult;
    const { data: protocols, error: protocolError } = protocolResult;
    if (!itemsError) {
      for (const item of items || []) {
        const documentId = String(item.document_id || '');
        if (!documentId) continue;
        itemQuantityByDocumentId.set(
          documentId,
          (itemQuantityByDocumentId.get(documentId) || 0) + Number(item.billed_quantity || 0)
        );
      }
    }
    if (!protocolError) {
      authorizationXmlByDocumentId = new Map(
        (protocols || []).map((document) => [String(document.id), String(document.xml_protocolo || '')])
      );
    }
  }

  const returnOrderById = new Map(returnOrders.map((order) => [String(order.id), order]));
  const compactDocuments = (documents || []).map((document) => {
    const returnOrder = returnOrderById.get(String(document.order_id || ''));
    return {
      id: document.id,
      order_id: document.order_id,
      status: document.status,
      document_type: document.document_type,
      ambiente: document.ambiente,
      created_at: document.created_at,
      numero_nfe: document.numero_nfe,
      serie: document.serie,
      modelo: document.modelo,
      valor_total: document.valor_total,
      issuedAt:
        document.id && document.document_type === 'return'
          ? getAuthorizedAt(authorizationXmlByDocumentId.get(String(document.id)) || '', '') || null
          : null,
      ...(document.document_type === 'return'
        ? {
            returnOrderCode:
              returnOrder?.order_index || returnOrder?.id || document.order_id || null,
            itemQuantity: document.id
              ? itemQuantityByDocumentId.get(String(document.id))
              : undefined,
          }
        : {}),
    };
  });
  const cancelledOrderIds = (visibleOrders || [])
    .filter((order) => ['cancelled', 'cancelado'].includes(String(order.status || '').toLowerCase()))
    .map((order) => String(order.id));

  const outboundDocumentIds = [
    ...new Set(
      (documents || [])
        .filter((document) => document.document_type === 'outbound')
        .map((document) => String(document.id))
    ),
  ];
  const scopedDocumentIds = [...new Set((documents || []).map((document) => String(document.id)))];
  let eventsResult: { data: any[] | null; error: any | null } = { data: [], error: null };
  let draftsResult: { data: any[] | null; error: any | null } = { data: [], error: null };
  if (scopedDocumentIds.length) {
    const { data, error } = await db
      .from('nfe_document_events')
      .select('document_id,status,attempt_number,requested_at')
      .in('document_id', scopedDocumentIds)
      .eq('event_type', '110111')
      .order('attempt_number', { ascending: false });
    eventsResult = { data, error };
  }
  if (outboundDocumentIds.length) {
    const { data, error } = await db
      .from('nfe_operation_drafts')
      .select('original_document_id,operation_kind,environment,status,created_at')
      .in('original_document_id', outboundDocumentIds)
      .eq('operation_kind', 'estorno')
      .order('created_at', { ascending: false });
    draftsResult = { data, error };
  }
  if (eventsResult.error || draftsResult.error)
    return res.status(503).json({ error: 'Não foi possível consultar o histórico fiscal.' });

  const latestEvents = new Map<string, (typeof eventsResult.data)[number]>();
  for (const event of eventsResult.data || []) {
    if (!latestEvents.has(String(event.document_id)))
      latestEvents.set(String(event.document_id), event);
  }
  const latestDrafts = new Map<string, (typeof draftsResult.data)[number]>();
  for (const draft of draftsResult.data || []) {
    if (!latestDrafts.has(String(draft.original_document_id)))
      latestDrafts.set(String(draft.original_document_id), draft);
  }

  return res.status(200).json({
    documents: compactDocuments,
    returnOrders: returnOrders.map((order) => ({
      id: order.id,
      linked_order_id: order.linked_order_id || order.legacy_parent_id || null,
      order_index: order.order_index,
    })),
    cancellationEvents: Array.from(latestEvents.values()).map((event) => ({
      document_id: event.document_id,
      status: event.status,
      requested_at: event.requested_at,
    })),
    cancelledOrderIds,
    estornoDrafts: Array.from(latestDrafts.values()).map((draft) => ({
      original_document_id: draft.original_document_id,
      operation_kind: draft.operation_kind,
      environment: draft.environment,
      status: draft.status,
      created_at: draft.created_at,
    })),
  });
}
