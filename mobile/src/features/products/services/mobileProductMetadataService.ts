import { supabase } from '../../../services/supabaseClient';

interface OpportunityRow {
  id: string;
  name: string | null;
}

interface SupplierRow {
  id: string;
  full_name: string | null;
  nickname: string | null;
  social_name: string | null;
}

let opportunityMapCache: Record<string, string> | null = null;
let opportunityMapPromise: Promise<Record<string, string>> | null = null;

export const fetchProductOpportunityMap = async (): Promise<Record<string, string>> => {
  if (opportunityMapCache) return opportunityMapCache;
  if (!opportunityMapPromise) {
    opportunityMapPromise = (async () => {
      const { data } = await supabase.from('opportunities').select('id, name');
      const map: Record<string, string> = {};
      ((data || []) as OpportunityRow[]).forEach(({ id, name }) => {
        if (name) map[id] = name;
      });
      opportunityMapCache = map;
      return map;
    })();
  }
  return opportunityMapPromise;
};

let supplierMapCache: Record<string, string> | null = null;
let supplierMapPromise: Promise<Record<string, string>> | null = null;

export const fetchProductSupplierMap = async (): Promise<Record<string, string>> => {
  if (supplierMapCache) return supplierMapCache;
  if (!supplierMapPromise) {
    supplierMapPromise = (async () => {
      const { data } = await supabase
        .from('people')
        .select('id, full_name, nickname, social_name')
        .or('person_type.ilike.suppliers,person_type.ilike.supplier');
      const map: Record<string, string> = {};
      ((data || []) as SupplierRow[]).forEach(({ id, full_name, nickname, social_name }) => {
        map[id] = nickname || full_name || social_name || '';
      });
      supplierMapCache = map;
      return map;
    })();
  }
  return supplierMapPromise;
};
