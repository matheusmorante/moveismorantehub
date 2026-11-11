import { resolveProductUnitPrice } from '../../../../../shared-utils/productUnitPrice';
import { resolveProductVariationSku } from '../../../../../shared-utils/productVariationSku';
import { getMobileProductListCategoryLabel } from '../domain/mobileProductListPresentation';
import { getMobileProductVariationRecords } from '../domain/mobileProductVariationVisibility';

export const mapMobileProductSummaries = (
  products: any[],
  categoryNames: Map<string, string>,
  includeMerged: boolean
) =>
  products
    .filter((product: any) => {
      if (includeMerged) return true;
      const rawVars = getMobileProductVariationRecords(product, true);
      const isMerged =
        rawVars.length > 0 &&
        rawVars.every((variation: any) =>
          Boolean(variation.merged_to_variation_id || variation.mergedToVariationId)
        );
      return !isMerged;
    })
    .map((product: any, productIndex: number) => {
      const parentCode = product.sku || product.code || String(productIndex + 1).padStart(6, '0');
      let variations = getMobileProductVariationRecords(product, includeMerged).map(
        (variation: any, variationIndex: number) => ({
          id: variation.id,
          sku: resolveProductVariationSku(variation.sku, parentCode, variationIndex),
          active: variation.active !== false,
          stock: Number(variation.stock ?? 0),
          comboItems: Array.isArray(variation.combo_items) ? variation.combo_items : [],
        })
      );

      if (
        variations.length === 0 &&
        (product.product_variations || []).length === 0 &&
        (!product.item_type || product.item_type === 'product')
      ) {
        variations = [
          {
            id: `virtual-${String(product.id || parentCode)}`,
            sku: `${parentCode}-01`,
            active: Boolean(product.active),
            stock: Number(product.stock ?? 0),
            comboItems: [],
          },
        ];
      }

      const isDraft = Boolean(product.is_draft || product.status === 'draft');
      const activeVariationCount = variations.filter(
        (variation: any) => variation.active !== false
      ).length;
      return {
        id: product.id,
        code: product.code,
        name: product.name,
        title: product.title,
        description: product.description,
        line: product.line,
        category: getMobileProductListCategoryLabel(product, categoryNames),
        brand: product.brand,
        condition: product.condition,
        price: product.price,
        unitPrice: resolveProductUnitPrice(product),
        promoPrice: Number(product.promo_price ?? 0),
        costPrice: Number(product.cost_price ?? 0),
        stock: Number(product.stock ?? 0),
        unit: product.unit,
        active: isDraft
          ? false
          : variations.length > 0
            ? activeVariationCount > 0
            : Boolean(product.active),
        status: product.status,
        itemType: product.item_type || 'product',
        isDraft,
        deleted: Boolean(product.deleted),
        comboItems: Array.isArray(product.combo_items) ? product.combo_items : [],
        variations,
        allVariations: variations.map((variation: any) => ({
          id: variation.id,
          sku: variation.sku,
          stock: variation.stock,
        })),
      };
    });
