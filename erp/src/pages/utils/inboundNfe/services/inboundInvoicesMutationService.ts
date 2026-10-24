import { supabase } from '../../supabaseConfig';
import { isValidUuid } from '../../uuidUtils';
import { InboundInvoice } from '../types/inboundNfeTypes';
import { getLocalInvoices, saveLocalInvoices, isSampleInvoice } from './inboundInvoicesCache';
import { parseInboundNfeXml } from '../utils/inboundXmlParser';
import { normalizeFiscalIdentifier } from '../../../../../../shared-utils/fiscalIdentifiers';
import { normalizeInvoiceItem } from './inboundInvoicesMapper';
import {
  assertInboundInvoiceRecipientMatchesCompany,
  getInboundInvoiceRecipientGuardError,
} from '../../../../../../shared-utils/inboundInvoiceRecipient';
import { getSettings } from '../../settingsService';

export const deleteInboundInvoice = async (_invoiceIdOrKey: string): Promise<void> => {
  throw new Error('Notas fiscais de entrada não podem ser excluídas.');
};

export const saveInboundInvoice = async (invoice: InboundInvoice, options: { requireConfirmation?: boolean; assertCurrent?: () => void } = {}): Promise<InboundInvoice> => {
  if (isSampleInvoice(invoice)) {
    if (options.requireConfirmation) throw new Error('Não é possível gravar alterações na nota demonstrativa.');
    return invoice;
  }
  assertInboundInvoiceRecipientMatchesCompany(invoice.recipientCnpj, getSettings().companyCnpj);
  options.assertCurrent?.();
  const accessKey = normalizeFiscalIdentifier(invoice.nfeKey);
  const validId = isValidUuid(invoice.id) ? invoice.id : crypto.randomUUID();
  const invoiceToSave: InboundInvoice = { ...invoice, id: validId, nfeKey: accessKey };
  const local = getLocalInvoices().filter((inv) => !isSampleInvoice(inv));
  const existingIndex = accessKey
    ? local.findIndex((inv) => normalizeFiscalIdentifier(inv.nfeKey) === accessKey)
    : local.findIndex((inv) => inv.id === validId);
  if (existingIndex >= 0) {
    local[existingIndex] = invoiceToSave;
  } else {
    local.unshift(invoiceToSave);
  }
  try {
    const payload: Record<string, any> = {
      id: validId,
      chave_acesso: accessKey || null,
      numero_nfe: Number((invoice.nfeNumber || '').replace(/\D/g, '')) || 0,
      serie: invoice.series || '1',
      data_emissao: invoice.issuedAt || new Date().toISOString(),
      emitente_cnpj: invoice.emitterCnpj || '',
      emitente_nome: invoice.emitterName || '',
      emitente_fantasia: invoice.emitterTradeName || null,
      emitente_ie: invoice.emitterIe || null,
      emitente_endereco: invoice.emitterAddress || {},
      supplier_id: invoice.supplierId || null,
      destinatario_cnpj: invoice.recipientCnpj || '',
      destinatario_nome: invoice.recipientName || '',
      valor_produtos: invoice.totalProducts || 0,
      valor_frete: invoice.totalFreight || 0,
      valor_ipi: invoice.totalIpi || 0,
      valor_desconto: invoice.totalDiscount || 0,
      valor_seguro: invoice.totalInsurance || 0,
      outras_despesas: invoice.totalOtherExpenses || 0,
      valor_icms: invoice.totalIcms || 0,
      valor_icms_st: invoice.totalIcmsSt || 0,
      data_saida_entrada: invoice.entryExitAt || null,
      natureza_operacao: invoice.operationNature || null,
      modelo: invoice.model || null,
      ambiente: invoice.environment || null,
      protocolo: invoice.protocol || null,
      informacoes_adicionais: invoice.additionalInfo || null,
      documento_original_path: invoice.originalDocumentPath || null,
      documento_original_mime: invoice.originalDocumentMime || null,
      origem_importacao: invoice.originalDocumentPath ? 'documento' : 'xml',
      extraction_warnings: invoice.extractionWarnings || [],
      extraction_confidence: invoice.extractionConfidence || {},
      extraction_status: invoice.extractionStatus || 'completed',
      extraction_processed_at: invoice.processedAt || null,
      extraction_ai_model: invoice.aiModel || null,
      raw_extraction: invoice.rawExtraction || null,
      valor_total: invoice.totalInvoice || 0,
      status_recebimento:
        invoice.status === 'received'
          ? 'recebida'
          : invoice.status === 'manifested'
            ? 'manifestada'
            : 'pendente',
      receipt_id: invoice.receiptId || null,
      xml_conteudo: invoice.rawXml || null,
      itens: invoice.items || [],
      updated_at: new Date().toISOString(),
    };

    const onConflict = accessKey.length === 44 ? 'chave_acesso' : 'id';
    const headerWrite = supabase.from('inbound_invoices').upsert(payload, { onConflict });
    const header = options.requireConfirmation ? await headerWrite.select('id,supplier_id,itens').single() : await headerWrite;
    options.assertCurrent?.();
    const { error } = header;
    if (error) {
      const recipientError = getInboundInvoiceRecipientGuardError(error.message);
      if (recipientError) throw new Error(recipientError);
    }
    if (options.requireConfirmation) {
        if (error) throw error;
        const row = header.data;
        const canonical = (value: unknown) => JSON.stringify(value, (_key, entry) => entry && typeof entry === 'object' && !Array.isArray(entry)
          ? Object.fromEntries(Object.keys(entry).sort().map((key) => [key, entry[key]])) : entry);
        if (!row || row.id !== validId || (row.supplier_id || undefined) !== (invoice.supplierId || undefined) || canonical(row.itens) !== canonical(invoice.items)) {
          throw new Error('A gravação dos vínculos da nota não foi confirmada pelo servidor.');
        }
    }
    if (error) {
      console.warn('Alerta upsert Supabase:', error);
    } else if (Array.isArray(invoice.items) && invoice.items.length > 0) {
      // Sincronizar itens na tabela normalizada inbound_invoice_items
      try {
        const itemRows = invoice.items.map((item, idx) => {
          const normalized = normalizeInvoiceItem(item, idx);
          return {
            invoice_id: validId,
            item_number: Number(normalized.itemNumber) || idx + 1,
            product_code: String(normalized.productCode || ''),
            product_description: String(normalized.productDescription || 'Item sem descrição'),
            ean: normalized.ean || null,
            ncm: normalized.ncm || null,
            cest: normalized.cest || null,
            cfop: normalized.cfop || null,
            unit: normalized.unit || 'UN',
            quantity: Number(normalized.quantity) || 0,
            unit_cost: Number(normalized.unitCost) || 0,
            total_cost: Number(normalized.totalCost) || 0,
            ipi_percent: Number(normalized.ipiPercent) || 0,
            ipi_value: Number(normalized.ipiValue) || 0,
            icms_percent: Number(normalized.icmsPercent) || 0,
            icms_value: Number(normalized.icmsValue) || 0,
            icms_base_value: Number(normalized.icmsBaseValue) || 0,
            icms_st_percent: Number(normalized.icmsStPercent) || 0,
            icms_st_value: Number(normalized.icmsStValue) || 0,
            icms_st_base_value: Number(normalized.icmsStBaseValue) || 0,
            freight_value: Number(normalized.freightValue) || 0,
            insurance_value: Number(normalized.insuranceValue) || 0,
            discount_value: Number(normalized.discountValue) || 0,
            other_expenses_value: Number(normalized.otherExpensesValue) || 0,
            product_id: normalized.matchedProductId || null,
            variation_id: normalized.matchedVariationId || null,
            raw_item: { ...item, ...normalized },
          };
        });
        options.assertCurrent?.();
        const itemWrite = supabase
          .from('inbound_invoice_items')
          .upsert(itemRows, { onConflict: 'invoice_id,item_number' });
        const itemResult = options.requireConfirmation ? await itemWrite.select('invoice_id,item_number') : await itemWrite;
        options.assertCurrent?.();
        if (options.requireConfirmation && (itemResult.error || !Array.isArray(itemResult.data) || itemResult.data.length !== itemRows.length ||
          itemRows.some((expected) => !itemResult.data?.some((row) => row.invoice_id === validId && row.item_number === expected.item_number)))) {
          throw itemResult.error || new Error('A gravação dos itens da nota não foi confirmada pelo servidor.');
        }
      } catch (itemErr) {
        if (options.requireConfirmation) throw itemErr;
        console.warn('Alerta ao persistir itens normalizados em inbound_invoice_items:', itemErr);
      }
    }
  } catch (err) {
    const recipientError = getInboundInvoiceRecipientGuardError(
      err instanceof Error ? err.message : (err as { message?: unknown })?.message
    );
    if (recipientError) throw new Error(recipientError);
    if (options.requireConfirmation) throw err;
    console.warn('Erro ao salvar no Supabase, mantido em cache local:', err);
  }

  if (!options.requireConfirmation) saveLocalInvoices(local);

  if (options.requireConfirmation) {
    options.assertCurrent?.();
    // Merge against the latest cache, so other invoices loaded during the request survive.
    const latest = getLocalInvoices().filter((current) => !isSampleInvoice(current) && current.id !== validId && (!accessKey || normalizeFiscalIdentifier(current.nfeKey) !== accessKey));
    saveLocalInvoices([invoiceToSave, ...latest]);
  }

  return invoiceToSave;
};

export const importInboundInvoiceXml = async (xmlString: string): Promise<InboundInvoice> => {
  const parsed = parseInboundNfeXml(xmlString);
  return await saveInboundInvoice(parsed);
};

export const markInvoiceAsReceived = async (nfeKey: string, receiptId: string): Promise<void> => {
  const local = getLocalInvoices();
  const invoice = local.find((inv) => normalizeFiscalIdentifier(inv.nfeKey) === normalizeFiscalIdentifier(nfeKey));
  if (invoice) {
    invoice.status = 'received';
    invoice.receiptId = receiptId;
    invoice.receivedAt = new Date().toISOString();
    await saveInboundInvoice(invoice);
  }
};
