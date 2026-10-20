import type { VercelResponse } from '@vercel/node';
import {
  hasPotentialFiscalOrderEdit,
  projectOrderDataForFiscalEdit,
} from '../orderEditFiscalAudit';
import { getOrderEditFiscalPolicy } from '../../../erp/src/pages/utils/nfe/orderEditFiscalPolicy';
import { buildOrderPersistencePayload } from '../../../erp/src/pages/utils/orderPersistencePayload';
import type Order from '../../../erp/src/pages/types/order.type';
import type { AuditedDocument, AuthorizedDocumentRow } from './auditOrderEdit.types';
import {
  loadAuditedChanges,
  loadContinuationReplacements,
} from './auditContinuationLoader';

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function handleAuditAndConfirmAction({
  db,
  order,
  orderId,
  action,
  submitted,
  currentData,
  reqBody,
  fiscalOperatorId,
  res,
}: {
  db: any;
  order: any;
  orderId: string;
  action: 'audit' | 'confirm';
  submitted: Record<string, any>;
  currentData: Record<string, any>;
  reqBody: any;
  fiscalOperatorId: string | null;
  res: VercelResponse;
}) {
  const proposedOrderData = projectOrderDataForFiscalEdit(currentData, submitted);

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

  const pending = (fiscalRows || []).find((row: any) =>
    ['processando', 'pendente', 'unknown', 'transmitting'].includes(
      String(row.status || '').toLowerCase()
    )
  );

  if (pending)
    return res.status(409).json({
      status: 'blocked',
      error:
        'Existe uma tentativa fiscal sem resultado confirmado. Consulte a SEFAZ antes de editar os dados fiscais do pedido.',
    });

  const { data: replaced, error: replacedError } = await db
    .from('nfe_order_edit_replacements')
    .select('original_document_id,status,request_id,original_order_data')
    .eq('order_id', orderId);

  if (replacedError)
    return res.status(503).json({ error: 'O registro de substituição fiscal está indisponível.' });

  if (replaced?.some((row: any) => row.status !== 'completed')) {
    if (action === 'confirm' && replaced.some((row: any) => row.request_id === reqBody?.requestId)) {
      const original = replaced.find((row: any) => row.request_id === reqBody.requestId)!
        .original_order_data;
      const retryData = projectOrderDataForFiscalEdit(original, submitted);
      const payload = buildOrderPersistencePayload({ ...retryData, id: orderId } as Order);
      const { error } = await db.rpc('commit_fiscal_order_edit', {
        p_request_id: reqBody.requestId,
        p_order_id: orderId,
        p_expected_updated_at: reqBody.orderUpdatedAt,
        p_order_payload: payload,
        p_items: retryData.items || [],
        p_payments: retryData.payments || [],
        p_plans: reqBody.plans,
        p_actor_id: fiscalOperatorId!,
      });
      if (error)
        return res
          .status(409)
          .json({ error: 'A confirmação já registrada não corresponde a esta edição.' });
      return res.status(200).json({
        success: true,
        replacements: await loadContinuationReplacements(db, orderId),
        order: { ...currentData, id: orderId },
      });
    }
    return res.status(409).json({
      status: 'blocked',
      error:
        'Existe uma substituição fiscal pendente. Conclua a reversão e a nova emissão antes de editar novamente.',
    });
  }

  const authorizedDocuments = (fiscalRows || []).filter(
    (row: any) =>
      ['autorizada', 'homologada'].includes(String(row.status || '').toLowerCase()) &&
      !replaced?.some(
        (replacement: any) =>
          replacement.original_document_id === row.id && replacement.status === 'completed'
      )
  ) as AuthorizedDocumentRow[];

  if (!authorizedDocuments.length)
    return res.status(200).json({
      status: 'unchanged',
      orderUpdatedAt: order.updated_at,
      changes: [],
      documents: [],
    });

  const documents: AuditedDocument[] = [];
  try {
    for (const document of authorizedDocuments) {
      const changes = await loadAuditedChanges(db, order, document, proposedOrderData);
      if (changes.length) {
        const policy = getOrderEditFiscalPolicy(order, document);
        if (policy.action !== 'cancel' && policy.action !== 'estorno') {
          return res.status(200).json({
            status: 'blocked',
            error: policy.reason || 'Esta nota exige revisão fiscal.',
            orderUpdatedAt: order.updated_at,
            changes,
            documents: [
              {
                id: document.id,
                model: String(document.modelo),
                environment: Number(document.ambiente) as 1 | 2,
                action: policy.action,
                reason: policy.reason,
                changes,
              },
            ],
          });
        }
        documents.push({
          id: document.id,
          model: String(document.modelo),
          environment: Number(document.ambiente) as 1 | 2,
          action: policy.action,
          reason: policy.reason,
          changes,
        });
      }
    }
  } catch (error) {
    return res.status(409).json({
      status: 'blocked',
      error:
        error instanceof Error
          ? error.message
          : 'Não foi possível comprovar a integridade das notas autorizadas.',
    });
  }

  if (action === 'confirm') {
    if (
      !uuidPattern.test(String(reqBody?.requestId || '')) ||
      !documents.length ||
      reqBody.orderUpdatedAt !== order.updated_at ||
      proposedOrderData.status !== 'scheduled' ||
      JSON.stringify(reqBody.plans) !==
        JSON.stringify(
          documents.map(({ id, action: reversal, environment }) => ({
            id,
            action: reversal,
            environment,
          }))
        )
    )
      return res.status(409).json({
        error: 'O pedido ou a política fiscal mudou. Confira novamente antes de confirmar.',
      });

    if (
      documents.some((document) => document.environment === 1) &&
      reqBody.productionConfirmed !== true
    )
      return res
        .status(400)
        .json({ error: 'Confirme explicitamente a substituição fiscal em Produção.' });

    const payload = buildOrderPersistencePayload({ ...proposedOrderData, id: orderId } as Order);
    const { data: result, error } = await db.rpc('commit_fiscal_order_edit', {
      p_request_id: reqBody.requestId,
      p_order_id: orderId,
      p_expected_updated_at: order.updated_at,
      p_order_payload: payload,
      p_items: proposedOrderData.items || [],
      p_payments: proposedOrderData.payments || [],
      p_plans: reqBody.plans,
      p_actor_id: fiscalOperatorId!,
    });

    if (error)
      return res.status(409).json({
        error:
          'A edição não foi gravada. O pedido mudou ou algum efeito obrigatório falhou; confira novamente.',
      });

    return res.status(200).json({
      success: true,
      replacements: await loadContinuationReplacements(db, orderId),
      order: { ...result.order_data, id: orderId },
    });
  }

  return res.status(200).json({
    status: documents.length ? 'confirmation_required' : 'unchanged',
    orderUpdatedAt: order.updated_at,
    changes: documents.flatMap((document) => document.changes),
    documents,
  });
}
