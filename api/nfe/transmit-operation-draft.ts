import { getSupabaseSecretKey } from '../supabaseSecretKey';
import { hasPendingOrderEditEstorno } from './orderEditReplacement';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import type { AppSettings } from '../../erp/src/pages/utils/settingsService';
import { generateNfeAccessKey } from '../../erp/src/pages/utils/nfe/nfeAccessKey';
import {
  buildReviewedFiscalOperationXml,
  normalizeReviewedFiscalBlock,
} from '../../erp/src/pages/utils/nfe/fiscalOperationXml';
import {
  buildProportionalReturnTaxesXml,
  buildReturnProductXml,
} from '../../erp/src/pages/utils/nfe/fiscalOperationReview';
import { parseAuthorizedInvoiceLines } from '../../erp/src/pages/utils/nfe/invoiceLineSnapshot';
import { parseSefazAuthorization } from '../../erp/src/pages/utils/nfe/sefazResponseParser';
import { authorizeFiscalOperator } from './fiscalAuthorization';
import {
  decideOperationDraftRecovery,
  getAuthorizedAt,
  parseSefazNfeSituation,
} from '../../erp/src/pages/utils/nfe/nfeEventRules';
import { validateUnsignedNfeStructure, validateNfeAgainstOfficialSchema } from './schemaValidator';
import { extractCertificateAndKey, signNfeXml } from './nfeSigner';
import { sendSoapToSefaz } from './sefazClient';
import { isNfeProductionEnabled } from './productionGuard';
import {
  appendResponsibleTechnician,
  getResponsibleTechnicianConfig,
  hasResponsibleTechnicianCsrt,
} from './responsibleTechnician';
import { resolveNfeSequenceSettings } from '../../erp/src/pages/utils/nfe/nfeSequenceSettings';
import type { FiscalDatabase } from './fiscalDatabaseTypes';
import { embeddedNfeXml } from './xmlEnvelope';
import {
  loadReturnFiscalSourceContext,
  validateAuthorizedOutboundNfe,
} from './returnFiscalRules';
import {
  getFiscalFormRules,
  getFiscalFormXmlDefaults,
  getReturnCfopOptionsForSourceItem,
  ESTORNO_NATURE_OF_OPERATION,
} from '../../shared-utils/fiscalOperationContext';
import {
  originalItemCfop,
  getEstornoCfopOptions,
  type FiscalCfopConfiguration,
} from '../../erp/src/pages/utils/nfe/fiscalCfopResolution';
import { getGoodsCirculationState } from '../../erp/src/pages/utils/nfe/cancellationEligibility';
import { getFiscalCancellationPolicy } from '../../erp/src/pages/utils/nfe/fiscalCancellationPolicy';
import { getNfeServiceEndpoint } from './fiscalEnvironmentPolicy';
import { assertNfeSignature } from './fiscalXmlAudit';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const serviceKey = getSupabaseSecretKey() || '';
type Environment = 1 | 2;

function brazilTimestamp(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value || '';
  const local = Date.UTC(
    Number(value('year')),
    Number(value('month')) - 1,
    Number(value('day')),
    Number(value('hour')),
    Number(value('minute')),
    Number(value('second'))
  );
  const offsetMinutes = Math.round((local - now.getTime()) / 60_000);
  const sign = offsetMinutes < 0 ? '-' : '+';
  const offset = Math.abs(offsetMinutes);
  return `${value('year')}-${value('month')}-${value('day')}T${value('hour')}:${value('minute')}:${value('second')}${sign}${String(Math.floor(offset / 60)).padStart(2, '0')}:${String(offset % 60).padStart(2, '0')}`;
}

function readTag(xml: string, tag: string): string | null {
  return xml.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([^<]*)</${tag}>`, 'i'))?.[1]?.trim() || null;
}

function extractXmlBlock(xml: string, tag: string): string {
  const prefix = '(?:[\\w.-]+:)?';
  return xml.match(new RegExp(`<${prefix}${tag}\\b[^>]*>[\\s\\S]*?<\\/${prefix}${tag}>`, 'i'))?.[0] || '';
}

function asFiscalSettings(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const record = value as Record<string, unknown>;
  const nested = record.data;
  return nested && typeof nested === 'object' && !Array.isArray(nested)
    ? (nested as Record<string, unknown>)
    : record;
}

function getPersistableItems(signedXml: string, draftLines: Array<Record<string, unknown>>) {
  const parsed = parseAuthorizedInvoiceLines(signedXml);
  if (parsed.length !== draftLines.length)
    throw new Error('Os itens do XML assinado diferem dos itens revisados.');
  return parsed.map((item, index) => {
    const line = draftLines.find(
      (candidate) => Number(candidate.fiscal_item_number) === item.invoiceItemNumber
    );
    if (!line || !line.reviewed_product_xml || !line.reviewed_taxes_xml || !line.reviewed_cfop) {
      throw new Error(`Item ${item.invoiceItemNumber} não possui revisão fiscal persistida.`);
    }
    if (
      normalizeReviewedFiscalBlock(item.productXml, 'prod') !==
        normalizeReviewedFiscalBlock(String(line.reviewed_product_xml), 'prod') ||
      normalizeReviewedFiscalBlock(item.taxesXml, 'imposto') !==
        normalizeReviewedFiscalBlock(String(line.reviewed_taxes_xml), 'imposto')
    )
      throw new Error(
        `XML assinado diverge da revisão fiscal do item ${item.invoiceItemNumber}.`
      );
    return {
      draft_line_id: String(line.id),
      item_number: item.invoiceItemNumber,
      product_code: item.productCode,
      description: item.description,
      quantity: item.billedQuantity,
      unit_value: item.unitValue,
      gross_value: item.grossValue,
      discount_value: item.discountValue,
      product_xml: String(line.reviewed_product_xml),
      taxes_xml: String(line.reviewed_taxes_xml),
    };
  });
}

function assertDraftXmlMatchesReview(input: {
  signedXml: string;
  certificatePem: string;
  draft: { operation_kind: string };
  review: Record<string, unknown>;
  lines: Array<Record<string, unknown>>;
  originalById: Map<string, Record<string, unknown>>;
  sourceAccessKey: string;
  environment: Environment;
  accessKey: string;
  series: string;
  number: number;
  sourceOperationType: number;
  sourceDestinationIndicator: number;
}) {
  const {
    signedXml,
    certificatePem,
    draft,
    review,
    lines,
    originalById,
    sourceAccessKey,
    environment,
    accessKey,
    series,
    number,
    sourceOperationType,
    sourceDestinationIndicator,
  } = input;
  assertNfeSignature(signedXml, certificatePem);
  const blocks = [
    ['dest', 'recipient_xml'],
    ['total', 'totals_xml'],
    ['transp', 'transport_xml'],
    ['pag', 'payment_xml'],
  ] as const;
  for (const [tag, reviewField] of blocks) {
    const expected = normalizeReviewedFiscalBlock(String(review[reviewField] || ''), tag);
    const actual = normalizeReviewedFiscalBlock(extractXmlBlock(signedXml, tag), tag);
    if (actual !== expected)
      throw new Error(`XML assinado diverge da prévia fiscal no campo ${tag}.`);
  }

  const expectedIdentity: Record<string, string> = {
    mod: '55',
    tpAmb: String(environment),
    serie: String(Number(series)),
    nNF: String(number),
    finNFe: draft.operation_kind === 'return' ? '4' : '3',
    tpNF:
      draft.operation_kind === 'return' || sourceOperationType === 1
        ? '0'
        : '1',
    idDest: draft.operation_kind === 'return' ? '1' : String(sourceDestinationIndicator),
  };
  if (!signedXml.includes(`Id="NFe${accessKey}"`))
    throw new Error('XML assinado diverge da chave de acesso reservada.');
  for (const [tag, expected] of Object.entries(expectedIdentity)) {
    if (readTag(extractXmlBlock(signedXml, 'ide'), tag) !== expected)
      throw new Error(`XML assinado diverge da identidade fiscal em ide.${tag}.`);
  }
  if (!signedXml.includes(`<tpAmb>${environment}</tpAmb>`))
    throw new Error('XML assinado diverge do ambiente fiscal selecionado.');

  const invoiceLines = getPersistableItems(
    signedXml,
    lines as Array<Record<string, unknown>>
  );
  if (draft.operation_kind === 'return') {
    const actualReferences = [
      ...signedXml.matchAll(/<DFeReferenciado>([\s\S]*?)<\/DFeReferenciado>/g),
    ].map(([, block]) => ({
      accessKey: readTag(block, 'chaveAcesso'),
      itemNumber: Number(readTag(block, 'nItem')),
    }));
    const expectedReferences = lines.map((line) => {
      const original = originalById.get(String(line.original_document_item_id || ''));
      return Number(original?.item_number);
    });
    if (
      actualReferences.length !== lines.length ||
      actualReferences.some(
        (reference, index) =>
          reference.accessKey !== sourceAccessKey ||
          reference.itemNumber !== expectedReferences[index]
      ) ||
      invoiceLines.length !== lines.length ||
      /<NFref\b/.test(signedXml)
    )
      throw new Error('Referências fiscais dos itens da devolução divergem das alocações revisadas.');
  } else {
    const ide = extractXmlBlock(signedXml, 'ide');
    const references = [...ide.matchAll(/<refNFe>(\d{44})<\/refNFe>/g)].map(([, key]) => key);
    if (references.length !== 1 || references[0] !== sourceAccessKey || /<DFeReferenciado\b/.test(signedXml))
      throw new Error('XML de estorno deve referenciar somente a chave fiscal original.');
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')
    return res.status(405).json({ success: false, error: 'Método não permitido.' });
  if (!supabaseUrl || !serviceKey)
    return res.status(503).json({ success: false, error: 'Serviço fiscal indisponível.' });

  const db = createClient<FiscalDatabase>(supabaseUrl, serviceKey);
  const fiscalAuthorization = await authorizeFiscalOperator(db, req.headers.authorization);
  if (!fiscalAuthorization.ok)
    return res.status(fiscalAuthorization.status).json({
      success: false,
      error: fiscalAuthorization.message,
    });
  const draftId = String(req.body?.draftId || '');
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(draftId)) {
    return res.status(400).json({ success: false, error: 'Rascunho fiscal inválido.' });
  }

  let reservedNfeNumber: number | undefined;
  try {
    const { data: draft, error: draftError } = await db
      .from('nfe_operation_drafts')
      .select('*')
      .eq('id', draftId)
      .maybeSingle();
    if (draftError || !draft)
      return res.status(404).json({ success: false, error: 'Rascunho fiscal não encontrado.' });
    const environment = Number(draft.environment) as Environment;
    if (![1, 2].includes(environment))
      return res
        .status(409)
        .json({ success: false, error: 'Ambiente fiscal inválido no rascunho.' });
    if (draft.status === 'authorized' && draft.document_id) {
      return res.status(200).json({
        success: true,
        status: 'authorized',
        documentId: draft.document_id,
        accessKey: draft.access_key,
      });
    }
    if (draft.status === 'rejected')
      return res.status(409).json({
        success: false,
        status: 'rejected',
        error:
          'A SEFAZ rejeitou esta tentativa. Revise o motivo antes de iniciar uma nova operação fiscal.',
      });
    if (!['ready', 'transmitting', 'unknown'].includes(draft.status)) {
      return res
        .status(409)
        .json({ success: false, error: 'Conclua e salve a revisão fiscal antes de transmitir.' });
    }
    if (environment === 1 && req.body?.productionConfirmed !== true) {
      return res.status(400).json({
        success: false,
        error: 'Confirme explicitamente a transmissão deste documento em Produção.',
      });
    }
    if (!draft.review_data || !draft.nature_of_operation || !draft.reviewed_at) {
      return res
        .status(409)
        .json({ success: false, error: 'A revisão fiscal não foi persistida.' });
    }

    const { data: source, error: sourceError } = await db
      .from('nfe_documents')
      .select('id,order_id,document_type,status,ambiente,modelo,chave_acesso,numero_protocolo,xml_protocolo,xml_nfe,numero_nfe,serie')
      .eq('id', draft.original_document_id)
      .maybeSingle();
    const returnModelOptions = getFiscalFormRules('return').allowedModels;
    const sourceModelAllowed =
      source &&
      (draft.operation_kind === 'return'
        ? returnModelOptions.includes(String(source.modelo) as '55' | '65')
        : draft.operation_kind === 'estorno' && ['55', '65'].includes(String(source.modelo)));
    if (sourceError || !source || source.document_type !== 'outbound' || !sourceModelAllowed) {
      return res.status(409).json({
        success: false,
        error:
          draft.operation_kind === 'return'
            ? 'Não é possível emitir NF-e de devolução porque este pedido não possui NF-e de saída autorizada.'
            : 'Documento original incompatível com esta operação fiscal.',
      });
    }
    if (
      source.chave_acesso !== draft.original_access_key ||
      Number(source.ambiente) !== environment ||
      source.status !== (environment === 1 ? 'autorizada' : 'homologada') ||
      !source.numero_protocolo
    ) {
      return res
        .status(409)
        .json({
          success: false,
          error:
            draft.operation_kind === 'return'
              ? 'Não é possível emitir NF-e de devolução porque este pedido não possui NF-e de saída autorizada.'
              : 'A autorização original não confere com o rascunho.',
        });
    }
    const isStoredAttempt = draft.status === 'transmitting' || draft.status === 'unknown';
    const sourceDestinationIndicator = Number(readTag(String(source.xml_nfe || ''), 'idDest'));
    const sourceOperationTypeText = readTag(String(source.xml_nfe || ''), 'tpNF');
    const sourceOperationType = Number(sourceOperationTypeText);
    let returnFiscalContext: Awaited<ReturnType<typeof loadReturnFiscalSourceContext>> | null = null;
    let returnFormRules: ReturnType<typeof getFiscalFormRules> | null = null;
    let returnXmlDefaults: ReturnType<typeof getFiscalFormXmlDefaults> = null;
    if (!isStoredAttempt) {
      if (draft.operation_kind === 'estorno') {
        if (
          ![1, 2, 3].includes(sourceDestinationIndicator) ||
          !sourceOperationTypeText ||
          !['0', '1'].includes(sourceOperationTypeText)
        ) {
          return res.status(409).json({
            success: false,
            error: 'A NF-e original não informa tpNF e indicador de destino válidos para o estorno.',
          });
        }
        if (
          Number(draft.finalidade) !== 3 ||
          draft.nature_of_operation !== ESTORNO_NATURE_OF_OPERATION ||
          String(draft.review_data.nature_of_operation || '') !== ESTORNO_NATURE_OF_OPERATION ||
          Array.from(String(draft.review_data.reason || draft.reason || '').trim()).length < 15 ||
          Array.from(String(draft.review_data.reason || draft.reason || '').trim()).length > 255 ||
          draft.review_data.item_taxes_confirmed !== true ||
          draft.review_data.totals_confirmed !== true
        ) {
          return res.status(409).json({
            success: false,
            error: 'O rascunho de estorno não contém natureza, finalidade ou revisão fiscal obrigatória.',
          });
        }
        const { data: order, error: orderError } = await db
          .from('orders')
          .select(
            'id,status,delivery_status,delivery_started_at,delivery_arrived_at,delivery_finished_at,delivery_method,order_data'
          )
          .eq('id', String(source.order_id || ''))
          .maybeSingle();
        if (orderError || !order || (!['cancelled', 'cancelado'].includes(String(order.status)) &&
          !(order.status === 'scheduled' && await hasPendingOrderEditEstorno(db, String(source.order_id), source.id, environment)))) {
          return res.status(409).json({
            success: false,
            error: 'O estorno exige pedido cancelado ou substituição por edição registrada e ainda agendada.',
          });
        }
        if (getGoodsCirculationState(order) !== 'none') {
          return res.status(409).json({
            success: false,
            error: 'A entrega/retirada está confirmada ou em andamento; o estorno está bloqueado e a NF-e original deve ser preservada.',
          });
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
          return res.status(409).json({
            success: false,
            error: policy.reason || 'O prazo normal de cancelamento ainda está aberto; não transmita o estorno.',
          });
        }
      }
      const sourceAuthorizationError = validateAuthorizedOutboundNfe(
        source,
        String(source.order_id || ''),
        environment,
        { allowNfceSource: draft.operation_kind === 'estorno' }
      );
      if (sourceAuthorizationError)
        return res.status(409).json({ success: false, error: sourceAuthorizationError });
      if (draft.operation_kind === 'return') {
        if (!draft.return_order_id)
          return res.status(409).json({ success: false, error: 'Devolução comercial ausente no rascunho.' });
        returnFiscalContext = await loadReturnFiscalSourceContext(
          db,
          draft.original_document_id,
          draft.return_order_id,
          environment
        );
        if ('error' in returnFiscalContext)
          return res.status(409).json({ success: false, error: returnFiscalContext.error });
        returnFormRules = getFiscalFormRules(
          'return',
          returnFiscalContext.context.operationContext
        );
        returnXmlDefaults = getFiscalFormXmlDefaults(returnFormRules);
        if (
          !returnXmlDefaults ||
          !returnFormRules.allowedModels.includes(String(source.modelo) as '55' | '65') ||
          !returnFormRules.allowedFinalidades.includes(Number(draft.finalidade))
        ) {
          return res.status(409).json({
            success: false,
            error: 'Modelo, finalidade ou opções fiscais incompatíveis com a devolução.',
          });
        }
      }
    }

    const { data: lines, error: linesError } = await db
      .from('nfe_operation_draft_lines')
      .select(
        'id,original_document_item_id,fiscal_item_number,quantity,gross_value,discount_value,reviewed_cfop,reviewed_product_xml,reviewed_taxes_xml'
      )
      .eq('draft_id', draft.id)
      .order('fiscal_item_number');
    if (
      linesError ||
      !lines?.length ||
      lines.some(
        (line) => !line.reviewed_cfop || !line.reviewed_product_xml || !line.reviewed_taxes_xml
      )
    ) {
      return res
        .status(409)
        .json({ success: false, error: 'Há itens sem CFOP ou blocos fiscais revisados.' });
    }
    const originalIds = lines.map((line) => line.original_document_item_id);
    const { data: originalLines, error: originalLinesError } = await db
      .from('nfe_document_items')
      .select(
        'id,document_id,item_number,billed_quantity,gross_value,discount_value,product_code,description,unit_value,product_xml,taxes_xml'
      )
      .in('id', originalIds);
    if (originalLinesError || !originalLines || originalLines.length !== lines.length) {
      return res.status(409).json({
        success: false,
        error: 'Não foi possível carregar todos os itens da NF-e original.',
      });
    }
    if (originalLines.some((line) => line.document_id !== source.id)) {
      return res.status(409).json({ success: false, error: 'Item fiscal vinculado a outro documento original.' });
    }
    const originalById = new Map(originalLines.map((line) => [line.id, line]));

    if (draft.operation_kind === 'return' && returnFiscalContext && 'context' in returnFiscalContext) {
      if (!returnFormRules || !returnXmlDefaults) {
        return res.status(409).json({
          success: false,
          error: 'O cenário da devolução não possui opções fiscais aprovadas.',
        });
      }
      const allocationRows = returnFiscalContext.context.allocations;
      const sourceLineByNumber = new Map(originalLines.map((line) => [line.item_number, line]));
      const draftLineByOriginalId = new Map(lines.map((line) => [line.original_document_item_id, line]));
      const allocationsByNumber = new Map<number, typeof allocationRows>();
      for (const allocation of allocationRows) {
        const grouped = allocationsByNumber.get(allocation.original_item_number) || [];
        grouped.push(allocation);
        allocationsByNumber.set(allocation.original_item_number, grouped);
      }
      const { data: allocationLinks, error: allocationLinksError } = await db
        .from('nfe_operation_draft_allocations')
        .select('draft_line_id,allocation_id')
        .in('draft_line_id', lines.map((line) => line.id));
      if (allocationLinksError)
        return res.status(409).json({ success: false, error: 'Não foi possível validar a alocação dos itens da devolução.' });
      for (const [originalItemNumber, allocations] of allocationsByNumber) {
        const originalLine = sourceLineByNumber.get(originalItemNumber);
        const draftLine = originalLine && draftLineByOriginalId.get(originalLine.id);
        const linksForLine = draftLine
          ? (allocationLinks || []).filter((link) => link.draft_line_id === draftLine.id)
          : [];
        const expectedAllocationIds = allocations.map((allocation) => allocation.id).sort();
        const linkedAllocationIds = linksForLine.map((link) => link.allocation_id).sort();
        const expectedQuantity = allocations.reduce((sum, allocation) => sum + allocation.quantity, 0);
        if (
          !draftLine ||
          Math.abs(Number(draftLine.quantity) - expectedQuantity) > 0.00005 ||
          JSON.stringify(expectedAllocationIds) !== JSON.stringify(linkedAllocationIds)
        ) {
          return res.status(409).json({
            success: false,
            error: 'Os itens e quantidades do rascunho não correspondem às alocações persistidas da devolução.',
          });
        }
      }
      if (allocationsByNumber.size !== lines.length) {
        return res.status(409).json({
          success: false,
          error: 'O rascunho contém item sem alocação fiscal correspondente à devolução.',
        });
      }
    }

    const { data: settingsRow, error: settingsError } = await db
      .from('settings')
      .select('*')
      .eq('id', 'app')
      .maybeSingle();
    if (settingsError || !settingsRow)
      return res.status(503).json({ success: false, error: 'Configuração fiscal indisponível.' });
    const settings = asFiscalSettings(settingsRow.data || settingsRow) as AppSettings &
      Record<string, unknown>;
    const fiscalDefaults = settings.fiscalDefaults as FiscalCfopConfiguration | undefined;
    if (draft.operation_kind === 'estorno') {
      const { data: sourceItems, error: sourceItemsError } = await db
        .from('nfe_document_items')
        .select('id')
        .eq('document_id', source.id);
      if (sourceItemsError || !sourceItems || sourceItems.length !== lines.length) {
        return res.status(409).json({
          success: false,
          error: 'O estorno precisa incluir todos os itens da NF-e original.',
        });
      }
      for (const line of lines) {
        const original = originalById.get(line.original_document_item_id);
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
          return res.status(409).json({
            success: false,
            error: 'Item do estorno diverge da origem ou não usa o CFOP inverso fiscalmente conferido.',
          });
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
          return res.status(409).json({
            success: false,
            error: 'O item do estorno precisa preservar os dados fiscais e valores originais.',
          });
        }
      }
    }
    const pfx = process.env.NFE_CERTIFICATE_BASE64;
    const password = process.env.NFE_CERTIFICATE_PASSWORD;
    if (!pfx)
      return res
        .status(503)
        .json({ success: false, error: 'Certificado digital não configurado.' });
    const certificate = extractCertificateAndKey(pfx, password || '');

    const persistAuthorized = async (
      responseXml: string,
      authorizedAccessKey: string,
      authorizedSignedXml: string
    ) => {
      const authorization = parseSefazAuthorization(responseXml);
      const protocolNumber = authorization.protocolNumber;
      if (!authorization.authorized || !protocolNumber || !/^\d{15}$/.test(protocolNumber)) {
        throw new Error('Consulta não confirmou autorização e protocolo válido da NF-e.');
      }
      const itemSnapshot = getPersistableItems(
        authorizedSignedXml,
        lines as unknown as Array<Record<string, unknown>>
      );
      const { data: documentId, error: persistError } = await db.rpc(
        'persist_authorized_nfe_operation_draft',
        {
          p_draft_id: draft.id,
          p_document_id: draft.document_id || draft.id,
          p_number: Number(authorizedAccessKey.slice(25, 34)),
          p_series: String(Number(authorizedAccessKey.slice(22, 25))),
          p_access_key: authorizedAccessKey,
          p_signed_xml: authorizedSignedXml,
          p_sefaz_response_xml: responseXml,
          p_protocol_number: protocolNumber,
          p_protocol_date: authorization.protocolDate
            ? new Date(authorization.protocolDate).toISOString()
            : null,
          p_status: environment === 1 ? 'autorizada' : 'homologada',
          p_status_reason: authorization.xMotivo || 'Autorizada pela SEFAZ.',
          p_items: itemSnapshot,
        }
      );
      if (persistError || !documentId) {
        console.error(
          '[NF-e Draft] SEFAZ autorizou, mas a RPC de persistência falhou:',
          persistError?.message || 'sem id'
        );
        return res.status(503).json({
          success: true,
          pending: true,
          reconciliationRequired: true,
          accessKey: authorizedAccessKey,
          protocolNumber,
          error:
            'A SEFAZ autorizou, mas falta reconciliar a gravação local. Consulte novamente; não retransmita.',
        });
      }
      if (draft.operation_kind === 'estorno') {
        const { data: editReplacement, error: editReplacementError } = await db
          .from('nfe_order_edit_replacements')
          .select('id')
          .eq('operation_draft_id', draft.id)
          .maybeSingle();
        const orderEditTableNotInstalled = ['42P01', 'PGRST204', 'PGRST205'].includes(
          String((editReplacementError as { code?: string } | null)?.code || '')
        );
        if (editReplacementError && !orderEditTableNotInstalled) {
          return res.status(503).json({
            success: true,
            pending: true,
            reconciliationRequired: true,
            documentId,
            accessKey: authorizedAccessKey,
            protocolNumber,
            error: 'O estorno foi autorizado, mas a conclusão da edição do pedido precisa ser retomada. Não retransmita.',
          });
        }
        if (editReplacement && !editReplacementError) {
          const { error: finalizeEditError } = await db.rpc('finalize_fiscal_order_edit', {
            p_replacement_id: editReplacement.id,
          });
          if (finalizeEditError) {
            console.error('[NF-e Draft] Estorno autorizado; conclusão da edição pendente:', finalizeEditError.message);
            return res.status(503).json({
              success: true,
              pending: true,
              reconciliationRequired: true,
              documentId,
              accessKey: authorizedAccessKey,
              protocolNumber,
              error: 'O estorno foi autorizado, mas a atualização do pedido está pendente. Retome a edição pelo ERP; não retransmita.',
            });
          }
        }
      }
      return res.status(200).json({
        success: true,
        status: 'authorized',
        documentId,
        accessKey: authorizedAccessKey,
        protocolNumber,
        cStat: authorization.cStat,
        xMotivo: authorization.xMotivo,
      });
    };

    const consultKey = async (accessKey: string): Promise<string> => {
      const queryXml = `<consSitNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00"><tpAmb>${environment}</tpAmb><xServ>CONSULTAR</xServ><chNFe>${accessKey}</chNFe></consSitNFe>`;
      return sendSoapToSefaz({
        url: getNfeServiceEndpoint('55', environment, 'NFeConsultaProtocolo4'),
        action: 'http://www.portalfiscal.inf.br/nfe/wsdl/NFeConsultaProtocolo4/nfeConsultaNF',
        serviceNamespace: 'http://www.portalfiscal.inf.br/nfe/wsdl/NFeConsultaProtocolo4',
        xmlPayload: queryXml,
        certPem: certificate.certPem,
        privateKeyPem: certificate.privateKeyPem,
      });
    };

    const reconcileStoredAttempt = async (allowRetryAfterNotFound: boolean) => {
      if (!draft.access_key || !draft.signed_xml) {
        return res.status(409).json({
          success: false,
          pending: true,
          error:
            'Tentativa sem chave/XML persistidos; requer reconciliação manual e não pode ser retransmitida.',
        });
      }
      let queryXml: string;
      try {
        queryXml = await consultKey(draft.access_key);
      } catch (error) {
        console.error(
          '[NF-e Draft] Consulta após tentativa inconclusiva falhou:',
          error instanceof Error ? error.message : 'erro desconhecido'
        );
        return res.status(502).json({
          success: false,
          pending: true,
          accessKey: draft.access_key,
          error:
            'Não foi possível reconciliar a tentativa na SEFAZ. Nenhuma retransmissão foi feita.',
        });
      }
      const situation = parseSefazNfeSituation(queryXml);
      const recoveryDecision = decideOperationDraftRecovery(situation.cStat, situation.state);
      if (recoveryDecision === 'authorized')
        return persistAuthorized(queryXml, draft.access_key, draft.signed_xml);
      if (recoveryDecision === 'confirmed_not_found' && allowRetryAfterNotFound) {
        const { data: ready, error } = await db
          .from('nfe_operation_drafts')
          .update({ status: 'ready', updated_at: new Date().toISOString() })
          .eq('id', draft.id)
          .in('status', ['transmitting', 'unknown'])
          .select('id')
          .maybeSingle();
        if (error || !ready)
          return res.status(503).json({
            success: false,
            pending: true,
            accessKey: draft.access_key,
            error:
              'A SEFAZ não localizou a chave, mas não foi possível liberar a repetição segura. Tente consultar novamente.',
          });
        return res.status(409).json({
          success: false,
          retryAllowed: true,
          status: 'ready',
          accessKey: draft.access_key,
          error:
            'A consulta à SEFAZ retornou cStat 217 (chave não localizada). Uma nova tentativa poderá reutilizar exatamente a mesma chave e XML.',
        });
      }
      return res.status(202).json({
        success: false,
        pending: true,
        accessKey: draft.access_key,
        cStat: situation.cStat,
        error: situation.xMotivo || 'A SEFAZ ainda não confirmou a situação. Não retransmita.',
      });
    };

    if (draft.status === 'transmitting' || draft.status === 'unknown')
      return reconcileStoredAttempt(true);

    if (environment === 1 && !isNfeProductionEnabled(process.env.NFE_PRODUCTION_ENABLED)) {
      return res.status(503).json({
        success: false,
        error:
          'Transmissões em Produção estão desabilitadas neste servidor. Configure NFE_PRODUCTION_ENABLED=true somente após aprovação fiscal.',
      });
    }

    const review = draft.review_data as Record<string, unknown>;
    if (draft.operation_kind === 'return') {
      if (!draft.return_order_id || !returnFiscalContext || !('context' in returnFiscalContext)) {
        return res.status(409).json({
          success: false,
          error: 'A NF-e de devolução não possui vínculo fiscal elegível com a devolução comercial.',
        });
      }
      if (!returnFormRules || !returnXmlDefaults) {
        return res.status(409).json({
          success: false,
          error: 'O cenário da devolução não possui opções fiscais aprovadas.',
        });
      }
      const fixedRecipient = normalizeReviewedFiscalBlock(
        extractXmlBlock(String(source.xml_nfe || ''), 'dest'),
        'dest'
      );
      const submittedRecipient = normalizeReviewedFiscalBlock(String(review.recipient_xml || ''), 'dest');
      const fixedPayment = normalizeReviewedFiscalBlock(
        returnXmlDefaults.paymentXml,
        'pag'
      );
      const submittedPayment = normalizeReviewedFiscalBlock(String(review.payment_xml || ''), 'pag');
      const fixedTransport = normalizeReviewedFiscalBlock(
        returnXmlDefaults.transportXml,
        'transp'
      );
      const submittedTransport = normalizeReviewedFiscalBlock(String(review.transport_xml || ''), 'transp');
      if (
        fixedRecipient !== submittedRecipient ||
        fixedPayment !== submittedPayment ||
        fixedTransport !== submittedTransport ||
        String(review.nature_of_operation || '').trim() !== returnXmlDefaults.natureOfOperation
      ) {
        return res.status(409).json({
          success: false,
          error: 'Os campos estruturais da NF-e de devolução divergem do cenário fiscal permitido.',
        });
      }
      for (const line of lines) {
        const original = originalById.get(line.original_document_item_id);
        if (!original) return res.status(409).json({ success: false, error: 'Item original ausente.' });
        const originalCfop = originalItemCfop(original.product_xml);
        const allowedCfops = getReturnCfopOptionsForSourceItem(originalCfop || '', original.taxes_xml);
        if (!allowedCfops.some((option) => option.value === line.reviewed_cfop)) {
          return res.status(409).json({
            success: false,
            error: `CFOP ${line.reviewed_cfop} não é permitido para o item original e o cenário de devolução.`,
          });
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
          return res.status(409).json({
            success: false,
            error: 'Item ou tributação fiscal diverge da quantidade e referência originais da devolução.',
          });
        }
      }
    }
    let accessKey = draft.access_key;
    let signedXml = draft.signed_xml;
    let nfeNumber: number;
    let series: string;
    if (!accessKey || !signedXml) {
      const issuedAt = brazilTimestamp(new Date());
      const sourceAuthorizedAt = getAuthorizedAt(String(source.xml_protocolo || ''), '');
      const fiscalPeriod = (value: string) => value.match(/^(\d{4}-\d{2})/)?.[1] || '';
      const periodAdjustmentText = String(review.period_adjustment_text || '').trim();
      if (
        draft.operation_kind === 'estorno' &&
        (review.apportionment_review_confirmed !== true ||
          !fiscalPeriod(sourceAuthorizedAt) ||
          !fiscalPeriod(issuedAt) ||
          (fiscalPeriod(issuedAt) !== fiscalPeriod(sourceAuthorizedAt) &&
            Array.from(periodAdjustmentText).length < 15))
      ) {
        return res.status(409).json({
          success: false,
          error:
            'Confirme a revisão do período de apuração e informe diferenças/acréscimos do art. 298, §2º, ou justifique por que não se aplicam.',
        });
      }
      const responsibleTechnician = getResponsibleTechnicianConfig(process.env, environment);
      if (!responsibleTechnician)
        return res.status(503).json({
          success: false,
          error:
            'Configuração obrigatória de responsável técnico/CSRT da NF-e indisponível no servidor.',
        });
      const municipalityCode = String(settings.companyCMun || '').trim();
      if (!/^\d{7}$/.test(municipalityCode))
        return res.status(503).json({
          success: false,
          error: 'Código IBGE do município do estabelecimento inválido na configuração fiscal.',
        });

      const sequence = resolveNfeSequenceSettings(settings, '55', environment);
      series = sequence.series;
      const minimumNumber = sequence.minimumNumber;
      const { data: reservedNumber, error: numberError } = await db.rpc('reserve_next_nfe_number', {
        p_modelo: '55',
        p_serie: series,
        p_ambiente: environment,
        p_numero_minimo: minimumNumber,
      });
      if (numberError || typeof reservedNumber !== 'number' || reservedNumber < 1) {
        return res.status(503).json({
          success: false,
          error: 'Não foi possível reservar número fiscal seguro para o rascunho.',
        });
      }
      nfeNumber = reservedNumber;
      reservedNfeNumber = reservedNumber;
      const generatedKey = generateNfeAccessKey({
        ufCode: '41',
        yearMonth: `${issuedAt.slice(2, 4)}${issuedAt.slice(5, 7)}`,
        cnpj: String(settings.companyCnpj || ''),
        model: '55',
        series,
        number: nfeNumber,
        emissionType: '1',
      });
      accessKey = generatedKey.accessKey;
      const baseXml = buildReviewedFiscalOperationXml({
        kind: draft.operation_kind === 'estorno' ? 'estorno' : 'return',
        returnMethod:
          draft.operation_kind === 'return' && returnFiscalContext && 'context' in returnFiscalContext
            ? returnFiscalContext.context.returnOrder.returnMethod || undefined
            : undefined,
        returnScenario:
          draft.operation_kind === 'return' && returnFiscalContext && 'context' in returnFiscalContext
            ? returnFiscalContext.context.operationContext
            : undefined,
        environment,
        originalEnvironment: environment,
        originalStatus: environment === 1 ? 'autorizada' : 'homologada',
        originalProtocol: String(source.numero_protocolo),
        originalAccessKey: String(source.chave_acesso),
        accessKey,
        randomCode: generatedKey.randomCode,
        checkDigit: generatedKey.checkDigit,
        nfeNumber,
        series,
        issuedAt,
        settings,
        natureOfOperation: draft.nature_of_operation,
        originalOperationType:
          draft.operation_kind === 'estorno' ? (sourceOperationType as 0 | 1) : undefined,
        destinationIndicator:
          draft.operation_kind === 'estorno'
            ? (sourceDestinationIndicator as 1 | 2 | 3)
            : undefined,
        recipientXml: String(review.recipient_xml || ''),
        totalsXml: String(review.totals_xml || ''),
        transportXml: String(review.transport_xml || ''),
        paymentXml: String(review.payment_xml || ''),
        reason: String(review.reason || draft.reason || ''),
        periodAdjustmentText,
        lines: lines.map((line) => {
          const original = originalById.get(line.original_document_item_id);
          if (!original)
            throw new Error(`Item original ${line.fiscal_item_number} não encontrado.`);
          return {
            originalItemNumber: Number(original.item_number),
            originalProductCode: original.product_code,
            originalDescription: original.description,
            originalNcm: readTag(String(original.product_xml), 'NCM') || undefined,
            originalCfop: originalItemCfop(original.product_xml) || undefined,
            originalTaxesXml: original.taxes_xml,
            originalUnitValue: Number(original.unit_value),
            billedQuantity: Number(original.billed_quantity),
            originalGrossValue: Number(original.gross_value),
            originalDiscountValue: Number(original.discount_value),
            quantity: Number(line.quantity),
            grossValue: Number(line.gross_value),
            discountValue: Number(line.discount_value),
            cfop: String(line.reviewed_cfop),
            productXml: String(line.reviewed_product_xml),
            taxesXml: String(line.reviewed_taxes_xml),
          };
        }),
      });
      // Fragments copied from the original invoice retain indentation nodes.
      // Remove editing whitespace before signing; never change stored signed XML.
      const xml = appendResponsibleTechnician(baseXml, accessKey, responsibleTechnician)
        .replace(/>\s+</g, '><')
        .trim();
      await validateUnsignedNfeStructure(xml);
      signedXml = signNfeXml(xml, certificate.privateKeyPem, certificate.certDerBase64);
      await validateNfeAgainstOfficialSchema(signedXml);
      assertDraftXmlMatchesReview({
        signedXml,
        certificatePem: certificate.certPem,
        draft,
        review,
        lines: lines as Array<Record<string, unknown>>,
        originalById,
        sourceAccessKey: String(source.chave_acesso),
        environment,
        accessKey,
        series,
        number: nfeNumber,
        sourceOperationType,
        sourceDestinationIndicator,
      });
      const { data: claimed, error: claimError } = await db
        .from('nfe_operation_drafts')
        .update({
          status: 'transmitting',
          access_key: accessKey,
          signed_xml: signedXml,
          transmitted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', draft.id)
        .eq('status', 'ready')
        .select('id')
        .maybeSingle();
      if (claimError || !claimed)
        return res.status(409).json({
          success: false,
          pending: true,
          error: 'Outro processo alterou este rascunho. Consulte a chave/estado antes de repetir.',
        });
    } else {
      nfeNumber = Number(accessKey.slice(25, 34));
      series = String(Number(accessKey.slice(22, 25)));
      // A 217 recovery reuses the stored XML, but it still has to pass the
      // local schema gate before claiming the draft or opening a SOAP request.
      if (!hasResponsibleTechnicianCsrt(signedXml))
        return res.status(409).json({
          success: false,
          pending: true,
          error:
            'O XML assinado desta tentativa não contém CSRT. Não é seguro alterá-lo durante retry; faça reconciliação fiscal antes de retransmitir.',
        });
      await validateNfeAgainstOfficialSchema(signedXml);
      assertDraftXmlMatchesReview({
        signedXml,
        certificatePem: certificate.certPem,
        draft,
        review,
        lines: lines as Array<Record<string, unknown>>,
        originalById,
        sourceAccessKey: String(source.chave_acesso),
        environment,
        accessKey,
        series,
        number: nfeNumber,
        sourceOperationType,
        sourceDestinationIndicator,
      });
      const { data: claimed, error: claimError } = await db
        .from('nfe_operation_drafts')
        .update({ status: 'transmitting', updated_at: new Date().toISOString() })
        .eq('id', draft.id)
        .eq('status', 'ready')
        .select('id')
        .maybeSingle();
      if (claimError || !claimed)
        return res.status(409).json({
          success: false,
          pending: true,
          error: 'Outro processo iniciou o rascunho. Consulte o estado antes de repetir.',
        });
    }

    assertDraftXmlMatchesReview({
      signedXml,
      certificatePem: certificate.certPem,
      draft,
      review,
      lines: lines as Array<Record<string, unknown>>,
      originalById,
      sourceAccessKey: String(source.chave_acesso),
      environment,
      accessKey: accessKey!,
      series,
      number: nfeNumber,
      sourceOperationType,
      sourceDestinationIndicator,
    });
    const batchXml = `<enviNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00"><idLote>${Date.now().toString().slice(-15)}</idLote><indSinc>1</indSinc>${embeddedNfeXml(signedXml)}</enviNFe>`;
    let sefazXml: string;
    try {
      sefazXml = await sendSoapToSefaz({
        url: getNfeServiceEndpoint('55', environment, 'NFeAutorizacao4'),
        action: 'http://www.portalfiscal.inf.br/nfe/wsdl/NFeAutorizacao4/nfeAutorizacaoLote',
        xmlPayload: batchXml,
        certPem: certificate.certPem,
        privateKeyPem: certificate.privateKeyPem,
      });
    } catch (error) {
      await db
        .from('nfe_operation_drafts')
        .update({ status: 'unknown', updated_at: new Date().toISOString() })
        .eq('id', draft.id)
        .eq('status', 'transmitting');
      console.error(
        '[NF-e Draft] Conexão de autorização interrompida:',
        error instanceof Error ? error.message : 'erro desconhecido'
      );
      return reconcileStoredAttempt(false);
    }

    const authorization = parseSefazAuthorization(sefazXml);
    if (authorization.authorized) return persistAuthorized(sefazXml, accessKey!, signedXml!);
    if (authorization.pending || authorization.cStat === '204') {
      await db
        .from('nfe_operation_drafts')
        .update({
          status: 'unknown',
          sefaz_response_xml: sefazXml,
          updated_at: new Date().toISOString(),
        })
        .eq('id', draft.id)
        .eq('status', 'transmitting');
      return reconcileStoredAttempt(false);
    }
    const { error: rejectionSyncError } = await db
      .from('nfe_operation_drafts')
      .update({
        status: 'rejected',
        sefaz_response_xml: sefazXml,
        updated_at: new Date().toISOString(),
      })
      .eq('id', draft.id)
      .eq('status', 'transmitting');
    if (rejectionSyncError)
      console.error('[NF-e Draft] Rejeição SEFAZ não persistida:', rejectionSyncError.message);
    return res.status(authorization.pending ? 202 : 422).json({
      success: false,
      pending: authorization.pending,
      status: rejectionSyncError ? 'unknown' : 'rejected',
      cStat: authorization.cStat,
      xMotivo: authorization.xMotivo,
      error: authorization.xMotivo || 'A SEFAZ não autorizou o documento.',
    });
  } catch (error) {
    console.error(
      '[NF-e Draft] Erro no fluxo de emissão:',
      error instanceof Error ? error.message : 'erro desconhecido'
    );
    const message = error instanceof Error ? error.message : 'Erro interno na emissão fiscal.';
    const schemaFailure = message.startsWith('XML da NF-e não passou pelo schema oficial');
    return res.status(schemaFailure ? 422 : 500).json({
      success: false,
      ...(reservedNfeNumber ? { numberReserved: true, reservedNumber: reservedNfeNumber } : {}),
      error:
        schemaFailure && reservedNfeNumber
          ? `${message} O número ${reservedNfeNumber} já foi consumido pela sequência; nenhuma transmissão foi feita. Uma nova tentativa reservará outro número.`
          : message,
    });
  }
}
