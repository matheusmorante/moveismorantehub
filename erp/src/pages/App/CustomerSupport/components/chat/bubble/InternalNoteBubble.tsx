import React from 'react';
import { WhatsAppMessage } from '../../../types';
import { renderFormattedText } from './bubbleUtils';

interface InternalNoteBubbleProps {
  message: WhatsAppMessage;
  timeFormatted: string;
}

export const InternalNoteBubble: React.FC<InternalNoteBubbleProps> = ({
  message,
  timeFormatted,
}) => {
  const authorInitials = (message.authorName || 'E')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');

  return (
    <div className="flex w-full my-2.5 justify-end items-end gap-2">
      <div className="relative max-w-[85%] sm:max-w-[75%] md:max-w-[65%] rounded-2xl rounded-tr-xs px-4 py-3 bg-[#fef3c7] dark:bg-[#78350f]/40 border border-amber-300/80 dark:border-amber-700/70 text-slate-900 dark:text-amber-100 shadow-xs select-text">
        {/* Cabeçalho do Comentário Interno */}
        <div className="flex items-center justify-between gap-3 mb-1.5 pb-1 border-b border-amber-300/60 dark:border-amber-700/50">
          <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-amber-800 dark:text-amber-300">
            <i className="bi bi-lock-fill text-[11px]"></i>
            Nota Interna
          </span>
          <span className="text-[11px] font-bold text-amber-900 dark:text-amber-200">
            {message.authorName || 'Equipe'}
          </span>
        </div>

        <p className="whitespace-pre-wrap break-words text-[13px] leading-relaxed font-medium">
          {message.textContent ? renderFormattedText(message.textContent) : ''}
        </p>

        <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-amber-800/80 dark:text-amber-300/80">
          <span>{timeFormatted}</span>
          <i className="bi bi-eye text-[10px]" title="Visível apenas para colaboradores do ERP"></i>
        </div>
      </div>

      {/* Avatar do Autor do Comentário */}
      <div
        title={message.authorName || 'Atendente'}
        className="w-7 h-7 rounded-full bg-amber-500 text-white flex items-center justify-center text-[10px] font-black shrink-0 shadow-xs border border-amber-600/30 mb-0.5"
      >
        {authorInitials}
      </div>
    </div>
  );
};
