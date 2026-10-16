import { supabase } from '@/pages/utils/supabaseConfig';
import type { UnavailabilitySupplier } from '../types/unavailabilityForm.types';
import { stockUnavailabilitySupplierQuerySchema } from '../../../../../../../shared-utils/stockUnavailabilityFormSchemas';
import { withTimeout } from '../../../../../../../shared-utils/withTimeout';

interface ProductSuppliersRow {
  supplier_id?: string | null;
  main_supplier_id?: string | null;
  supplier_ids?: string[] | null;
}

interface SupplierPersonRow {
  id: string;
  full_name?: string | null;
  nickname?: string | null;
  social_name?: string | null;
}

/**
 * Busca exclusivamente os fornecedores vinculados ao produto informado
 * (mesclando supplier_id principal, alternativo e lista supplier_ids).
 */
export async function fetchSuppliersForProductResult(productId: string, stillCurrent: () => boolean = () => true): Promise<{ data: UnavailabilitySupplier[]; error: Error | null }> {
  try {
    const values = stockUnavailabilitySupplierQuerySchema.parse({ productId });
    if (!stillCurrent()) throw new Error('A consulta de fornecedores mudou.');
    const product = await withTimeout(supabase
      .from('products')
      .select('supplier_id, main_supplier_id, supplier_ids')
      .eq('id', values.productId)
      .single(), 10000, null, 'indisponibilidade:fornecedores-produto');
    if (!product) throw new Error('A consulta de fornecedores excedeu o prazo.');
    const { data: prodData, error: prodErr } = product;
    if (prodErr) throw prodErr;
    if (!prodData) throw new Error('Não foi possível confirmar o produto da consulta.');

    const typedProd = prodData as ProductSuppliersRow;
    const linkedIds = Array.from(
      new Set(
        [
          typedProd.supplier_id,
          typedProd.main_supplier_id,
          ...(Array.isArray(typedProd.supplier_ids) ? typedProd.supplier_ids : []),
        ].filter((id): id is string => typeof id === 'string' && id.trim().length > 0)
      )
    );

    if (linkedIds.length === 0) {
      return { data: [], error: null };
    }

    if (!stillCurrent()) throw new Error('A consulta de fornecedores mudou.');
    const people = await withTimeout(supabase
      .from('people')
      .select('id, full_name, nickname, social_name')
      .in('id', linkedIds)
      .or('person_type.ilike.suppliers,person_type.ilike.supplier'), 10000, null, 'indisponibilidade:fornecedores-pessoas');
    if (!people) throw new Error('A consulta de fornecedores excedeu o prazo.');
    const { data: supList, error: supErr } = people;
    if (supErr) throw supErr;
    if (!Array.isArray(supList)) throw new Error('Não foi possível confirmar a lista de fornecedores.');

    const data = (supList as SupplierPersonRow[])
      .filter((person) => linkedIds.includes(person.id))
      .map((person) => ({
        id: person.id,
        fantasy_name:
          person.nickname?.trim() ||
          person.full_name?.trim() ||
          person.social_name?.trim() ||
          'Fornecedor sem nome',
      }))
      .sort((left, right) => left.fantasy_name.localeCompare(right.fantasy_name, 'pt-BR'));
    return { data, error: null };
  } catch (err) {
    return { data: [], error: err instanceof Error ? err : new Error('Não foi possível consultar os fornecedores do produto.') };
  }
}

export async function fetchSuppliersForProduct(productId: string): Promise<UnavailabilitySupplier[]> {
  if (!productId.trim()) return [];
  return (await fetchSuppliersForProductResult(productId)).data;
}
