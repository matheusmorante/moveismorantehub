import React from 'react';
import type { WhatsAppMessage } from '../../types';

interface MessageBubbleHeaderProps {
  message: WhatsAppMessage;
  isInbound: boolean;
  isSuggestion: boolean;
  isAiMessage: boolean;
}

export const MessageBubbleHeader: React.FC<MessageBubbleHeaderProps> = ({
  message,
  isInbound,
  isSuggestion,
  isAiMessage,
}) => {
  if (isInbound) return null;

  if (isSuggestion) {
    return (
      <div className="flex items-center justify-between gap-1.5 mb-1.5 pb-1 border-b border-amber-300/60 dark:border-amber-700/60 text-[10px] font-semibold text-amber-900 dark:text-amber-200 select-none">
        <div className="flex items-center gap-1.5">
          <i className="bi bi-robot text-xs text-amber-600 dark:text-amber-400" aria-hidden="true" />
          <span>Sugestão da IA (Lizandro)</span>
        </div>
        <span className="px-1.5 py-0.2 rounded-full bg-amber-200 dark:bg-amber-900/80 text-[9px] font-bold text-amber-800 dark:text-amber-200 uppercase tracking-wider">
          Aguardando Aprovação
        </span>
      </div>
    );
  }

  if (isAiMessage) {
    return (
      <div className="flex items-center gap-1.5 mb-1.5 pb-1 border-b border-emerald-300/40 dark:border-emerald-700/40 text-[10px] font-semibold text-emerald-800 dark:text-emerald-300 select-none">
        <i className="bi bi-robot text-xs text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
        <span>{message.authorName || 'Lizandro (IA)'}</span>
        <span className="px-1.5 py-0.2 rounded-full bg-indigo-100 dark:bg-indigo-950/70 text-[9px] font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-wider border border-indigo-200 dark:border-indigo-800/60">
          IA
        </span>
      </div>
    );
  }

  return null;
};
