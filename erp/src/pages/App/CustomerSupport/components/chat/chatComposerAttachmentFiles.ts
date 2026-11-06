import type { z } from 'zod';
import type { supportChatComposerDraftSchema } from '../../../../../../../shared-utils/customerSupportFormSchemas';

export const MAX_ATTACHMENTS = 50;
export const MAX_FILE_SIZE = 4 * 1024 * 1024;

export type ChatComposerAttachment = z.input<typeof supportChatComposerDraftSchema>['attachments'][number];

const FILE_TYPES: Record<string, { mimeType: string; label: string }> = {
  jpg: { mimeType: 'image/jpeg', label: 'Imagem' },
  jpeg: { mimeType: 'image/jpeg', label: 'Imagem' },
  png: { mimeType: 'image/png', label: 'Imagem' },
  mp4: { mimeType: 'video/mp4', label: 'Vídeo' },
  '3gp': { mimeType: 'video/3gpp', label: 'Vídeo' },
  aac: { mimeType: 'audio/aac', label: 'Áudio' },
  m4a: { mimeType: 'audio/mp4', label: 'Áudio' },
  mp3: { mimeType: 'audio/mpeg', label: 'Áudio' },
  amr: { mimeType: 'audio/amr', label: 'Áudio' },
  ogg: { mimeType: 'audio/ogg', label: 'Áudio' },
  txt: { mimeType: 'text/plain', label: 'Documento' },
  pdf: { mimeType: 'application/pdf', label: 'Documento' },
  doc: { mimeType: 'application/msword', label: 'Documento' },
  docx: { mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', label: 'Documento' },
  xls: { mimeType: 'application/vnd.ms-excel', label: 'Documento' },
  xlsx: { mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', label: 'Documento' },
  ppt: { mimeType: 'application/vnd.ms-powerpoint', label: 'Documento' },
  pptx: { mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', label: 'Documento' },
};

export const formatFileSize = (size: number) => {
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

export const normalizedFileType = (file: File) => {
  const extension = file.name.split('.').pop()?.toLowerCase() || '';
  return FILE_TYPES[extension] || null;
};

export const prepareChatComposerFileAttachments = (
  incoming: FileList | File[],
  kind: 'media' | 'document',
  customKind: 'order' | 'quote' | undefined,
  makeId: () => string,
  onPreviewCreated: (url: string) => void,
) => {
  const additions: ChatComposerAttachment[] = [];
  const fileMap = new Map<string, File>();
  const validationMessages: string[] = [];

  for (const file of Array.from(incoming)) {
    const classification = normalizedFileType(file);
    if (file.size > MAX_FILE_SIZE) {
      validationMessages.push(`${file.name}: o limite é 4 MB.`);
      continue;
    }
    if (!classification || (kind === 'media' && !['Imagem', 'Vídeo'].includes(classification.label))
      || (kind === 'document' && !['Documento', 'Áudio'].includes(classification.label))) {
      validationMessages.push(`${file.name}: formato não aceito pelo WhatsApp.`);
      continue;
    }
    const id = makeId();
    const mimeType = file.type || classification.mimeType;
    const previewUrl = (classification.label === 'Imagem' || classification.label === 'Vídeo' || classification.label === 'Áudio')
      ? URL.createObjectURL(file)
      : undefined;
    if (previewUrl) onPreviewCreated(previewUrl);
    const attachmentKind: ChatComposerAttachment['kind'] = customKind || (classification.label === 'Áudio' ? 'audio' : kind);
    additions.push({
      kind: attachmentKind,
      id,
      label: customKind ? `${customKind === 'quote' ? 'Orçamento' : 'Pedido'} em PDF` : file.name,
      detail: `${formatFileSize(file.size)} · ${classification.label}`,
      fileName: file.name,
      mimeType,
      ...(previewUrl ? { previewUrl } : {}),
    });
    fileMap.set(id, file);
  }

  return { additions, fileMap, validationMessages };
};
