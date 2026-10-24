import { supabase } from '@/pages/utils/supabaseConfig';
import InventoryMove from '../../types/inventoryMove.type';
import { mapFromDB as mapProductFromDB, updateProduct } from '@/pages/utils/productService';
import { applyInventoryMoveToStockProjection } from '../../../../../shared-utils/inventoryStockProjection';

export const recalculateProductStockOnMove = async (move: InventoryMove): Promise<void> => {
  const { data: p, error } = await supabase
    .from('products')
    .select('*, product_variations(*)')
    .eq('id', move.productId)
    .single();

  if (error) throw error;
  if (!p) throw new Error('Produto não encontrado para confirmar o saldo.');

  const product = mapProductFromDB(p);
  const projection = applyInventoryMoveToStockProjection(product, move);

  await updateProduct(move.productId, {
    stock: projection.stock,
    costPrice: projection.costPrice,
    variations: projection.variations.length > 0 ? projection.variations : undefined,
  });
};

export const revertProductStockFromMove = async (move: InventoryMove): Promise<void> => {
  const { data: p } = await supabase
    .from('products')
    .select('*, product_variations(*)')
    .eq('id', move.productId)
    .single();

  if (!p) return;

  const qty = Number(move.quantity || 0);
  const product = mapProductFromDB(p);
  let newTotalStock = Number(product.stock || 0);
  const updatedVariations = product.variations ? [...product.variations] : [];

  if (move.variationId && updatedVariations.length > 0) {
    const vIdx = updatedVariations.findIndex((v: any) => String(v.id) === String(move.variationId));
    if (vIdx !== -1) {
      let vStock = Number(updatedVariations[vIdx].stock || 0);
      if (isEntryType(move.type)) vStock -= qty;
      else if (isExitType(move.type)) vStock += qty;
      else if (isAdjustmentType(move.type)) vStock -= qty;
      updatedVariations[vIdx].stock = vStock;
    }
    newTotalStock = updatedVariations.reduce(
      (acc: number, v: any) => acc + Number(v.stock || 0),
      0
    );
  } else {
    if (isEntryType(move.type)) newTotalStock -= qty;
    else if (isExitType(move.type)) newTotalStock += qty;
    else if (isAdjustmentType(move.type)) newTotalStock -= qty;
  }

  await updateProduct(move.productId, {
    stock: newTotalStock,
    variations: updatedVariations.length > 0 ? updatedVariations : undefined,
  });
};

export const reapplyProductStockFromMove = async (move: InventoryMove): Promise<void> => {
  const { data: p } = await supabase
    .from('products')
    .select('*, product_variations(*)')
    .eq('id', move.productId)
    .single();

  if (!p) return;

  const qty = Number(move.quantity || 0);
  const product = mapProductFromDB(p);
  let newTotalStock = Number(product.stock || 0);
  const updatedVariations = product.variations ? [...product.variations] : [];

  if (move.variationId && updatedVariations.length > 0) {
    const vIdx = updatedVariations.findIndex((v: any) => String(v.id) === String(move.variationId));
    if (vIdx !== -1) {
      let vStock = Number(updatedVariations[vIdx].stock || 0);
      if (isEntryType(move.type)) vStock += qty;
      else if (isExitType(move.type)) vStock -= qty;
      else if (isAdjustmentType(move.type)) vStock += qty;
      updatedVariations[vIdx].stock = vStock;
    }
    newTotalStock = updatedVariations.reduce(
      (acc: number, v: any) => acc + Number(v.stock || 0),
      0
    );
  } else {
    if (isEntryType(move.type)) newTotalStock += qty;
    else if (isExitType(move.type)) newTotalStock -= qty;
    else if (isAdjustmentType(move.type)) newTotalStock += qty;
  }

  await updateProduct(move.productId, {
    stock: newTotalStock,
    variations: updatedVariations.length > 0 ? updatedVariations : undefined,
  });
};
