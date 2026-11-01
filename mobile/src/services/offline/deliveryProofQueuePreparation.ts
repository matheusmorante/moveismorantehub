import { SyncQueueRepository } from '../../repositories/SyncQueueRepository';
import { isLocalDeliveryProofUri } from '../../features/orders/services/deliveryProofRules';
import type { SyncQueueItem } from './offlineTypes';

export async function prepareDeliveryProofs(item: SyncQueueItem): Promise<SyncQueueItem> {
  if (item.entityType !== 'order' || item.payload.event_type !== 'DELIVERY_UNATTENDED') {
    return item;
  }

  let preparedItem = item;
  const readPatch = () =>
    (preparedItem.payload.order_data_patch as Record<string, unknown> | undefined) || {};
  const initialProofs = readPatch().unattendedProofUrls;
  if (!Array.isArray(initialProofs)) return item;

  for (let index = 0; index < initialProofs.length; index += 1) {
    const patch = readPatch();
    const proofUrls = Array.isArray(patch.unattendedProofUrls)
      ? [...(patch.unattendedProofUrls as string[])]
      : [];
    const localUri = proofUrls[index];
    if (!localUri || !isLocalDeliveryProofUri(localUri)) continue;

    const metadata = Array.isArray(patch.unattendedProofMetadata)
      ? (patch.unattendedProofMetadata as Array<{
          uri?: string;
          fileName?: string;
          contentType?: string;
        }>)
      : [];
    const localMetadata = metadata.find((proof) => proof.uri === localUri);
    const fallbackName = localUri.split(/[\\/?#]/).filter(Boolean).pop() || `comprovante-${index + 1}.jpg`;
    const fileName = localMetadata?.fileName || fallbackName;
    const extension = fileName.match(/\.([a-z0-9]+)$/i)?.[1]?.toLowerCase();
    const contentType =
      localMetadata?.contentType ||
      (extension === 'png' ? 'image/png' : extension === 'webp' ? 'image/webp' : 'image/jpeg');
    const { uploadDeliveryProof } = await import(
      '../../features/orders/services/deliveryProofUploadService'
    );
    const remoteUrl = await uploadDeliveryProof(
      localUri,
      `${preparedItem.idempotencyKey}-${index}-${fileName}`,
      contentType
    );

    proofUrls[index] = remoteUrl;
    const nextPatch: Record<string, unknown> = {
      ...patch,
      unattendedProofUrls: proofUrls,
      unattendedProofUrl: proofUrls[0] || '',
    };
    const remainingMetadata = metadata.filter((proof) => proof.uri !== localUri);
    if (remainingMetadata.length) {
      nextPatch.unattendedProofMetadata = remainingMetadata;
    } else {
      delete nextPatch.unattendedProofMetadata;
    }
    const nextPayload = {
      ...preparedItem.payload,
      order_data_patch: nextPatch,
    };
    await SyncQueueRepository.updatePayload(preparedItem.id, nextPayload);
    preparedItem = { ...preparedItem, payload: nextPayload };
  }

  return preparedItem;
}
