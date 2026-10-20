import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseSecretKey, getSupabaseUrl, getSupabaseAnonKey } from '../supabaseSecretKey';
import { authorizeFiscalOperator } from './fiscalAuthorization';
import {
  handleFinalizeAction,
  handleResumeAction,
  handleAuditAndConfirmAction,
} from './order-edit-audit/auditActionHandlers';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido.' });

  const supabaseUrl = getSupabaseUrl();
  const serviceKey = getSupabaseSecretKey() || '';
  const anonKey = getSupabaseAnonKey();
  if (!supabaseUrl || !serviceKey || !anonKey)
    return res.status(503).json({ error: 'Serviço de auditoria fiscal indisponível.' });

  const header = Array.isArray(req.headers.authorization)
    ? req.headers.authorization[0]
    : req.headers.authorization;
  const accessToken = String(header || '').replace(/^Bearer\s+/i, '').trim();
  const orderId = String(req.body?.orderId || '');
  const action = String(req.body?.action || 'audit');
  const submitted = req.body?.proposedOrder;

  if (!accessToken) return res.status(401).json({ error: 'Autenticação necessária.' });
  if (
    !uuid.test(orderId) ||
    !['audit', 'confirm', 'resume', 'finalize'].includes(action) ||
    (!['resume', 'finalize'].includes(action) &&
      (!submitted || typeof submitted !== 'object' || Array.isArray(submitted)))
  )
    return res.status(400).json({ error: 'Dados de edição do pedido inválidos.' });

  if (submitted && JSON.stringify(submitted).length > 1_000_000)
    return res.status(413).json({ error: 'Os dados de edição excedem o limite permitido.' });

  const userDb = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
  const db = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  let fiscalOperatorId: string | null = null;
  if (action === 'confirm' || action === 'finalize') {
    const authorization = await authorizeFiscalOperator(db, header);
    if (!authorization.ok)
      return res.status(authorization.status).json({ error: authorization.message });
    fiscalOperatorId = authorization.userId;
  }

  const { data: order, error: orderError } = await userDb
    .from('orders')
    .select(
      'id,order_type,status,order_data,updated_at,delivery_status,delivery_started_at,delivery_arrived_at,delivery_finished_at,delivery_method'
    )
    .eq('id', orderId)
    .maybeSingle();

  if (orderError)
    return res.status(503).json({ error: 'Não foi possível carregar o pedido atual.' });
  if (!order) return res.status(403).json({ error: 'Pedido indisponível para esta sessão.' });
  if (!['sale', 'showroom'].includes(String(order.order_type || order.order_data?.orderType || 'sale')))
    return res.status(409).json({ error: 'A auditoria de edição fiscal está disponível para vendas.' });

  const currentData = (order.order_data || {}) as Record<string, any>;

  if (action === 'finalize') {
    return handleFinalizeAction({
      db,
      orderId,
      replacementId: String(req.body?.replacementId || ''),
      res,
    });
  }

  if (action === 'resume') {
    return handleResumeAction({ db, orderId, currentData, res });
  }

  return handleAuditAndConfirmAction({
    db,
    order,
    orderId,
    action: action as 'audit' | 'confirm',
    submitted,
    currentData,
    reqBody: req.body,
    fiscalOperatorId,
    res,
  });
}
