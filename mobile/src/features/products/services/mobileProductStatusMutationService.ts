import { isTestProduct } from '../../../../../shared-utils/isTestProduct';
import { resolveProductUnitPrice } from '../../../../../shared-utils/productUnitPrice';
import {
  validateProductActivationRequirements,
  type ProductActivationProduct,
} from '../../../../../shared-utils/productActivationValidation';
import { supabase } from '../../../services/supabaseClient';
import { getMobileProductVariationRecords } from '../domain/mobileProductVariationVisibility';
import { triggerMobileProductMetaCatalogSync } from './mobileProductMetaCatalogSyncService';
import { withMobileMutationTimeout } from './mobileProductMutationTimeout';
export const toggleMobileProductCatalog = async (
  productId: string,
  currentStatus: string,
  isVariation = false,
  variationId?: string
) => {
  const nextStatus = currentStatus === 'published' ? 'hidden' : 'published';
  if (nextStatus === 'published') {
    const productResult = await withMobileMutationTimeout(
      supabase
        .from('products')
        .select('id, code, sku, name, title, observations, technical_specs')
        .eq('id', productId)
        .maybeSingle(),
      'mobile:validar-publicacao-produto'
    );
    if (productResult.error) throw productResult.error;
    const prod = productResult.data;
    if (isTestProduct(prod)) {
      throw new Error(
        'Produtos identificados como teste não podem ser publicados no Catálogo Digital.'
      );
    }
  }
  if (isVariation && variationId) {
    const variationResult = await withMobileMutationTimeout(
      supabase
        .from('product_variations')
        .update({ status: nextStatus, updated_at: new Date().toISOString() })
        .eq('id', variationId),
      'mobile:atualizar-status-variacao'
    );
    if (variationResult.error) throw variationResult.error;

    if (nextStatus === 'published') {
      const parentResult = await withMobileMutationTimeout(
        supabase
          .from('products')
          .update({ status: 'published', updated_at: new Date().toISOString() })
          .eq('id', productId),
        'mobile:publicar-pai-da-variacao'
      );
      if (parentResult.error) throw parentResult.error;
    } else {
      const remainingResult = await withMobileMutationTimeout(
        supabase
          .from('product_variations')
          .select('id')
          .eq('product_id', productId)
          .neq('id', variationId)
          .eq('status', 'published'),
        'mobile:consultar-variacoes-publicadas'
      );
      if (remainingResult.error) throw remainingResult.error;
      if (!remainingResult.data?.length) {
        const parentResult = await withMobileMutationTimeout(
          supabase
            .from('products')
            .update({ status: 'hidden', updated_at: new Date().toISOString() })
            .eq('id', productId),
          'mobile:ocultar-pai-sem-variacoes-publicadas'
        );
        if (parentResult.error) throw parentResult.error;
      }
    }
    triggerMobileProductMetaCatalogSync(productId);
    return nextStatus;
  }

  const productUpdateResult = await withMobileMutationTimeout(
    supabase
      .from('products')
      .update({ status: nextStatus, updated_at: new Date().toISOString() })
      .eq('id', productId),
    'mobile:atualizar-status-produto'
  );
  if (productUpdateResult.error) throw productUpdateResult.error;

  // Publicar/ocultar o pai no ERP aplica o mesmo status às variações vinculadas.
  const variationsResult = await withMobileMutationTimeout(
    supabase
      .from('product_variations')
      .update({ status: nextStatus, updated_at: new Date().toISOString() })
      .eq('product_id', productId),
    'mobile:atualizar-status-variacoes'
  );
  if (variationsResult.error) throw variationsResult.error;
  triggerMobileProductMetaCatalogSync(productId);
  return nextStatus;
};

export const toggleMobileProductActive = async (
  productId: string,
  currentActive: boolean,
  isVariation = false,
  variationId?: string,
  isVirtualVariation = false
) => {
  const nextActive = !currentActive;
  let productKind: string | undefined;
  if (nextActive || (isVariation && variationId) || isVirtualVariation) {
    const productResult = await withMobileMutationTimeout(
      supabase
        .from('products')
        .select(
          nextActive
            ? '*, product_categories(category_id), product_variations(*)'
            : 'product_kind'
        )
        .eq('id', productId)
        .maybeSingle(),
      'mobile:consultar-origem-produto'
    );
    if (productResult.error) throw productResult.error;
    const row: any = productResult.data;
    productKind = row?.product_kind;
    if (nextActive && !row) throw new Error('Produto não encontrado para ativação.');
    if (isVirtualVariation) {
      let hasPersistedVariations = Array.isArray(row?.product_variations)
        ? row.product_variations.length > 0
        : false;
      if (!nextActive) {
        const variationsResult = await withMobileMutationTimeout(
          supabase
            .from('product_variations')
            .select('id')
            .eq('product_id', productId)
            .limit(1),
          'mobile:verificar-variacao-virtual'
        );
        if (variationsResult.error) throw variationsResult.error;
        hasPersistedVariations = Boolean(variationsResult.data?.length);
      }
      if (hasPersistedVariations) {
        throw new Error(
          'As variações deste produto mudaram. Atualize a lista antes de alterar o status.'
        );
      }
    }
    if (nextActive && row) {
      const parentCode = String(row.code || row.sku || '');
      const isDraft = Boolean(row.is_draft || row.status === 'draft');
      const unitPrice = resolveProductUnitPrice(row);
      const visibleVariations = getMobileProductVariationRecords(row, true);
      const variations = visibleVariations.map((variation: any, index: number) => {
        const suffix = String(index + 1).padStart(2, '0');
        const prefix = parentCode ? `${parentCode}-` : '';
        const sku =
          variation.sku && prefix && String(variation.sku).startsWith(prefix)
            ? String(variation.sku)
            : parentCode
              ? `${parentCode}-${suffix}`
              : String(variation.sku || '');
        const syncUnitPrice = variation.use_parent_price !== false;
        return {
          id: String(variation.id),
          sku,
          syncUnitPrice,
          unitPrice: syncUnitPrice ? unitPrice : Number(variation.price || 0),
          comboItems: Array.isArray(variation.combo_items) ? variation.combo_items : [],
        };
      });

      if (
        !isDraft &&
        variations.length === 0 &&
        (!row.item_type || row.item_type === 'product')
      ) {
        variations.push({
          id: `${productId}_${parentCode ? `${parentCode}-01` : '01'}`,
          sku: parentCode ? `${parentCode}-01` : '01',
          syncUnitPrice: true,
          unitPrice,
          comboItems: [],
        });
      }

      const categoryIds = [
        ...(Array.isArray(row.product_categories)
          ? row.product_categories.map((relation: any) => relation.category_id).filter(Boolean)
          : []),
        ...(row.category_id ? [row.category_id] : []),
      ].map(String);
      const itemType = row.item_type || 'product';
      const hasVariations =
        isDraft || itemType !== 'product'
          ? Boolean(row.has_variations)
          : variations.length > 1;
      const activationProduct: ProductActivationProduct = {
        id: String(row.id),
        code: parentCode,
        sku: String(row.sku || parentCode),
        name: row.name || row.title || '',
        description: row.description || '',
        unitPrice,
        category: row.category || '',
        categoryIds,
        supplierId: row.supplier_id || row.main_supplier_id || '',
        mainSupplierId: row.main_supplier_id || row.supplier_id || '',
        isDraft,
        hasVariations,
        itemType,
        isCombo: Boolean(row.is_combo),
        comboItems: Array.isArray(row.combo_items) ? row.combo_items : [],
        variations,
        productKind: row.product_kind,
        condition: row.condition,
        is_salvado: row.is_salvado,
      };

      if (isVariation && variationId) {
        const targetVariation = variations.find(
          (variation) => String(variation.id) === String(variationId)
        );
        if (!targetVariation?.sku) {
          throw new Error('A variação mudou. Atualize a lista antes de ativá-la.');
        }
        const validationId = `${productId}_${targetVariation.sku}`;
        const validation = validateProductActivationRequirements(
          validationId,
          [activationProduct],
          [activationProduct]
        );
        if (!validation.isValid) throw new Error(validation.errorMessage || 'Produto incompleto.');
      } else {
        const validation = validateProductActivationRequirements(
          String(productId),
          [activationProduct],
          [activationProduct]
        );
        if (!validation.isValid) throw new Error(validation.errorMessage || 'Produto incompleto.');
      }
    }
  }
  if (isVariation && variationId) {
    const variationResult = await withMobileMutationTimeout(
      supabase
        .from('product_variations')
        .update({ active: nextActive, updated_at: new Date().toISOString() })
        .eq('id', variationId),
      'mobile:atualizar-ativacao-variacao'
    );
    if (variationResult.error) throw variationResult.error;

    if (productKind && productKind !== 'normal') {
      const parentResult = await withMobileMutationTimeout(
        supabase
          .from('products')
          .update({ active: false, updated_at: new Date().toISOString() })
          .eq('id', productId),
        'mobile:sincronizar-ativacao-pai'
      );
      if (parentResult.error) throw parentResult.error;
    } else {
      const siblingsResult = await withMobileMutationTimeout(
        supabase.from('product_variations').select('active').eq('product_id', productId),
        'mobile:recalcular-ativacao-pai'
      );
      if (siblingsResult.error) throw siblingsResult.error;
      const parentActive = (siblingsResult.data || []).some(
        (variation: { active?: boolean | null }) => variation.active !== false
      );
      const parentResult = await withMobileMutationTimeout(
        supabase
          .from('products')
          .update({ active: parentActive, updated_at: new Date().toISOString() })
          .eq('id', productId),
        'mobile:sincronizar-ativacao-pai'
      );
      if (parentResult.error) throw parentResult.error;
    }
    triggerMobileProductMetaCatalogSync(productId);
    return nextActive;
  }
  const productUpdateResult = await withMobileMutationTimeout(
    supabase
      .from('products')
      .update({ active: nextActive, updated_at: new Date().toISOString() })
      .eq('id', productId),
    'mobile:atualizar-ativacao-produto'
  );
  if (productUpdateResult.error) throw productUpdateResult.error;

  // A ação no produto pai também alterna todas as variações no ERP. Sem esta
  // atualização, o app só mudava `products.active`, enquanto a lista deriva o
  // estado do pai pelas linhas de `product_variations` e continuava mostrando
  // o produto como ativo/inativo incorretamente.
  const variationsResult = await withMobileMutationTimeout(
    supabase
      .from('product_variations')
      .update({ active: nextActive, updated_at: new Date().toISOString() })
      .eq('product_id', productId),
    'mobile:atualizar-ativacao-variacoes'
  );
  if (variationsResult.error) throw variationsResult.error;
  triggerMobileProductMetaCatalogSync(productId);
  return nextActive;
};
