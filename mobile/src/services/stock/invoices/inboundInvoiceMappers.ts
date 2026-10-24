import {
  hasUnlinkedInvoiceItems,
  normalizeInvoiceStatus,
} from '../../../features/stock/invoices/utils/invoiceList';

export const normalizeTaxId = (value: unknown) => String(value || '').replace(/\D/g, '');

export const formatTaxId = (digits: string) =>
  digits.length === 14
    ? digits.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')
    : digits.length === 11
      ? digits.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4')
      : digits;

export const mapInboundInvoiceListRow = (row: any) => {
  const linkedItems = Array.isArray(row.inbound_invoice_items)
    ? row.inbound_invoice_items.map((item: any) => ({ ...item.raw_item, ...item }))
    : [];
  const legacyItems = Array.isArray(row.itens) ? row.itens : [];
  const items = linkedItems.length ? linkedItems : legacyItems;
  const isSummaryOnly =
    items.length === 0 && Boolean(row.xml_conteudo?.includes('<resNFe') || !row.xml_conteudo);

  return {
    id: row.id,
    number: String(row.numero_nfe || ''),
    series: String(row.serie || '1'),
    accessKey: row.chave_acesso || '',
    supplierName: row.emitente_nome || 'Fornecedor Desconhecido',
    supplierCnpj: row.emitente_cnpj || '',
    issueDate: row.data_emissao || '',
    totalValue: Number(row.valor_total || 0),
    itemsCount: items.length,
    status: normalizeInvoiceStatus(row.status_recebimento),
    hasPendingBindings: hasUnlinkedInvoiceItems(items),
    sefazStatus: 'pending' as const,
    isSummaryOnly,
    rawXml: row.xml_conteudo || '',
  };
};

export const mapInboundInvoiceDetailItem = (item: any) => ({
  description:
    item.product_description ||
    item.productDescription ||
    item.descricao ||
    item.xProd ||
    'Item sem descrição',
  productCode: String(
    item.product_code || item.productCode || item.codigo_produto || item.cProd || ''
  ),
  ean: String(item.ean || item.gtin || ''),
  ncm: String(item.ncm || ''),
  cest: String(item.cest || ''),
  cfop: String(item.cfop || ''),
  unit: String(item.unit || item.unidade || 'UN'),
  quantity: Number(item.quantity ?? item.quantidade ?? 0),
  unitCost: Number(item.unit_cost ?? item.unitCost ?? item.valor_unitario ?? 0),
  totalCost: Number(item.total_cost ?? item.totalCost ?? item.valor_total ?? 0),
  freightValue: Number(item.freight_value ?? item.freightValue ?? item.valor_frete ?? 0),
  ipiValue: Number(item.ipi_value ?? item.ipiValue ?? item.valor_ipi ?? 0),
  ipiPercent: Number(item.ipi_percent ?? item.ipiPercent ?? 0),
  icmsValue: Number(item.icms_value ?? item.icmsValue ?? item.valor_icms ?? 0),
  icmsPercent: Number(item.icms_percent ?? item.icmsPercent ?? 0),
  icmsStValue: Number(item.icms_st_value ?? item.icmsStValue ?? item.valor_icms_st ?? 0),
});

export const mapInboundInvoiceDetailRow = (data: any) => {
  const rows = Array.isArray(data.inbound_invoice_items) ? data.inbound_invoice_items : [];
  const legacyItems = Array.isArray(data.itens) ? data.itens : [];
  const sourceItems = rows.length
    ? rows.map((item: any) => ({ ...(item.raw_item || {}), ...item }))
    : legacyItems;
  const items = sourceItems.map(mapInboundInvoiceDetailItem);

  return {
    id: data.id,
    number: String(data.numero_nfe || ''),
    series: String(data.serie || '1'),
    accessKey: data.chave_acesso || '',
    supplierName: data.emitente_nome || 'Fornecedor Desconhecido',
    supplierCnpj: data.emitente_cnpj || '',
    emitterIe: data.emitente_ie || undefined,
    issueDate: data.data_emissao || '',
    totalValue: Number(data.valor_total || 0),
    itemsCount: items.length,
    status: normalizeInvoiceStatus(data.status_recebimento),
    hasPendingBindings: hasUnlinkedInvoiceItems(sourceItems),
    sefazStatus: 'pending' as const,
    recipientName: data.destinatario_nome || '',
    recipientCnpj: data.destinatario_cnpj || '',
    receivedAt: data.updated_at || undefined,
    totalProducts: Number(data.valor_produtos || 0),
    totalFreight: Number(data.valor_frete || 0),
    totalIpi: Number(data.valor_ipi || 0),
    totalDiscount: Number(data.valor_desconto || 0),
    totalInsurance: Number(data.valor_seguro || 0),
    totalOtherExpenses: Number(data.outras_despesas || 0),
    totalIcms: Number(data.valor_icms || 0),
    totalIcmsSt: Number(data.valor_icms_st || 0),
    model: data.modelo || undefined,
    protocol: data.protocolo || undefined,
    entryExitAt: data.data_saida_entrada || undefined,
    operationNature: data.natureza_operacao || undefined,
    additionalInfo: data.informacoes_adicionais || undefined,
    freightPercent:
      Number(data.valor_produtos || 0) > 0
        ? Number(
            ((Number(data.valor_frete || 0) / Number(data.valor_produtos || 0)) * 100).toFixed(4)
          )
        : 0,
    ipiPercent:
      Number(data.valor_produtos || 0) > 0
        ? Number(
            ((Number(data.valor_ipi || 0) / Number(data.valor_produtos || 0)) * 100).toFixed(4)
          )
        : 0,
    rawXml: data.xml_conteudo || undefined,
    items,
  };
};

export const buildInboundInvoicePayload = (
  invoice: any,
  accessKey: string,
  supplierId: string | null,
  items: any[],
  xml: string
) => ({
  chave_acesso: accessKey,
  numero_nfe: Number(String(invoice.nfeNumber || '').replace(/\D/g, '')) || 0,
  serie: invoice.series || '1',
  data_emissao: invoice.issuedAt,
  emitente_cnpj: invoice.emitterCnpj || '',
  emitente_nome: invoice.emitterName || '',
  emitente_fantasia: invoice.emitterTradeName || null,
  emitente_ie: invoice.emitterIe || null,
  emitente_endereco: invoice.emitterAddress || {},
  supplier_id: supplierId,
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
  valor_total: invoice.totalInvoice || 0,
  status_recebimento: 'pendente',
  xml_conteudo: xml,
  itens: items,
  origem_importacao: 'xml',
  updated_at: new Date().toISOString(),
});

export const buildInboundInvoiceItemRows = (invoiceId: string, items: any[]) =>
  items.map((item: any, index: number) => ({
    invoice_id: invoiceId,
    item_number: Number(item.itemNumber) || index + 1,
    product_code: String(item.productCode || ''),
    product_description: String(item.productDescription || 'Item sem descrição'),
    ean: item.ean || null,
    ncm: item.ncm || null,
    cfop: item.cfop || null,
    cest: item.cest || null,
    unit: item.unit || 'UN',
    quantity: Number(item.quantity) || 0,
    unit_cost: Number(item.unitCost) || 0,
    total_cost: Number(item.totalCost) || 0,
    ipi_percent: Number(item.ipiPercent) || 0,
    ipi_value: Number(item.ipiValue) || 0,
    icms_percent: Number(item.icmsPercent) || 0,
    icms_value: Number(item.icmsValue) || 0,
    icms_base_value: Number(item.icmsBaseValue) || 0,
    icms_st_percent: Number(item.icmsStPercent) || 0,
    icms_st_value: Number(item.icmsStValue) || 0,
    icms_st_base_value: Number(item.icmsStBaseValue) || 0,
    freight_value: Number(item.freightValue) || 0,
    insurance_value: Number(item.insuranceValue) || 0,
    discount_value: Number(item.discountValue) || 0,
    other_expenses_value: Number(item.otherExpensesValue) || 0,
    product_id: item.matchedProductId || null,
    variation_id: item.matchedVariationId || null,
    raw_item: item,
  }));
