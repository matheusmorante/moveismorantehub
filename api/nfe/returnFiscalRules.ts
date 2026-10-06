import { calculateMod11CheckDigit } from '../../erp/src/pages/utils/nfe/nfeAccessKey';
import { parseSefazAuthorization } from '../../erp/src/pages/utils/nfe/sefazResponseParser';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { FiscalDatabase } from './fiscalDatabaseTypes';
import {
  getReturnCfopOptionsForSourceItem,
  validateReturnTaxScenario,
} from '../../shared-utils/fiscalOperationContext';
import { originalItemCfop } from '../../erp/src/pages/utils/nfe/fiscalCfopResolution';

export const MISSING_AUTHORIZED_ORIGINAL_NFE_MESSAGE =
  'Não é possível emitir NF-e de devolução porque este pedido não possui NF-e de saída autorizada.';

export interface OriginalOutboundNfeProof {
  id: string;
  order_id: string | null;
  document_type: string;
  status: string;
  ambiente: number;
  modelo: string;
  chave_acesso: string;
  numero_nfe: number;
  serie: string;
  numero_protocolo: string | null;
  xml_protocolo: string | null;
  xml_nfe: string | null;
}

export type FiscalReturnMethod = 'store_delivery' | 'store_collection';

export function resolveFiscalReturnMethod(
  orderData: Record<string, unknown>,
  status: string
): FiscalReturnMethod | null {
  const persistedMethod = String(orderData.returnMethod || '').toLowerCase();
  if (persistedMethod === 'store_delivery' || persistedMethod === 'store_collection')
    return persistedMethod;
  // Legacy fulfilled returns represented goods brought to the store; scheduled returns were collections.
  if (status === 'fulfilled') return 'store_delivery';
  return null;
}

export interface ReturnFiscalSourceContext {
  source: OriginalOutboundNfeProof & {
    numero_nfe: number;
    serie: string;
  };
  returnOrder: {
    id: string;
    order_index: number | null;
    order_type: string;
    status: string;
    deleted: boolean;
    linked_order_id: string | null;
    returnMethod: FiscalReturnMethod | null;
    order_data: Record<string, unknown> | null;
  };
  allocations: Array<{
    id: string;
    return_order_id: string;
    return_item_index: number;
    original_document_id: string;
    original_item_number: number;
    quantity: number;
    fiscal_return_document_id: string | null;
  }>;
  lines: Array<{
    id: string;
    document_id: string;
    item_number: number;
    billed_quantity: number;
    product_code: string;
    description: string;
    product_xml: string;
    taxes_xml: string;
  }>;
}

function xmlBlock(xml: string, name: string): string {
  const prefix = '(?:[\\w.-]+:)?';
  return xml.match(new RegExp(`<${prefix}${name}\\b[^>]*>[\\s\\S]*?<\\/${prefix}${name}>`, 'i'))?.[0] || '';
}

export function readXmlTag(xml: string, name: string): string {
  const prefix = '(?:[\\w.-]+:)?';
  return (
    xml.match(new RegExp(`<${prefix}${name}\\b[^>]*>([\\s\\S]*?)<\\/${prefix}${name}>`, 'i'))?.[1]
      ?.trim() || ''
  );
}

/** Verifies persisted fields against both the signed invoice and its SEFAZ authorization protocol. */
export function validateAuthorizedOutboundNfe(
  source: OriginalOutboundNfeProof | null | undefined,
  linkedSaleOrderId: string,
  expectedEnvironment?: 1 | 2
): string | null {
  if (
    !source ||
    source.document_type !== 'outbound' ||
    source.order_id !== linkedSaleOrderId ||
    source.modelo !== '55' ||
    ![1, 2].includes(Number(source.ambiente)) ||
    (expectedEnvironment !== undefined && Number(source.ambiente) !== expectedEnvironment) ||
    source.status !== (Number(source.ambiente) === 1 ? 'autorizada' : 'homologada') ||
    !/^\d{44}$/.test(source.chave_acesso || '') ||
    source.chave_acesso.slice(20, 22) !== '55' ||
    source.chave_acesso.slice(22, 25) !== String(Number(source.serie)).padStart(3, '0') ||
    source.chave_acesso.slice(25, 34) !== String(Number(source.numero_nfe)).padStart(9, '0') ||
    source.chave_acesso.slice(6, 20) === '00000000000000' ||
    calculateMod11CheckDigit(source.chave_acesso.slice(0, 43)) !== Number(source.chave_acesso[43]) ||
    !/^\d{15}$/.test(source.numero_protocolo || '')
  ) {
    return MISSING_AUTHORIZED_ORIGINAL_NFE_MESSAGE;
  }

  const authorizationXml = String(source.xml_protocolo || '');
  const authorization = parseSefazAuthorization(authorizationXml);
  const protocol = xmlBlock(authorizationXml, 'infProt');
  if (
    !authorization.authorized ||
    authorization.protocolNumber !== source.numero_protocolo ||
    readXmlTag(protocol, 'cStat') !== '100' ||
    readXmlTag(protocol, 'chNFe') !== source.chave_acesso ||
    readXmlTag(protocol, 'tpAmb') !== String(source.ambiente)
  ) {
    return MISSING_AUTHORIZED_ORIGINAL_NFE_MESSAGE;
  }

  const invoiceXml = String(source.xml_nfe || '');
  const infNfe = xmlBlock(invoiceXml, 'infNFe');
  const ide = xmlBlock(infNfe, 'ide');
  if (
    !infNfe ||
    !new RegExp(`\\bId=["']NFe${source.chave_acesso}["']`, 'i').test(infNfe) ||
    readXmlTag(ide, 'mod') !== '55' ||
    readXmlTag(ide, 'tpAmb') !== String(source.ambiente) ||
    readXmlTag(ide, 'serie') !== String(Number(source.serie)) ||
    readXmlTag(ide, 'nNF') !== String(Number(source.numero_nfe)) ||
    readXmlTag(xmlBlock(invoiceXml, 'emit'), 'CNPJ') !== source.chave_acesso.slice(6, 20)
  ) {
    return MISSING_AUTHORIZED_ORIGINAL_NFE_MESSAGE;
  }

  return null;
}

/** Current ERP return-entry flow is limited to same-state returns by non-ICMS taxpayers. */
export function validateSupportedReturnEntryScenario(
  sourceInvoiceXml: string,
  companyUf: string,
  returnMethod: FiscalReturnMethod | null
): string | null {
  const destination = xmlBlock(sourceInvoiceXml, 'dest');
  const destinationUf = readXmlTag(destination, 'UF').toUpperCase();
  const taxpayerIndicator = readXmlTag(destination, 'indIEDest');
  const invoiceIde = xmlBlock(xmlBlock(sourceInvoiceXml, 'infNFe'), 'ide');
  const originalIsFinalConsumer = readXmlTag(invoiceIde, 'indFinal') === '1';
  const normalizedCompanyUf = companyUf.trim().toUpperCase();
  if (!destination || !destinationUf || !normalizedCompanyUf) {
    return 'Não foi possível determinar a UF e a condição fiscal do destinatário original.';
  }
  if (destinationUf !== normalizedCompanyUf) {
    return 'Devolução interestadual bloqueada: a matriz fiscal interestadual ainda não foi aprovada.';
  }
  if (taxpayerIndicator !== '9') {
    return 'Esta devolução exige NF-e emitida pelo destinatário contribuinte do ICMS; o ERP só emite entrada para destinatário não contribuinte neste fluxo.';
  }
  if (!originalIsFinalConsumer) {
    return 'Devolução bloqueada: o tratamento fiscal de destinatário não consumidor final ainda não está aprovado para emissão pelo ERP.';
  }
  if (returnMethod !== 'store_delivery') {
    return 'Devolução por coleta bloqueada: a modalidade e os dados fiscais do transporte de retorno ainda não foram aprovados.';
  }
  return null;
}

/** Loads and revalidates the return/order/source/allocation chain on the server. */
export async function loadReturnFiscalSourceContext(
  db: SupabaseClient<FiscalDatabase>,
  originalDocumentId: string,
  returnOrderId: string,
  expectedEnvironment: 1 | 2,
  options: { allowConsumedAllocations?: boolean } = {}
): Promise<{ context: ReturnFiscalSourceContext } | { error: string }> {
  const [{ data: returnOrder, error: returnError }, { data: source, error: sourceError }, { data: settings, error: settingsError }] =
    await Promise.all([
      db
        .from('orders')
        .select('id,order_index,order_type,status,deleted,linked_order_id,order_data')
        .eq('id', returnOrderId)
        .maybeSingle(),
      db
        .from('nfe_documents')
        .select('id,order_id,document_type,status,ambiente,modelo,chave_acesso,numero_nfe,serie,numero_protocolo,xml_protocolo,xml_nfe')
        .eq('id', originalDocumentId)
        .maybeSingle(),
      db.from('settings').select('data').eq('id', 'app').maybeSingle(),
    ]);
  if (returnError || sourceError || settingsError) {
    return { error: 'Não foi possível conferir a NF-e original e o pedido de devolução.' };
  }
  if (!returnOrder || returnOrder.order_type !== 'return' || returnOrder.deleted) {
    return { error: 'Pedido de devolução não encontrado ou inválido.' };
  }
  if (!source) {
    return { error: MISSING_AUTHORIZED_ORIGINAL_NFE_MESSAGE };
  }
  if (returnOrder.status !== 'fulfilled') {
    return { error: 'A devolução precisa estar recebida/coletada antes da emissão fiscal.' };
  }
  const orderData = returnOrder.order_data && typeof returnOrder.order_data === 'object'
    ? (returnOrder.order_data as Record<string, unknown>)
    : {};
  const returnMethod = resolveFiscalReturnMethod(orderData, returnOrder.status);
  const linkedSaleOrderId = String(returnOrder.linked_order_id || orderData.linkedOrderId || '');
  const authorizationError = validateAuthorizedOutboundNfe(
    source,
    linkedSaleOrderId,
    expectedEnvironment
  );
  if (authorizationError) return { error: authorizationError };

  const settingsData = settings?.data && typeof settings.data === 'object'
    ? (settings.data as Record<string, unknown>)
    : {};
  const fiscalDefaults = settingsData.fiscalDefaults && typeof settingsData.fiscalDefaults === 'object'
    ? (settingsData.fiscalDefaults as Record<string, unknown>)
    : settingsData;
  const companyUf = String(fiscalDefaults.companyUF || '');
  const companyCnpj = String(fiscalDefaults.companyCnpj || '').replace(/\D/g, '');
  if (companyCnpj.length !== 14) {
    return { error: 'CNPJ do estabelecimento ausente na configuração fiscal do servidor.' };
  }
  if (companyCnpj && source.chave_acesso.slice(6, 20) !== companyCnpj) {
    return { error: MISSING_AUTHORIZED_ORIGINAL_NFE_MESSAGE };
  }
  const scenarioError = validateSupportedReturnEntryScenario(
    source.xml_nfe || '',
    companyUf,
    returnMethod
  );
  if (scenarioError) return { error: scenarioError };

  const [{ data: allocations, error: allocationsError }, { data: lines, error: linesError }] =
    await Promise.all([
      db
        .from('nfe_return_item_allocations')
        .select('id,return_order_id,return_item_index,original_document_id,original_item_number,quantity,fiscal_return_document_id')
        .eq('return_order_id', returnOrderId)
        .eq('original_document_id', originalDocumentId),
      db
        .from('nfe_document_items')
        .select('id,document_id,item_number,billed_quantity,product_code,description,product_xml,taxes_xml')
        .eq('document_id', originalDocumentId),
    ]);
  if (allocationsError || linesError) {
    return { error: 'Não foi possível conferir os itens e quantidades da devolução.' };
  }
  if (!allocations?.length) {
    return { error: 'Não há itens fiscais ainda disponíveis para vincular a esta NF-e de devolução.' };
  }
  if (
    !options.allowConsumedAllocations &&
    allocations.some((allocation) => allocation.fiscal_return_document_id)
  ) {
    return { error: 'Uma ou mais alocações já estão vinculadas a documento fiscal de devolução.' };
  }
  const lineByNumber = new Map((lines || []).map((line) => [line.item_number, line]));
  const quantityByOriginalItem = new Map<number, number>();
  for (const allocation of allocations) {
    const quantity = Number(allocation.quantity);
    const originalLine = lineByNumber.get(allocation.original_item_number);
    const total = (quantityByOriginalItem.get(allocation.original_item_number) || 0) + quantity;
    if (
      !Number.isInteger(allocation.return_item_index) ||
      !Number.isInteger(allocation.original_item_number) ||
      !Number.isFinite(quantity) ||
      quantity <= 0 ||
      !originalLine ||
      total > Number(originalLine.billed_quantity) + 0.00005
    ) {
      return { error: 'A alocação dos itens devolvidos não corresponde à NF-e original.' };
    }
    if (
      originalLine &&
      !getReturnCfopOptionsForSourceItem(
        originalItemCfop(originalLine.product_xml) || '',
        originalLine.taxes_xml
      ).length
    ) {
      return { error: `Não há CFOP de devolução aprovado para o item original ${allocation.original_item_number}.` };
    }
    const taxScenarioError = originalLine
      ? validateReturnTaxScenario(source.xml_nfe || '', originalLine.taxes_xml)
      : null;
    if (taxScenarioError) return { error: taxScenarioError };
    quantityByOriginalItem.set(allocation.original_item_number, total);
  }
  return {
    context: {
      source,
      returnOrder: { ...returnOrder, returnMethod },
      allocations: allocations.map((allocation) => ({
        ...allocation,
        quantity: Number(allocation.quantity),
      })),
      lines: lines || [],
    },
  };
}
