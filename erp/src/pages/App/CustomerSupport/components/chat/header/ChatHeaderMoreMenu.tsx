import React, { useState } from 'react';
import { toast } from 'react-toastify';

interface ChatHeaderMoreMenuProps {
  contactPhone: string;
  formattedPhone: string;
  isArchived: boolean;
  isTimelineOpen: boolean;
  onToggleTimeline?: () => void;
  onToggleArchive: () => void;
}

export const ChatHeaderMoreMenu: React.FC<ChatHeaderMoreMenuProps> = ({
  contactPhone,
  formattedPhone,
  isArchived,
  isTimelineOpen,
  onToggleTimeline,
  onToggleArchive,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        title="Mais opções da conversa"
        aria-label="Mais ações da conversa"
        aria-expanded={isOpen}
        className="w-9 h-9 flex items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
      >
        <i className="bi bi-three-dots-vertical text-sm"></i>
      </button>

      {isOpen && (
        <div
          className="absolute right-0 top-11 w-60 rounded-2xl bg-white dark:bg-slate-900 shadow-xl border border-slate-100 dark:border-slate-800 py-1.5 z-50 animate-slide-down text-xs"
          onClick={() => setIsOpen(false)}
        >
          {onToggleTimeline && (
            <button
              type="button"
              onClick={onToggleTimeline}
              aria-pressed={isTimelineOpen}
              className="w-full px-4 py-2.5 text-left text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 cursor-pointer"
            >
              <i className={`bi bi-clock-history ${isTimelineOpen ? 'text-blue-500' : 'text-slate-400'}`}></i>
              {isTimelineOpen ? 'Ocultar linha do tempo' : 'Linha do tempo'}
            </button>
          )}
          <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
          <button
            type="button"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(contactPhone);
                toast.success('Telefone copiado para a área de transferência.');
              } catch {
                toast.error('Não foi possível copiar o telefone. Verifique a permissão da área de transferência.');
              }
            }}
            className="w-full px-4 py-2.5 text-left text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 cursor-pointer"
          >
            <i className="bi bi-clipboard text-slate-400"></i>
            Copiar telefone · {formattedPhone}
          </button>
          <button
            type="button"
            onClick={onToggleArchive}
            className="w-full px-4 py-2.5 text-left text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 cursor-pointer"
          >
            <i className="bi bi-archive text-slate-400"></i>
            {isArchived ? 'Desarquivar conversa' : 'Arquivar conversa'}
          </button>
        </div>
      )}
    </div>
  );
};
