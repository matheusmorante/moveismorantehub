import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { authorizeFiscalOperator } from './fiscalAuthorization';
import { getAuthorizedAt } from '../../erp/src/pages/utils/nfe/nfeEventRules';
import { hasGoodsCirculated } from '../../erp/src/pages/utils/nfe/cancellationEligibility';
import { getFiscalCancellationPolicy } from '../../erp/src/pages/utils/nfe/fiscalCancellationPolicy';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido.' });
  if (!supabaseUrl || !serviceKey)
    return res.status(503).json({ error: 'Backend fiscal indisponível.' });

  const db = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const authorization = await authorizeFiscalOperator(db, req.headers.authorization);
  if (!authorization.ok) return res.status(authorization.status).json({ error: authorization.message });

  const orderId = String(req.body?.orderId || '');
  const preview = req.body?.preview === true;
  if (!uuid.test(orderId)) return res.status(400).json({ error: 'Pedido inválido.' });

  const { data: order, error: orderError } = await db
    .from('orders')
    .select('id,status,delivery_status,order_data')
    .eq('id', orderId)
    .maybeSingle();
  if (orderError) return res.status(503).json({ error: 'Não foi possível validar o pedido.' });
  const orderStatus = String(order?.status || '').toLowerCase();
  if (!order || (preview
    ? !['scheduled', 'agendado', 'aguardando retirada'].includes(orderStatus)
    : !['cancelled', 'cancelado'].includes(orderStatus)))
    return res.status(409).json({ error: preview ? 'O pedido não está em um estado cancelável.' : 'Cancele o pedido antes de tratar o documento fiscal.' });
  if (hasGoodsCirculated(order))
    return res.status(409).json({ error: 'Mercadoria circulou; o fluxo correto é devolução.' });

  const { data: documents, error: documentsError } = await db
    .from('nfe_documents')
    .select('id,status,ambiente,modelo,xml_protocolo,created_at')
    .eq('order_id', orderId)
    .eq('document_type', 'outbound')
    .in('status', ['autorizada', 'homologada'])
    .order('created_at', { ascending: false });
  if (documentsError) return res.status(503).json({ error: 'Não foi possível consultar as NF-e do pedido.' });
  if (!documents?.length) return res.status(200).json({ action: 'none', hasAuthorizedInvoice: false });
  if (documents.length !== 1)
    return res.status(409).json({ action: 'manual_review', error: 'Mais de uma NF-e autorizada está vinculada ao pedido.' });

  const document = documents[0];
  if (![1, 2].includes(Number(document.ambiente)))
    return res.status(409).json({ action: 'manual_review', error: 'Ambiente fiscal da NF-e inválido.' });
  const policy = getFiscalCancellationPolicy({
    model: String(document.modelo),
    authorizedAt: getAuthorizedAt(document.xml_protocolo || '', document.created_at || ''),
    status: String(document.status),
    environment: Number(document.ambiente) as 1 | 2,
    goodsCirculated: false,
    operationDidNotOccur: true,
  });
  if (policy.action === 'manual_review' && !preview)
    return res.status(409).json({ action: policy.action, error: policy.reason });

  return res.status(200).json({
    action: policy.action,
    hasAuthorizedInvoice: true,
    model: document.modelo,
    status: document.status,
    reason: policy.reason,
    documentId: document.id,
    environment: document.ambiente,
    deadline: policy.deadline?.toISOString() || null,
    requestedBy: authorization.userId,
  });
}
