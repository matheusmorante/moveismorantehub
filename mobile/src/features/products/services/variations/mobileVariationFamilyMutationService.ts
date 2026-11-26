import { parseVariationImages } from '../../../../../../shared-utils/productVariationImages';
import {
  sameFamilyAttributes,
  toFamilyAttributes,
  VariationFamilyUnconfirmedError,
  variationFamilyAckSchema,
  variationFamilyCommandSchema,
  variationFamilyUuidSchema,
} from '../../../../../../shared-utils/variationFamilyFormSchemas';
import { withTimeout } from '../../../../../../shared-utils/core/withTimeout';
import { supabase } from '../../../../services/supabaseClient';
import { MAX_VARIATION_IMAGES } from '../../domain/productImageLimits';
import type { MobileVariationAttribute } from '../../domain/variationActionsDomain';
import { triggerMobileProductMetaCatalogSync } from '../catalog/mobileProductMetaCatalogSyncService';
import {
  ensureQueryIsCurrent,
  VARIATION_FAMILY_MUTATION_TIMEOUT_MS,
  VARIATION_FAMILY_QUERY_TIMEOUT_MS,
  verifyMobileVariationParent,
} from './mobileVariationFamilyQueryService';

async function confirmMovedVariationState(
  sourceId: string,
  targetFamilyId: string,
  newSku: string,
  expectedName: string,
  expectedAttributes: readonly MobileVariationAttribute[],
  expectedImages: readonly string[]
): Promise<void> {
  const confirmation = await withTimeout(
    supabase
      .from('product_variations')
      .select('id, product_id, sku, name, attributes, image_url, images')
      .eq('id', sourceId)
      .single(),
    VARIATION_FAMILY_QUERY_TIMEOUT_MS,
    null,
    'mover-variacao:confirmar'
  );
  const row = confirmation?.data;
  const storedAttributes = toFamilyAttributes(row?.attributes);
  const storedImages = parseVariationImages(row?.image_url, row?.images);

  if (
    !confirmation ||
    confirmation.error ||
    row?.id !== sourceId ||
    row.product_id !== targetFamilyId ||
    row.sku !== newSku ||
    row.name !== expectedName ||
    !sameFamilyAttributes(expectedAttributes, storedAttributes) ||
    expectedAttributes.some(
      (attribute) =>
        attribute.showName !== undefined &&
        !storedAttributes.some(
          (stored) =>
            stored.name.trim().toLocaleLowerCase('pt-BR') === attribute.name.toLocaleLowerCase('pt-BR') &&
            (stored.showName ?? true) === attribute.showName
        )
    ) ||
    storedImages.length !== expectedImages.length ||
    expectedImages.some((url) => !storedImages.includes(url))
  ) {
    throw new VariationFamilyUnconfirmedError();
  }
}

async function linkMissingDestinationImages(
  targetFamilyId: string,
  variationImages: readonly string[],
  checkStillCurrent: () => void
): Promise<void> {
  if (variationImages.length === 0) return;

  const photos = await withTimeout(
    supabase
      .from('product_images')
      .select('image_url')
      .eq('product_id', targetFamilyId)
      .in('image_url', variationImages),
    VARIATION_FAMILY_QUERY_TIMEOUT_MS,
    null,
    'mover-variacao:fotos-destino'
  );
  if (!photos || photos.error || !Array.isArray(photos.data)) {
    throw new VariationFamilyUnconfirmedError();
  }

  const existingUrls = new Set(photos.data.map((image: { image_url: string }) => image.image_url));
  const missingUrls = variationImages.filter((url) => !existingUrls.has(url));
  if (missingUrls.length === 0) return;

  checkStillCurrent();
  const inserted = await withTimeout(
    supabase
      .from('product_images')
      .insert(
        missingUrls.map((image_url) => ({
          product_id: targetFamilyId,
          image_url,
          is_main: false,
        }))
      )
      .select('product_id, image_url'),
    VARIATION_FAMILY_QUERY_TIMEOUT_MS,
    null,
    'mover-variacao:vincular-fotos'
  );
  if (
    !inserted ||
    inserted.error ||
    !Array.isArray(inserted.data) ||
    inserted.data.length !== missingUrls.length ||
    missingUrls.some(
      (url) =>
        !inserted.data.some(
          (image: { product_id: string; image_url: string }) =>
            image.product_id === targetFamilyId && image.image_url === url
        )
    )
  ) {
    throw new VariationFamilyUnconfirmedError();
  }
}

export const moveMobileVariationToFamily = async (
  variationId: string,
  targetFamilyId: string,
  attributes: readonly MobileVariationAttribute[],
  name: string,
  imageUrls: readonly string[],
  sourceParentId?: string,
  stillCurrent: () => boolean = () => true
): Promise<{ newSku: string; sourceParentRemoved: boolean }> => {
  const parsedSourceId = variationFamilyUuidSchema.safeParse(variationId);
  if (!parsedSourceId.success) {
    throw new Error(
      'A variação precisa ter um UUID válido para ser movida. Atualize o cadastro legado antes de continuar.'
    );
  }
  const command = variationFamilyCommandSchema.parse({
    sourceId: parsedSourceId.data,
    familyId: targetFamilyId,
    sourceParentId: sourceParentId || '',
    attributes,
    name,
    images: imageUrls,
  });
  const variationImages = Array.from(new Set(command.images));
  if (variationImages.length > MAX_VARIATION_IMAGES) {
    throw new Error(`Cada variação pode vincular no máximo ${MAX_VARIATION_IMAGES} fotos.`);
  }

  await verifyMobileVariationParent(command.sourceId, command.sourceParentId, stillCurrent);
  const check = () => ensureQueryIsCurrent(stillCurrent);
  let dispatched = false;
  let moved = false;
  try {
    check();
    dispatched = true;
    const response = await withTimeout(
      supabase.rpc('move_variation_to_parent', {
        p_variation_id: command.sourceId,
        p_target_parent_id: command.familyId,
        p_attributes: command.attributes,
        p_name: command.name,
        p_images: variationImages,
        p_source_parent_id: command.sourceParentId,
      }),
      VARIATION_FAMILY_MUTATION_TIMEOUT_MS,
      null,
      'mover-variacao:rpc'
    );
    if (!response) throw new VariationFamilyUnconfirmedError();
    if (response.error) {
      const { error, status } = response;
      if (
        status === 0 ||
        (status ?? 0) >= 500 ||
        !error.code ||
        error.code === '40003' ||
        error.code.startsWith('08')
      ) {
        throw new VariationFamilyUnconfirmedError();
      }
      dispatched = false;
      throw new Error('Não foi possível mover a variação. Confira os dados, o destino e as permissões.');
    }

    const acknowledgement = variationFamilyAckSchema.parse(response.data);
    check();
    await confirmMovedVariationState(
      command.sourceId,
      command.familyId,
      acknowledgement.newSku,
      command.name,
      command.attributes,
      variationImages
    );
    moved = true;
    check();

    if (acknowledgement.sourceParentRemoved) {
      const parent = await withTimeout(
        supabase.from('products').select('id, deleted').eq('id', command.sourceParentId).maybeSingle(),
        VARIATION_FAMILY_QUERY_TIMEOUT_MS,
        null,
        'mover-variacao:confirmar-origem'
      );
      if (
        !parent ||
        parent.error ||
        (parent.data && (parent.data.id !== command.sourceParentId || parent.data.deleted !== true))
      ) {
        throw new VariationFamilyUnconfirmedError();
      }
    }
    check();

    await linkMissingDestinationImages(command.familyId, variationImages, check);
    check();
    return acknowledgement;
  } catch (error) {
    if (dispatched) {
      throw moved
        ? new VariationFamilyUnconfirmedError(
            'A variação foi movida, mas nem todas as etapas foram confirmadas. Confira o cadastro antes de repetir.'
          )
        : new VariationFamilyUnconfirmedError();
    }
    throw error;
  }
};

export const mergeMobileVariationIntoCanonical = async (
  nonCanonicalVariationId: string,
  canonicalVariationId: string
): Promise<{ transferredSupplierIds: string[]; canonicalSupplierIds: string[] }> => {
  const { data, error } = await supabase.rpc('merge_product_variation_into_canonical', {
    p_non_canonical_variation_id: nonCanonicalVariationId,
    p_canonical_variation_id: canonicalVariationId,
  });
  if (error) throw new Error(`Falha ao fundir variações no banco: ${error.message}`);

  // O ERP aplica esta atualização após a RPC; falha aqui não desfaz o vínculo
  // canônico já confirmado pelo banco.
  const { data: source, error: statusError } = await supabase
    .from('product_variations')
    .update({ active: false, status: 'hidden' })
    .eq('id', nonCanonicalVariationId)
    .select('product_id')
    .maybeSingle();
  if (statusError) console.error('Falha ao atualizar o estado da variação mesclada:', statusError);
  if (source?.product_id) void triggerMobileProductMetaCatalogSync(source.product_id);

  const result =
    data && typeof data === 'object' ? (data as Record<string, unknown>) : null;
  return {
    transferredSupplierIds: Array.isArray(result?.transferredSupplierIds)
      ? (result.transferredSupplierIds as string[])
      : [],
    canonicalSupplierIds: Array.isArray(result?.canonicalSupplierIds)
      ? (result.canonicalSupplierIds as string[])
      : [],
  };
};
