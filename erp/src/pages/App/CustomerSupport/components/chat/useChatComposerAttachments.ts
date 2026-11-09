import { useRef } from 'react';
import type { UseFormSetValue, UseFormSetError, UseFormClearErrors } from 'react-hook-form';
import type { SupportChatComposerDraft } from '../../../../../../../shared-utils/customerSupportFormSchemas';
import type { ProductCatalogPrepareInput } from '../../../../../../../shared-utils/productCatalogFormSchemas';
import { getSettings } from '@/pages/utils/settingsService';
import {
  MAX_ATTACHMENTS,
  prepareChatComposerFileAttachments,
  type ChatComposerAttachment,
} from './chatComposerAttachmentFiles';

interface UseChatComposerAttachmentsParams {
  watchAttachments: () => ChatComposerAttachment[];
  setDraftValue: UseFormSetValue<SupportChatComposerDraft>;
  setDraftError: UseFormSetError<SupportChatComposerDraft>;
  clearDraftErrors: UseFormClearErrors<SupportChatComposerDraft>;
  setSendError: (err: string) => void;
  setSendFeedback: (fb: string) => void;
  setAudioPreview: (preview: { url: string; type: string; name: string } | null) => void;
  audioPreview: { url: string; type: string; name: string } | null;
  currentAudioAttachmentRef: React.MutableRefObject<string | null>;
  makeId: () => string;
}

export function useChatComposerAttachments({
  watchAttachments,
  setDraftValue,
  setDraftError,
  clearDraftErrors,
  setSendError,
  setSendFeedback,
  setAudioPreview,
  audioPreview,
  currentAudioAttachmentRef,
  makeId,
}: UseChatComposerAttachmentsParams) {
  const objectUrlsRef = useRef<Set<string>>(new Set());
  const fileByAttachmentIdRef = useRef<Map<string, File>>(new Map());
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const documentInputRef = useRef<HTMLInputElement | null>(null);

  const releaseAttachment = (attachment: ChatComposerAttachment | undefined) => {
    if (!attachment) return;
    fileByAttachmentIdRef.current.delete(attachment.id);
    if ('previewUrl' in attachment && attachment.previewUrl) {
      URL.revokeObjectURL(attachment.previewUrl);
      objectUrlsRef.current.delete(attachment.previewUrl);
    }
    if (attachment.id === currentAudioAttachmentRef.current) {
      currentAudioAttachmentRef.current = null;
    }
    if (audioPreview?.url && 'previewUrl' in attachment && attachment.previewUrl === audioPreview.url) {
      setAudioPreview(null);
    }
  };

  const appendAttachments = (
    nextAttachments: ChatComposerAttachment[],
    files: Map<string, File> = new Map()
  ): boolean => {
    const current = watchAttachments();
    const next = [...current, ...nextAttachments];
    if (next.length > MAX_ATTACHMENTS) {
      nextAttachments.forEach(releaseAttachment);
      setDraftError('attachments', {
        type: 'max',
        message: `O rascunho aceita até ${MAX_ATTACHMENTS} anexos.`,
      });
      return false;
    }
    files.forEach((file, id) => fileByAttachmentIdRef.current.set(id, file));
    clearDraftErrors(['attachments', 'message']);
    setDraftValue('attachments', next, { shouldDirty: true, shouldValidate: true });
    setSendError('');
    setSendFeedback('');
    return true;
  };

  const removeAttachment = (attachmentId: string) => {
    const current = watchAttachments();
    const removed = current.find((attachment) => attachment.id === attachmentId);
    releaseAttachment(removed);
    setDraftValue(
      'attachments',
      current.filter((attachment) => attachment.id !== attachmentId),
      { shouldDirty: true, shouldValidate: true }
    );
    setSendFeedback('');
  };

  const addFiles = (
    incoming: FileList | File[],
    kind: 'media' | 'document',
    customKind?: 'order' | 'quote'
  ): boolean => {
    if (!incoming.length) return false;
    const { additions, fileMap, validationMessages } = prepareChatComposerFileAttachments(
      incoming,
      kind,
      customKind,
      makeId,
      (url) => objectUrlsRef.current.add(url)
    );
    const wasAdded = additions.length > 0 && appendAttachments(additions, fileMap);
    if (validationMessages.length) setSendError(validationMessages.slice(0, 2).join(' '));
    if (kind === 'media' && photoInputRef.current) photoInputRef.current.value = '';
    if (kind === 'document' && documentInputRef.current) documentInputRef.current.value = '';
    return wasAdded;
  };

  const addStoreContact = (onCloseMenu: () => void) => {
    const settings = getSettings();
    const phone = String(settings.companyPhone || '').replace(/\D/g, '');
    const name = String(settings.companyName || 'Móveis Morante').trim();
    if (!/^\d{10,15}$/.test(phone)) {
      setSendError('Cadastre um telefone comercial válido nas configurações da empresa para compartilhar o contato.');
      onCloseMenu();
      return;
    }
    appendAttachments([
      {
        kind: 'contact',
        id: makeId(),
        label: name,
        detail: `+${phone}`,
        contactName: name,
        contactPhone: phone,
      },
    ]);
    onCloseMenu();
  };

  const addCatalogSelection = (
    selection: ProductCatalogPrepareInput,
    catalogUrl: string | null,
    onCloseCatalog: () => void
  ) => {
    appendAttachments([
      {
        kind: 'catalog',
        id: makeId(),
        selection,
        ...(catalogUrl ? { catalogUrl } : {}),
      },
    ]);
    onCloseCatalog();
  };

  return {
    objectUrlsRef,
    fileByAttachmentIdRef,
    photoInputRef,
    documentInputRef,
    releaseAttachment,
    appendAttachments,
    removeAttachment,
    addFiles,
    addStoreContact,
    addCatalogSelection,
  };
}
