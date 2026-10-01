import { supabase } from '../../../../utils/supabaseConfig';

/**
 * Atribui fornecedor em lote para os IDs selecionados
 */
export async function applySupplierBatch(
  productIds: string[],
  supplierId: string,
  replaceExisting: boolean = true
): Promise<{ success: boolean; updated: number; error?: string }> {
  try {
    const BATCH_SIZE = 50;
    let updated = 0;

    for (let i = 0; i < productIds.length; i += BATCH_SIZE) {
      const batch = productIds.slice(i, i + BATCH_SIZE);

      let q = supabase
        .from('products')
        .update({ main_supplier_id: supplierId, supplier_id: supplierId })
        .in('id', batch);

      if (!replaceExisting) {
        q = q.is('main_supplier_id', null);
      }

      const { error, count } = await q.select('id');
      if (error) throw error;
      updated += count ?? batch.length;
    }

    return { success: true, updated };
  } catch (err: any) {
    console.error('[Reconciliation] Erro ao aplicar fornecedor em lote:', err);
    return { success: false, updated: 0, error: err.message || 'Erro ao atualizar fornecedor.' };
  }
}

/**
 * Atribui categoria em lote para os IDs selecionados
 */
export async function applyCategoryBatch(
  productIds: string[],
  categoryId: string
): Promise<{ success: boolean; updated: number; error?: string }> {
  try {
    // Atualiza a coluna category_id na tabela products
    const { error: prodErr } = await supabase
      .from('products')
      .update({ category_id: categoryId })
      .in('id', productIds);

    if (prodErr) throw prodErr;

    // Atualiza a tabela associativa product_categories
    await supabase.from('product_categories').delete().in('product_id', productIds);

    const categoryRecords = productIds.map((id) => ({
      product_id: id,
      category_id: categoryId,
    }));

    const { error: catErr } = await supabase.from('product_categories').insert(categoryRecords);

    if (catErr) {
      console.warn('[Reconciliation] Aviso ao inserir product_categories:', catErr);
    }

    return { success: true, updated: productIds.length };
  } catch (err: any) {
    console.error('[Reconciliation] Erro ao aplicar categoria em lote:', err);
    return { success: false, updated: 0, error: err.message || 'Erro ao atualizar categoria.' };
  }
}

/**
 * Atribui NCM em lote para os IDs selecionados
 */
export async function applyNcmBatch(
  productIds: string[],
  ncm: string
): Promise<{ success: boolean; updated: number; error?: string }> {
  try {
    const cleanNcm = ncm.trim();
    for (const id of productIds) {
      const { data: prod } = await supabase.from('products').select('fiscal').eq('id', id).single();

      const existingFiscal = prod?.fiscal || {};
      const updatedFiscal = { ...existingFiscal, ncm: cleanNcm };

      await supabase.from('products').update({ fiscal: updatedFiscal }).eq('id', id);
    }

    return { success: true, updated: productIds.length };
  } catch (err: any) {
    console.error('[Reconciliation] Erro ao aplicar NCM em lote:', err);
    return { success: false, updated: 0, error: err.message || 'Erro ao atualizar NCM.' };
  }
}

/**
 * Atribui atributo e valor em lote para as variações de produtos compatíveis
 */
export async function applyAttributeBatch(
  productIds: string[],
  attributeName: string,
  attributeValue: string
): Promise<{ success: boolean; updated: number; error?: string }> {
  try {
    const cleanName = attributeName.trim();
    const cleanValue = attributeValue.trim();

    const { data: variations, error: varErr } = await supabase
      .from('product_variations')
      .select('id, product_id, attributes')
      .in('product_id', productIds);

    if (varErr) throw varErr;

    let updatedCount = 0;
    for (const v of variations || []) {
      let attrs: any[] = v.attributes;
      if (typeof attrs === 'string') {
        try {
          attrs = JSON.parse(attrs);
        } catch {
          attrs = [];
        }
      }
      if (!Array.isArray(attrs)) attrs = [];

      const existingIndex = attrs.findIndex(
        (a: any) => (a.name || '').toLowerCase() === cleanName.toLowerCase()
      );

      if (existingIndex >= 0) {
        attrs[existingIndex] = { ...attrs[existingIndex], value: cleanValue };
      } else {
        attrs.push({ name: cleanName, value: cleanValue, showName: true });
      }

      const { error: updErr } = await supabase
        .from('product_variations')
        .update({ attributes: attrs })
        .eq('id', v.id);

      if (!updErr) updatedCount++;
    }

    return { success: true, updated: updatedCount };
  } catch (err: any) {
    console.error('[Reconciliation] Erro ao aplicar atributo em lote:', err);
    return { success: false, updated: 0, error: err.message || 'Erro ao atualizar atributos.' };
  }
}

/**
 * Salva correções inline feitas diretamente em um produto e em suas variações
 */
export async function saveSingleProductReconciliation(
  productUpdates: {
    id: string;
    mainSupplierId?: string;
    categoryId?: string;
    ncm?: string;
    price?: number;
  },
  variationUpdates?: Array<{
    id: string;
    price?: number;
    attributes?: Array<{ name: string; value: string; showName?: boolean }>;
  }>
): Promise<{ success: boolean; error?: string }> {
  try {
    const payload: Record<string, any> = {};

    if (productUpdates.mainSupplierId !== undefined) {
      payload.main_supplier_id = productUpdates.mainSupplierId;
      payload.supplier_id = productUpdates.mainSupplierId;
    }

    if (productUpdates.categoryId !== undefined) {
      payload.category_id = productUpdates.categoryId;
      // Atualizar tabela product_categories
      await supabase.from('product_categories').delete().eq('product_id', productUpdates.id);

      if (productUpdates.categoryId) {
        await supabase
          .from('product_categories')
          .insert([{ product_id: productUpdates.id, category_id: productUpdates.categoryId }]);
      }
    }

    if (productUpdates.price !== undefined && !isNaN(productUpdates.price)) {
      payload.price = productUpdates.price;
    }

    if (productUpdates.ncm !== undefined) {
      const { data: current } = await supabase
        .from('products')
        .select('fiscal')
        .eq('id', productUpdates.id)
        .single();

      const fiscal = { ...(current?.fiscal || {}), ncm: productUpdates.ncm.trim() };
      payload.fiscal = fiscal;
    }

    if (Object.keys(payload).length > 0) {
      const { error: pErr } = await supabase
        .from('products')
        .update(payload)
        .eq('id', productUpdates.id);

      if (pErr) throw pErr;
    }

    // Salvar variações caso tenham sido alteradas
    if (variationUpdates && variationUpdates.length > 0) {
      for (const v of variationUpdates) {
        const varPayload: Record<string, any> = {};
        if (v.price !== undefined) varPayload.price = v.price;
        if (v.attributes !== undefined) varPayload.attributes = v.attributes;

        if (Object.keys(varPayload).length > 0) {
          const { error: vErr } = await supabase
            .from('product_variations')
            .update(varPayload)
            .eq('id', v.id);

          if (vErr) throw vErr;
        }
      }
    }

    return { success: true };
  } catch (err: any) {
    console.error('[Reconciliation] Erro ao salvar conciliação do produto:', err);
    return { success: false, error: err.message || 'Erro ao salvar alterações.' };
  }
}
