import { getSupabaseSecretKey } from '../supabaseSecretKey';
import { hasPendingOrderEditEstorno } from './orderEditReplacement';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import type { FiscalDatabase } from './fiscalDatabaseTypes';
import { getAuthorizedAt } from '../../erp/src/pages/utils/nfe/nfeEventRules';
import { getGoodsCirculationState } from '../../erp/src/pages/utils/nfe/cancellationEligibility';
import { getFiscalCancellationPolicy } from '../../erp/src/pages/utils/nfe/fiscalCancellationPolicy';
import {
  originalItemCfop,
  type FiscalCfopConfiguration,
} from '../../erp/src/pages/utils/nfe/fiscalCfopResolution';
import { normalizeReviewedFiscalBlock } from '../../erp/src/pages/utils/nfe/fiscalOperationXml';
import {
  buildProportionalReturnTaxesXml,
  buildReturnProductXml,
} from '../../erp/src/pages/utils/nfe/fiscalOperationReview';
import { authorizeFiscalOperator } from './fiscalAuthorization';
import {
  AUTOMATIC_RETURN_WORKER_SECRET_HEADER,
  isAutomaticReturnWorkerAuthorized,
} from './automaticReturnWorkerAuthorization';
import {
  loadReturnFiscalSourceContext,
  validateAuthorizedOutboundNfe,
} from './returnFiscalRules';
import { validateEstornoDraftReviewItems } from './operation-draft/draftValidation';
import { extractFiscalBlock, readFiscalOperationDraft } from './operation-draft/readOperationDraft';
import {
  getReturnCfopOptionsForSourceItem,
  getFiscalFormXmlDefaults,
  getFiscalFormRules,
  ESTORNO_NATURE_OF_OPERATION,
} from '../../shared-utils/fiscalOperationContext';

const supabaseUrl =
  process.env.VITE_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  'https://hkoxhourxwlddgsfdgws.supabase.co';
const serviceKey = getSupabaseSecretKey() || '';
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'OPTIONS,GET,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!['GET', 'POST', 'PUT'].includes(req.method || ''))
    return res.status(405).json({ error: 'Método não permitido.' });
  if (!supabaseUrl || !serviceKey)
    return res.status(503).json({ error: 'Serviço fiscal indisponível.' });
  const db = createClient<FiscalDatabase>(supabaseUrl, serviceKey);
  const automaticReturnWorker = isAutomaticReturnWorkerAuthorized(
    req.headers[AUTOMATIC_RETURN_WORKER_SECRET_HEADER]
  );
  const fiscalAuthorization = automaticReturnWorker
    ? { ok: true as const, userId: null as string | null, isAdministrator: false }
    : await authorizeFiscalOperator(db, req.headers.authorization);
  if (!fiscalAuthorization.ok)
    return res.status(fiscalAuthorization.status).json({ error: fiscalAuthorization.message });

  try {
    if (req.method === 'GET') {
      const draftId = String(req.query.id || '');
      if (!uuid.test(draftId)) return res.status(400).json({ error: 'Rascunho fiscal inválido.' });
      return await readFiscalOperationDraft(db, draftId, automaticReturnWorker, res);
    }
    if (req.method === 'PUT') {
      const draftId = String(req.body?.draftId || '');
      const reviewData = req.body?.reviewData;
      const lines = req.body?.lines;
      if (!uuid.test(draftId) || !reviewData || !Array.isArray(lines)) {
        return res.status(400).json({ error: 'Revisão fiscal inválida ou incompleta.' });
      }
      let normalizedLines: Array<{
        draft_line_id: string;
        cfop: string;
        product_xml: string;
        taxes_xml: string;
      }>;
      try {
        normalizedLines = lines.map((line: Record<string, unknown>) => ({
          draft_line_id: String(line.draft_line_id || ''),
          cfop: String(line.cfop || ''),
          product_xml: normalizeReviewedFiscalBlock(String(line.product_xml || ''), 'prod'),
          taxes_xml: normalizeReviewedFiscalBlock(String(line.taxes_xml || ''), 'imposto'),
        }));
      } catch (error) {
        return res.status(400).json({
          error: error instanceof Error ? error.message : 'Bloco fiscal de item inválido.',
        });
      }
      const { data: draftForReview, error: draftForReviewError } = await db
        .from('nfe_operation_drafts')
        .select('id,operation_kind,finalidade,original_document_id,return_order_id,environment,status,reason,nature_of_operation')
        .eq('id', draftId)
        .maybeSingle();
      if (draftForReviewError) throw draftForReviewError;
      if (!draftForReview) return res.status(404).json({ error: 'Rascunho fiscal não encontrado.' });
      if (automaticReturnWorker && draftForReview.operation_kind !== 'return') {
        return res.status(403).json({ error: 'O worker só pode revisar rascunhos de devolução.' });
      }
      if (draftForReview.operation_kind === 'return' && draftForReview.return_order_id) {
        const sourceContext = await loadReturnFiscalSourceContext(
          db,
          draftForReview.original_document_id,
          draftForReview.return_order_id,
          Number(draftForReview.environment) as 1 | 2
        );
        if ('error' in sourceContext)
          return res.status(409).json({ error: sourceContext.error });
        const returnFormRules = getFiscalFormRules(
          'return',
          sourceContext.context.operationContext
        );
        const returnXmlDefaults = getFiscalFormXmlDefaults(returnFormRules);
        if (
          !returnXmlDefaults ||
          !returnFormRules.allowedModels.includes(
            String(sourceContext.context.source.modelo) as '55' | '65'
          ) ||
          !returnFormRules.allowedFinalidades.includes(Number(draftForReview.finalidade))
        ) {
          return res.status(409).json({
            error: 'Modelo, finalidade ou opções fiscais incompatíveis com a devolução.',
          });
        }
        let expectedRecipient = '';
        let submittedRecipient = '';
        let expectedPayment = '';
        let submittedPayment = '';
        let expectedTransport = '';
        let submittedTransport = '';
        try {
          expectedRecipient = normalizeReviewedFiscalBlock(
            extractFiscalBlock(sourceContext.context.source.xml_nfe || '', 'dest'),
            'dest'
          );
          submittedRecipient = normalizeReviewedFiscalBlock(
            String(reviewData.recipient_xml || ''),
            'dest'
          );
          expectedPayment = normalizeReviewedFiscalBlock(
            returnXmlDefaults.paymentXml,
            'pag'
          );
          submittedPayment = normalizeReviewedFiscalBlock(
            String(reviewData.payment_xml || ''),
            'pag'
          );
          expectedTransport = normalizeReviewedFiscalBlock(
            returnXmlDefaults.transportXml,
            'transp'
          );
          submittedTransport = normalizeReviewedFiscalBlock(
            String(reviewData.transport_xml || ''),
            'transp'
          );
        } catch {
          return res.status(400).json({
            error: 'Destinatário, pagamento ou transporte não formam um bloco XML válido para devolução.',
          });
        }
        if (
          submittedRecipient !== expectedRecipient ||
          submittedPayment !== expectedPayment ||
          submittedTransport !== expectedTransport ||
          String(reviewData.nature_of_operation || '').trim() !== returnXmlDefaults.natureOfOperation
        ) {
          return res.status(409).json({
            error:
              'Na devolução, destinatário, natureza, pagamento sem pagamento e transporte são determinados pelo contexto fiscal.',
          });
        }
        const { data: returnLines, error: returnLinesError } = await db
          .from('nfe_operation_draft_lines')
          .select('id,original_document_item_id,quantity,gross_value,discount_value')
          .eq('draft_id', draftId);
        if (returnLinesError || !returnLines?.length)
          return res.status(409).json({ error: 'Rascunho de devolução sem itens fiscais.' });
        const sourceLines = new Map(sourceContext.context.lines.map((line) => [line.id, line]));
        const draftLineById = new Map(returnLines.map((line) => [line.id, line]));
        if (normalizedLines.length !== returnLines.length)
          return res.status(409).json({ error: 'A revisão deve cobrir todos os itens da devolução.' });
        for (const line of normalizedLines) {
          const draftLine = draftLineById.get(line.draft_line_id);
          const sourceLine = draftLine && sourceLines.get(draftLine.original_document_item_id);
          if (!draftLine || !sourceLine || sourceLine.document_id !== draftForReview.original_document_id) {
            return res.status(409).json({ error: 'Item fiscal não pertence à NF-e original desta devolução.' });
          }
          const originalCfop = originalItemCfop(sourceLine.product_xml);
          const allowedCfops = getReturnCfopOptionsForSourceItem(
            originalCfop || '',
            sourceLine.taxes_xml
          );
          if (!allowedCfops.some((option) => option.value === line.cfop)) {
            return res.status(409).json({
              error: `CFOP ${line.cfop} não é permitido para a origem, tributação e escopo do item devolvido.`,
            });
          }
          const expectedProduct = buildReturnProductXml({
            originalProductXml: sourceLine.product_xml,
            quantity: Number(draftLine.quantity),
            originalQuantity: Number(sourceLine.billed_quantity),
            grossValue: Number(draftLine.gross_value),
            discountValue: Number(draftLine.discount_value),
            cfop: line.cfop,
          });
          const expectedTaxes = buildProportionalReturnTaxesXml(
            sourceLine.taxes_xml,
            Number(draftLine.quantity),
            Number(sourceLine.billed_quantity)
          );
          if (
            normalizeReviewedFiscalBlock(line.product_xml, 'prod') !==
              normalizeReviewedFiscalBlock(expectedProduct, 'prod') ||
            normalizeReviewedFiscalBlock(line.taxes_xml, 'imposto') !==
              normalizeReviewedFiscalBlock(expectedTaxes, 'imposto')
          ) {
            return res.status(409).json({
              error:
                'A revisão alterou campos estruturais ou tributos fora do cálculo proporcional permitido para a devolução.',
            });
          }
        }
      }
      if (draftForReview.operation_kind === 'estorno') {
        const reason = String(reviewData.reason || draftForReview.reason || '').trim();
        if (
          Number(draftForReview.finalidade) !== 3 ||
          String(reviewData.nature_of_operation || '').trim() !== ESTORNO_NATURE_OF_OPERATION ||
          reason.length < 15 ||
          Array.from(reason).length > 255 ||
          reviewData.item_taxes_confirmed !== true ||
          reviewData.totals_confirmed !== true ||
          reviewData.apportionment_review_confirmed !== true ||
          typeof reviewData.period_adjustment_text !== 'string' ||
          Array.from(reviewData.period_adjustment_text).length > 1200
        ) {
          return res.status(409).json({
            error: 'Estorno exige natureza e finalidade fixas, justificativa válida e revisão fiscal confirmada.',
          });
        }
        const { data: draftLines, error: draftLinesError } = await db
          .from('nfe_operation_draft_lines')
          .select('id,original_document_item_id,quantity,gross_value,discount_value')
          .eq('draft_id', draftId);
        if (draftLinesError || !draftLines?.length || draftLines.length !== normalizedLines.length) {
          return res.status(409).json({ error: 'A revisão deve cobrir todos os itens do estorno.' });
        }
        const { data: sourceItems, error: sourceItemsError } = await db
          .from('nfe_document_items')
          .select('id,document_id,billed_quantity,gross_value,discount_value,product_xml,taxes_xml')
          .in('id', draftLines.map((line) => line.original_document_item_id));
        const { data: settingsRow, error: settingsError } = await db
          .from('settings')
          .select('data')
          .eq('id', 'app')
          .maybeSingle();
        if (
          sourceItemsError ||
          settingsError ||
          !sourceItems ||
          sourceItems.length !== draftLines.length
        ) {
          return res.status(409).json({ error: 'Não foi possível conferir todos os itens originais do estorno.' });
        }
        const fiscalDefaults = settingsRow?.data?.fiscalDefaults as FiscalCfopConfiguration | undefined;
        const allSourceItems = await db
          .from('nfe_document_items')
          .select('id')
          .eq('document_id', draftForReview.original_document_id);
        if (allSourceItems.error || !allSourceItems.data || allSourceItems.data.length !== draftLines.length) {
          return res.status(409).json({ error: 'O estorno precisa conter todos os itens fiscais originais.' });
        }
        const estornoReviewError = validateEstornoDraftReviewItems({
          normalizedLines,
          draftLines,
          sourceItems,
          originalDocumentId: draftForReview.original_document_id,
          fiscalDefaults,
        });
        if (estornoReviewError) return res.status(409).json({ error: estornoReviewError });
      }
      const { data: savedId, error: reviewError } = await db.rpc(
        'save_nfe_operation_draft_review',
        {
          p_draft_id: draftId,
          p_review_data: reviewData,
          p_lines: normalizedLines,
          p_user_id: fiscalAuthorization.userId,
        }
      );
      if (reviewError || !savedId)
        return res
          .status(409)
          .json({ error: reviewError?.message || 'Não foi possível registrar a revisão fiscal.' });
      return res.status(200).json({ success: true, draftId: savedId, status: 'ready' });
    }

    const kind = String(req.body?.kind || '');
    const originalDocumentId = String(req.body?.originalDocumentId || '');
    const returnOrderId = req.body?.returnOrderId ? String(req.body.returnOrderId) : null;
    const environment = Number(req.body?.environment);
    const reason = String(req.body?.reason || '').trim();
    if (automaticReturnWorker && (kind !== 'return' || !returnOrderId)) {
      return res.status(403).json({ error: 'O worker só pode preparar rascunhos de devolução vinculados.' });
    }
    if (
      !['estorno', 'return'].includes(kind) ||
      !uuid.test(originalDocumentId) ||
      (returnOrderId !== null && !uuid.test(returnOrderId)) ||
      ![1, 2].includes(environment)
    ) {
      return res
        .status(400)
        .json({ error: 'Tipo, origem, devolução ou ambiente fiscal inválido.' });
    }
    const { data: source, error: sourceError } = await db
      .from('nfe_documents')
      .select(
        'id,order_id,document_type,status,ambiente,modelo,chave_acesso,numero_protocolo,xml_protocolo,xml_nfe,numero_nfe,serie,created_at'
      )
      .eq('id', originalDocumentId)
      .maybeSingle();
    if (sourceError) throw sourceError;
    if (!source) {
      return res.status(409).json({ error: 'Documento fiscal original ausente.' });
    }
    const sourceAuthorizationError = validateAuthorizedOutboundNfe(
      source,
      String(source?.order_id || ''),
      environment as 1 | 2,
      { allowNfceSource: kind === 'estorno' }
    );
    if (sourceAuthorizationError)
      return res.status(409).json({ error: sourceAuthorizationError });
    if (kind === 'estorno') {
      if (
        returnOrderId ||
        req.body?.operationDidNotOccur !== true ||
        req.body?.goodsDidNotCirculate !== true ||
        reason.length < 15
      )
        return res.status(400).json({
          error: 'Confirme operação não realizada, ausência de circulação e justifique o estorno.',
        });
      const { data: order, error: orderError } = await db
        .from('orders')
        .select(
          'id,status,delivery_status,delivery_started_at,delivery_arrived_at,delivery_finished_at,delivery_method,order_data'
        )
        .eq('id', source.order_id)
        .maybeSingle();
      if (orderError) throw orderError;
      if (
        !order ||
        (!['cancelled', 'cancelado'].includes(order.status) &&
          !(order.status === 'scheduled' && await hasPendingOrderEditEstorno(db, source.order_id, source.id, environment))) ||
        getGoodsCirculationState(order) !== 'none'
      ) {
        return res.status(409).json({
          error:
            'O estorno exige pedido cancelado ou substituição por edição registrada, sem entrega/retirada confirmada nem operação em andamento.',
        });
      }
      const authorizedAt = getAuthorizedAt(source.xml_protocolo || '', '');
      const policy = getFiscalCancellationPolicy({
        model: source.modelo,
        authorizedAt,
        status: source.status,
        environment: source.ambiente as 1 | 2,
        goodsCirculated: false,
        operationDidNotOccur: true,
        issuerUf: String(source.chave_acesso || '').slice(0, 2) === '41' ? 'PR' : '',
      });
      if (policy.action !== 'estorno') {
        return res.status(409).json({
          error: policy.reason || 'A política fiscal não autorizou a preparação do estorno.',
        });
      }
    } else if (!returnOrderId) {
      return res.status(400).json({ error: 'Informe a devolução comercial atendida.' });
    } else {
      const sourceContext = await loadReturnFiscalSourceContext(
        db,
        originalDocumentId,
        returnOrderId,
        environment as 1 | 2
      );
      if ('error' in sourceContext)
        return res.status(409).json({ error: sourceContext.error });
    }

    const { data: draftId, error: prepareError } = await db.rpc('prepare_nfe_operation_draft', {
      p_kind: kind,
      p_original_document_id: originalDocumentId,
      p_return_order_id: returnOrderId,
      p_environment: environment,
      p_reason: kind === 'estorno' ? reason : null,
      p_user_id: fiscalAuthorization.userId,
    });
    if (prepareError || !draftId)
      return res
        .status(409)
        .json({ error: prepareError?.message || 'Não foi possível preparar o rascunho fiscal.' });
    return res.status(200).json({ success: true, draftId, status: 'draft' });
  } catch (error: unknown) {
    console.error(
      '[NF-e Draft] Erro ao preparar/ler documento fiscal:',
      error instanceof Error ? error.message : 'erro desconhecido'
    );
    return res.status(503).json({ error: 'Não foi possível acessar o rascunho fiscal.' });
  }
}
