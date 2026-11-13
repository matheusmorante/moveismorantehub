import React from 'react';
import type { UseFormRegisterReturn } from 'react-hook-form';
import type { WhatsAppMessage } from '../../types';
import { ChatComposerAttachmentMenu } from './ChatComposerAttachmentMenu';
import { ChatComposerEmojiMenu } from './ChatComposerEmojiMenu';
import { ChatComposerReplyTargetPreview } from './ChatComposerReplyTargetPreview';
import { useComposerMenusState } from './useComposerMenusState';

interface ChatComposerInputBarProps {
  messageInputRef: React.MutableRefObject<HTMLInputElement | null>;
  messageRegister: UseFormRegisterReturn;
  message: string;
  hasAttachments: boolean;
  canSend?: boolean;
  isSending: boolean;
  isDraftSubmitting: boolean;
  canShareCommercialInfo: boolean;
  replyTarget?: WhatsAppMessage | null;
  onClearReplyTarget?: () => void;
  onOpenSnippets: () => void;
  onSendDraft: () => void;
  onStartRecording: () => void;
  onSelectPhotos: () => void;
  onSelectDocument: () => void;
  onSelectContact: () => void;
  onSelectCatalog: () => void;
  onSelectOrderDocument: () => void;
  onInsertEmoji: (emoji: string) => void;
}

export const ChatComposerInputBar: React.FC<ChatComposerInputBarProps> = ({
  messageInputRef,
  messageRegister,
  message,
  hasAttachments,
  canSend = true,
  isSending,
  isDraftSubmitting,
  canShareCommercialInfo,
  replyTarget,
  onClearReplyTarget,
  onOpenSnippets,
  onSendDraft,
  onStartRecording,
  onSelectPhotos,
  onSelectDocument,
  onSelectContact,
  onSelectCatalog,
  onSelectOrderDocument,
  onInsertEmoji,
}) => {
  const {
    isAttachmentMenuOpen,
    setIsAttachmentMenuOpen,
    isEmojiMenuOpen,
    setIsEmojiMenuOpen,
    attachmentMenuRef,
    emojiMenuRef,
  } = useComposerMenusState();

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    if (!e.shiftKey) onSendDraft();
  };

  return (
    <div className="p-3 space-y-2">
      {/* Target de Resposta (Reply Quote Preview) */}
      {replyTarget && (
        <ChatComposerReplyTargetPreview
          replyTarget={replyTarget}
          onClearReplyTarget={onClearReplyTarget}
        />
      )}

      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 gap-y-1 md:flex md:gap-2">
        {/* Campo de uma linha: em telas estreitas usa toda a largura na primeira linha. */}
        <div className="relative order-1 col-span-2 col-start-1 row-start-1 min-w-0 md:order-2 md:col-auto md:row-auto md:flex-1">
          <input
            {...messageRegister}
            ref={(element) => {
              messageRegister.ref(element);
              messageInputRef.current = element;
            }}
            type="text"
            aria-label="Mensagem"
            disabled={!canSend}
            onKeyDown={handleInputKeyDown}
            placeholder="Digite sua mensagem..."
            className="block h-10 w-full min-w-0 rounded-2xl border-0 bg-slate-100 px-3.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-slate-800 dark:text-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
          />
        </div>

        <div className="order-2 col-start-1 row-start-2 flex min-w-0 items-center gap-1 md:order-1 md:col-auto md:row-auto">
          {/* Menu de Anexos */}
          <ChatComposerAttachmentMenu
            menuRef={attachmentMenuRef}
            isOpen={isAttachmentMenuOpen}
            canShareCommercialInfo={canShareCommercialInfo}
            canCreateOrders={false}
            hasCustomer={true}
            onToggle={() => setIsAttachmentMenuOpen((prev) => !prev)}
            onOpenCatalog={onSelectCatalog}
            onChooseMedia={onSelectPhotos}
            onChooseDocument={onSelectDocument}
            onOpenOrderPicker={onSelectOrderDocument}
            onNewSalesOrder={() => {}}
            onNewBudget={() => {}}
            onAddStoreContact={onSelectContact}
            onOpenSnippets={() => {
              setIsAttachmentMenuOpen(false);
              onOpenSnippets();
            }}
          />

          {/* Menu de Emojis */}
          <div className="relative" ref={emojiMenuRef}>
            <button
              type="button"
              aria-label="Inserir emoji"
              onClick={() => setIsEmojiMenuOpen((prev) => !prev)}
              className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <i className="bi bi-emoji-smile text-lg" />
            </button>
            <ChatComposerEmojiMenu
              isOpen={isEmojiMenuOpen}
              menuRef={emojiMenuRef}
              onSelectEmoji={(emoji) => {
                setIsEmojiMenuOpen(false);
                onInsertEmoji(emoji);
              }}
            />
          </div>
        </div>

        {/* Botão de Gravar Áudio ou Enviar Mensagem */}
        <div className="order-3 col-start-2 row-start-2 flex items-center justify-self-end md:order-3 md:col-auto md:row-auto">
          {message.trim() || hasAttachments ? (
            <button
              type="button"
              aria-label="Enviar mensagem"
              onClick={onSendDraft}
              disabled={!canSend || isSending || isDraftSubmitting}
              className="w-10 h-10 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center transition-colors shadow-xs cursor-pointer disabled:opacity-50"
            >
              {isSending ? (
                <i className="bi bi-arrow-repeat animate-spin text-lg" />
              ) : (
                <i className="bi bi-send-fill text-base" />
              )}
            </button>
          ) : (
            <button
              type="button"
              aria-label="Gravar áudio"
              onClick={onStartRecording}
              disabled={!canSend}
              className="w-10 h-10 rounded-xl border-0 bg-transparent text-slate-600 hover:text-slate-800 dark:text-slate-300 dark:hover:text-slate-100 flex items-center justify-center transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <i className="bi bi-mic-fill text-lg" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
