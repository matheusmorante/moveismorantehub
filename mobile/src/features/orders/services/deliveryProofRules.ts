export interface LocalDeliveryProofMetadata {
  uri: string;
  fileName: string;
  contentType: string;
}

export const isLocalDeliveryProofUri = (uri: string): boolean =>
  /^(file|content|blob|data|ph|assets-library):/i.test(uri);
