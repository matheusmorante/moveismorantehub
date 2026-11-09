import React from 'react';

interface MessageBubbleQuotedPreviewProps {
  quoteAuthor?: string;
  quotePreview: string;
  quoteExists: boolean;
  isResolvingQuote: boolean;
  quoteError?: string;
  onJumpToQuoted: () => void;
}

export const MessageBubbleQuotedPreview: React.FC<MessageBubbleQuotedPreviewProps> = ({
  quoteAuthor,
  quotePreview,
  quoteExists,
  isResolvingQuote,
  quoteError,
  onJumpToQuoted,
}) => {
  return (
    <div className="mb-2 p-2 rounded-xl bg-black/5 dark:bg-white/10 border-l-4 border-emerald-600 dark:border-emerald-400 text-[11px] text-slate-600 dark:text-slate-300">
      <span className="font-semibold block text-[10px] text-emerald-700 dark:text-emerald-400">
        {quoteAuthor ? `Mensagem de ${quoteAuthor}` : 'Mensagem citada'}
      </span>
      <span className="truncate block opacity-80" title={quotePreview}>
        {quotePreview}
      </span>
      <button
        type="button"
        onClick={onJumpToQuoted}
        disabled={isResolvingQuote}
        className="mt-1 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 disabled:opacity-50 cursor-pointer"
      >
        {isResolvingQuote ? 'Localizando…' : quoteExists ? 'Ir para a mensagem' : 'Carregar contexto citado'}
      </button>
      {quoteError && (
        <span role="alert" className="block mt-1 text-[10px] text-red-600 dark:text-red-300">
          {quoteError}
        </span>
      )}
    </div>
  );
};
