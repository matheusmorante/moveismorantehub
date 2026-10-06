import { getSupabaseSecretKey } from '../supabaseSecretKey';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import type { FiscalDatabase } from './fiscalDatabaseTypes';
import { authorizeFiscalOperator } from './fiscalAuthorization';
import {
  MISSING_AUTHORIZED_ORIGINAL_NFE_MESSAGE,
  resolveFiscalReturnMethod,
  validateAuthorizedOutboundNfe,
  validateSupportedReturnEntryScenario,
} from './returnFiscalRules';
import {
  getReturnCfopOptionsForSourceItem,
  validateReturnTaxScenario,
} from '../../shared-utils/fiscalOperationContext';
import { originalItemCfop } from '../../erp/src/pages/utils/nfe/fiscalCfopResolution';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const serviceKey = getSupabaseSecretKey() || '';
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function getCompanyFiscalSettings(value: unknown): Record<string, unknown> {
  const root = asRecord(value);
  const nested = Object.keys(asRecord(root.data)).length ? asRecord(root.data) : root;
  const fiscalDefaults = asRecord(nested.fiscalDefaults);
  return Object.keys(fiscalDefaults).length ? fiscalDefaults : nested;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'OPTIONS,GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Método não permitido.' });
  if (!supabaseUrl || !serviceKey)
    return res.status(503).json({ error: 'Serviço fiscal indisponível.' });

  const returnOrderId = String(req.query.returnOrderId || '');
  if (!uuid.test(returnOrderId))
    return res.status(400).json({ error: 'Devolução fiscal inválida.' });

  const db = createClient<FiscalDatabase>(supabaseUrl, serviceKey);
  const fiscalAuthorization = await authorizeFiscalOperator(db, req.headers.authorization);
  if (!fiscalAuthorization.ok)
    return res.status(fiscalAuthorization.status).json({ error: fiscalAuthorization.message });

  try {
    const [{ data: returnOrder, error: returnError }, { data: settingsRow, error: settingsError }] =
      await Promise.all([
        db
          .from('orders')
          .select('id,order_type,status,deleted,items,order_index,linked_order_id,order_data')
          .eq('id', returnOrderId)
          .maybeSingle(),
        db.from('settings').select('data').eq('id', 'app').maybeSingle(),
      ]);
    if (returnError || settingsError) throw returnError || settingsError;
    if (!returnOrder || returnOrder.order_type !== 'return' || returnOrder.deleted) {
      return res.status(404).json({ error: 'Pedido de devolução não encontrado.' });
    }
    if (returnOrder.status !== 'fulfilled') {
      return res.status(200).json({
        eligible: false,
        returnOrderId,
        hasAuthorizedOriginal: false,
        reason: 'A devolução precisa estar recebida/coletada antes da emissão fiscal.',
        sources: [],
      });
    }

    const orderData = asRecord(returnOrder.order_data);
    const returnMethod = resolveFiscalReturnMethod(orderData);
    const linkedSaleOrderId = String(returnOrder.linked_order_id || orderData.linkedOrderId || '');
    if (!uuid.test(linkedSaleOrderId)) {
      return res.status(200).json({
        eligible: false,
        returnOrderId,
        hasAuthorizedOriginal: false,
        reason: MISSING_AUTHORIZED_ORIGINAL_NFE_MESSAGE,
        sources: [],
      });
    }

    const { data: allocations, error: allocationsError } = await db
      .from('nfe_return_item_allocations')
      .select(
        'id,return_order_id,return_item_index,original_document_id,original_item_number,quantity,fiscal_return_document_id,created_at'
      )
      .eq('return_order_id', returnOrderId)
      .order('return_item_index');
    if (allocationsError) throw allocationsError;
    if (!allocations?.length) {
      return res.status(200).json({
        eligible: false,
        returnOrderId,
        hasAuthorizedOriginal: false,
        reason: MISSING_AUTHORIZED_ORIGINAL_NFE_MESSAGE,
        sources: [],
      });
    }

    const sourceIds = [...new Set(allocations.map((item) => item.original_document_id))];
    const [{ data: sourceDocuments, error: sourceError }, { data: originalLines, error: linesError }, { data: returnDocuments, error: returnDocumentsError }, { data: drafts, error: draftsError }] =
      await Promise.all([
        db
          .from('nfe_documents')
          .select(
            'id,order_id,document_type,status,ambiente,modelo,chave_acesso,numero_nfe,serie,numero_protocolo,xml_protocolo,xml_nfe'
          )
          .in('id', sourceIds),
        db
          .from('nfe_document_items')
          .select('id,document_id,item_number,billed_quantity,product_code,description,product_xml,taxes_xml')
          .in('document_id', sourceIds),
        db
          .from('nfe_documents')
          .select('id,original_document_id,related_return_order_id,document_type,status,ambiente,chave_acesso')
          .eq('related_return_order_id', returnOrderId),
        db
          .from('nfe_operation_drafts')
          .select('id,original_document_id,return_order_id,environment,status,document_id,updated_at')
          .eq('return_order_id', returnOrderId)
          .in('original_document_id', sourceIds)
          .order('updated_at', { ascending: false }),
      ]);
    if (sourceError || linesError || returnDocumentsError || draftsError)
      throw sourceError || linesError || returnDocumentsError || draftsError;

    const fiscalSettings = getCompanyFiscalSettings(settingsRow?.data);
    const companyUf = String(fiscalSettings.companyUF || '');
    const companyCnpj = String(fiscalSettings.companyCnpj || '').replace(/\D/g, '');
    const sourceById = new Map((sourceDocuments || []).map((source) => [source.id, source]));
    const lineByDocumentAndNumber = new Map(
      (originalLines || []).map((line) => [`${line.document_id}:${line.item_number}`, line])
    );
    const sourceGroups = sourceIds.map((sourceId) => {
      const source = sourceById.get(sourceId);
      const sourceAllocations = allocations.filter((item) => item.original_document_id === sourceId);
      const authorizationError = validateAuthorizedOutboundNfe(
        source,
        linkedSaleOrderId,
        source && ([1, 2].includes(Number(source.ambiente)) ? (Number(source.ambiente) as 1 | 2) : undefined)
      );
      const companyCnpjMatchesSource = Boolean(
        source && companyCnpj.length === 14 && source.chave_acesso.slice(6, 20) === companyCnpj
      );
      const sourceAuthorized =
        !authorizationError &&
        Boolean(source) &&
        companyCnpjMatchesSource;
      let blockReason = authorizationError;
      if (!authorizationError && !companyCnpj) {
        blockReason = 'CNPJ do estabelecimento ausente na configuração fiscal do servidor.';
      }
      if (!authorizationError && source && companyCnpj && !companyCnpjMatchesSource) {
        blockReason = MISSING_AUTHORIZED_ORIGINAL_NFE_MESSAGE;
      }
      if (!blockReason && source) {
        blockReason = validateSupportedReturnEntryScenario(
          source.xml_nfe || '',
          companyUf,
          returnMethod
        );
      }

      const quantities = new Map<number, number>();
      for (const allocation of sourceAllocations) {
        const quantity = Number(allocation.quantity);
        const originalLine = lineByDocumentAndNumber.get(
          `${sourceId}:${allocation.original_item_number}`
        );
        if (
          !Number.isInteger(allocation.return_item_index) ||
          !Number.isInteger(allocation.original_item_number) ||
          !Number.isFinite(quantity) ||
          quantity <= 0 ||
          !originalLine ||
          (quantities.get(allocation.original_item_number) || 0) + quantity >
            Number(originalLine.billed_quantity) + 0.00005
        ) {
          blockReason ||= 'A alocação dos itens devolvidos não corresponde às quantidades fiscais da NF-e original.';
        }
        if (
          originalLine &&
          !getReturnCfopOptionsForSourceItem(
            originalItemCfop(originalLine.product_xml) || '',
            originalLine.taxes_xml
          ).length
        ) {
          blockReason ||= `Não há CFOP de devolução aprovado para o item original ${allocation.original_item_number}.`;
        }
        if (originalLine) {
          blockReason ||= validateReturnTaxScenario(source?.xml_nfe || '', originalLine.taxes_xml);
        }
        quantities.set(
          allocation.original_item_number,
          (quantities.get(allocation.original_item_number) || 0) + quantity
        );
      }

      const returnedDocument = (returnDocuments || []).find(
        (document) => document.original_document_id === sourceId && document.document_type === 'return'
      );
      const existingDraft = (drafts || []).find((draft) => draft.original_document_id === sourceId);
      let state: 'ready' | 'draft' | 'rejected' | 'pending' | 'authorized' | 'cancelled' | 'blocked' =
        blockReason ? 'blocked' : 'ready';
      if (!blockReason && returnedDocument) {
        state = ['autorizada', 'homologada'].includes(returnedDocument.status)
          ? 'authorized'
          : returnedDocument.status === 'cancelada' || returnedDocument.status === 'cancelled'
            ? 'cancelled'
            : 'blocked';
        if (state === 'blocked') blockReason = 'A NF-e de devolução vinculada exige reconciliação fiscal.';
      } else if (!blockReason && existingDraft) {
        state = ['transmitting', 'unknown'].includes(existingDraft.status)
          ? 'pending'
          : existingDraft.status === 'rejected'
            ? 'rejected'
            : 'draft';
      }

      return {
        source: source
          && sourceAuthorized
          ? {
              id: source.id,
              order_id: source.order_id,
              modelo: source.modelo,
              ambiente: Number(source.ambiente),
              numero_nfe: Number(source.numero_nfe),
              serie: String(source.serie),
              chave_acesso: source.chave_acesso,
            }
          : null,
        state,
        sourceAuthorized,
        blockReason,
        draftId: existingDraft?.id || null,
        returnDocumentId: returnedDocument?.id || null,
        allocatedItems: sourceAllocations.map((allocation) => ({
          returnItemIndex: allocation.return_item_index,
          originalItemNumber: allocation.original_item_number,
          quantity: Number(allocation.quantity),
          productCode:
            lineByDocumentAndNumber.get(`${sourceId}:${allocation.original_item_number}`)
              ?.product_code || '',
        })),
      };
    });

    const hasAuthorizedOriginal = sourceGroups.some((group) => group.sourceAuthorized);
    const eligible = sourceGroups.some((group) =>
      ['ready', 'draft', 'rejected', 'pending', 'authorized'].includes(group.state)
    );
    return res.status(200).json({
      eligible,
      returnOrderId,
      returnOrderIndex: returnOrder.order_index,
      linkedSaleOrderId,
      hasAuthorizedOriginal,
      reason: eligible
        ? null
        : hasAuthorizedOriginal
          ? sourceGroups.find((group) => group.blockReason)?.blockReason || 'A NF-e de devolução vinculada está cancelada; uma nova emissão exige revisão fiscal.'
          : MISSING_AUTHORIZED_ORIGINAL_NFE_MESSAGE,
      sources: sourceGroups,
    });
  } catch (error: unknown) {
    console.error(
      '[NF-e Return Eligibility] Falha ao conferir vínculo fiscal:',
      error instanceof Error ? error.message : 'erro desconhecido'
    );
    return res.status(503).json({ error: 'Não foi possível verificar a elegibilidade fiscal da devolução.' });
  }
}
