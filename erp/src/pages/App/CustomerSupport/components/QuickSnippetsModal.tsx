import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { QuickSnippet } from '../types';
import { DEFAULT_QUICK_SNIPPETS } from '@/pages/utils/customerSupport/customerSupportService';

interface QuickSnippetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSnippet?: (content: string) => void;
}

export const QuickSnippetsModal: React.FC<QuickSnippetsModalProps> = ({
  isOpen,
  onClose,
  onSelectSnippet,
}) => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('todos');

  if (!isOpen) return null;

  const categories = [
    { id: 'todos', label: 'Todos' },
    { id: 'pagamento', label: 'PIX / Pagamento' },
    { id: 'entrega', label: 'Entrega' },
    { id: 'loja', label: 'Loja Física' },
    { id: 'assistencia', label: 'Garantia' },
    { id: 'geral', label: 'Saudação' },
  ];

  const filtered = DEFAULT_QUICK_SNIPPETS.filter((s) => {
    const matchesCat = selectedCategory === 'todos' || s.category === selectedCategory;
    const matchesSearch =
      !search.trim() ||
      s.title.toLowerCase().includes(search.toLowerCase()) ||
      s.content.toLowerCase().includes(search.toLowerCase()) ||
      s.shortcut.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const handleCopy = (snippet: QuickSnippet) => {
    navigator.clipboard.writeText(snippet.content);
    toast.success(`Modelo "${snippet.title}" copiado para a área de transferência! ✨`);
    if (onSelectSnippet) {
      onSelectSnippet(snippet.content);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="snippets-modal-title"
      className="fixed inset-0 z-[999999] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[85vh] overflow-hidden animate-slide-up"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <i className="bi bi-lightning-charge-fill text-lg"></i>
            </div>
            <div>
              <h3 id="snippets-modal-title" className="text-base font-bold text-slate-900 dark:text-slate-100">
                Respostas Rápidas & Modelos
              </h3>
              <p className="text-xs text-slate-400">
                Selecione um modelo pré-definido para copiar ou inserir
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Fechar"
          >
            <i className="bi bi-x-lg text-sm"></i>
          </button>
        </div>

        {/* Barra de Pesquisa */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-800/30">
          <div className="relative flex items-center mb-3">
            <i className="bi bi-search absolute left-3.5 text-slate-400 text-xs"></i>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Pesquisar por título, atalho (ex: /pix) ou texto..."
              autoFocus
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {/* Categorias */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {categories.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelectedCategory(c.id)}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  selectedCategory === c.id
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* Lista de Modelos */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              Nenhum modelo encontrado para a pesquisa.
            </div>
          ) : (
            filtered.map((s) => (
              <div
                key={s.id}
                className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700/60 hover:border-amber-400/80 dark:hover:border-amber-600/60 transition-all flex flex-col gap-2 group"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-[10px] font-bold">
                      {s.shortcut}
                    </span>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      {s.title}
                    </h4>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy(s)}
                    className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-300 hover:bg-amber-500 hover:text-white dark:hover:bg-amber-500 dark:hover:text-white border border-amber-300/60 dark:border-amber-600/50 text-[11px] font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <i className="bi bi-clipboard-check"></i>
                    Copiar
                  </button>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed bg-white/70 dark:bg-slate-900/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 select-text">
                  {s.content}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
