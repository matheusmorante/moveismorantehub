import type { SupabaseClient } from '@supabase/supabase-js';
import { getGoodsCirculationState } from '../../../erp/src/pages/utils/nfe/cancellationEligibility';
import { getFiscalCancellationPolicy } from '../../../erp/src/pages/utils/nfe/fiscalCancellationPolicy';
import {
  type FiscalCfopConfiguration,
  getEstornoCfopOptions,
  originalItemCfop,
} from '../../../erp/src/pages/utils/nfe/fiscalCfopResolution';
import {
  buildProportionalReturnTaxesXml,
  buildReturnProductXml,
} from '../../../erp/src/pages/utils/nfe/fiscalOperationReview';
import { normalizeReviewedFiscalBlock } from '../../../erp/src/pages/utils/nfe/fiscalOperationXml';
import { getAuthorizedAt } from '../../../erp/src/pages/utils/nfe/nfeEventRules';
import {
  ESTORNO_NATURE_OF_OPERATION,
  getReturnCfopOptionsForSourceItem,
  getFiscalFormRules,
  type FiscalFormXmlDefaults,
} from '../../../shared-utils/fiscalOperationContext';
import type { FiscalDatabase } from '../fiscalDatabaseTypes';
import { hasPendingOrderEditEstorno } from '../orderEditReplacement';
import { validateAuthorizedOutboundNfe } from '../returnFiscalRules';
import { extractXmlBlock, type Environment } from './draftXmlAudit';

export type DraftRecord = FiscalDatabase['public']['Tables']['nfe_operation_drafts']['Row'];
export type SourceDocumentRecord = {
  id: string;
  order_id: string | null;
  document_type: string;
  status: string;
  ambiente: number;
  modelo: string;
  chave_acesso: string;
  numero_protocolo: string | null;
  xml_protocolo: string | null;
  xml_nfe: string | null;
  numero_nfe: number;
  serie: string;
};

type ReturnReviewDraftLine = Pick<
  FiscalDatabase['public']['Tables']['nfe_operation_draft_lines']['Row'],
  | 'original_document_item_id'
  | 'quantity'
  | 'gross_value'
  | 'discount_value'
  | 'reviewed_cfop'
  | 'reviewed_product_xml'
  | 'reviewed_taxes_xml'
>;

type ReturnReviewOriginalLine = Pick<
  FiscalDatabase['public']['Tables']['nfe_document_items']['Row'],
  'product_xml' | 'taxes_xml' | 'billed_quantity'
>;

export function validateDraftPreconditions(
  draft: DraftRecord,
  automaticReturnWorker: boolean,
  productionConfirmed?: boolean,
  previewOnly?: boolean
): { error?: string; status?: number; earlyAuthorized?: boolean } {
  if (automaticReturnWorker && (draft.operation_kind !== 'return' || !draft.return_order_id)) {
    return {
      status: 403,
      error: 'O worker só pode transmitir documentos de devolução vinculados.',
    };
  }

  const environment = Number(draft.environment) as Environment;
  if (![1, 2].includes(environment)) {
    return { status: 409, error: 'Ambiente fiscal inválido no rascunho.' };
  }

  if (draft.status === 'authorized' && draft.document_id) {
    return { earlyAuthorized: true };
  }

  if (draft.status === 'rejected') {
    return {
      status: 409,
      error:
        'A SEFAZ rejeitou esta tentativa. Revise o motivo antes de iniciar uma nova operação fiscal.',
    };
  }

  if (!previewOnly && !['ready', 'transmitting', 'unknown'].includes(draft.status)) {
    return {
      status: 409,
      error: 'Conclua e salve a revisão fiscal antes de transmitir.',
    };
  }

  if (previewOnly && !['draft', 'ready', 'transmitting', 'unknown'].includes(draft.status)) {
    return {
      status: 409,
      error: 'Rascunho em estado incompatível com a prévia.',
    };
  }

  if (
    !automaticReturnWorker &&
    !previewOnly &&
    environment === 1 &&
    draft.status === 'ready' &&
    productionConfirmed !== true
  ) {
    return {
      status: 400,
      error: 'Confirme explicitamente a transmissão deste documento em Produção.',
    };
  }

  if (!draft.review_data || !draft.nature_of_operation || !draft.reviewed_at) {
    return {
      status: 409,
      error: 'A revisão fiscal não foi persistida.',
    };
  }

  return {};
}

export function validateSourceDocument(
  source: SourceDocumentRecord | null,
  draft: DraftRecord,
  environment: Environment
): string | null {
  const returnModelOptions = getFiscalFormRules('return').allowedModels;
  const sourceModelAllowed =
    source &&
    (draft.operation_kind === 'return'
      ? returnModelOptions.includes(String(source.modelo) as '55' | '65')
      : draft.operation_kind === 'estorno' && ['55', '65'].includes(String(source.modelo)));

  if (!source || source.document_type !== 'outbound' || !sourceModelAllowed) {
    return draft.operation_kind === 'return'
      ? 'Não é possível emitir NF-e de devolução porque este pedido não possui NF-e de saída autorizada.'
      : 'Documento original incompatível com esta operação fiscal.';
  }

  if (
    source.chave_acesso !== draft.original_access_key ||
    Number(source.ambiente) !== environment ||
    source.status !== (environment === 1 ? 'autorizada' : 'homologada') ||
    !source.numero_protocolo
  ) {
    return draft.operation_kind === 'return'
      ? 'Não é possível emitir NF-e de devolução porque este pedido não possui NF-e de saída autorizada.'
      : 'A autorização original não confere com o rascunho.';
  }

  return null;
}

export async function validateEstornoPreconditions(params: {
  db: SupabaseClient<FiscalDatabase>;
  source: SourceDocumentRecord;
  draft: DraftRecord;
  environment: Environment;
  sourceDestinationIndicator: number;
  sourceOperationTypeText: string | null;
}): Promise<string | null> {
  const { db, source, draft, environment, sourceDestinationIndicator, sourceOperationTypeText } =
    params;

  if (
    ![1, 2, 3].includes(sourceDestinationIndicator) ||
    !sourceOperationTypeText ||
    !['0', '1'].includes(sourceOperationTypeText)
  ) {
    return 'A NF-e original não informa tpNF e indicador de destino válidos para o estorno.';
  }

  const review = (draft.review_data || {}) as Record<string, unknown>;
  if (
    Number(draft.finalidade) !== 3 ||
    draft.nature_of_operation !== ESTORNO_NATURE_OF_OPERATION ||
    String(review.nature_of_operation || '') !== ESTORNO_NATURE_OF_OPERATION ||
    Array.from(String(review.reason || draft.reason || '').trim()).length < 15 ||
    Array.from(String(review.reason || draft.reason || '').trim()).length > 255 ||
    review.item_taxes_confirmed !== true ||
    review.totals_confirmed !== true
  ) {
    return 'O rascunho de estorno não contém natureza, finalidade ou revisão fiscal obrigatória.';
  }

  const { data: order, error: orderError } = await db
    .from('orders')
    .select(
      'id,status,delivery_status,delivery_started_at,delivery_arrived_at,delivery_finished_at,delivery_method,order_data'
    )
    .eq('id', String(source.order_id || ''))
    .maybeSingle();

  if (
    orderError ||
    !order ||
    (!['cancelled', 'cancelado'].includes(String(order.status)) &&
      !(
        order.status === 'scheduled' &&
        (await hasPendingOrderEditEstorno(db, String(source.order_id), source.id, environment))
      ))
  ) {
    return 'O estorno exige pedido cancelado ou substituição por edição registrada e ainda agendada.';
  }

  if (getGoodsCirculationState(order) !== 'none') {
    return 'A entrega/retirada está confirmada ou em andamento; o estorno está bloqueado e a NF-e original deve ser preservada.';
  }

  const policy = getFiscalCancellationPolicy({
    model: String(source.modelo),
    authorizedAt: getAuthorizedAt(source.xml_protocolo || '', ''),
    status: String(source.status),
    environment,
    goodsCirculated: false,
    operationDidNotOccur: true,
    issuerUf: String(source.chave_acesso || '').slice(0, 2) === '41' ? 'PR' : '',
  });

  if (policy.action !== 'estorno') {
    return (
      policy.reason || 'O prazo normal de cancelamento ainda está aberto; não transmita o estorno.'
    );
  }

  const sourceAuthorizationError = validateAuthorizedOutboundNfe(
    source,
    String(source.order_id || ''),
    environment,
    { allowNfceSource: true }
  );
  if (sourceAuthorizationError) {
    return sourceAuthorizationError;
  }

  return null;
}

export function validateEstornoItems(params: {
  lines: Array<Record<string, unknown>>;
  sourceItemsCount: number;
  originalById: Map<string, Record<string, unknown>>;
  fiscalDefaults?: FiscalCfopConfiguration;
}): string | null {
  const { lines, sourceItemsCount, originalById, fiscalDefaults } = params;

  if (sourceItemsCount !== lines.length) {
    return 'O estorno precisa incluir todos os itens da NF-e original.';
  }

  for (const line of lines) {
    const original = originalById.get(String(line.original_document_item_id || ''));
    const sourceCfop = original ? originalItemCfop(String(original.product_xml)) : null;
    const reviewedCfop = String(line.reviewed_cfop);
    const cfopIsValid = getEstornoCfopOptions(sourceCfop, fiscalDefaults).some(
      (option) => option.value === reviewedCfop
    );
    if (
      !original ||
      !/^[56]\d{3}$/.test(sourceCfop || '') ||
      !cfopIsValid ||
      Math.abs(Number(line.quantity) - Number(original.billed_quantity)) > 0.00005 ||
      Math.abs(Number(line.gross_value) - Number(original.gross_value)) > 0.005 ||
      Math.abs(Number(line.discount_value) - Number(original.discount_value)) > 0.005
    ) {
      return 'Item do estorno diverge da origem ou não usa o CFOP inverso fiscalmente conferido.';
    }
    const expectedProduct = buildReturnProductXml({
      originalProductXml: String(original.product_xml),
      quantity: Number(original.billed_quantity),
      originalQuantity: Number(original.billed_quantity),
      grossValue: Number(original.gross_value),
      discountValue: Number(original.discount_value),
      cfop: reviewedCfop,
    });
    if (
      normalizeReviewedFiscalBlock(String(line.reviewed_product_xml), 'prod') !==
      normalizeReviewedFiscalBlock(expectedProduct, 'prod')
    ) {
      return 'O item do estorno precisa preservar os dados fiscais e valores originais.';
    }
  }

  return null;
}

export function validateEstornoDraftReviewItems(params: {
  normalizedLines: Array<{
    draft_line_id: string;
    cfop: string;
    product_xml: string;
    taxes_xml: string;
  }>;
  draftLines: Array<
    Pick<
      FiscalDatabase['public']['Tables']['nfe_operation_draft_lines']['Row'],
      'id' | 'original_document_item_id' | 'quantity' | 'gross_value' | 'discount_value'
    >
  >;
  sourceItems: Array<
    Pick<
      FiscalDatabase['public']['Tables']['nfe_document_items']['Row'],
      | 'id'
      | 'document_id'
      | 'billed_quantity'
      | 'gross_value'
      | 'discount_value'
      | 'product_xml'
      | 'taxes_xml'
    >
  >;
  originalDocumentId: string;
  fiscalDefaults?: FiscalCfopConfiguration;
}): string | null {
  const { normalizedLines, draftLines, sourceItems, originalDocumentId, fiscalDefaults } = params;
  const draftLinesById = new Map(draftLines.map((line) => [line.id, line]));
  const sourceItemsById = new Map(sourceItems.map((line) => [line.id, line]));

  for (const reviewed of normalizedLines) {
    const draftLine = draftLinesById.get(reviewed.draft_line_id);
    const sourceLine = draftLine && sourceItemsById.get(draftLine.original_document_item_id);
    if (!draftLine || !sourceLine || sourceLine.document_id !== originalDocumentId) {
      return 'Item fiscal do estorno não pertence à NF-e original.';
    }
    const sourceCfop = originalItemCfop(String(sourceLine.product_xml));
    const allowedEstornoCfops = getEstornoCfopOptions(sourceCfop, fiscalDefaults);
    const cfopIsValid = allowedEstornoCfops.some((option) => option.value === reviewed.cfop);
    if (
      !/^[56]\d{3}$/.test(sourceCfop || '') ||
      !cfopIsValid ||
      Math.abs(Number(draftLine.quantity) - Number(sourceLine.billed_quantity)) > 0.00005 ||
      Math.abs(Number(draftLine.gross_value) - Number(sourceLine.gross_value)) > 0.005 ||
      Math.abs(Number(draftLine.discount_value) - Number(sourceLine.discount_value)) > 0.005
    ) {
      return 'Item do estorno diverge da origem ou não usa o CFOP inverso fiscalmente conferido.';
    }
    const expectedProduct = buildReturnProductXml({
      originalProductXml: String(sourceLine.product_xml),
      quantity: Number(sourceLine.billed_quantity),
      originalQuantity: Number(sourceLine.billed_quantity),
      grossValue: Number(sourceLine.gross_value),
      discountValue: Number(sourceLine.discount_value),
      cfop: reviewed.cfop,
    });
    if (
      normalizeReviewedFiscalBlock(reviewed.product_xml, 'prod') !==
      normalizeReviewedFiscalBlock(expectedProduct, 'prod')
    ) {
      return 'O item do estorno precisa preservar os dados fiscais e valores originais.';
    }
  }

  return null;
}

export function validateReturnDraftReview(params: {
  sourceXml: string;
  review: Record<string, unknown>;
  returnXmlDefaults: FiscalFormXmlDefaults;
  lines: ReturnReviewDraftLine[];
  originalById: ReadonlyMap<string, ReturnReviewOriginalLine>;
}): string | null {
  const { sourceXml, review, returnXmlDefaults, lines, originalById } = params;
  const fixedRecipient = normalizeReviewedFiscalBlock(extractXmlBlock(sourceXml, 'dest'), 'dest');
  const submittedRecipient = normalizeReviewedFiscalBlock(
    String(review.recipient_xml || ''),
    'dest'
  );
  const fixedPayment = normalizeReviewedFiscalBlock(returnXmlDefaults.paymentXml, 'pag');
  const submittedPayment = normalizeReviewedFiscalBlock(String(review.payment_xml || ''), 'pag');
  const fixedTransport = normalizeReviewedFiscalBlock(returnXmlDefaults.transportXml, 'transp');
  const submittedTransport = normalizeReviewedFiscalBlock(
    String(review.transport_xml || ''),
    'transp'
  );
  if (
    fixedRecipient !== submittedRecipient ||
    fixedPayment !== submittedPayment ||
    fixedTransport !== submittedTransport ||
    String(review.nature_of_operation || '').trim() !== returnXmlDefaults.natureOfOperation
  ) {
    return 'Os campos estruturais da NF-e de devolução divergem do cenário fiscal permitido.';
  }

  for (const line of lines) {
    const original = originalById.get(line.original_document_item_id);
    if (!original) return 'Item original ausente.';
    const originalCfop = originalItemCfop(original.product_xml);
    const allowedCfops = getReturnCfopOptionsForSourceItem(
      originalCfop || '',
      original.taxes_xml
    );
    if (!allowedCfops.some((option) => option.value === line.reviewed_cfop)) {
      return `CFOP ${line.reviewed_cfop} não é permitido para o item original e o cenário de devolução.`;
    }
    const expectedProduct = buildReturnProductXml({
      originalProductXml: original.product_xml,
      quantity: Number(line.quantity),
      originalQuantity: Number(original.billed_quantity),
      grossValue: Number(line.gross_value),
      discountValue: Number(line.discount_value),
      cfop: String(line.reviewed_cfop),
    });
    const expectedTaxes = buildProportionalReturnTaxesXml(
      original.taxes_xml,
      Number(line.quantity),
      Number(original.billed_quantity)
    );
    if (
      normalizeReviewedFiscalBlock(String(line.reviewed_product_xml), 'prod') !==
        normalizeReviewedFiscalBlock(expectedProduct, 'prod') ||
      normalizeReviewedFiscalBlock(String(line.reviewed_taxes_xml), 'imposto') !==
        normalizeReviewedFiscalBlock(expectedTaxes, 'imposto')
    ) {
      return 'Item ou tributação fiscal diverge da quantidade e referência originais da devolução.';
    }
  }

  return null;
}
