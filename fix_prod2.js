const fs = require('fs');

let file = fs.readFileSync('erp/src/pages/utils/productService/productQueryService.ts', 'utf8');

file = file.replace(
  /export const fetchProductsPage = async \(/,
  export const fetchAutocompleteProducts = async (
  search: string,
  supplierId?: string,
  includeDeactivated = false
): Promise<Product[]> => {
  try {
    const baseQuery = supabase.from(TABLE_NAME).select('id, name, code, unit_price, cost_price, has_variations, item_type, supplier_id, supplier_ids, active, is_draft, deleted, product_variations(id, name, sku, price, merged_to_variation_id, active)');
    
    const options = {
      search,
      activeOnly: includeDeactivated ? undefined : true,
      isDraft: false,
      supplierId
    };

    const { data, error } = await applyProductFiltersAndSort(baseQuery, options, {
      orderColumn: 'name',
      ascending: true,
      from: 0,
      to: 14
    });

    if (error) {
      console.error('[ProductService] Erro em fetchAutocompleteProducts:', error);
      return [];
    }
    
    let filtered = data || [];
    if (supplierId) {
      filtered = filtered.filter(p => {
        const supIds = p.supplier_ids || [];
        const mainId = p.main_supplier_id || p.supplier_id;
        return supIds.includes(supplierId) || mainId === supplierId;
      });
    }
    
    return filtered.map((p, idx) => mapFromDB(p, idx));
  } catch(e) {
    return [];
  }
};

export const fetchProductsPage = async (
);

fs.writeFileSync('erp/src/pages/utils/productService/productQueryService.ts', file);
console.log('Added fetchAutocompleteProducts');