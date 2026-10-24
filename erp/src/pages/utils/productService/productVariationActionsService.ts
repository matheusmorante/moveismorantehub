import { supabase } from '@/pages/utils/supabaseConfig';
import { MAX_VARIATION_IMAGES } from './productImageHelpers';
import { LOCAL_STORAGE_KEY, getLocalProducts, saveLocalProducts, notifySubscribers } from './productLocalCache';
import { updateProduct, invalidateProductQueries } from './productMutationService';
import { triggerProductMetaCatalogSync } from './productMetaCatalogSync';
import { toTitleCase } from '../textUtils';
import { withTimeout } from '../../../../../shared-utils/withTimeout';
import { variationFamilyCommandSchema, variationFamilyAckSchema, sameFamilyAttributes, toFamilyAttributes, VariationFamilyUnconfirmedError } from '../../../../../shared-utils/variationFamilyFormSchemas';
import { parseVariationImages } from './productImageHelpers';
import { mapToDB } from './productToDbMapper';
import { variationMergeCommandSchema, variationMergeAckSchema, variationMergeIdentitySchema, VariationMergeUnconfirmedError } from '../../../../../shared-utils/variationMergeFormSchemas';

export const saveVariation = async (productId: string, variation: any): Promise<void> => {
  try {
    const products = getLocalProducts();
    const index = products.findIndex(
      (p) => String(p.id).toLowerCase() === String(productId).toLowerCase()
    );
    if (index === -1) throw new Error('Produto pai não encontrado.');

    const parent = products[index];
    let variations = parent.variations || [];
    if (variations.length === 0) {
      const { data: dbVars } = await supabase
        .from('product_variations')
        .select('*')
        .eq('product_id', productId);
      if (dbVars && dbVars.length > 0) {
        variations = dbVars;
        parent.variations = dbVars;
      }
    }
    const rawVarId = variation.variationId || variation.id;

    // Desfaz IDs sintéticos legados (formato `productId_skuSuffix`) para extrair o UUID real.
    const variationId =
      rawVarId && String(rawVarId).includes('_') && String(rawVarId).startsWith(String(productId))
        ? String(rawVarId).split('_').slice(1).join('_')
        : rawVarId;

    const isUuidPattern = (val?: string) =>
      Boolean(val && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val));

    const targetIdStr = variationId ? String(variationId).toLowerCase() : '';

    // REGRA DE IDENTIDADE: a variação é localizada EXCLUSIVAMENTE pelo UUID.
    const varIndex = variations.findIndex((v: any) => {
      const vIdStr = v.id ? String(v.id).toLowerCase() : '';
      return targetIdStr && vIdStr && targetIdStr === vIdStr;
    });

    if (varIndex === -1 && !isUuidPattern(variationId)) {
      const skuHint = variation.sku ? ` (sku="${variation.sku}")` : '';
      console.error(
        `[saveVariation] Falha de identidade: variação sem UUID válido${skuHint}.`,
        `productId=${productId}`,
        `rawVarId=${rawVarId}`,
        'Registre este caso para saneamento do cadastro legado.'
      );
    }

    const cleanAttrs = (variation.attributes || []).map((attr: any) => ({
      ...attr,
      name: toTitleCase(attr.name),
      value: toTitleCase(attr.value),
    }));

    const variationToSave = {
      ...variation,
      id:
        (isUuidPattern(variationId) ? variationId : null) ||
        (varIndex !== -1 ? variations[varIndex].id : crypto.randomUUID()),
      name: toTitleCase(variation.name || parent.name || ''),
      ...(variation.title ? { title: toTitleCase(variation.title) } : {}),
      ...(variation.marketplaceTitle
        ? { marketplaceTitle: toTitleCase(variation.marketplaceTitle) }
        : {}),
      attributes: cleanAttrs,
    };
    delete (variationToSave as any).variationId;

    const newVariations = [...variations];
    if (varIndex === -1) {
      newVariations.push(variationToSave);
    } else {
      newVariations[varIndex] = {
        ...newVariations[varIndex],
        ...variationToSave,
      };
    }

    const seenIds = new Set<string>();
    const deduplicatedVariations: any[] = [];
    for (const v of newVariations) {
      const idKey = String(v.id || '').toLowerCase();
      if (idKey && seenIds.has(idKey)) continue;
      if (idKey) seenIds.add(idKey);
      deduplicatedVariations.push(v);
    }

    if (deduplicatedVariations.length === 1) {
      deduplicatedVariations[0] = {
        ...deduplicatedVariations[0],
        images: [...(parent.images || [])],
      };
    } else if (
      deduplicatedVariations.some((item) => (item.images || []).length > MAX_VARIATION_IMAGES)
    ) {
      throw new Error(`Cada variação pode vincular no máximo ${MAX_VARIATION_IMAGES} fotos.`);
    }

    parent.variations = deduplicatedVariations;
    parent.updatedAt = new Date().toISOString();
    products[index] = parent;
    saveLocalProducts(products);
    notifySubscribers();

    if (isUuidPattern(productId) && isUuidPattern(variationToSave.id)) {
      const effectiveImages = variationToSave.images || [];

      const attributesToSave = (cleanAttrs || [])
        .filter((attr: any) => attr.name && attr.value)
        .map((attr: any) => ({
          name: attr.name,
          value: attr.value,
          showName: attr.showName ?? true,
        }));

      const varRecord = {
        id: variationToSave.id,
        product_id: productId,
        name: variationToSave.name,
        sku: variationToSave.sku,
        price: variationToSave.syncUnitPrice !== false
          ? (parent.unitPrice ? Number(parent.unitPrice) : 0)
          : (variationToSave.unitPrice !== undefined && variationToSave.unitPrice !== null ? Number(variationToSave.unitPrice) : 0),
        stock: variationToSave.stock ? parseInt(String(variationToSave.stock), 10) : 0,
        image_url: effectiveImages.length > 0 ? effectiveImages.join(',') : null,
        attributes: attributesToSave,
        combo_items: Array.isArray(variationToSave.comboItems) ? variationToSave.comboItems : [],
        promo_price:
          variationToSave.syncPromoPrice !== false
            ? (parent.promoPrice ? Number(parent.promoPrice) : null)
            : (variationToSave.promoPrice !== undefined && variationToSave.promoPrice !== null ? Number(variationToSave.promoPrice) : null),
        description: variationToSave.syncDescription !== false ? null : variationToSave.description || null,
        width: variationToSave.width ? String(variationToSave.width) : null,
        depth: variationToSave.depth ? String(variationToSave.depth) : null,
        height: variationToSave.height ? String(variationToSave.height) : null,
        use_parent_price: variationToSave.syncUnitPrice !== false,
        use_parent_promo_price: variationToSave.syncPromoPrice !== false,
        use_parent_dimensions: variationToSave.syncWidth !== false,
        use_parent_description: variationToSave.syncDescription !== false,
        use_parent_name: true,
        status: variationToSave.status || parent.status || 'hidden',
        active: variationToSave.active !== undefined ? Boolean(variationToSave.active) : parent.active !== false,
      };

      const { error: upsertErr } = await supabase
        .from('product_variations')
        .upsert(varRecord);
      if (upsertErr) throw upsertErr;

      const { error: metadataError } = await supabase
        .from('products')
        .update({
          updated_at: new Date().toISOString(),
          has_variations: deduplicatedVariations.length > 1,
          technical_specs: mapToDB({ technicalSpecs: parent.technicalSpecs, variations: deduplicatedVariations }).technical_specs,
        })
        .eq('id', productId);
      if (metadataError) throw metadataError;

      invalidateProductQueries();
      void triggerProductMetaCatalogSync(productId);
    } else {
      await updateProduct(productId, { variations: deduplicatedVariations }, { deferQueryInvalidation: true });
    }
  } catch (error) {
    console.error('Erro ao salvar variação: ', error);
    throw error;
  }
};

export const moveVariationToFamily = async (
  variationId: string,
  targetFamilyId: string,
  attributes: { name: string; value: string; showName?: boolean }[],
  name: string,
  imageUrls: string[],
  sourceParentId?: string,
  stillCurrent: () => boolean = () => true,
): Promise<{ newSku: string; sourceParentRemoved: boolean }> => {
  const command = variationFamilyCommandSchema.parse({ sourceId: variationId, familyId: targetFamilyId, sourceParentId, attributes, name, images: imageUrls });
  const variationImages = Array.from(new Set(command.images));
  if (variationImages.length > MAX_VARIATION_IMAGES) {
    throw new Error(`Cada variação pode vincular no máximo ${MAX_VARIATION_IMAGES} fotos.`);
  }

  const check = () => { if (!stillCurrent()) throw new Error('A mudança de família perdeu o contexto.'); };
  check();
  let dispatched = false, moved = false;
  try {
    dispatched = true;
    const response = await withTimeout(supabase.rpc('move_variation_to_parent', {
      p_variation_id: command.sourceId,
      p_target_parent_id: command.familyId,
      p_attributes: command.attributes,
      p_name: command.name,
      p_images: variationImages,
      p_source_parent_id: command.sourceParentId,
    }), 20000, null, 'mover-variacao:rpc');
    if (!response) throw new VariationFamilyUnconfirmedError();
    const { data, error, status } = response;
    if (error) {
      if (status === 0 || status >= 500 || !error.code || error.code === '40003' || error.code.startsWith('08')) throw new VariationFamilyUnconfirmedError();
      dispatched = false;
      throw new Error('Não foi possível mover a variação. Confira os dados, o destino e as permissões.');
    }
    const result = variationFamilyAckSchema.parse(data);
    check();
    const confirmation = await withTimeout(supabase.from('product_variations').select('id, product_id, sku, name, attributes, image_url, images')
      .eq('id', command.sourceId).single(), 10000, null, 'mover-variacao:confirmar');
    const row = confirmation?.data;
    const storedAttributes = toFamilyAttributes(row?.attributes);
    const storedImages = parseVariationImages(row?.image_url, row?.images);
    if (!confirmation || confirmation.error || row?.id !== command.sourceId || row.product_id !== command.familyId
      || row.sku !== result.newSku || row.name !== command.name || !sameFamilyAttributes(command.attributes, storedAttributes)
      || command.attributes.some((attribute) => attribute.showName !== undefined && !storedAttributes.some((stored) => stored.name.trim().toLocaleLowerCase('pt-BR') === attribute.name.toLocaleLowerCase('pt-BR') && (stored.showName ?? true) === attribute.showName))
      || storedImages.length !== variationImages.length || variationImages.some((url) => !storedImages.includes(url))) throw new VariationFamilyUnconfirmedError();
    moved = true; check();
    if (result.sourceParentRemoved) {
      const parent = await withTimeout(supabase.from('products').select('id, deleted').eq('id', command.sourceParentId).maybeSingle(), 10000, null, 'mover-variacao:confirmar-origem');
      if (!parent || parent.error || (parent.data && (parent.data.id !== command.sourceParentId || parent.data.deleted !== true))) throw new VariationFamilyUnconfirmedError();
    }
    check();
    if (variationImages.length > 0) {
      const photos = await withTimeout(supabase
        .from('product_images')
        .select('image_url')
        .eq('product_id', command.familyId), 10000, null, 'mover-variacao:fotos-destino');
      if (!photos || photos.error || !Array.isArray(photos.data)) throw new VariationFamilyUnconfirmedError();
        const existingUrls = new Set(photos.data.map((img) => img.image_url));
        const newImages = variationImages.filter((url) => !existingUrls.has(url));
        if (newImages.length > 0) {
          const imageRecords = newImages.map((url) => ({
            product_id: command.familyId,
            image_url: url,
            is_main: false,
          }));
          check();
          const inserted = await withTimeout(supabase.from('product_images').insert(imageRecords).select('product_id, image_url'), 10000, null, 'mover-variacao:vincular-fotos');
          if (!inserted || inserted.error || !Array.isArray(inserted.data) || inserted.data.length !== newImages.length
            || newImages.some((url) => !inserted.data.some((image) => image.product_id === command.familyId && image.image_url === url))) throw new VariationFamilyUnconfirmedError();
        }
    }
    check();
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    notifySubscribers();

    return result;
  } catch (error) {
    if (dispatched) throw moved
      ? new VariationFamilyUnconfirmedError('A variação foi movida, mas nem todas as etapas foram confirmadas. Confira o cadastro antes de repetir.')
      : new VariationFamilyUnconfirmedError();
    throw error;
  }
};

export const mergeVariationIntoCanonical = async (
  nonCanonicalVariationId: string,
  canonicalVariationId: string,
  context: { sourceParentId?: string; supplierId?: string } = {},
  stillCurrent: () => boolean = () => true,
): Promise<{ transferredSupplierIds: string[]; canonicalSupplierIds: string[] }> => {
  const command = variationMergeCommandSchema.parse({ ...context, sourceId: nonCanonicalVariationId, targetId: canonicalVariationId });
  const check = () => { if (!stillCurrent()) throw new Error('O contexto da mesclagem mudou.'); };
  const readIdentities = async () => {
    check();
    const response = await withTimeout(supabase.from('product_variations')
      .select('id, product_id, merged_to_variation_id, active, status').in('id', [command.sourceId, command.targetId]),
    10000, null, 'mesclar-variacao:identidades');
    check();
    if (!response || response.error || !Array.isArray(response.data) || response.data.length !== 2) throw new Error('Não foi possível confirmar as variações. Confira a configuração e recarregue a lista.');
    const rows = response.data.map((row) => variationMergeIdentitySchema.safeParse(row));
    if (rows.some((row) => !row.success)) throw new Error('Não foi possível confirmar os dados das variações. Recarregue a lista.');
    const parsed = rows.flatMap((row) => row.success ? [row.data] : []);
    const source = parsed.find((row) => row.id === command.sourceId), target = parsed.find((row) => row.id === command.targetId);
    if (!source || !target || !source.product_id || !target.product_id) throw new Error('Não foi possível confirmar a identidade das variações.');
    return { source, target };
  };
  const before = await readIdentities();
  if (before.source.merged_to_variation_id) throw new Error('A origem já foi mesclada. Consulte a variação canônica antes de continuar.');
  if (before.target.merged_to_variation_id) throw new Error('O destino já aponta para outra variação. Atualize a busca.');
  if (command.sourceParentId && before.source.product_id !== command.sourceParentId) throw new Error('A variação mudou de produto pai. Recarregue a lista.');
  if (command.supplierId) {
    check();
    const parent = await withTimeout(supabase.from('products').select('id, supplier_id, main_supplier_id').eq('id', before.target.product_id).single(), 10000, null, 'mesclar-variacao:fornecedor');
    check();
    if (!parent || parent.error || parent.data?.id !== before.target.product_id
      || (parent.data.supplier_id !== command.supplierId && parent.data.main_supplier_id !== command.supplierId)) throw new Error('O fornecedor do destino mudou. Atualize a busca.');
  }
  let dispatched = false, linked = false, phase = 'a ocultação da origem';
  try {
    check(); dispatched = true;
    const response = await withTimeout(supabase.rpc('merge_product_variation_into_canonical', {
      p_non_canonical_variation_id: command.sourceId, p_canonical_variation_id: command.targetId,
    }), 20000, null, 'mesclar-variacao:rpc');
    if (!response) throw new VariationMergeUnconfirmedError();
    if (response.error) {
      const { error, status } = response;
      if (status === 0 || status >= 500 || !error.code || error.code === '40003' || error.code.startsWith('08')) throw new VariationMergeUnconfirmedError();
      dispatched = false;
      throw new Error('Não foi possível mesclar as variações. Confira os dados e as permissões.');
    }
    const ack = variationMergeAckSchema.parse(response.data);
    const after = await readIdentities();
    if (after.source.merged_to_variation_id !== command.targetId || after.target.merged_to_variation_id) throw new VariationMergeUnconfirmedError();
    linked = true; check();
    if (after.source.active !== false || after.source.status !== 'hidden') {
      const hidden = await withTimeout(supabase.from('product_variations').update({ active: false, status: 'hidden' })
        .eq('id', command.sourceId).eq('merged_to_variation_id', command.targetId)
        .select('id, merged_to_variation_id, active, status').single(), 10000, null, 'mesclar-variacao:ocultar');
      const row = hidden?.data;
      if (!hidden || hidden.error || row?.id !== command.sourceId || row.merged_to_variation_id !== command.targetId
        || row.active !== false || row.status !== 'hidden') throw new VariationMergeUnconfirmedError();
    }
    check(); phase = 'a atualização da tela';
    localStorage.removeItem(LOCAL_STORAGE_KEY); notifySubscribers();
    return ack;
  } catch (error) {
    if (dispatched) throw linked ? new VariationMergeUnconfirmedError(`Variações mescladas, mas ${phase} não foi confirmada. Confira o cadastro antes de repetir.`) : new VariationMergeUnconfirmedError();
    throw error;
  }
};
