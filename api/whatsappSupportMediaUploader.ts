import type { SendPayload } from './whatsappSupportSendRequest.js';
import {
  classifyWhatsAppSupportFile,
  type WhatsAppSupportContentType,
} from './whatsappSupportFileClassifier.js';

export interface UploadWhatsAppSupportMediaInput {
  fetchMeta: typeof fetch;
  phoneNumberId: string;
  accessToken: string;
  file: NonNullable<SendPayload['file']>;
  graphVersion?: string;
}

export interface UploadWhatsAppSupportMediaResult {
  mediaId: string | null;
  messageType: WhatsAppSupportContentType;
  mediaMimeType: string;
  mediaFilename: string;
  errorStatus?: number;
  errorMessage?: string;
}

/**
 * Uploads media file to Meta Graph API `/media` endpoint with timeout.
 */
export async function uploadWhatsAppSupportMedia({
  fetchMeta,
  phoneNumberId,
  accessToken,
  file,
  graphVersion = 'v26.0',
}: UploadWhatsAppSupportMediaInput): Promise<UploadWhatsAppSupportMediaResult> {
  const classified = classifyWhatsAppSupportFile(file);
  const uploadForm = new FormData();
  uploadForm.set('messaging_product', 'whatsapp');
  uploadForm.set('type', classified.mimeType);
  uploadForm.set(
    'file',
    new Blob([new Uint8Array(file.bytes)], { type: classified.mimeType }),
    file.name,
  );

  const uploadController = new AbortController();
  const uploadTimeout = setTimeout(() => uploadController.abort(), 25_000);
  let uploadResponse: Response;

  try {
    uploadResponse = await fetchMeta(
      `https://graph.facebook.com/${graphVersion}/${phoneNumberId}/media`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
        body: uploadForm,
        signal: uploadController.signal,
      },
    );
  } catch {
    return {
      mediaId: null,
      messageType: classified.type,
      mediaMimeType: classified.mimeType,
      mediaFilename: file.name.slice(0, 255),
      errorStatus: uploadController.signal.aborted ? 504 : 502,
      errorMessage:
        'Não foi possível enviar o arquivo à Meta. O arquivo não foi enviado ao cliente.',
    };
  } finally {
    clearTimeout(uploadTimeout);
  }

  const uploadData = (await uploadResponse.json().catch(() => ({}))) as Record<string, any>;
  const mediaId = typeof uploadData.id === 'string' ? uploadData.id : null;

  if (!uploadResponse.ok || !mediaId) {
    return {
      mediaId: null,
      messageType: classified.type,
      mediaMimeType: classified.mimeType,
      mediaFilename: file.name.slice(0, 255),
      errorStatus: 502,
      errorMessage: 'O WhatsApp não aceitou este arquivo. Confira o formato e o tamanho.',
    };
  }

  return {
    mediaId,
    messageType: classified.type,
    mediaMimeType: classified.mimeType,
    mediaFilename: file.name.slice(0, 255),
  };
}
