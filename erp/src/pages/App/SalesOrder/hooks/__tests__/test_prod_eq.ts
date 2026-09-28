import { createClient } from '@supabase/supabase-js';
const supabase = createClient('https://hkoxhourxwlddgsfdgws.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhrb3hob3VyeHdsZGRnc2ZkZ3dzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxNTg5MzgsImV4cCI6MjA5MzczNDkzOH0.vCNJeoR4wDl1BqESiyNhKpgviwxcx0cim8Dbl6MvdJI');
import { mapFromDB } from '../../../../utils/productService/productMapper';
import { getProductSelectableById } from '../../../../utils/productService/productQueryService';
import { getCompositionSelectableById } from '../../../../utils/compositionService';

// Logic from OLD hook
const fetchOld = async (term: string) => {
    // 1. Fetch all products
    const { data: prods, error: err1 } = await supabase.from('products').select(`
        *,
        product_variations (*),
        product_categories (category_id, categories (id, name, path)),
        product_images (id, url, position, is_primary)
      `).eq('is_draft', false).eq('active', true).eq('deleted', false);
    
    // 2. Fetch all compositions
    const { data: comps } = await supabase.from('compositions').select(`
        *,
        variations:composition_variations(
            *,
            items:composition_variation_items(
                *,
                product:products(*, product_variations(*)),
                variation:product_variations(*)
            )
        )
    `).eq('active', true);

    if (err1) throw new Error(JSON.stringify(err1)); const mappedProds = prods!.map(p => mapFromDB(p));
    
    let flatItems: any[] = [];
    
    mappedProds.forEach((p) => {
      if (!p.variations || p.variations.length === 0) {
        flatItems.push({ p, key: `p-${p.id}` });
      } else {
        p.variations.forEach((v) => {
          if (v.active !== false) {
            flatItems.push({ p, v, key: `v-${v.id}-${p.id}` });
          }
        });
      }
    });
    
    comps!.forEach((c) => {
      if (!c.variations || c.variations.length === 0) {
        flatItems.push({
          p: {
            ...c,
            isComposition: true,
            description: c.name,
            unitPrice: c.manual_price || c.calculated_price || 0,
            code: c.sku || 'COMP',
            category: 'Composição',
          },
          key: `comp-${c.id}`,
          isComposition: true,
        });
      } else {
        c.variations.forEach((cv: any) => {
          if (cv.active !== false) {
            flatItems.push({
              p: {
                ...c,
                isComposition: true,
                description: c.name,
                unitPrice: c.manual_price || c.calculated_price || 0,
                code: c.sku || 'COMP',
                category: 'Composição',
              },
              v: cv,
              key: `comp-v-${cv.id}-${c.id}`,
              isComposition: true,
            });
          }
        });
      }
    });
    
    const searchLower = term.toLowerCase();
    
    return flatItems.filter((item) => {
      if (item.isComposition) {
        return (
          item.p.description?.toLowerCase().includes(searchLower) ||
          item.p.code?.toLowerCase().includes(searchLower) ||
          item.v?.sku?.toLowerCase().includes(searchLower) ||
          item.v?.name?.toLowerCase().includes(searchLower)
        );
      }
      return (
        item.p.description?.toLowerCase().includes(searchLower) ||
        item.p.code?.toLowerCase().includes(searchLower) ||
        item.p.category?.toLowerCase().includes(searchLower) ||
        item.v?.sku?.toLowerCase().includes(searchLower) ||
        item.v?.name?.toLowerCase().includes(searchLower)
      );
    });
};

// Logic from NEW hook (Shallow RPC + Deep Fetch)
const fetchNew = async (term: string) => {
    const { data: shallowItems } = await supabase.rpc('search_catalog_shallow', { p_query: term, p_limit: 15 });
    
    const resolvedItems = [];
    for (const row of shallowItems!) {
        const isComp = row.entity_type.startsWith('composition');
        const hasVar = row.entity_type.includes('variation');
        
        if (isComp) {
            const rawComp = await getCompositionSelectableById(row.composition_id);
            let cv = undefined;
            if (hasVar) {
                cv = rawComp.variations.find((v: any) => v.id === row.composition_variation_id);
            }
            resolvedItems.push({
              p: {
                ...rawComp,
                isComposition: true,
                description: rawComp.name,
                unitPrice: rawComp.manual_price || rawComp.calculated_price || 0,
                code: rawComp.sku || 'COMP',
                category: 'Composição',
              },
              v: cv,
              key: row.key,
              isComposition: true
            });
        } else {
            const rawProd = await getProductSelectableById(row.product_id);
            const p = mapFromDB(rawProd);
            let v = undefined;
            if (hasVar) {
                v = p.variations?.find((v: any) => v.id === row.variation_id);
            }
            resolvedItems.push({
              p,
              v,
              key: row.key
            });
        }
    }
    
    return resolvedItems;
};

// Remove unpredictable fields like 'updatedAt', specific memory instances, etc before comparing
const normalizePayload = (payload: any[]) => {
    return payload.map(item => {
        const cleanP = { ...item.p };
        delete cleanP.updatedAt;
        delete cleanP.createdAt;
        delete cleanP.created_at;
        delete cleanP.updated_at;
        const cleanV = { ...item.v };
        delete cleanV.updatedAt;
        delete cleanV.createdAt;
        delete cleanV.created_at;
        delete cleanV.updated_at;
        return {
            key: item.key,
            isComposition: item.isComposition || false,
            p_id: cleanP.id,
            v_id: cleanV.id,
            p_desc: cleanP.description,
            v_sku: cleanV.sku,
            p_unitPrice: cleanP.unitPrice,
            comp_items_count: item.isComposition && cleanV.items ? cleanV.items.length : undefined
        };
    }).sort((a, b) => a.key.localeCompare(b.key));
};

const runTest = async () => {
    const term = 'a'; // Search something broad
    console.log('Fetching old...');
    const oldResults = await fetchOld(term);
    console.log('Fetching new...');
    const newResults = await fetchNew(term);
    
    const newKeys = newResults.map(r => r.key);
    const oldFiltered = oldResults.filter(r => newKeys.includes(r.key));
    
    const oldNorm = normalizePayload(oldFiltered);
    const newNorm = normalizePayload(newResults);
    
    let isEq = true;
    for (let i = 0; i < newNorm.length; i++) {
        if (JSON.stringify(newNorm[i]) !== JSON.stringify(oldNorm[i])) {
           console.log('MISMATCH at key:', newNorm[i].key);
           console.log('NEW:', newNorm[i]);
           console.log('OLD:', oldNorm[i]);
           isEq = false;
        }
    }
    if (isEq) {
        console.log('SUCCESS! Payloads are perfectly equivalent. Keys matched:', newNorm.length);
    }
};

runTest();
