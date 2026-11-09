import React from 'react';
import type { UseFormRegisterReturn } from 'react-hook-form';
import type { WhatsAppMessage } from '../../types';
import { ChatComposerAttachmentMenu } from './ChatComposerAttachmentMenu';
import { ChatComposerEmojiMenu } from './ChatComposerEmojiMenu';
import { ChatComposerReplyTargetPreview } from './ChatComposerReplyTargetPreview';
import { useComposerMenusState } from './useComposerMenusState';

interface ChatComposerInputBarProps {
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
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
  onSwitchToCommentMode: () => void;
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
  textareaRef,
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
  onSwitchToCommentMode,
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

  const handleTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSendDraft();
    }
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

      <div className="flex items-end gap-2">
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
          onOpenSnippets={onOpenSnippets}
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

        {/* Botão de Respostas Rápidas / Snippets */}
        <button
          type="button"
          aria-label="Abrir modelos e respostas rápidas"
          onClick={onOpenSnippets}
          className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          title="Modelos Rápidos / Snippets"
        >
          <i className="bi bi-lightning-charge text-lg" />
        </button>

        {/* Alternar para Comentário Interno */}
        <button
          type="button"
          aria-label="Adicionar comentário"
          onClick={onSwitchToCommentMode}
          className="w-10 h-10 rounded-xl flex items-center justify-center text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors cursor-pointer"
          title="Adicionar comentário"
        >
          <i className="bi bi-sticky text-lg" />
        </button>

        {/* Textarea de Digitação */}
        <div className="flex-1 min-w-0 relative">
          <textarea
            ref={textareaRef}
            {...messageRegister}
            aria-label="Mensagem"
            disabled={!canSend}
            onKeyDown={handleTextareaKeyDown}
            placeholder="Digite sua mensagem (Enter para enviar, Shift+Enter para nova linha)..."
            rows={1}
            className="w-full resize-none py-2.5 px-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 border-0 disabled:opacity-60 disabled:cursor-not-allowed"
          />
        </div>

        {/* Botão de Gravar Áudio ou Enviar Mensagem */}
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
            className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <i className="bi bi-mic-fill text-lg" />
          </button>
        )}
      </div>
    </div>
  );
};
