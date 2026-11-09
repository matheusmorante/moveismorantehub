import React from 'react';
import type { WhatsAppMessage } from '../../types';

interface MessageBubbleDirectActionsProps {
  message: WhatsAppMessage;
  canReply: boolean;
  canForward: boolean;
  onReplyMessage?: (message: WhatsAppMessage) => void;
  onForwardMessage?: (message: WhatsAppMessage) => void;
}

export const MessageBubbleDirectActions: React.FC<MessageBubbleDirectActionsProps> = ({
  message,
  canReply,
  canForward,
  onReplyMessage,
  onForwardMessage,
}) => {
  if (!onReplyMessage && (!onForwardMessage || !canForward)) {
    return null;
  }

  return (
    <div className="absolute -top-3 right-2 z-10 flex gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover/message:opacity-100 sm:focus-within:opacity-100">
      {onReplyMessage && canReply && (
        <button
          type="button"
          title="Responder esta mensagem"
          aria-label="Responder esta mensagem"
          onClick={(e) => {
            e.stopPropagation();
            onReplyMessage(message);
          }}
          className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-emerald-50 hover:text-emerald-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-emerald-950"
        >
          <i className="bi bi-reply-fill text-sm" />
        </button>
      )}
      {onForwardMessage && canForward && (
        <button
          type="button"
          title="Encaminhar mensagem"
          aria-label="Encaminhar mensagem"
          onClick={(e) => {
            e.stopPropagation();
            onForwardMessage(message);
          }}
          className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-emerald-50 hover:text-emerald-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-emerald-950"
        >
          <i className="bi bi-forward-fill text-sm" />
        </button>
      )}
    </div>
  );
};
