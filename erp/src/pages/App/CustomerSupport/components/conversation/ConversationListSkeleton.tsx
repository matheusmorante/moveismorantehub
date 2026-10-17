import React from 'react';

interface ConversationListSkeletonProps {
  isLoading: boolean;
  count: number;
  search: string;
}

export const ConversationListSkeleton: React.FC<ConversationListSkeletonProps> = ({
  isLoading,
  count,
  search,
}) => {
  if (isLoading && count === 0) {
    return (
      <div className="p-3 space-y-3">
        {[1, 2, 3, 4, 5].map((n) => (
          <div
            key={n}
            className="flex items-center gap-3 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 animate-pulse mx-2"
          >
            <div className="w-11 h-11 rounded-full bg-slate-200 dark:bg-slate-800 shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-3.5 bg-slate-200 dark:bg-slate-800 rounded w-2/3" />
              <div className="h-3 bg-slate-100 dark:bg-slate-800/60 rounded w-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (count === 0) {
    return (
      <div className="p-8 text-center text-slate-400 text-xs flex flex-col items-center justify-center h-full">
        <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mb-3">
          <i className="bi bi-chat-left-dots text-2xl"></i>
        </div>
        <h4 className="font-bold text-slate-700 dark:text-slate-300 text-sm mb-1">
          Nenhuma conversa encontrada
        </h4>
        <p className="text-slate-400 max-w-[240px] leading-relaxed text-[11px]">
          {search
            ? 'Nenhum resultado corresponde à sua pesquisa.'
            : 'As mensagens recebidas pelo WhatsApp aparecerão aqui automaticamente.'}
        </p>
      </div>
    );
  }

  return null;
};
