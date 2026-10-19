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
import { parseSefazAuthorization } from '../../erp/src/pages/utils/nfe/sefazResponseParser';
import { authorizeFiscalOperator } from './fiscalAuthorization';
import {
  AUTOMATIC_RETURN_WORKER_SECRET_HEADER,
  isAutomaticReturnWorkerAuthorized,
} from './automaticReturnWorkerAuthorization';
import { getAuthorizedAt } from '../../erp/src/pages/utils/nfe/nfeEventRules';
import { validateUnsignedNfeStructure, validateNfeAgainstOfficialSchema } from './schemaValidator';
import { extractCertificateAndKey, signNfeXml } from './nfeSigner';
import { sendSoapToSefaz } from './sefazClient';
import {
  appendResponsibleTechnician,
  getResponsibleTechnicianConfig,
  hasResponsibleTechnicianCsrt,
} from './responsibleTechnician';
import { resolveNfeSequenceSettings } from '../../erp/src/pages/utils/nfe/nfeSequenceSettings';
import type { FiscalDatabase } from './fiscalDatabaseTypes';
import { embeddedNfeXml } from './xmlEnvelope';
import { loadReturnFiscalSourceContext } from './returnFiscalRules';
import {
  getFiscalFormRules,
  getFiscalFormXmlDefaults,
  getReturnCfopOptionsForSourceItem,
} from '../../shared-utils/fiscalOperationContext';
import {
  originalItemCfop,
  type FiscalCfopConfiguration,
} from '../../erp/src/pages/utils/nfe/fiscalCfopResolution';
import { getNfeServiceEndpoint } from './fiscalEnvironmentPolicy';
import { getSupabaseSecretKey } from '../supabaseSecretKey';
import { isUncertainAuthorization } from './normal-sale/attemptPolicy';
import { matchesSefazTransmissionResponse } from './authorizationResponseIdentity';
import {
  type Environment,
  asFiscalSettings,
  assertDraftXmlMatchesReview,
  brazilTimestamp,
  extractXmlBlock,
  readTag,
} from './operation-draft/draftXmlAudit';
import {
  type SourceDocumentRecord,
  validateDraftPreconditions,
  validateEstornoItems,
  validateEstornoPreconditions,
  validateSourceDocument,
} from './operation-draft/draftValidation';
import {
  persistDraftAuthorized,
  reconcileStoredDraftAttempt,
} from './operation-draft/draftPersistence';

const supabaseUrl =
  process.env.VITE_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  'https://hkoxhourxwlddgsfdgws.supabase.co';
const serviceKey = getSupabaseSecretKey() || '';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Método não permitido.' });
  }

  if (!supabaseUrl || !serviceKey) {
    return res.status(503).json({ success: false, error: 'Serviço fiscal indisponível.' });
  }

  const db = createClient<FiscalDatabase>(supabaseUrl, serviceKey);
  const automaticReturnWorker = isAutomaticReturnWorkerAuthorized(
    req.headers[AUTOMATIC_RETURN_WORKER_SECRET_HEADER]
  );
  const fiscalAuthorization = automaticReturnWorker
    ? { ok: true as const, userId: null as string | null, isAdministrator: false }
    : await authorizeFiscalOperator(db, req.headers.authorization);
  if (!fiscalAuthorization.ok) {
    return res.status(fiscalAuthorization.status).json({
      success: false,
      error: fiscalAuthorization.message,
    });
  }

  const draftId = String(req.body?.draftId || '');
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(draftId)
  ) {
    return res.status(400).json({ success: false, error: 'Rascunho fiscal inválido.' });
  }

  const previewOnly = req.body?.previewOnly === true;
  if (previewOnly && !fiscalAuthorization.isAdministrator) {
    return res.status(403).json({
      success: false,
      code: 'FISCAL_XML_PREVIEW_ADMIN_REQUIRED',
      error: 'Somente administradores podem visualizar a prévia do XML fiscal.',
    });
  }

  let reservedNfeNumber: number | undefined;
  try {
    const { data: draft, error: draftError } = await db
      .from('nfe_operation_drafts')
      .select('*')
      .eq('id', draftId)
      .maybeSingle();

    if (draftError || !draft) {
      return res.status(404).json({ success: false, error: 'Rascunho fiscal não encontrado.' });
    }

    const draftPreconditions = validateDraftPreconditions(
      draft,
      automaticReturnWorker,
      req.body?.productionConfirmed,
      previewOnly
    );
    if (draftPreconditions.earlyAuthorized) {
      if (previewOnly) {
        return res.status(200).json({
          success: true,
          preview: true,
          xml: draft.signed_xml || draft.generated_xml || '',
          documentId: draft.document_id,
          accessKey: draft.access_key,
        });
      }
      return res.status(200).json({
        success: true,
        status: 'authorized',
        documentId: draft.document_id,
        accessKey: draft.access_key,
      });
    }
    if (draftPreconditions.error) {
      return res
        .status(draftPreconditions.status || 409)
        .json({ success: false, error: draftPreconditions.error });
    }

    const environment = Number(draft.environment) as Environment;

    const { data: source, error: sourceError } = await db
      .from('nfe_documents')
      .select(
        'id,order_id,document_type,status,ambiente,modelo,chave_acesso,numero_protocolo,xml_protocolo,xml_nfe,numero_nfe,serie'
      )
      .eq('id', draft.original_document_id)
      .maybeSingle();

    const sourceDocError = validateSourceDocument(
      sourceError ? null : (source as SourceDocumentRecord),
      draft,
      environment
    );
    if (sourceDocError) {
      return res.status(409).json({ success: false, error: sourceDocError });
    }
    const validatedSource = source as SourceDocumentRecord;

    const isStoredAttempt = draft.status === 'transmitting' || draft.status === 'unknown';
    const sourceDestinationIndicator = Number(
      readTag(String(validatedSource.xml_nfe || ''), 'idDest')
    );
    const sourceOperationTypeText = readTag(String(validatedSource.xml_nfe || ''), 'tpNF');
    const sourceOperationType = Number(sourceOperationTypeText);

    let returnFiscalContext: Awaited<ReturnType<typeof loadReturnFiscalSourceContext>> | null = null;
    let returnFormRules: ReturnType<typeof getFiscalFormRules> | null = null;
    let returnXmlDefaults: ReturnType<typeof getFiscalFormXmlDefaults> = null;

    if (!isStoredAttempt) {
      if (draft.operation_kind === 'estorno') {
        const estornoError = await validateEstornoPreconditions({
          db,
          source: validatedSource,
          draft,
          environment,
          sourceDestinationIndicator,
          sourceOperationTypeText,
        });
        if (estornoError) {
          return res.status(409).json({ success: false, error: estornoError });
        }
      }

      if (draft.operation_kind === 'return') {
        if (!draft.return_order_id) {
          return res
            .status(409)
            .json({ success: false, error: 'Devolução comercial ausente no rascunho.' });
        }
        returnFiscalContext = await loadReturnFiscalSourceContext(
          db,
          draft.original_document_id,
          draft.return_order_id,
          environment
        );
        if ('error' in returnFiscalContext) {
          return res.status(409).json({ success: false, error: returnFiscalContext.error });
        }
        returnFormRules = getFiscalFormRules(
          'return',
          returnFiscalContext.context.operationContext
        );
        returnXmlDefaults = getFiscalFormXmlDefaults(returnFormRules);
        if (
          !returnXmlDefaults ||
          !returnFormRules.allowedModels.includes(String(validatedSource.modelo) as '55' | '65') ||
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

    if (originalLines.some((line) => line.document_id !== validatedSource.id)) {
      return res
        .status(409)
        .json({ success: false, error: 'Item fiscal vinculado a outro documento original.' });
    }
    const originalById = new Map(originalLines.map((line) => [line.id, line]));

    if (
      draft.operation_kind === 'return' &&
      returnFiscalContext &&
      'context' in returnFiscalContext
    ) {
      if (!returnFormRules || !returnXmlDefaults) {
        return res.status(409).json({
          success: false,
          error: 'O cenário da devolução não possui opções fiscais aprovadas.',
        });
      }
      const allocationRows = returnFiscalContext.context.allocations;
      const sourceLineByNumber = new Map(originalLines.map((line) => [line.item_number, line]));
      const draftLineByOriginalId = new Map(
        lines.map((line) => [line.original_document_item_id, line])
      );
      const allocationsByNumber = new Map<number, typeof allocationRows>();
      for (const allocation of allocationRows) {
        const grouped = allocationsByNumber.get(allocation.original_item_number) || [];
        grouped.push(allocation);
        allocationsByNumber.set(allocation.original_item_number, grouped);
      }
      const { data: allocationLinks, error: allocationLinksError } = await db
        .from('nfe_operation_draft_allocations')
        .select('draft_line_id,allocation_id')
        .in(
          'draft_line_id',
          lines.map((line) => line.id)
        );
      if (allocationLinksError) {
        return res.status(409).json({
          success: false,
          error: 'Não foi possível validar a alocação dos itens da devolução.',
        });
      }
      for (const [originalItemNumber, allocations] of allocationsByNumber) {
        const originalLine = sourceLineByNumber.get(originalItemNumber);
        const draftLine = originalLine && draftLineByOriginalId.get(originalLine.id);
        const linksForLine = draftLine
          ? (allocationLinks || []).filter((link) => link.draft_line_id === draftLine.id)
          : [];
        const expectedAllocationIds = allocations.map((allocation) => allocation.id).sort();
        const linkedAllocationIds = linksForLine.map((link) => link.allocation_id).sort();
        const expectedQuantity = allocations.reduce(
          (sum, allocation) => sum + allocation.quantity,
          0
        );
        if (
          !draftLine ||
          Math.abs(Number(draftLine.quantity) - expectedQuantity) > 0.00005 ||
          JSON.stringify(expectedAllocationIds) !== JSON.stringify(linkedAllocationIds)
        ) {
          return res.status(409).json({
            success: false,
            error:
              'Os itens e quantidades do rascunho não correspondem às alocações persistidas da devolução.',
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

    if (settingsError || !settingsRow) {
      return res.status(503).json({ success: false, error: 'Configuração fiscal indisponível.' });
    }
    const settings = asFiscalSettings(settingsRow.data || settingsRow) as AppSettings &
      Record<string, unknown>;
    const fiscalDefaults = settings.fiscalDefaults as FiscalCfopConfiguration | undefined;

    if (draft.operation_kind === 'estorno') {
      const { data: sourceItems, error: sourceItemsError } = await db
        .from('nfe_document_items')
        .select('id')
        .eq('document_id', validatedSource.id);

      if (sourceItemsError || !sourceItems) {
        return res
          .status(409)
          .json({ success: false, error: 'Não foi possível ler os itens originais do estorno.' });
      }

      const estornoItemError = validateEstornoItems({
        lines,
        sourceItemsCount: sourceItems.length,
        originalById,
        fiscalDefaults,
      });
      if (estornoItemError) {
        return res.status(409).json({ success: false, error: estornoItemError });
      }
    }

    const pfx = process.env.NFE_CERTIFICATE_BASE64;
    const password = process.env.NFE_CERTIFICATE_PASSWORD;
    if (!pfx) {
      return res
        .status(503)
        .json({ success: false, error: 'Certificado digital não configurado.' });
    }
    const certificate = extractCertificateAndKey(pfx, password || '');

    if (draft.status === 'transmitting' || draft.status === 'unknown') {
      if (previewOnly && draft.signed_xml) {
        return res.status(200).json({
          success: true,
          preview: true,
          xml: draft.signed_xml,
          accessKey: draft.access_key,
        });
      }
      return reconcileStoredDraftAttempt({
        res,
        db,
        draft,
        lines,
        environment,
        certificate,
        allowRetryAfterNotFound: true,
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
        extractXmlBlock(String(validatedSource.xml_nfe || ''), 'dest'),
        'dest'
      );
      const submittedRecipient = normalizeReviewedFiscalBlock(
        String(review.recipient_xml || ''),
        'dest'
      );
      const fixedPayment = normalizeReviewedFiscalBlock(returnXmlDefaults.paymentXml, 'pag');
      const submittedPayment = normalizeReviewedFiscalBlock(
        String(review.payment_xml || ''),
        'pag'
      );
      const fixedTransport = normalizeReviewedFiscalBlock(
        returnXmlDefaults.transportXml,
        'transp'
      );
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
        return res.status(409).json({
          success: false,
          error: 'Os campos estruturais da NF-e de devolução divergem do cenário fiscal permitido.',
        });
      }
      for (const line of lines) {
        const original = originalById.get(line.original_document_item_id);
        if (!original)
          return res.status(409).json({ success: false, error: 'Item original ausente.' });
        const originalCfop = originalItemCfop(original.product_xml);
        const allowedCfops = getReturnCfopOptionsForSourceItem(
          originalCfop || '',
          original.taxes_xml
        );
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
            error:
              'Item ou tributação fiscal diverge da quantidade e referência originais da devolução.',
          });
        }
      }
    }

    let accessKey = draft.access_key;
    let signedXml = draft.signed_xml;
    let nfeNumber = 0;
    let series = '';
    let transmissionVersion = '';

    if (!accessKey || !signedXml) {
      for (let preparation = 0; preparation < 3; preparation++) {
        const issuedAt = brazilTimestamp(new Date());
        const sourceAuthorizedAt = getAuthorizedAt(String(validatedSource.xml_protocolo || ''), '');
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
        if (!responsibleTechnician) {
          return res.status(503).json({
            success: false,
            error:
              'Configuração obrigatória de responsável técnico/CSRT da NF-e indisponível no servidor.',
          });
        }
        const municipalityCode = String(settings.companyCMun || '').trim();
        if (!/^\d{7}$/.test(municipalityCode)) {
          return res.status(503).json({
            success: false,
            error: 'Código IBGE do município do estabelecimento inválido na configuração fiscal.',
          });
        }

        const sequence = resolveNfeSequenceSettings(settings, '55', environment);
        series = sequence.series;
        const minimumNumber = sequence.minimumNumber;
        const { data: suggestedNumber, error: numberError } = await db.rpc('peek_nfe_outbound_number', {
          p_issuer_cnpj: String(validatedSource.chave_acesso).slice(6, 20),
          p_model: '55',
          p_series: series,
          p_environment: environment,
          p_minimum: minimumNumber,
        });
        if (numberError || typeof suggestedNumber !== 'number' || suggestedNumber < 1) {
          return res.status(503).json({
            success: false,
            numberReserved: false,
            error: 'Não foi possível consultar a sequência fiscal para preparar o rascunho.',
          });
        }
        nfeNumber = suggestedNumber;
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
            draft.operation_kind === 'return' &&
            returnFiscalContext &&
            'context' in returnFiscalContext
              ? returnFiscalContext.context.returnOrder.returnMethod || undefined
              : undefined,
          returnScenario:
            draft.operation_kind === 'return' &&
            returnFiscalContext &&
            'context' in returnFiscalContext
              ? returnFiscalContext.context.operationContext
              : undefined,
          environment,
          originalEnvironment: environment,
          originalStatus: environment === 1 ? 'autorizada' : 'homologada',
          originalProtocol: String(validatedSource.numero_protocolo),
          originalAccessKey: String(validatedSource.chave_acesso),
          accessKey,
          randomCode: generatedKey.randomCode,
          checkDigit: generatedKey.checkDigit,
          nfeNumber,
          series,
          issuedAt,
          settings,
          natureOfOperation: String(draft.nature_of_operation || ''),
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
            if (!original) {
              throw new Error(`Item original ${line.fiscal_item_number} não encontrado.`);
            }
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
          sourceAccessKey: String(validatedSource.chave_acesso),
          environment,
          accessKey,
          series,
          number: nfeNumber,
          sourceOperationType,
          sourceDestinationIndicator,
        });

        if (previewOnly) {
          return res.status(200).json({
            success: true,
            preview: true,
            xml: signedXml,
            accessKey,
            nfeNumber,
            series,
          });
        }

        let prepared = null;
        try {
          prepared = await db.rpc('prepare_nfe_operation_attempt', {
            p_draft_id: draft.id,
            p_expected_updated_at: draft.updated_at,
            p_expected_review_data: review,
            p_expected_lines: lines,
            p_signed_xml: signedXml,
            p_access_key: accessKey,
            p_minimum_number: minimumNumber,
          });
        } catch {
          return res.status(503).json({
            success: false,
            pending: true,
            error: 'A gravação da tentativa não foi confirmada. Atualize a situação fiscal antes de repetir; nenhuma transmissão foi iniciada por esta requisição.',
          });
        }
        const { data: claimed, error: claimError } = prepared;
        if (claimError?.message?.includes('FISCAL_SEQUENCE_CHANGED') && preparation < 2) continue;

        if (claimError || claimed?.created !== true || claimed.draftId !== draft.id
            || claimed.accessKey !== accessKey || claimed.number !== nfeNumber || !claimed.updatedAt) {
          return res.status(409).json({
            success: false,
            pending: true,
            error: claimError?.message?.includes('FISCAL_SEQUENCE_CHANGED')
              ? 'A numeração mudou durante a preparação. Atualize a situação fiscal antes de repetir.'
              : 'A preparação não foi confirmada ou outro processo alterou este rascunho. Atualize a situação fiscal antes de repetir.',
          });
        }
        reservedNfeNumber = nfeNumber;
        transmissionVersion = claimed.updatedAt;
        break;
      }
    } else {
      nfeNumber = Number(accessKey.slice(25, 34));
      series = String(Number(accessKey.slice(22, 25)));

      if (!hasResponsibleTechnicianCsrt(signedXml)) {
        return res.status(409).json({
          success: false,
          pending: true,
          error:
            'O XML assinado desta tentativa não contém CSRT. Não é seguro alterá-lo durante retry; faça reconciliação fiscal antes de retransmitir.',
        });
      }
      await validateNfeAgainstOfficialSchema(signedXml);
      assertDraftXmlMatchesReview({
        signedXml,
        certificatePem: certificate.certPem,
        draft,
        review,
        lines: lines as Array<Record<string, unknown>>,
        originalById,
        sourceAccessKey: String(validatedSource.chave_acesso),
        environment,
        accessKey,
        series,
        number: nfeNumber,
        sourceOperationType,
        sourceDestinationIndicator,
      });
      const { data: claimed, error: claimError } = await db
        .from('nfe_operation_drafts')
        .update({ status: 'transmitting', transmitted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq('id', draft.id)
        .eq('status', 'ready')
        .eq('access_key', accessKey)
        .eq('updated_at', draft.updated_at)
        .select('id,updated_at')
        .maybeSingle();

      if (claimError || !claimed) {
        return res.status(409).json({
          success: false,
          pending: true,
          error: 'Outro processo iniciou o rascunho. Consulte o estado antes de repetir.',
        });
      }
      transmissionVersion = claimed.updated_at;
    }

    if (!accessKey || !signedXml) throw new Error('Tentativa fiscal sem chave/XML confirmados.');
    assertDraftXmlMatchesReview({
      signedXml,
      certificatePem: certificate.certPem,
      draft,
      review,
      lines: lines as Array<Record<string, unknown>>,
      originalById,
      sourceAccessKey: String(validatedSource.chave_acesso),
      environment,
      accessKey,
      series,
      number: nfeNumber,
      sourceOperationType,
      sourceDestinationIndicator,
    });

    const batchXml = `<enviNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00"><idLote>${Date.now().toString().slice(-15)}</idLote><indSinc>1</indSinc>${embeddedNfeXml(signedXml)}</enviNFe>`;
    // A delayed preparation response must not send after another session changed the attempt.
    try {
      const now = new Date().toISOString();
      const { data: started, error: startError } = await db.from('nfe_operation_drafts')
        .update({ transmitted_at: now, updated_at: now })
        .eq('id', draft.id).eq('status', 'transmitting').eq('access_key', accessKey)
        .eq('updated_at', transmissionVersion).select('id,updated_at').maybeSingle();
      if (startError || !started) throw new Error('TRANSMISSION_START_NOT_CONFIRMED');
      transmissionVersion = started.updated_at;
    } catch {
      return res.status(503).json({ success: false, pending: true, accessKey,
        error: 'Não foi possível confirmar o início desta transmissão. Atualize a situação fiscal antes de repetir.' });
    }
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
        .eq('updated_at', transmissionVersion)
        .eq('status', 'transmitting');
      console.error(
        '[NF-e Draft] Conexão de autorização interrompida:',
        error instanceof Error ? error.message : 'erro desconhecido'
      );
      return reconcileStoredDraftAttempt({
        res,
        db,
        draft,
        lines,
        environment,
        certificate,
        allowRetryAfterNotFound: false,
      });
    }

    const authorization = parseSefazAuthorization(sefazXml);
    if (authorization.authorized) {
      return persistDraftAuthorized({
        res,
        db,
        draft,
        lines,
        environment,
        responseXml: sefazXml,
        authorizedAccessKey: accessKey,
        authorizedSignedXml: signedXml,
      });
    }

    if (isUncertainAuthorization(authorization.cStat, authorization.pending) ||
        !matchesSefazTransmissionResponse(sefazXml, { accessKey, environment })) {
      await db
        .from('nfe_operation_drafts')
        .update({
          status: 'unknown',
          sefaz_response_xml: sefazXml,
          updated_at: new Date().toISOString(),
        })
        .eq('id', draft.id)
        .eq('updated_at', transmissionVersion)
        .eq('status', 'transmitting');
      return reconcileStoredDraftAttempt({
        res,
        db,
        draft,
        lines,
        environment,
        certificate,
        allowRetryAfterNotFound: false,
      });
    }

    const { data: rejectedDraft, error: rejectionSyncError } = await db
      .from('nfe_operation_drafts')
      .update({
        status: 'rejected',
        sefaz_response_xml: sefazXml,
        updated_at: new Date().toISOString(),
      })
      .eq('id', draft.id)
      .eq('updated_at', transmissionVersion)
      .eq('status', 'transmitting')
      .select('id')
      .maybeSingle();
    if (rejectionSyncError || !rejectedDraft) {
      return res.status(503).json({
        success: false, pending: true, reconciliationRequired: true, accessKey,
        error: 'O retorno fiscal não foi confirmado na tentativa atual. Atualize a situação antes de continuar; não retransmita.',
      });
    }
    return res.status(422).json({
      success: false,
      pending: false,
      status: 'rejected',
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
      ...(reservedNfeNumber ? { numberReserved: true, reservedNumber: reservedNfeNumber } : { numberReserved: false }),
      error:
        schemaFailure && reservedNfeNumber
          ? `${message} O número ${reservedNfeNumber} já foi consumido pela sequência; nenhuma transmissão foi feita. Uma nova tentativa reservará outro número.`
          : message,
    });
  }
}
