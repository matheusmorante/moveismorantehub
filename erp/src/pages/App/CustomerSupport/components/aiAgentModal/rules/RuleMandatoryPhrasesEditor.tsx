import React, { useState } from 'react';

interface RuleMandatoryPhrasesEditorProps {
  phrases: string[];
  isAdministrator: boolean;
  onAddPhrase: (phrase: string) => void;
  onRemovePhrase: (index: number) => void;
}

export const RuleMandatoryPhrasesEditor: React.FC<RuleMandatoryPhrasesEditorProps> = ({
  phrases,
  isAdministrator,
  onAddPhrase,
  onRemovePhrase,
}) => {
  const [newPhrase, setNewPhrase] = useState('');

  const handleAdd = () => {
    const val = newPhrase.trim();
    if (!val) return;
    onAddPhrase(val);
    setNewPhrase('');
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Frases Obrigatórias (Garantia Determinística pelo Motor)
        </label>
        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
          <i className="bi bi-shield-check" aria-hidden="true" />
          Injetadas se omitidas pela IA
        </span>
      </div>

      <div className="space-y-2 mb-2">
        {phrases.length === 0 ? (
          <p className="text-xs text-slate-400 italic">
            Nenhuma frase obrigatória definida para esta situação.
          </p>
        ) : (
          phrases.map((phrase, idx) => (
            <div
              key={idx}
              className="p-2.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-800/40 flex items-start justify-between gap-2"
            >
              <div className="flex items-start gap-2">
                <i className="bi bi-quote text-emerald-600 dark:text-emerald-400 text-sm shrink-0 mt-0.5" aria-hidden="true" />
                <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                  {phrase}
                </p>
              </div>
              {isAdministrator && (
                <button
                  type="button"
                  onClick={() => onRemovePhrase(idx)}
                  className="text-slate-400 hover:text-rose-500 shrink-0 cursor-pointer p-0.5"
                  title="Remover frase obrigatória"
                >
                  <i className="bi bi-trash text-xs" aria-hidden="true" />
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {isAdministrator && (
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Digite a frase obrigatória..."
            value={newPhrase}
            onChange={(e) => setNewPhrase(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAdd();
              }
            }}
            className="flex-1 px-2.5 py-1.5 text-xs rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
          />
          <button
            type="button"
            onClick={handleAdd}
            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1 shrink-0"
          >
            <i className="bi bi-plus-lg text-xs" aria-hidden="true" />
            Adicionar Frase
          </button>
        </div>
      )}
    </div>
  );
};
