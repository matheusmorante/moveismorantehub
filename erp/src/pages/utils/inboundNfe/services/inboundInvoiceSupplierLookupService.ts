import { supabase } from '../../supabaseConfig';
import { normalizeFiscalIdentifier } from '../../../../../../shared-utils/fiscalIdentifiers';
import { normalizeSearchTerm } from '../../../../../../shared-utils/productText';
import { buildPostgrestAccentInsensitivePattern } from '../../../../../../shared-utils/searchText';
import { isSalvadosOnlySupplier } from '../../../../../../shared-utils/productSupplierStockOrigin';
import { withTimeout } from '../../../../../../shared-utils/withTimeout';

interface SupplierLookupRow {
  id: string;
  full_name?: string | null;
  cpf_cnpj?: string | null;
  stock_origins?: string[] | null;
  active?: boolean | null;
}

interface PriorInvoiceSupplierRow {
  supplier_id?: string | null;
  supplier?: { stock_origins?: string[] | null; active?: boolean | null } | Array<{ stock_origins?: string[] | null; active?: boolean | null }> | null;
}

export interface InboundInvoiceSupplierMatch {
  id: string;
  active: boolean;
  stockOrigins?: string[];
}

const formatTaxIdentifier = (identifier: string): string => {
  if (identifier.length === 14) {
    return `${identifier.slice(0, 2)}.${identifier.slice(2, 5)}.${identifier.slice(5, 8)}/${identifier.slice(8, 12)}-${identifier.slice(12)}`;
  }
  if (identifier.length === 11) {
    return `${identifier.slice(0, 3)}.${identifier.slice(3, 6)}.${identifier.slice(6, 9)}-${identifier.slice(9)}`;
  }
  return identifier;
};

const chooseSupplier = (matches: SupplierLookupRow[]): InboundInvoiceSupplierMatch | null => {
  const supplier = matches.find((row) => row.active && isSalvadosOnlySupplier(row.stock_origins))
    || matches.find((row) => isSalvadosOnlySupplier(row.stock_origins))
    || matches.find((row) => row.active)
    || matches[0];
  if (!supplier?.id) return null;
  return {
    id: supplier.id,
    active: supplier.active === true,
    stockOrigins: Array.isArray(supplier.stock_origins) ? supplier.stock_origins : undefined,
  };
};

const queryRows = async <TRow>(
  query: PromiseLike<{ data: unknown[] | null; error: unknown }>
): Promise<TRow[]> => {
  const result = await withTimeout(query, 10_000, null, 'entrada:localizar-fornecedor-nfe');
  if (!result) throw new Error('A consulta do fornecedor da NF-e excedeu o prazo.');
  if (result.error) throw result.error;
  return (result.data || []) as TRow[];
};

/** Resolve only existing suppliers; invoice import never creates people records. */
export const findInboundInvoiceSupplier = async (
  emitterName?: string,
  emitterTaxId?: string,
  issuedAt?: string
): Promise<InboundInvoiceSupplierMatch | null> => {
  const taxId = normalizeFiscalIdentifier(emitterTaxId);
  if (taxId.length === 11 || taxId.length === 14) {
    const candidates = Array.from(new Set([taxId, formatTaxIdentifier(taxId)]));
    const matches = await queryRows<SupplierLookupRow>(
      supabase
        .from('people')
        .select('id,full_name,cpf_cnpj,stock_origins,active')
        .in('person_type', ['suppliers', 'supplier'])
        .or('deleted.eq.false,deleted.is.null')
        .in('cpf_cnpj', candidates)
        .order('full_name', { ascending: true })
        .limit(20)
    );
    const match = chooseSupplier(matches);
    if (match) return match;

    const issuedAtTimestamp = issuedAt ? Date.parse(issuedAt) : Number.NaN;
    let historyQuery = supabase
      .from('inbound_invoices')
      .select('supplier_id,supplier:people(stock_origins,active)')
      .in('emitente_cnpj', candidates)
      .not('supplier_id', 'is', null);
    if (Number.isFinite(issuedAtTimestamp)) {
      historyQuery = historyQuery.lte('data_emissao', new Date(issuedAtTimestamp).toISOString());
    }
    try {
      const previousInvoices = await queryRows<PriorInvoiceSupplierRow>(
        historyQuery
          .order('data_emissao', { ascending: false })
          .order('updated_at', { ascending: false })
          .limit(1)
      );
      const previousInvoice = previousInvoices[0];
      if (previousInvoice?.supplier_id) {
        const supplier = Array.isArray(previousInvoice.supplier)
          ? previousInvoice.supplier[0]
          : previousInvoice.supplier;
        return {
          id: previousInvoice.supplier_id,
          active: supplier?.active === true,
          stockOrigins: Array.isArray(supplier?.stock_origins) ? supplier.stock_origins : undefined,
        };
      }
    } catch (error) {
      console.warn('[findInboundInvoiceSupplier] Não foi possível consultar vínculos de notas anteriores.', error);
    }
  }

  const name = String(emitterName || '').trim();
  const normalizedName = normalizeSearchTerm(name);
  if (!normalizedName) return null;
  const nameMatches = await queryRows<SupplierLookupRow>(
    supabase
      .from('people')
      .select('id,full_name,cpf_cnpj,stock_origins,active')
      .in('person_type', ['suppliers', 'supplier'])
      .or('deleted.eq.false,deleted.is.null')
      .filter('full_name', 'imatch', buildPostgrestAccentInsensitivePattern(name, 'exact'))
      .order('full_name', { ascending: true })
      .limit(20)
  );
  return chooseSupplier(nameMatches);
};
