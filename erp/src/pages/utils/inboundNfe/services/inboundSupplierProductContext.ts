import { supabase } from '../../supabaseConfig';

export type SupplierProductVariationSummary = {
  id: string;
  name: string;
  attributes: Record<string, string>;
};

export type SupplierProductSummary = {
  id: string;
  name: string;
  variations: SupplierProductVariationSummary[];
};

const SUPPLIER_CONTEXT_PAGE_SIZE = 100;

function extractVariationAttributes(variation: Record<string, unknown>): Record<string, string> {
  try {
    const rawAttrs = variation['attributes'];
    if (!rawAttrs) return {};
    if (typeof rawAttrs === 'object' && !Array.isArray(rawAttrs)) {
      return Object.fromEntries(
        Object.entries(rawAttrs as Record<string, unknown>)
          .filter(([, v]) => v !== null && v !== undefined && String(v).trim() !== '')
          .map(([k, v]) => [k, String(v).trim()])
      );
    }
    if (Array.isArray(rawAttrs)) {
      const result: Record<string, string> = {};
      for (const attr of rawAttrs as Array<{ name?: string; value?: string }>) {
        if (attr.name && attr.value) result[attr.name] = attr.value;
      }
      return result;
    }
    return {};
  } catch {
    return {};
  }
}

/**
 * Busca os produtos ativos do fornecedor com paginação
 * com suas variacoes para compor o contexto de classificacao da IA.
 * Contexto sem imagens, paginado e enviado à IA em lotes.
 */
export async function fetchSupplierProductsForContext(supplierId: string): Promise<SupplierProductSummary[]> {
  if (!supplierId) return [];
  try {
    const loadPages = async () => {
      const rows: Record<string, unknown>[] = [];
      for (let offset = 0; ; offset += SUPPLIER_CONTEXT_PAGE_SIZE) {
        let query = supabase.from('products')
          .select('id, name, description, product_variations(id, name, attributes)')
          .eq('deleted', false).eq('active', true).not('is_draft', 'is', true);
        query = query.or('supplier_id.eq.' + supplierId + ',main_supplier_id.eq.' + supplierId + ',supplier_ids.cs.{"' + supplierId + '"}');
        const { data, error } = await query.order('id').range(offset, offset + SUPPLIER_CONTEXT_PAGE_SIZE - 1);
        if (error) throw error;
        rows.push(...(data || []));
        if ((data || []).length < SUPPLIER_CONTEXT_PAGE_SIZE) return rows;
      }
    };
    const filtered = await loadPages();
    return filtered
      .map((row: Record<string, unknown>) => ({
        id: String(row['id'] || ''),
        name: String(row['name'] || row['description'] || ''),
        variations: Array.isArray(row['product_variations'])
          ? (row['product_variations'] as Record<string, unknown>[])
              .filter((v) => v['name'] || v['id'])
              .map((v) => ({
                id: String(v['id'] || ''),
                name: String(v['name'] || ''),
                attributes: extractVariationAttributes(v),
              }))
          : [],
      }));
  } catch (err) {
    console.warn('[inboundSupplierProductContext] Excecao ao buscar produtos do fornecedor:', err);
    return [];
  }
}

/**
 * Formata a lista de produtos do fornecedor para o prompt da IA.
 * Formato compacto para minimizar tokens consumidos.
 */
export function buildSupplierContextSummary(products: SupplierProductSummary[]): string {
  if (!products.length) return 'Nenhum produto cadastrado para este fornecedor.';
  return products
    .map((p) => {
      const variationLines = p.variations
        .map((v) => {
          const attrStr = Object.entries(v.attributes)
            .map(([k, val]) => `${k}: ${val}`)
            .join(', ');
          return `  - Variacao [ID:${v.id}]: ${v.name}${attrStr ? ` [${attrStr}]` : ''}`;
        })
        .join('\n');
      return `• Produto [ID:${p.id}] Nome: ${p.name}${variationLines ? '\n' + variationLines : ''}`;
    })
    .join('\n');
}
