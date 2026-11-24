import { supabase } from '@/pages/utils/supabaseConfig';
import type Product from '../../types/product.type';
import type { ComboItem } from '../../types/product.type';
import { TABLE_NAME } from './productSkuService';
import { calculateCompositionAvailability } from '../compositionMath';
import { withAbortTimeout } from '../../../../../shared-utils/withAbortTimeout';

interface ComponentStockRow {
  id: string | number;
  stock: number | null;
  product_variations?: Array<{ id: string | number; stock: number | null }> | null;
}

interface ComponentStockSnapshot {
  stock: number;
  variations: Map<string, number>;
}

const markCompositionsUnavailable = (products: Product[]): Product[] =>
  products.map((product) =>
    product.itemType === 'composition'
      ? {
          ...product,
          stock: 0,
          variations: product.variations?.map((variation) => ({ ...variation, stock: 0 })),
        }
      : product
  );

const collectCompositionComponentIds = (compositions: Product[]): string[] =>
  Array.from(
    new Set(
      compositions
        .flatMap((product) => [
          ...(product.comboItems || []),
          ...(product.variations || []).flatMap((variation) => variation.comboItems || []),
        ])
        .map((item) => String(item.productId || '').trim())
        .filter(Boolean)
    )
  );

const buildComponentStockMap = (rows: ComponentStockRow[]): Map<string, ComponentStockSnapshot> => {
  const currentComponents = new Map<string, ComponentStockSnapshot>();
  for (const row of rows) {
    const variations = new Map<string, number>();
    for (const variation of row.product_variations || []) {
      variations.set(String(variation.id), Number(variation.stock) || 0);
    }
    currentComponents.set(String(row.id), {
      stock: Number(row.stock) || 0,
      variations,
    });
  }
  return currentComponents;
};

const calculateItemsAvailability = (
  items: ComboItem[] | undefined,
  currentComponents: Map<string, ComponentStockSnapshot>
): number => {
  if (!items?.length) return 0;
  const requirements = new Map<string, { currentStock: number; quantityNeeded: number }>();

  for (const item of items) {
    const component = currentComponents.get(String(item.productId));
    const currentStock = item.variationId
      ? component?.variations.get(String(item.variationId)) ?? 0
      : component?.stock ?? 0;
    const key = `${item.productId}:${item.variationId || ''}`;
    const existing = requirements.get(key);
    requirements.set(key, {
      currentStock,
      quantityNeeded: (existing?.quantityNeeded || 0) + Number(item.quantity),
    });
  }

  const components = Array.from(requirements.values());
  if (components.some((item) => !Number.isFinite(item.quantityNeeded) || item.quantityNeeded <= 0)) {
    return 0;
  }
  return calculateCompositionAvailability(components);
};

/** Saldo de um produto composto é a quantidade de kits montáveis com o estoque atual dos componentes. */
export const applyCompositionAvailability = async (products: Product[]): Promise<Product[]> => {
  const compositions = products.filter((product) => product.itemType === 'composition');
  if (!compositions.length) return products;

  const componentIds = collectCompositionComponentIds(compositions);
  if (!componentIds.length) return markCompositionsUnavailable(products);

  let data: ComponentStockRow[] | null = null;
  let queryError: unknown = null;

  try {
    const result = await withAbortTimeout(
      supabase
        .from(TABLE_NAME)
        .select('id, stock, product_variations(id, stock)')
        .in('id', componentIds),
      'catalogo:saldo-produtos-compostos'
    );
    data = (result.data as ComponentStockRow[] | null) ?? null;
    queryError = result.error ?? null;
  } catch (error) {
    queryError = error;
  }

  if (queryError) {
    console.warn(
      '[ProductService] Não foi possível consultar o estoque atual dos componentes.',
      queryError
    );
    return markCompositionsUnavailable(products);
  }

  const currentComponents = buildComponentStockMap(data || []);

  return products.map((product) => {
    if (product.itemType !== 'composition') return product;

    const rootItems = product.comboItems || [];
    const hasVariationComposition = (product.variations || []).some((variation) =>
      Boolean(variation.comboItems?.length)
    );
    const variations = product.variations?.map((variation) => ({
      ...variation,
      stock: calculateItemsAvailability(
        variation.comboItems?.length ? variation.comboItems : rootItems,
        currentComponents
      ),
    }));
    const stock = hasVariationComposition
      ? (variations || []).reduce((total, variation) => total + (Number(variation.stock) || 0), 0)
      : calculateItemsAvailability(rootItems, currentComponents);

    return { ...product, stock, variations };
  });
};
