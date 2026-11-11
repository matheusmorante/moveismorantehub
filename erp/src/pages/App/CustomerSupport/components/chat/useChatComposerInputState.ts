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
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (replyTarget && composerMode === 'whatsapp') {
      requestAnimationFrame(() => textareaRef.current?.focus());
    }
  }, [replyTarget?.id, composerMode]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`;
  }, [message]);

  useEffect(() => {
    if (!insertedSnippet?.text) return;
    setComposerMode('whatsapp');
    const current = watchDraft('message') || '';
    const next = current.trim() ? `${current.replace(/\s+$/, '')}\n${insertedSnippet.text}` : insertedSnippet.text;
    setDraftValue('message', next, { shouldDirty: true, shouldValidate: true });
    requestAnimationFrame(() => textareaRef.current?.focus());
  }, [insertedSnippet?.id, setComposerMode, setDraftValue, watchDraft]);

  const insertEmoji = (emoji: string) => {
    const textarea = textareaRef.current;
    const start = textarea?.selectionStart ?? message.length;
    const end = textarea?.selectionEnd ?? message.length;
    const nextMessage = `${message.slice(0, start)}${emoji}${message.slice(end)}`;
    setDraftValue('message', nextMessage, { shouldDirty: true, shouldValidate: true });
    requestAnimationFrame(() => {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(start + emoji.length, start + emoji.length);
    });
  };

  return {
    textareaRef,
    insertEmoji,
  };
}
