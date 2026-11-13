import { useEffect, useRef } from 'react';
import type { UseFormSetValue, UseFormWatch } from 'react-hook-form';
import type { SupportChatComposerDraft } from '../../../../../../../shared-utils/customerSupportFormSchemas';
import type { WhatsAppMessage } from '../../types';

interface InsertedSnippet {
  id: number;
  text: string;
}

interface UseChatComposerInputStateParams {
  message: string;
  setDraftValue: UseFormSetValue<SupportChatComposerDraft>;
  watchDraft: UseFormWatch<SupportChatComposerDraft>;
  replyTarget?: WhatsAppMessage | null;
  composerMode: 'whatsapp' | 'comment';
  setComposerMode: (mode: 'whatsapp' | 'comment') => void;
  insertedSnippet?: InsertedSnippet | null;
}

export function useChatComposerInputState({
  message,
  setDraftValue,
  watchDraft,
  replyTarget,
  composerMode,
  setComposerMode,
  insertedSnippet,
}: UseChatComposerInputStateParams) {
  const messageInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (replyTarget && composerMode === 'whatsapp') {
      requestAnimationFrame(() => messageInputRef.current?.focus());
    }
  }, [replyTarget?.id, composerMode]);

  useEffect(() => {
    if (!insertedSnippet?.text) return;
    setComposerMode('whatsapp');
    const current = watchDraft('message') || '';
    const snippetText = insertedSnippet.text.replace(/\s+/g, ' ').trim();
    const next = current.trim() ? `${current.replace(/\s+$/, '')} ${snippetText}` : snippetText;
    setDraftValue('message', next, { shouldDirty: true, shouldValidate: true });
    requestAnimationFrame(() => messageInputRef.current?.focus());
  }, [insertedSnippet?.id, setComposerMode, setDraftValue, watchDraft]);

  const insertEmoji = (emoji: string) => {
    const input = messageInputRef.current;
    const start = input?.selectionStart ?? message.length;
    const end = input?.selectionEnd ?? message.length;
    const nextMessage = `${message.slice(0, start)}${emoji}${message.slice(end)}`;
    setDraftValue('message', nextMessage, { shouldDirty: true, shouldValidate: true });
    requestAnimationFrame(() => {
      messageInputRef.current?.focus();
      messageInputRef.current?.setSelectionRange(start + emoji.length, start + emoji.length);
    });
  };

  return {
    messageInputRef,
    insertEmoji,
  };
}
