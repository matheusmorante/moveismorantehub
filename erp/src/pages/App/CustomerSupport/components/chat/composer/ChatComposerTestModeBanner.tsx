import React from 'react';

interface ChatComposerTestModeBannerProps {
  canSend: boolean;
}

export const ChatComposerTestModeBanner: React.FC<ChatComposerTestModeBannerProps> = ({
  canSend,
}) => {
  if (canSend) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 border-b border-slate-100 dark:border-slate-800 text-xs">
      <span className="font-bold text-slate-700 dark:text-slate-300">WhatsApp</span>
      <span className="text-[11px] text-slate-500">
        Envio de teste disponível apenas no ambiente Development
      </span>
      <button
        type="button"
        disabled
        aria-label="Enviar mensagem de teste"
        className="px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 text-xs cursor-not-allowed"
      >
        Enviar mensagem de teste
      </button>
    </div>
  );
};
