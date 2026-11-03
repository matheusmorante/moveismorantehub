import { supabase } from '../../../services/supabaseClient';
import { withMobileMutationTimeout } from './mobileProductMutationTimeout';
import { triggerMobileProductMetaCatalogSync } from './mobileProductMetaCatalogSyncService';

export const deleteMobileProduct = async (productId: string, isDraft = false) => {
  if (isDraft) {
    const realId = String(productId).split('_')[0];
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(realId)) {
      throw new Error('ID do produto inválido.');
    }

    const { data, error } = await withMobileMutationTimeout(
      supabase.rpc('delete_unreferenced_product', {
        p_product_id: realId,
      }),
      'mobile:descartar-rascunho'
    );
    if (error) throw error;

    const result = data as { success?: boolean; message?: string } | null;
    if (!result?.success) {
      throw new Error(result?.message || 'Não foi possível descartar o rascunho.');
    }
    return result;
  }

  const { error } = await supabase
    .from('products')
    .update({ deleted: true, active: false, updated_at: new Date().toISOString() })
    .eq('id', productId);
  if (error) throw error;
};

export const moveMobileProductToTrash = async (productId: string) => {
  const realId = String(productId).split('_')[0];
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(realId)) {
    throw new Error('ID do produto inválido.');
  }
  const { data, error } = await withMobileMutationTimeout(
    supabase.rpc('move_product_to_trash', {
      p_product_id: realId,
    }),
    'mobile:mover-produto-para-lixeira'
  );
  if (error) throw error;
  const result = data as { success?: boolean; message?: string } | null;
  if (!result?.success) {
    throw new Error(result?.message || 'Não foi possível mover o produto para a lixeira.');
  }
  triggerMobileProductMetaCatalogSync(realId);
  return result;
};

export const restoreMobileProductFromTrash = async (productId: string) => {
  const realId = String(productId).split('_')[0];
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(realId)) {
    throw new Error('ID do produto inválido.');
  }
  const { data, error } = await withMobileMutationTimeout(
    supabase.rpc('restore_product_from_trash', {
      p_product_id: realId,
    }),
    'mobile:restaurar-produto-da-lixeira'
  );
  if (error) throw error;
  const result = data as { success?: boolean; message?: string } | null;
  if (!result?.success) {
    throw new Error(result?.message || 'Não foi possível restaurar o produto da lixeira.');
  }
  triggerMobileProductMetaCatalogSync(realId);
  return result;
};
