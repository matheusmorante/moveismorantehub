import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseSecretKey } from '../supabaseSecretKey';
import {
  assertAuthorizedFiscalSnapshot,
  findFiscalOrderEditChanges,
  hasPotentialFiscalOrderEdit,
  projectOrderDataForFiscalEdit,
  type AuthorizedFiscalDocumentForEdit,
} from './orderEditFiscalAudit';
import type { FiscalSnapshotCandidate } from './fiscalSnapshot';
import { authorizeFiscalOperator } from './fiscalAuthorization';
import { getOrderEditFiscalPolicy } from '../../erp/src/pages/utils/nfe/orderEditFiscalPolicy';
import { buildOrderPersistencePayload } from '../../erp/src/pages/utils/orderPersistencePayload';
import type Order from '../../erp/src/pages/types/order.type';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const serviceKey = getSupabaseSecretKey() || '';
const anonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type AuthorizedDocumentRow = {
  id: string;
  order_id: string;
  emission_request_id: string | null;
  document_type: string;
  status: string;
  ambiente: number;
  modelo: string;
  numero_nfe: number;
  serie: string;
  chave_acesso: string;
  numero_protocolo: string;
  xml_protocolo: string | null;
  xml_nfe: string | null;
};

type OrderRow = {
  id: string;
  order_type?: string | null;
  status?: string | null;
  order_data?: Record<string, any> | null;
  updated_at?: string | null;
};

async function loadAuditedChanges(
  db: any,
  order: OrderRow,
  document: AuthorizedDocumentRow,
  proposedOrderData: Record<string, any>
) {
  if (!document.emission_request_id || !document.xml_nfe)
    throw new Error('A nota autorizada não possui vínculo técnico e XML íntegro para auditoria.');
  const { data: fiscalSnapshotRow, error } = await db
    .from('nfe_fiscal_snapshots')
    .select('snapshot_data')
    .eq('emission_request_id', document.emission_request_id)
    .eq('order_id', order.id)
    .maybeSingle();
  if (error || !fiscalSnapshotRow?.snapshot_data)
    throw new Error('Não existe fotografia fiscal imutável para comparar esta nota autorizada.');

  const snapshot = fiscalSnapshotRow.snapshot_data as FiscalSnapshotCandidate;
  const resolvedDocument = assertAuthorizedFiscalSnapshot(
    snapshot,
    document as AuthorizedFiscalDocumentForEdit
  );
  return findFiscalOrderEditChanges(snapshot, proposedOrderData, resolvedDocument);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido.' });
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
  if (!uuid.test(orderId) || !['audit', 'confirm', 'resume', 'finalize'].includes(action) ||
    (!['resume', 'finalize'].includes(action) && (!submitted || typeof submitted !== 'object' || Array.isArray(submitted))))
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
  const { data: visibleOrder, error: visibleOrderError } = await userDb
    .from('orders')
    .select('id')
    .eq('id', orderId)
    .maybeSingle();
  if (visibleOrderError)
    return res.status(503).json({ error: 'Não foi possível validar o acesso ao pedido.' });
  if (!visibleOrder) return res.status(403).json({ error: 'Pedido indisponível para esta sessão.' });

  const { data: order, error: orderError } = await db
    .from('orders')
    .select('id,order_type,status,order_data,updated_at,delivery_status,delivery_started_at,delivery_arrived_at,delivery_finished_at,delivery_method')
    .eq('id', orderId)
    .maybeSingle();
  if (orderError || !order)
    return res.status(503).json({ error: 'Não foi possível carregar o pedido atual.' });
  if (!['sale', 'showroom'].includes(String(order.order_type || order.order_data?.orderType || 'sale')))
    return res.status(409).json({ error: 'A auditoria de edição fiscal está disponível para vendas.' });

  const currentData = (order.order_data || {}) as Record<string, any>;
  if (action === 'finalize') {
    const replacementId = String(req.body?.replacementId || '');
    if (!uuid.test(replacementId)) return res.status(400).json({ error: 'Substituição fiscal inválida.' });
    const { data: replacement, error: replacementError } = await db
      .from('nfe_order_edit_replacements')
      .select('id')
      .eq('id', replacementId)
      .eq('order_id', orderId)
      .maybeSingle();
    if (replacementError || !replacement)
      return res.status(404).json({ error: 'Substituição fiscal não encontrada para este pedido.' });
    const { data: finalized, error: finalizeError } = await db.rpc('finalize_fiscal_order_edit', {
      p_replacement_id: replacementId,
    });
    if (finalizeError)
      return res.status(409).json({ error: 'A reversão ainda não está confirmada; o pedido continua sem alteração.' });
    return res.status(200).json({ success: true, order: { ...finalized.order_data, id: orderId } });
  }
  const loadContinuation = async () => {
    const { data: rows, error } = await db.from('nfe_order_edit_replacements')
      .select('id,original_document_id,environment,reversal_kind,status,operation_draft_id,source_document_snapshot,replacement_document_id')
      .eq('order_id', orderId).neq('status', 'completed').order('created_at');
    if (error) throw new Error('O registro de substituição fiscal está indisponível.');
    return Promise.all((rows || []).map(async (row) => {
      const { data: confirmed, error: proofError } = await db.rpc('is_order_edit_reversal_confirmed', {
        p_original_document_id: row.original_document_id,
      });
      if (proofError) throw new Error('Não foi possível comprovar a reversão da nota original.');
      const source = row.source_document_snapshot;
      return {
        id: row.id, status: row.status, action: row.reversal_kind, environment: row.environment,
        reversalConfirmed: confirmed === true, draftId: row.operation_draft_id,
        replacementDocumentId: row.replacement_document_id,
        sourceDocument: {
          id: row.original_document_id, order_id: orderId, modelo: source.modelo,
          ambiente: row.environment, numero_nfe: source.numero_nfe, serie: source.serie,
          chave_acesso: source.chave_acesso,
        },
      };
    }));
  };
  if (action === 'resume') {
    try {
      return res.status(200).json({ replacements: await loadContinuation(), order: { ...currentData, id: orderId } });
    } catch (error) {
      return res.status(503).json({ error: error instanceof Error ? error.message : 'Substituição fiscal indisponível.' });
    }
  }
  const proposedOrderData = projectOrderDataForFiscalEdit(currentData, submitted as Record<string, any>);
  if (action === 'audit' && !hasPotentialFiscalOrderEdit(currentData, proposedOrderData))
    return res.status(200).json({
      status: 'unchanged',
      orderUpdatedAt: order.updated_at,
      changes: [],
      documents: [],
    });

  const { data: fiscalRows, error: fiscalError } = await db
    .from('nfe_documents')
    .select(
      'id,order_id,emission_request_id,document_type,status,ambiente,modelo,numero_nfe,serie,chave_acesso,numero_protocolo,xml_protocolo,xml_nfe,created_at'
    )
    .eq('order_id', orderId)
    .eq('document_type', 'outbound')
    .in('modelo', ['55', '65'])
    .order('created_at', { ascending: false });
  if (fiscalError)
    return res.status(503).json({ error: 'Não foi possível consultar as notas autorizadas.' });

  const pending = (fiscalRows || []).find((row) =>
    ['processando', 'pendente', 'unknown', 'transmitting'].includes(String(row.status || '').toLowerCase())
  );
  if (pending)
    return res.status(409).json({
      status: 'blocked',
      error: 'Existe uma tentativa fiscal sem resultado confirmado. Consulte a SEFAZ antes de editar os dados fiscais do pedido.',
    });

  const { data: replaced, error: replacedError } = await db.from('nfe_order_edit_replacements')
    .select('original_document_id,status,request_id,original_order_data').eq('order_id', orderId);
  if (replacedError) return res.status(503).json({ error: 'O registro de substituição fiscal está indisponível.' });
  if (replaced?.some((row) => row.status !== 'completed')) {
    if (action === 'confirm' && replaced.some((row) => row.request_id === req.body?.requestId)) {
      // The RPC below owns the payload hash check. A retry cannot silently change the saved edit.
      const original = replaced.find((row) => row.request_id === req.body.requestId)!.original_order_data;
      const retryData = projectOrderDataForFiscalEdit(original, submitted);
      const payload = buildOrderPersistencePayload({ ...retryData, id: orderId } as Order);
      const { error } = await db.rpc('commit_fiscal_order_edit', {
        p_request_id: req.body.requestId, p_order_id: orderId, p_expected_updated_at: req.body.orderUpdatedAt,
        p_order_payload: payload, p_items: retryData.items || [], p_payments: retryData.payments || [],
        p_plans: req.body.plans, p_actor_id: fiscalOperatorId!,
      });
      if (error) return res.status(409).json({ error: 'A confirmação já registrada não corresponde a esta edição.' });
      return res.status(200).json({ success: true, replacements: await loadContinuation(), order: { ...currentData, id: orderId } });
    }
    return res.status(409).json({ status: 'blocked', error: 'Existe uma substituição fiscal pendente. Conclua a reversão e a nova emissão antes de editar novamente.' });
  }
  const authorizedDocuments = (fiscalRows || []).filter((row) =>
    ['autorizada', 'homologada'].includes(String(row.status || '').toLowerCase())
    && !replaced?.some((replacement) => replacement.original_document_id === row.id && replacement.status === 'completed')
  ) as AuthorizedDocumentRow[];
  if (!authorizedDocuments.length)
    return res.status(200).json({
      status: 'unchanged',
      orderUpdatedAt: order.updated_at,
      changes: [],
      documents: [],
    });

  const documents = [] as Array<{
    id: string;
    model: string;
    environment: 1 | 2;
    action: 'cancel' | 'estorno';
    changes: Array<{ field: string; expected: unknown; actual: unknown }>;
  }>;
  try {
    for (const document of authorizedDocuments) {
      const changes = await loadAuditedChanges(db, order, document, proposedOrderData);
      if (changes.length) {
        const policy = getOrderEditFiscalPolicy(order, document);
        if (policy.action !== 'cancel' && policy.action !== 'estorno')
          return res.status(409).json({ status: 'blocked', error: policy.reason || 'Esta nota exige revisão fiscal.' });
        documents.push({
          id: document.id,
          model: String(document.modelo),
          environment: Number(document.ambiente) as 1 | 2,
          action: policy.action,
          changes,
        });
      }
    }
  } catch (error) {
    return res.status(409).json({
      status: 'blocked',
      error: error instanceof Error ? error.message : 'Não foi possível comprovar a integridade das notas autorizadas.',
    });
  }

  if (action === 'confirm') {
    if (!uuid.test(String(req.body?.requestId || '')) || !documents.length ||
      req.body.orderUpdatedAt !== order.updated_at || proposedOrderData.status !== 'scheduled' ||
      JSON.stringify(req.body.plans) !== JSON.stringify(documents.map(({ id, action: reversal, environment }) => ({ id, action: reversal, environment }))))
      return res.status(409).json({ error: 'O pedido ou a política fiscal mudou. Confira novamente antes de confirmar.' });
    if (documents.some((document) => document.environment === 1) && req.body.productionConfirmed !== true)
      return res.status(400).json({ error: 'Confirme explicitamente a substituição fiscal em Produção.' });
    const payload = buildOrderPersistencePayload({ ...proposedOrderData, id: orderId } as Order);
    const { data: result, error } = await db.rpc('commit_fiscal_order_edit', {
      p_request_id: req.body.requestId, p_order_id: orderId, p_expected_updated_at: order.updated_at,
      p_order_payload: payload, p_items: proposedOrderData.items || [], p_payments: proposedOrderData.payments || [],
      p_plans: req.body.plans, p_actor_id: fiscalOperatorId!,
    });
    if (error) return res.status(409).json({ error: 'A edição não foi gravada. O pedido mudou ou algum efeito obrigatório falhou; confira novamente.' });
    return res.status(200).json({ success: true, replacements: await loadContinuation(), order: { ...result.order_data, id: orderId } });
  }

  return res.status(200).json({
    status: documents.length ? 'confirmation_required' : 'unchanged',
    orderUpdatedAt: order.updated_at,
    changes: documents.flatMap((document) => document.changes),
    documents,
  });
}
