import React from 'react';
import type { WhatsAppMessage } from '../../types';

interface ChatComposerReplyTargetPreviewProps {
  replyTarget: WhatsAppMessage;
  onClearReplyTarget?: () => void;
}

export const ChatComposerReplyTargetPreview: React.FC<ChatComposerReplyTargetPreviewProps> = ({
  replyTarget,
  onClearReplyTarget,
}) => {
  return (
    <div className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs text-slate-600 dark:text-slate-300 border-l-4 border-indigo-500">
      <div className="min-w-0 flex-1 truncate">
        <span className="font-bold mr-1">Respondendo:</span>
        <span>{replyTarget.textContent || 'Mídia / Anexo'}</span>
      </div>
      <button
        type="button"
        onClick={onClearReplyTarget}
        aria-label="Cancelar resposta"
        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
      >
        <i className="bi bi-x-lg text-xs" />
      </button>
    </div>
  );
};
