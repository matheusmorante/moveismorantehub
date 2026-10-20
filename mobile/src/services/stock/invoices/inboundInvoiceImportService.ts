import { supabase } from '../../supabaseClient';
import { parseInboundNfeXml } from '../../../features/stock/invoices/utils/inboundXmlParser';
import {
  buildInboundInvoiceItemRows,
  buildInboundInvoicePayload,
  formatTaxId,
  normalizeTaxId,
} from './inboundInvoiceMappers';
import { findInboundSupplierProductCodes } from './inboundInvoiceMappingsService';

export const findInboundInvoiceSupplier = async (taxId: string, name: string) => {
  const digits = normalizeTaxId(taxId);
  const supplierTypeFilter = 'person_type.ilike.suppliers,person_type.ilike.supplier';

  if (digits.length === 11 || digits.length === 14) {
    const formatted = formatTaxId(digits);
    const { data, error } = await supabase
      .from('people')
      .select('id, full_name, cpf_cnpj')
      .or(supplierTypeFilter)
      .in('cpf_cnpj', [digits, formatted])
      .order('full_name')
      .limit(20);
    if (error) throw error;
    const exactMatch = (data || []).find(
      (person: any) => normalizeTaxId(person.cpf_cnpj) === digits
    );
    if (exactMatch) return exactMatch;
  }

  const normalizedName = name.trim();
  if (!normalizedName) return null;
  const { data, error } = await supabase
    .from('people')
    .select('id, full_name, cpf_cnpj')
    .or(supplierTypeFilter)
    .ilike('full_name', normalizedName)
    .order('full_name')
    .limit(20);
  if (error) throw error;
  return (
    (data || []).find(
      (person: any) =>
        String(person.full_name || '')
          .trim()
          .toLocaleLowerCase('pt-BR') === normalizedName.toLocaleLowerCase('pt-BR')
    ) || null
  );
};

export const importInboundInvoiceXml = async (xml: string) => {
  const invoice = parseInboundNfeXml(xml);
  const accessKey = String(invoice.nfeKey || '').replace(/\D/g, '');
  if (accessKey.length !== 44) throw new Error('Chave de acesso da NF-e inválida.');
  if (String(invoice.model || '').replace(/\D/g, '') === '65') {
    throw new Error('NFC-e (modelo 65) não pode ser cadastrada como NF de Entrada.');
  }

  const { data: existingInvoice, error: duplicateCheckError } = await supabase
    .from('inbound_invoices')
    .select('numero_nfe,serie,emitente_nome')
    .eq('chave_acesso', accessKey)
    .maybeSingle();
  if (duplicateCheckError) throw duplicateCheckError;
  if (existingInvoice) {
    const formattedAccessKey = accessKey.match(/.{1,4}/g)?.join(' ') || accessKey;
    throw new Error(
      `Nota Fiscal Já Cadastrada: Chave de acesso ${formattedAccessKey}\nNF-e #${existingInvoice.numero_nfe || 'S/N'} · Série ${existingInvoice.serie || '1'} — ${existingInvoice.emitente_nome || 'Emitente não informado'}. A nota existente foi preservada.`
    );
  }

  let supplierId = invoice.supplierId || null;
  let items = Array.isArray(invoice.items) ? invoice.items : [];
  try {
    const supplier = await findInboundInvoiceSupplier(
      invoice.emitterCnpj || '',
      invoice.emitterName || ''
    );
    supplierId = supplier?.id || supplierId;
  } catch (supplierError) {
    console.warn(
      '[importInboundInvoiceXml] Não foi possível localizar o fornecedor; a NF será salva sem associação.',
      supplierError
    );
  }

  if (supplierId && items.length) {
    try {
      const mappings = await findInboundSupplierProductCodes(
        supplierId,
        items.map((item: any) => String(item.productCode || ''))
      );
      if (mappings.size) {
        items = items.map((item: any) => {
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

  const payload = buildInboundInvoicePayload(invoice, accessKey, supplierId, items, xml);

  const { data, error } = await supabase
    .from('inbound_invoices')
    .upsert(payload, { onConflict: 'chave_acesso' })
    .select('id')
    .single();
  if (error) throw error;

  const itemRows = buildInboundInvoiceItemRows(data.id, items);

  if (itemRows.length) {
    const { error: itemsError } = await supabase
      .from('inbound_invoice_items')
      .upsert(itemRows, { onConflict: 'invoice_id,item_number' });
    if (itemsError) throw itemsError;
  }

  return {
    id: data.id,
    number: String(invoice.nfeNumber || ''),
    series: String(invoice.series || '1'),
    accessKey,
    supplierName: invoice.emitterTradeName || invoice.emitterName || 'Fornecedor Desconhecido',
    supplierCnpj: invoice.emitterCnpj || '',
    issueDate: invoice.issuedAt || '',
    totalValue: Number(invoice.totalInvoice || 0),
    itemsCount: itemRows.length,
  };
};
