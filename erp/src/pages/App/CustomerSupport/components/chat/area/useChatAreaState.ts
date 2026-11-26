import { useState, useRef, useEffect } from 'react';
import type { WhatsAppConversation, WhatsAppMessage, QuickSnippet } from '../types';

export interface SelectedSupportMessage {
  message: WhatsAppMessage;
  canReply: boolean;
  canForward: boolean;
}

interface UseChatAreaStateParams {
  conversationId: string;
  canSend: boolean;
  jumpToMessageId?: string | null;
}

export function useChatAreaState({
  conversationId,
  canSend,
  jumpToMessageId,
}: UseChatAreaStateParams) {
  const [inChatSearch, setInChatSearch] = useState('');
  const [composerMode, setComposerMode] = useState<'whatsapp' | 'comment'>('whatsapp');
  const [searchRevision, setSearchRevision] = useState(0);
  const [isSearchingInChat, setIsSearchingInChat] = useState(false);
  const [isSnippetsModalOpen, setIsSnippetsModalOpen] = useState(false);
  const [replyTarget, setReplyTarget] = useState<WhatsAppMessage | null>(null);
  const [forwardMessage, setForwardMessage] = useState<WhatsAppMessage | null>(null);
  const [selectedMessages, setSelectedMessages] = useState<SelectedSupportMessage[]>([]);
  const [insertedSnippet, setInsertedSnippet] = useState<{ id: number; text: string } | null>(null);
  const snippetRevision = useRef(0);

  useEffect(() => {
    if (!jumpToMessageId) return;
    setIsSearchingInChat(false);
    setInChatSearch('');
  }, [jumpToMessageId]);

  useEffect(() => {
    setSelectedMessages([]);
  }, [conversationId]);

  const toggleSelectedMessage = (
    message: WhatsAppMessage,
    capabilities: Pick<SelectedSupportMessage, 'canReply' | 'canForward'>
  ) => {
    setSelectedMessages((current) => current.some((item) => item.message.id === message.id)
      ? current.filter((item) => item.message.id !== message.id)
      : [...current, { message, ...capabilities }]);
  };

  const clearSelectedMessages = () => setSelectedMessages([]);

  const selectedMessage = selectedMessages[0] ?? null;
  const selectedMessageIds = new Set(selectedMessages.map(({ message }) => message.id));

  const handleInsertSnippet = (snippet: QuickSnippet) => {
    snippetRevision.current += 1;
    setInsertedSnippet({ id: snippetRevision.current, text: snippet.content });
    setIsSnippetsModalOpen(false);
  };

  const isMessageSelectionMode = selectedMessages.length > 0 && canSend;

  const selectedMessagePreview =
    selectedMessage?.message.textContent?.trim() ||
    selectedMessage?.message.mediaCaption?.trim() ||
    (selectedMessage?.message.messageType === 'image'
      ? 'Foto'
      : selectedMessage?.message.messageType === 'video'
        ? 'Vídeo'
        : selectedMessage?.message.messageType === 'audio'
          ? 'Áudio'
          : selectedMessage?.message.messageType === 'document'
            ? 'Documento'
            : selectedMessage?.message.messageType === 'sticker'
              ? 'Figurinha'
              : 'Mensagem');

  return {
    inChatSearch,
    setInChatSearch,
    composerMode,
    setComposerMode,
    searchRevision,
    setSearchRevision,
    isSearchingInChat,
    setIsSearchingInChat,
    isSnippetsModalOpen,
    setIsSnippetsModalOpen,
    replyTarget,
    setReplyTarget,
    forwardMessage,
    setForwardMessage,
    selectedMessage,
    selectedMessages,
    selectedMessageIds,
    toggleSelectedMessage,
    clearSelectedMessages,
    insertedSnippet,
    handleInsertSnippet,
    isMessageSelectionMode,
    selectedMessagePreview,
  };
}
