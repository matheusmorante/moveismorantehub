import { withTimeout } from '../core/withTimeout';
import {
  reconciliationSupplierResultsSchema,
  reconciliationSupplierSearchSchema,
} from '../reconciliationFormSchemas';
import { buildPostgrestAccentInsensitiveOrFilter } from '../core/searchText';

export type ReconciliationSupplierOption = {
  id: string;
  fullName: string;
  tradeName?: string;
};

type SupplierSearchResponse = { data: unknown; error: unknown } | null;

/** Supplier lookup shared by the ERP product reconciliation card and modal. */
export async function searchReconciliationSuppliersWithClient(
  client: any,
  search: string
): Promise<ReconciliationSupplierOption[]> {
  const values = reconciliationSupplierSearchSchema.parse({ search });
  const result = await withTimeout<SupplierSearchResponse>(
    client
      .from('people')
      .select('id, full_name, social_name, nickname')
      .or(buildPostgrestAccentInsensitiveOrFilter(['full_name', 'social_name'], values.search))
      .or('person_type.ilike.suppliers,person_type.ilike.supplier')
      .eq('deleted', false)
      .order('full_name')
      .limit(5),
    15_000,
    null,
    'reconciliacao:buscar-fornecedor'
  );

  if (!result || result.error) {
    throw new Error('Não foi possível buscar fornecedores. Tente novamente.');
  }
  const parsed = reconciliationSupplierResultsSchema.safeParse(result.data ?? []);
  if (!parsed.success) {
    throw new Error('A busca retornou fornecedores inválidos. Tente novamente.');
  }

  return parsed.data.map((person) => ({
    id: person.id,
    fullName: person.full_name || '',
    tradeName: person.social_name || person.nickname || '',
  }));
}
