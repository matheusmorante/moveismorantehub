import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseSecretKey } from '../supabaseSecretKey';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const serviceKey = getSupabaseSecretKey() || '';
const orderIdPattern = /^[A-Za-z0-9_-]{1,100}$/;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido.' });
  if (!supabaseUrl || !serviceKey)
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

  const db = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const { data: userData, error: userError } = await db.auth.getUser(accessToken);
  if (userError || !userData.user?.id)
    return res.status(401).json({ error: 'Sessão inválida.' });

  const { data: documents, error: documentsError } = await db
    .from('nfe_documents')
    .select('id,order_id,status,document_type,ambiente,created_at')
    .in('order_id', orderIds);
  if (documentsError)
    return res.status(503).json({ error: 'Não foi possível consultar os documentos fiscais.' });

  const { data: orders, error: ordersError } = await db
    .from('orders')
    .select('id,status')
    .in('id', orderIds);
  if (ordersError)
    return res.status(503).json({ error: 'Não foi possível consultar o estado comercial dos pedidos.' });
  const cancelledOrderIds = (orders || [])
    .filter((order) => ['cancelled', 'cancelado'].includes(String(order.status || '').toLowerCase()))
    .map((order) => String(order.id));

  const outboundDocumentIds = [
    ...new Set(
      (documents || [])
        .filter((document) => document.document_type === 'outbound')
        .map((document) => String(document.id))
    ),
  ];
  if (outboundDocumentIds.length === 0)
    return res
      .status(200)
      .json({ documents: documents || [], cancellationEvents: [], estornoDrafts: [], cancelledOrderIds });

  const [eventsResult, draftsResult] = await Promise.all([
    db
      .from('nfe_document_events')
      .select('document_id,status,attempt_number,requested_at')
      .in('document_id', outboundDocumentIds)
      .eq('event_type', '110111')
      .order('attempt_number', { ascending: false }),
    db
      .from('nfe_operation_drafts')
      .select('original_document_id,operation_kind,environment,status,created_at')
      .in('original_document_id', outboundDocumentIds)
      .eq('operation_kind', 'estorno')
      .order('created_at', { ascending: false }),
  ]);

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
    documents: documents || [],
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
