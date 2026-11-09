import React from 'react';
import type { WhatsAppMessage } from '../../../types';

interface MessageBubbleAiSuggestionActionsProps {
  message: WhatsAppMessage;
}

export const MessageBubbleAiSuggestionActions: React.FC<MessageBubbleAiSuggestionActionsProps> = ({
  message,
}) => {
  return (
    <div className="mt-2.5 pt-2 border-t border-amber-200/80 dark:border-amber-800/50 flex items-center gap-1.5 flex-wrap">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          window.dispatchEvent(
            new CustomEvent('customer_support_approve_ai_suggestion', { detail: { message } })
          );
        }}
        className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer shadow-xs"
      >
        <i className="bi bi-send-fill text-[10px]" aria-hidden="true" />
        Aprovar e Enviar
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          window.dispatchEvent(
            new CustomEvent('customer_support_use_ai_suggestion', { detail: { text: message.textContent } })
          );
        }}
        className="px-2 py-1 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 text-[11px] font-medium transition-colors cursor-pointer flex items-center gap-1"
      >
        <i className="bi bi-pencil-square text-[10px]" aria-hidden="true" />
        Usar no Editor
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          window.dispatchEvent(
            new CustomEvent('customer_support_discard_ai_suggestion', { detail: { messageId: message.id } })
          );
        }}
        className="px-2 py-1 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-[11px] font-medium transition-colors cursor-pointer ml-auto"
      >
        Descartar
      </button>
    </div>
  );
};
