import { getSupabaseSecretKey } from '../supabaseSecretKey';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { authorizeFiscalOperator } from './fiscalAuthorization';
import {
  getAuthorizedAt,
  getCancellationWindow,
} from '../../erp/src/pages/utils/nfe/nfeEventRules';
import { hasGoodsCirculated } from '../../erp/src/pages/utils/nfe/cancellationEligibility';
import { canCancelOrderDirectly } from '../../erp/src/pages/utils/orderStatusTransitionRules';
import { getFiscalCancellationPolicy } from '../../erp/src/pages/utils/nfe/fiscalCancellationPolicy';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const serviceKey = getSupabaseSecretKey() || '';
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function evaluateDocumentEligibility(
  document: any,
  order: any,
  priorEvent: any,
  now: number,
  authorizedDocumentCount = 1
) {
  const authorizationDateFor = (candidate: any) =>
    getAuthorizedAt(candidate?.xml_protocolo || '', candidate?.created_at || '');
  const deadlineFor = (candidate: any) => {
    const window = getCancellationWindow(
      String(candidate?.modelo || ''),
      authorizationDateFor(candidate),
      now
    );
    return window.deadline?.toISOString() || null;
  };
  const blocked = (reason: string, action = 'manual_review') => ({
    canProceed: false,
    action,
    reason,
    orderId: document?.order_id || null,
    orderStatus: order?.status || null,
    authorizedAt: authorizationDateFor(document),
    deadline: deadlineFor(document),
  });

  if (!document) return blocked('Documento fiscal não encontrado.', 'none');
  if (document.document_type !== 'outbound' || !document.order_id)
    return blocked('A nota não está vinculada a um pedido de venda.', 'none');
  if (!order) return blocked('Pedido de origem não encontrado.', 'none');
  if (!['55', '65'].includes(String(document.modelo)) || ![1, 2].includes(Number(document.ambiente)))
    return blocked('Modelo ou ambiente fiscal inválido.', 'none');
  if (
    !['autorizada', 'homologada'].includes(String(document.status)) ||
    (document.status === 'homologada' && Number(document.ambiente) !== 2) ||
    (document.status === 'autorizada' && Number(document.ambiente) !== 1)
  )
    return blocked('Somente uma NF-e autorizada no ambiente correspondente pode receber cancelamento.', 'none');
  if (!document.numero_protocolo)
    return blocked('A nota não tem protocolo original para referenciar o evento.', 'none');
  if (!/^\d{44}$/.test(String(document.chave_acesso || '')))
    return blocked('A nota não tem uma chave de acesso válida para o evento fiscal.', 'none');
  if (authorizedDocumentCount !== 1)
    return blocked(
      'Mais de uma NF-e autorizada está vinculada ao pedido; é necessária revisão fiscal.',
      'manual_review'
    );

  const orderStatus = String(order.status || '').toLowerCase();
  if (hasGoodsCirculated(order))
    return blocked('Mercadoria circulou; preserve a NF-e original e use o fluxo de devolução.', 'return');
  const orderType = String(order.order_type || order.order_data?.orderType || 'sale').toLowerCase();
  if (!['sale', 'showroom'].includes(orderType))
    return blocked('Este documento não está ligado a uma venda elegível para cancelamento direto.', 'none');
  if (
    !['cancelled', 'cancelado'].includes(orderStatus) &&
    !canCancelOrderDirectly({ ...order, status: orderStatus })
  )
    return blocked('O estado atual do pedido não permite cancelamento comercial.', 'none');

  if (priorEvent?.status === 'registered' || priorEvent?.status === 'unknown')
    return blocked(
      'A situação da tentativa de cancelamento precisa ser consultada na SEFAZ antes de qualquer nova ação.',
      'reconcile'
    );
  if (priorEvent?.status === 'transmitting') {
    const requestedAt = new Date(priorEvent.requested_at || '').getTime();
    const attemptAge = now - requestedAt;
    if (!Number.isFinite(requestedAt) || attemptAge < 30_000)
      return blocked('Há uma tentativa de cancelamento em processamento. Aguarde antes de repetir.', 'pending');
    return blocked(
      'A tentativa anterior não foi confirmada. Consulte a SEFAZ antes de qualquer nova ação.',
      'reconcile'
    );
  }

  const policy = getFiscalCancellationPolicy({
    model: String(document.modelo),
    authorizedAt: authorizationDateFor(document),
    status: String(document.status),
    environment: Number(document.ambiente) as 1 | 2,
    goodsCirculated: false,
    operationDidNotOccur: true,
    now,
  });
  return {
    canProceed: policy.action === 'cancel' || policy.action === 'estorno',
    action: policy.action,
    reason: policy.reason || null,
    orderId: document.order_id,
    orderStatus: order.status,
    authorizedAt: authorizationDateFor(document),
    deadline: policy.deadline?.toISOString() || null,
  };
}

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
  if (!authorization.ok)
    return res.status(authorization.status).json({ error: authorization.message });

  const documentIds = Array.isArray(req.body?.documentIds)
    ? [...new Set((req.body.documentIds as unknown[]).map((id) => String(id)))]
    : null;
  if (documentIds) {
    if (!documentIds.length || documentIds.length > 30 || documentIds.some((id) => !uuid.test(id)))
      return res.status(400).json({ error: 'Lista de documentos inválida.' });

    const { data: documents, error: documentsError } = await db
      .from('nfe_documents')
      .select('id,order_id,document_type,status,ambiente,modelo,chave_acesso,xml_protocolo,numero_protocolo,created_at')
      .in('id', documentIds);
    if (documentsError)
      return res.status(503).json({ error: 'Não foi possível validar as notas fiscais.' });

    const linkedOrderIds = [
      ...new Set((documents || []).map((document: any) => document.order_id).filter(Boolean)),
    ];
    const { data: authorizedDocuments, error: authorizedDocumentsError } = linkedOrderIds.length
      ? await db
          .from('nfe_documents')
          .select('id,order_id')
          .in('order_id', linkedOrderIds)
          .eq('document_type', 'outbound')
          .in('status', ['autorizada', 'homologada'])
      : { data: [], error: null };
    if (authorizedDocumentsError)
      return res.status(503).json({ error: 'Não foi possível conferir as NF-e do pedido.' });

    const authorizedCounts = new Map<string, number>();
    for (const document of authorizedDocuments || []) {
      const orderId = String((document as any).order_id || '');
      if (orderId) authorizedCounts.set(orderId, (authorizedCounts.get(orderId) || 0) + 1);
    }
    const { data: orders, error: ordersError } = linkedOrderIds.length
      ? await db
          .from('orders')
          .select('id,status,delivery_status,delivery_method,order_type,order_data')
          .in('id', linkedOrderIds)
      : { data: [], error: null };
    if (ordersError)
      return res.status(503).json({ error: 'Não foi possível validar os pedidos de origem.' });

    const { data: events, error: eventsError } = await db
      .from('nfe_document_events')
      .select('document_id,status,requested_at,attempt_number')
      .in('document_id', documentIds)
      .eq('event_type', '110111')
      .order('attempt_number', { ascending: false });
    if (eventsError)
      return res.status(503).json({ error: 'Não foi possível validar tentativas anteriores.' });

    const documentsById = new Map<string, any>(
      (documents || []).map((document: any) => [String(document.id), document])
    );
    const ordersById = new Map<string, any>(
      (orders || []).map((order: any) => [String(order.id), order])
    );
    const latestEvents = new Map<string, any>();
    for (const event of events || []) {
      if (!latestEvents.has(String(event.document_id))) latestEvents.set(String(event.document_id), event);
    }
    const now = Date.now();
    const eligibility = Object.fromEntries(
      documentIds.map((id) => {
        const document = documentsById.get(id);
        return [
          id,
          evaluateDocumentEligibility(
            document,
            document?.order_id ? ordersById.get(String(document.order_id)) : null,
            latestEvents.get(id),
            now,
            document?.order_id ? authorizedCounts.get(String(document.order_id)) || 0 : 0
          ),
        ];
      })
    );
    return res.status(200).json({ documents: eligibility });
  }

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
  if (
    !order ||
    (preview
      ? !['scheduled', 'agendado', 'aguardando retirada'].includes(orderStatus)
      : !['cancelled', 'cancelado'].includes(orderStatus))
  )
    return res.status(409).json({
      error: preview
        ? 'O pedido não está em um estado cancelável.'
        : 'O fluxo comercial do pedido precisa estar confirmado antes de aplicar o tratamento fiscal.',
    });
  if (hasGoodsCirculated(order))
    return res.status(409).json({ error: 'Mercadoria circulou; o fluxo correto é devolução.' });

  const { data: documents, error: documentsError } = await db
    .from('nfe_documents')
    .select('id,status,ambiente,modelo,xml_protocolo,created_at')
    .eq('order_id', orderId)
    .eq('document_type', 'outbound')
    .in('status', ['autorizada', 'homologada'])
    .order('created_at', { ascending: false });
  if (documentsError)
    return res.status(503).json({ error: 'Não foi possível consultar as NF-e do pedido.' });
  if (!documents?.length)
    return res.status(200).json({ action: 'none', hasAuthorizedInvoice: false });
  if (documents.length !== 1)
    return res.status(409).json({
      action: 'manual_review',
      error: 'Mais de uma NF-e autorizada está vinculada ao pedido.',
    });

  const document = documents[0];
  if (![1, 2].includes(Number(document.ambiente)))
    return res
      .status(409)
      .json({ action: 'manual_review', error: 'Ambiente fiscal da NF-e inválido.' });
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
