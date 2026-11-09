import React, { useState } from 'react';

interface RuleKeywordsEditorProps {
  keywords: string[];
  isAdministrator: boolean;
  onAddKeyword: (keyword: string) => void;
  onRemoveKeyword: (keyword: string) => void;
}

export const RuleKeywordsEditor: React.FC<RuleKeywordsEditorProps> = ({
  keywords,
  isAdministrator,
  onAddKeyword,
  onRemoveKeyword,
}) => {
  const [newKeyword, setNewKeyword] = useState('');

  const handleAdd = () => {
    const val = newKeyword.trim();
    if (!val) return;
    onAddKeyword(val);
    setNewKeyword('');
  };

  return (
    <div>
      <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1.5">
        Palavras-chave de Disparo
      </label>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {keywords.map((kw) => (
          <span
            key={kw}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
          >
            <span>{kw}</span>
            {isAdministrator && (
              <button
                type="button"
                onClick={() => onRemoveKeyword(kw)}
                className="text-slate-400 hover:text-rose-500 ml-0.5 cursor-pointer"
                title="Remover palavra-chave"
              >
                <i className="bi bi-x" aria-hidden="true" />
              </button>
            )}
          </span>
        ))}
      </div>

      {isAdministrator && (
        <div className="flex gap-2 max-w-sm">
          <input
            type="text"
            placeholder="Adicionar termo..."
            value={newKeyword}
            onChange={(e) => setNewKeyword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAdd();
              }
            }}
            className="flex-1 px-2.5 py-1 text-xs rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
          />
          <button
            type="button"
            onClick={handleAdd}
            className="px-3 py-1 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-600 text-xs font-medium transition-colors cursor-pointer"
          >
            Adicionar
          </button>
        </div>
      )}
    </div>
  );
};
