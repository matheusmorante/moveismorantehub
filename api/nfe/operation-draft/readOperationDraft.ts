import type { VercelResponse } from '@vercel/node';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  getEstornoCfopOptions,
  originalItemCfop,
  suggestEstornoCfop,
  type FiscalCfopConfiguration,
} from '../../../erp/src/pages/utils/nfe/fiscalCfopResolution';
import { parseSefazAuthorization } from '../../../erp/src/pages/utils/nfe/sefazResponseParser';
import type { FiscalDatabase } from '../fiscalDatabaseTypes';
import {
  getReturnCfopOptionsForSourceItem,
  getFiscalFormXmlDefaults,
  getFiscalFormRules,
  suggestReturnCfopForSourceItem,
} from '../../../shared-utils/fiscalOperationContext';
import {
  loadReturnFiscalSourceContext,
  type ReturnFiscalSourceContext,
} from '../returnFiscalRules';

export function extractFiscalBlock(xml: string, name: string): string {
  const prefix = '(?:[\\w.-]+:)?';
  return (
    xml.match(new RegExp(`<${prefix}${name}\\b[^>]*>[\\s\\S]*?<\\/${prefix}${name}>`, 'i'))?.[0] ||
    ''
  );
}

export async function readFiscalOperationDraft(
  db: SupabaseClient<FiscalDatabase>,
  draftId: string,
  automaticReturnWorker: boolean,
  res: VercelResponse
) {
  const { data: draft, error: draftError } = await db
    .from('nfe_operation_drafts')
    .select(
      'id,operation_kind,finalidade,original_document_id,original_access_key,return_order_id,environment,status,reason,nature_of_operation,review_data,generated_xml,signed_xml,sefaz_response_xml,protocol_number,access_key,document_id,created_at,updated_at'
    )
    .eq('id', draftId)
    .maybeSingle();
  if (draftError) throw draftError;
  if (!draft) return res.status(404).json({ error: 'Rascunho fiscal não encontrado.' });
  if (automaticReturnWorker && draft.operation_kind !== 'return') {
    return res.status(403).json({ error: 'O worker só pode consultar rascunhos de devolução.' });
  }
  const { data: lines, error: linesError } = await db
    .from('nfe_operation_draft_lines')
    .select(
      'id,original_document_item_id,fiscal_item_number,quantity,gross_value,discount_value,reviewed_cfop,reviewed_product_xml,reviewed_taxes_xml'
    )
    .eq('draft_id', draftId)
    .order('fiscal_item_number');
  if (linesError) throw linesError;
  if (!lines?.length)
    return res.status(409).json({ error: 'Rascunho fiscal sem itens de origem.' });
  const sourceIds = lines.map((line) => line.original_document_item_id);
  const [sourceResult, settingsResult, sourceDocumentResult] = await Promise.all([
    db
      .from('nfe_document_items')
      .select(
        'id,document_id,item_number,product_code,description,billed_quantity,unit_value,gross_value,discount_value,product_xml,taxes_xml'
      )
      .in('id', sourceIds),
    db.from('settings').select('data').eq('id', 'app').maybeSingle(),
    db
      .from('nfe_documents')
      .select('id,order_id,document_type,status,ambiente,modelo,chave_acesso,numero_nfe,serie,numero_protocolo,xml_protocolo,xml_nfe')
      .eq('id', draft.original_document_id)
      .maybeSingle(),
  ]);
  if (
    sourceResult.error ||
    settingsResult.error ||
    sourceDocumentResult.error ||
    !sourceDocumentResult.data
  ) {
    throw (
      sourceResult.error ||
      settingsResult.error ||
      sourceDocumentResult.error ||
      new Error('Documento fiscal original ausente.')
    );
  }
  const originalById = new Map((sourceResult.data || []).map((item) => [item.id, item]));
  const fiscalSettings = settingsResult.data?.data?.fiscalDefaults as
    | FiscalCfopConfiguration
    | undefined;
  const reviewedLines = lines.map((line) => {
    const original = originalById.get(line.original_document_item_id);
    if (!original || original.document_id !== draft.original_document_id) {
      throw new Error('Linha fiscal de origem inconsistente no rascunho.');
    }
    const originalCfop = originalItemCfop(original.product_xml);
    const allowedReturnCfops =
      draft.operation_kind === 'return'
        ? getReturnCfopOptionsForSourceItem(originalCfop || '', original.taxes_xml)
        : [];
    const allowedEstornoCfops =
      draft.operation_kind === 'estorno'
        ? getEstornoCfopOptions(originalCfop, fiscalSettings)
        : [];
    return {
      ...line,
      originalItemNumber: original.item_number,
      originalDescription: original.description,
      originalProductCode: original.product_code,
      originalQuantity: original.billed_quantity,
      originalUnitValue: original.unit_value,
      originalGrossValue: original.gross_value,
      originalDiscountValue: original.discount_value,
      originalProductXml: original.product_xml,
      originalTaxesXml: original.taxes_xml,
      originalCfop,
      allowedCfops:
        draft.operation_kind === 'estorno'
          ? allowedEstornoCfops
          : allowedReturnCfops.map(({ value, label }) => ({ value, label })),
      suggestedCfop:
        draft.operation_kind === 'estorno'
          ? suggestEstornoCfop(originalCfop, fiscalSettings)
          : suggestReturnCfopForSourceItem(
              originalCfop || '',
              original.taxes_xml,
              fiscalSettings?.returnCfop
            ),
    };
  });
  const originalXml = String(sourceDocumentResult.data.xml_nfe || '');
  let fiscalReturnContext: ReturnFiscalSourceContext | null = null;
  if (draft.operation_kind === 'return' && draft.return_order_id) {
    const sourceContext = await loadReturnFiscalSourceContext(
      db,
      draft.original_document_id,
      draft.return_order_id,
      Number(draft.environment) as 1 | 2,
      { allowConsumedAllocations: draft.status === 'authorized' }
    );
    if ('error' in sourceContext)
      return res.status(409).json({ error: sourceContext.error });
    fiscalReturnContext = sourceContext.context;
  }
  const returnFormRules = fiscalReturnContext
    ? getFiscalFormRules('return', fiscalReturnContext.operationContext)
    : null;
  const returnXmlDefaults = returnFormRules
    ? getFiscalFormXmlDefaults(returnFormRules)
    : null;
  if (draft.operation_kind === 'return' && !returnXmlDefaults) {
    return res.status(409).json({
      error: returnFormRules?.blockReason || 'UNSUPPORTED_BY_ERP: contexto fiscal da devolução incompleto.',
    });
  }
  if (draft.operation_kind === 'return' && (!fiscalReturnContext || !returnXmlDefaults)) {
    return res.status(409).json({
      error: 'O cenário da devolução não possui opções fiscais aprovadas para revisão.',
    });
  }
  const lastSefazResult = draft.sefaz_response_xml
    ? parseSefazAuthorization(String(draft.sefaz_response_xml))
    : null;
  return res.status(200).json({
    success: true,
    draft,
    lastSefazResult: lastSefazResult
      ? { cStat: lastSefazResult.cStat, xMotivo: lastSefazResult.xMotivo }
      : null,
    source: {
      id: sourceDocumentResult.data.id,
      order_id: sourceDocumentResult.data.order_id,
      modelo: sourceDocumentResult.data.modelo,
      ambiente: sourceDocumentResult.data.ambiente,
      chave_acesso: sourceDocumentResult.data.chave_acesso,
      numero_nfe: sourceDocumentResult.data.numero_nfe,
      serie: sourceDocumentResult.data.serie,
    },
    returnOrder: fiscalReturnContext
      ? {
          id: fiscalReturnContext.returnOrder.id,
          orderIndex: fiscalReturnContext.returnOrder.order_index,
          returnMethod: fiscalReturnContext.returnOrder.returnMethod,
          operationContext: {
            issuerUf: fiscalReturnContext.operationContext.issuerUf,
            recipientUf: fiscalReturnContext.operationContext.recipientUf,
            scope: fiscalReturnContext.operationContext.scope,
            returnMethod: fiscalReturnContext.operationContext.returnMethod,
            recipientFiscalStatus: fiscalReturnContext.operationContext.recipientFiscalStatus,
            isFinalConsumer: fiscalReturnContext.operationContext.isFinalConsumer,
            taxRegime: fiscalReturnContext.operationContext.taxRegime,
          },
        }
      : null,
    lines: reviewedLines,
    reviewTemplate: {
      recipient_xml: extractFiscalBlock(originalXml, 'dest'),
      totals_xml: extractFiscalBlock(originalXml, 'total'),
      transport_xml:
        returnXmlDefaults?.transportXml ||
        (draft.operation_kind === 'return' ? '' : '<transp><modFrete>9</modFrete></transp>'),
      payment_xml:
        returnXmlDefaults?.paymentXml ||
        (draft.operation_kind === 'return'
          ? ''
          : '<pag><detPag><tPag>90</tPag><vPag>0.00</vPag></detPag></pag>'),
    },
  });
}
