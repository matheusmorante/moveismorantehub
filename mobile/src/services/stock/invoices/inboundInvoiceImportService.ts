import { supabase } from '../../supabaseClient';
import { parseInboundNfeXml } from '../../../features/stock/invoices/utils/inboundXmlParser';
import {
  buildInboundInvoiceItemRows,
  buildInboundInvoicePayload,
  formatTaxId,
  normalizeTaxId,
} from './inboundInvoiceMappers';
import { findInboundSupplierProductCodes } from './inboundInvoiceMappingsService';
import { mergeInboundInvoiceXml } from '../../../../../shared-utils/inboundInvoiceXmlMerge';
import {
  hasUnlinkedInvoiceItems,
  normalizeInvoiceStatus,
} from '../../../features/stock/invoices/utils/invoiceList';
import {
  assertInboundInvoiceRecipientMatchesCompany,
  getInboundInvoiceRecipientGuardError,
} from '../../../../../shared-utils/inboundInvoiceRecipient';
import {
  getSupplierStockOriginsFromRelation,
  isSalvadosOnlySupplier,
} from '../../../../../shared-utils/productSupplierStockOrigin';
import { markInboundInvoiceItemsNotApplicable } from '../../../../../shared-utils/inboundInvoiceSupplierRules';

export const findInboundInvoiceSupplier = async (taxId: string, name: string) => {
  const digits = normalizeTaxId(taxId);

  if (digits.length === 11 || digits.length === 14) {
    const formatted = formatTaxId(digits);
    const { data, error } = await supabase
      .from('people')
      .select('id, full_name, cpf_cnpj, stock_origins, active')
      .in('person_type', ['suppliers', 'supplier'])
      .or('deleted.eq.false,deleted.is.null')
      .in('cpf_cnpj', [digits, formatted])
      .order('full_name')
      .limit(20);
    if (error) throw error;
    const matches = (data || []).filter(
      (person: any) => normalizeTaxId(person.cpf_cnpj) === digits
    );
    const salvadosMatch = matches.find(
      (person: any) => person.active && isSalvadosOnlySupplier(person.stock_origins)
    ) || matches.find((person: any) => isSalvadosOnlySupplier(person.stock_origins));
    if (salvadosMatch) return salvadosMatch;
    const activeMatch = matches.find((person: any) => person.active);
    if (activeMatch) return activeMatch;
    if (matches[0]) return matches[0];
  }

  const normalizedName = name.trim();
  if (!normalizedName) return null;
  const { data, error } = await supabase
    .from('people')
    .select('id, full_name, cpf_cnpj, stock_origins, active')
    .in('person_type', ['suppliers', 'supplier'])
    .or('deleted.eq.false,deleted.is.null')
    .ilike('full_name', normalizedName)
    .order('full_name')
    .limit(20);
  if (error) throw error;
  const matches = (data || []).filter(
      (person: any) =>
        String(person.full_name || '')
          .trim()
          .toLocaleLowerCase('pt-BR') === normalizedName.toLocaleLowerCase('pt-BR')
    );
  return (
    matches.find(
      (person: any) => person.active && isSalvadosOnlySupplier(person.stock_origins)
    ) ||
    matches.find((person: any) => isSalvadosOnlySupplier(person.stock_origins)) ||
    matches.find((person: any) => person.active) ||
    matches[0] ||
    null
  );
};

export const importInboundInvoiceXml = async (
  xml: string,
  onStatusChange?: (message: string) => void
) => {
  onStatusChange?.('Lendo e validando o XML...');
  const invoice = parseInboundNfeXml(xml);
  const accessKey = String(invoice.nfeKey || '').replace(/\D/g, '');
  if (accessKey.length !== 44) throw new Error('Chave de acesso da NF-e inválida.');
  if (String(invoice.model || '').replace(/\D/g, '') === '65') {
    throw new Error('NFC-e (modelo 65) não pode ser cadastrada como NF de Entrada.');
  }

  onStatusChange?.('Conferindo o CNPJ destinatário da nota...');
  const { data: settingsRow, error: settingsError } = await supabase
    .from('settings')
    .select('data')
    .eq('id', 'app')
    .maybeSingle();
  if (settingsError) {
    throw new Error('Não foi possível confirmar o CNPJ da empresa configurado no sistema.');
  }
  assertInboundInvoiceRecipientMatchesCompany(
    invoice.recipientCnpj,
    settingsRow?.data?.companyCnpj
  );

  onStatusChange?.('Conferindo se esta NF-e já está cadastrada...');
  const { data: existingRow, error: duplicateCheckError } = await supabase
    .from('inbound_invoices')
    .select('*, supplier:people(stock_origins), inbound_invoice_items(*)')
    .eq('chave_acesso', accessKey)
    .maybeSingle();
  if (duplicateCheckError) throw duplicateCheckError;

  let existingInvoice: Record<string, any> | null = null;
  let invoiceToSave: Record<string, any> = invoice;
  let outcome: 'added' | 'updated' | 'unchanged' = 'added';
  let hasConflicts = false;
  if (existingRow) {
    onStatusChange?.('NF-e já cadastrada. Conferindo se há dados novos no XML...');
    const childItems = Array.isArray(existingRow.inbound_invoice_items)
      ? existingRow.inbound_invoice_items.map((item: any, index: number) => ({
          ...(item.raw_item || {}),
          itemNumber: item.item_number ?? index + 1,
          productCode: item.product_code ?? item.raw_item?.productCode ?? '',
          productDescription:
            item.product_description ?? item.raw_item?.productDescription ?? 'Item sem descrição',
          matchedProductId: item.product_id || item.raw_item?.matchedProductId || undefined,
          matchedVariationId: item.variation_id || item.raw_item?.matchedVariationId || undefined,
        }))
      : [];
    const existingItems = childItems.length
      ? childItems
      : Array.isArray(existingRow.itens)
        ? existingRow.itens
        : [];
    existingInvoice = {
      id: existingRow.id,
      nfeKey: existingRow.chave_acesso || '',
      nfeNumber: String(existingRow.numero_nfe || ''),
      series: String(existingRow.serie || '1'),
      issuedAt: existingRow.data_emissao || '',
      emitterCnpj: existingRow.emitente_cnpj || '',
      emitterName: existingRow.emitente_nome || '',
      emitterTradeName: existingRow.emitente_fantasia || undefined,
      emitterIe: existingRow.emitente_ie || undefined,
      emitterAddress: existingRow.emitente_endereco || {},
      recipientCnpj: existingRow.destinatario_cnpj || '',
      recipientName: existingRow.destinatario_nome || '',
      totalProducts: Number(existingRow.valor_produtos || 0),
      totalFreight: Number(existingRow.valor_frete || 0),
      totalIpi: Number(existingRow.valor_ipi || 0),
      totalDiscount: Number(existingRow.valor_desconto || 0),
      totalInsurance: Number(existingRow.valor_seguro || 0),
      totalOtherExpenses: Number(existingRow.outras_despesas || 0),
      totalIcms: Number(existingRow.valor_icms || 0),
      totalIcmsSt: Number(existingRow.valor_icms_st || 0),
      entryExitAt: existingRow.data_saida_entrada || undefined,
      operationNature: existingRow.natureza_operacao || undefined,
      model: existingRow.modelo || undefined,
      environment:
        existingRow.ambiente === 1 || existingRow.ambiente === 2 ? existingRow.ambiente : undefined,
      protocol: existingRow.protocolo || undefined,
      additionalInfo: existingRow.informacoes_adicionais || undefined,
      totalInvoice: Number(existingRow.valor_total || 0),
      supplierId: existingRow.supplier_id || undefined,
      status: existingRow.status_recebimento,
      receiptId: existingRow.receipt_id || undefined,
      rawXml: existingRow.xml_conteudo || undefined,
      items: existingItems,
      itemsCount: existingItems.length,
    };

    const merge = mergeInboundInvoiceXml(existingInvoice, invoice);
    if (merge.outcome === 'conflict') {
      throw new Error(
        'Nota Fiscal Já Cadastrada: há valores fiscais divergentes que não podem ser mesclados com segurança. Nenhuma alteração foi feita.'
      );
    }
    if (merge.outcome === 'unchanged') {
      return {
        id: existingRow.id,
        number: String(existingRow.numero_nfe || ''),
        series: String(existingRow.serie || '1'),
        accessKey,
        supplierName: existingRow.emitente_fantasia || existingRow.emitente_nome || 'Fornecedor Desconhecido',
        supplierCnpj: existingRow.emitente_cnpj || '',
        issueDate: existingRow.data_emissao || '',
        totalValue: Number(existingRow.valor_total || 0),
        itemsCount: existingItems.length,
        status: normalizeInvoiceStatus(existingRow.status_recebimento),
        outcome: 'unchanged' as const,
        hasConflicts: false,
      };
    }
    invoiceToSave = merge.invoice;
    outcome = 'updated';
    hasConflicts = merge.hasConflicts;
    onStatusChange?.('NF-e já cadastrada e desatualizada. Atualizando com os dados novos do XML...');
  }

  let supplier: any = null;
  try {
    supplier = await findInboundInvoiceSupplier(invoice.emitterCnpj || '', invoice.emitterName || '');
  } catch (supplierError) {
    console.warn(
      '[importInboundInvoiceXml] Não foi possível localizar o fornecedor; a NF será salva sem associação.',
      supplierError
    );
  }
  const existingSupplierOrigins = getSupplierStockOriginsFromRelation(existingRow?.supplier);
  const salvadosSupplier = isSalvadosOnlySupplier(supplier?.stock_origins)
    ? supplier
    : isSalvadosOnlySupplier(existingSupplierOrigins)
      ? { id: existingRow?.supplier_id, stock_origins: existingSupplierOrigins }
      : isSalvadosOnlySupplier(invoice.supplierStockOrigins)
        ? { id: existingRow?.supplier_id || invoice.supplierId, stock_origins: invoice.supplierStockOrigins }
        : null;
  const supplierId = salvadosSupplier?.id || existingRow?.supplier_id || invoice.supplierId || supplier?.id || null;
  const supplierStockOrigins = Array.isArray(salvadosSupplier?.stock_origins)
    ? salvadosSupplier.stock_origins
    : existingSupplierOrigins
      ? existingSupplierOrigins
      : Array.isArray(invoice.supplierStockOrigins)
        ? invoice.supplierStockOrigins
        : Array.isArray(supplier?.stock_origins)
          ? supplier.stock_origins
          : null;
  const isSalvadosSupplier = isSalvadosOnlySupplier(supplierStockOrigins);

  let items = Array.isArray(invoiceToSave.items) ? invoiceToSave.items : [];
  if (isSalvadosSupplier) {
    items = markInboundInvoiceItemsNotApplicable(items);
  } else if (supplierId && items.length) {
    try {
      const mappings = await findInboundSupplierProductCodes(
        supplierId,
        items.map((item: any) => String(item.productCode || ''))
      );
      if (mappings.size) {
        items = items.map((item: any) => {
          if (item.linkMode === 'not_applicable' || item.matchedProductId || item.matchedVariationId) return item;
          const code = String(item.productCode || '')
            .trim()
            .toLocaleUpperCase('pt-BR');
          const mapping = mappings.get(code);
          return mapping
            ? {
                ...item,
                matchedProductId: mapping.productId,
                matchedVariationId: mapping.variationId,
                productErpName: mapping.name,
                linkedProductCode: mapping.sku,
              }
            : item;
        });
      }
    } catch (mappingError) {
      console.warn(
        '[importInboundInvoiceXml] Não foi possível reaproveitar vínculos anteriores; a NF será salva sem esses vínculos.',
        mappingError
      );
    }
  }

  const xmlToStore = String(invoiceToSave.rawXml || xml);
  const payload = {
    ...buildInboundInvoicePayload(invoiceToSave, accessKey, supplierId, items, xmlToStore),
    ...(existingRow
      ? {
          status_recebimento: existingRow.status_recebimento || 'pendente',
          receipt_id: existingRow.receipt_id || null,
        }
      : {}),
  };

  onStatusChange?.(
    outcome === 'updated' ? 'Salvando os dados novos da nota...' : 'Salvando nota fiscal e itens...'
  );
  const { data, error } = await supabase
    .from('inbound_invoices')
    .upsert(payload, { onConflict: 'chave_acesso' })
    .select('id')
    .single();
  if (error) {
    const recipientError = getInboundInvoiceRecipientGuardError(error.message);
    if (recipientError) throw new Error(recipientError);
    throw error;
  }

  const itemRows = buildInboundInvoiceItemRows(data.id, items);

  if (itemRows.length) {
    const { error: itemsError } = await supabase
      .from('inbound_invoice_items')
      .upsert(itemRows, { onConflict: 'invoice_id,item_number' });
    if (itemsError) throw itemsError;
  }

  return {
    id: data.id,
    number: String(invoiceToSave.nfeNumber || ''),
    series: String(invoiceToSave.series || '1'),
    accessKey,
    supplierName: invoiceToSave.emitterTradeName || invoiceToSave.emitterName || 'Fornecedor Desconhecido',
    supplierCnpj: invoiceToSave.emitterCnpj || '',
    issueDate: invoiceToSave.issuedAt || '',
    totalValue: Number(invoiceToSave.totalInvoice || 0),
    itemsCount: itemRows.length,
    hasPendingBindings: hasUnlinkedInvoiceItems(items),
    status: existingRow ? normalizeInvoiceStatus(existingRow.status_recebimento) : 'pending',
    outcome,
    hasConflicts,
  };
};
