import { supabase } from '../../supabaseConfig';
import type { InboundInvoice } from '../types/inboundNfeTypes';
import { normalizeFiscalIdentifier } from '../../../../../../shared-utils/fiscalIdentifiers';
import { isSalvadosOnlySupplier } from '../../../../../../shared-utils/productSupplierStockOrigin';
import { markInboundInvoiceItemsNotApplicable } from '../../../../../../shared-utils/inboundInvoiceSupplierRules';
import { withTimeout } from '../../../../../../shared-utils/withTimeout';

interface SupplierOriginLookupRow {
  id: string;
  cpf_cnpj?: string | null;
  stock_origins?: string[] | null;
}

interface SupplierOriginByCnpj {
  readonly origins: Set<string>;
  hasSalvadosOnlySupplier: boolean;
}

export const resolveMissingSupplierOrigins = async (
  invoices: InboundInvoice[]
): Promise<InboundInvoice[]> => {
  const invoicesWithoutOrigins = invoices.filter(
    (invoice) => !Array.isArray(invoice.supplierStockOrigins) && invoice.emitterCnpj?.trim()
  );
  if (invoicesWithoutOrigins.length === 0) return invoices;

  const supplierRows: SupplierOriginLookupRow[] = [];
  try {
    for (let firstRow = 0; ; firstRow += 1000) {
      const result = await withTimeout(
        supabase
          .from('people')
          .select('id, cpf_cnpj, stock_origins')
          .or('deleted.eq.false,deleted.is.null')
          .or('person_type.ilike.suppliers,person_type.ilike.supplier')
          .order('id', { ascending: true })
          .range(firstRow, firstRow + 999),
        10000,
        null,
        'entrada:resolver-origem-fornecedor'
      );
      if (!result) throw new Error('A consulta de origem dos fornecedores excedeu o prazo.');
      const { data, error } = result;
      if (error) throw error;
      const page = (data || []) as SupplierOriginLookupRow[];
      supplierRows.push(...page);
      if (page.length < 1000) break;
    }
  } catch (error) {
    console.warn('Não foi possível classificar fornecedores pelo CNPJ da NF-e:', error);
    // Sem a classificação remota, falha de forma segura e não expõe notas sem origem confirmada.
    return invoices.map((invoice) =>
      Array.isArray(invoice.supplierStockOrigins)
        ? invoice
        : { ...invoice, supplierStockOrigins: [] }
    );
  }

  const originsByCnpj = new Map<string, SupplierOriginByCnpj>();
  for (const row of supplierRows) {
    const cnpj = normalizeFiscalIdentifier(row.cpf_cnpj);
    if (!cnpj) continue;
    const entry = originsByCnpj.get(cnpj) || {
      origins: new Set<string>(),
      hasSalvadosOnlySupplier: false,
    };
    const rowOrigins = Array.isArray(row.stock_origins) ? row.stock_origins : ['normal'];
    for (const origin of rowOrigins) {
      entry.origins.add(origin);
    }
    if (rowOrigins.includes('salvados') && !rowOrigins.includes('normal')) {
      entry.hasSalvadosOnlySupplier = true;
    }
    originsByCnpj.set(cnpj, entry);
  }

  return invoices.map((invoice) => {
    if (Array.isArray(invoice.supplierStockOrigins)) {
      return isSalvadosOnlySupplier(invoice.supplierStockOrigins)
        ? { ...invoice, items: markInboundInvoiceItemsNotApplicable(invoice.items) }
        : invoice;
    }
    const cnpj = normalizeFiscalIdentifier(invoice.emitterCnpj);
    const supplier = originsByCnpj.get(cnpj);
    if (!supplier) return invoice;
    const supplierStockOrigins = supplier.hasSalvadosOnlySupplier
      ? ['salvados']
      : Array.from(supplier.origins);
    return {
      ...invoice,
      supplierStockOrigins,
      ...(isSalvadosOnlySupplier(supplierStockOrigins)
        ? { items: markInboundInvoiceItemsNotApplicable(invoice.items) }
        : {}),
    };
  });
};
