import { supabase } from '@/pages/utils/supabaseConfig';
import type { UnavailabilitySupplier } from '../types/unavailabilityForm.types';

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
export async function fetchSuppliersForProduct(
  productId: string
): Promise<UnavailabilitySupplier[]> {
  if (!productId) return [];

  try {
    const { data: prodData, error: prodErr } = await supabase
      .from('products')
      .select('supplier_id, main_supplier_id, supplier_ids')
      .eq('id', productId)
      .single();

    if (prodErr) throw prodErr;
    if (!prodData) return [];

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
      return [];
    }

    const { data: supList, error: supErr } = await supabase
      .from('people')
      .select('id, full_name, nickname, social_name')
      .in('id', linkedIds)
      .or('person_type.ilike.suppliers,person_type.ilike.supplier');

    if (supErr) throw supErr;
    if (!supList) return [];

    return (supList as SupplierPersonRow[])
      .map((person) => ({
        id: person.id,
        fantasy_name:
          person.nickname?.trim() ||
          person.full_name?.trim() ||
          person.social_name?.trim() ||
          'Fornecedor sem nome',
      }))
      .sort((left, right) => left.fantasy_name.localeCompare(right.fantasy_name, 'pt-BR'));
  } catch (err) {
    console.error('Erro ao buscar fornecedores do produto:', err);
    return [];
  }
}
