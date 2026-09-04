import { useState, useEffect } from 'react';
import { supabase } from '../../../services/supabaseClient';

let oppCache: Record<string, string> | null = null;
let oppPromise: Promise<Record<string, string>> | null = null;

export const fetchOppMap = async (): Promise<Record<string, string>> => {
  if (oppCache) return oppCache;
  if (!oppPromise) {
    oppPromise = (async () => {
      const { data } = await supabase.from('opportunities').select('id, name');
      const map: Record<string, string> = {};
      if (data) {
        data.forEach((item: any) => { map[item.id] = item.name; });
      }
      oppCache = map;
      return map;
    })();
  }
  return oppPromise;
};

let supplierCache: Record<string, string> | null = null;
let supplierPromise: Promise<Record<string, string>> | null = null;

export const fetchSupplierMap = async (): Promise<Record<string, string>> => {
  if (supplierCache) return supplierCache;
  if (!supplierPromise) {
    supplierPromise = (async () => {
      const { data } = await supabase
        .from('people')
        .select('id, full_name, nickname, social_name')
        .or('person_type.ilike.suppliers,person_type.ilike.supplier');
      const map: Record<string, string> = {};
      if (data) {
        data.forEach((item: any) => {
          map[item.id] = item.nickname || item.full_name || item.social_name || '';
        });
      }
      supplierCache = map;
      return map;
    })();
  }
  return supplierPromise;
};

export function useMobileProductMetadata(product: any) {
  const [oppName, setOppName] = useState<string | null>(
    product.opportunityName || product.opportunity?.name || null
  );
  const [supplierNames, setSupplierNames] = useState<string[]>([]);

  useEffect(() => {
    let mounted = true;
    const oppId = product.opportunity_id || product.opportunityId;
    if (oppId) {
      fetchOppMap().then(map => {
        if (mounted && map[oppId]) setOppName(map[oppId]);
      });
    } else {
      setOppName(product.opportunityName || product.opportunity?.name || null);
    }

    const rawIds = [
      product.mainSupplierId,
      product.supplierId,
      product.main_supplier_id,
      product.supplier_id,
      ...(product.supplierIds || product.supplier_ids || [])
    ];
    const sIds = Array.from(new Set(rawIds.filter(Boolean))).map(String);

    if (sIds.length > 0) {
      fetchSupplierMap().then(map => {
        if (!mounted) return;
        const names: string[] = [];
        sIds.forEach(id => {
          if (map && map[id]) names.push(map[id]);
        });
        if (names.length === 0) {
          const fallback = product.supplierName || product.supplier_name || product.supplier?.name || product.supplier;
          if (fallback) names.push(String(fallback));
        }
        setSupplierNames(Array.from(new Set(names)));
      });
    } else {
      const fallback = product.supplierName || product.supplier_name || product.supplier?.name || product.supplier;
      setSupplierNames(fallback ? [String(fallback)] : []);
    }

    return () => { mounted = false; };
  }, [
    product.opportunity_id,
    product.opportunityId,
    product.mainSupplierId,
    product.supplierId,
    product.main_supplier_id,
    product.supplier_id,
    JSON.stringify(product.supplierIds || product.supplier_ids || [])
  ]);

  return { oppName, supplierNames };
}
