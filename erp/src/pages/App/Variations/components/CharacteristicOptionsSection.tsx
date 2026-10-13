import type { Dispatch, SetStateAction } from 'react';
import type { VariationOption } from '../../../types/variation.type';
import type { CharacteristicSaveStatus } from '../domain/characteristicFormRules';

interface CharacteristicOptionsSectionProps {
  readonly characteristicName: string;
  readonly optionsCount: number;
  readonly newOptionValue: string;
  readonly onNewOptionValueChange: (value: string) => void;
  readonly onAddOption: () => Promise<void>;
  readonly optionSearch: string;
  readonly onOptionSearchChange: (value: string) => void;
  readonly filteredOptionsCount: number;
  readonly visibleOptions: readonly VariationOption[];
  readonly editingOptionId: string | null;
  readonly editingOptionValue: string;
  readonly onOptionEditChange: (optionId: string, value: string) => void;
  readonly onCommitOptionEdit: (optionId: string, value: string) => Promise<void>;
  readonly onCancelOptionEdit: () => void;
  readonly onStartOptionEdit: (option: VariationOption) => void;
  readonly onRemoveOption: (option: VariationOption) => Promise<void>;
  readonly visiblePage: number;
  readonly totalOptionPages: number;
  readonly firstVisibleOption: number;
  readonly lastVisibleOption: number;
  readonly onPageChange: Dispatch<SetStateAction<number>>;
  readonly isClosing: boolean;
  readonly saveStatus: CharacteristicSaveStatus;
  readonly optionIdsOutOfSync: boolean;
}

export function CharacteristicOptionsSection({
  characteristicName,
  optionsCount,
  newOptionValue,
  onNewOptionValueChange,
  onAddOption,
  optionSearch,
  onOptionSearchChange,
  filteredOptionsCount,
  visibleOptions,
  editingOptionId,
  editingOptionValue,
  onOptionEditChange,
  onCommitOptionEdit,
  onCancelOptionEdit,
  onStartOptionEdit,
  onRemoveOption,
  visiblePage,
  totalOptionPages,
  firstVisibleOption,
  lastVisibleOption,
  onPageChange,
  isClosing,
  saveStatus,
  optionIdsOutOfSync,
}: CharacteristicOptionsSectionProps) {
  const isBusy = isClosing || saveStatus === 'saving' || optionIdsOutOfSync;

  return (
    <section className="flex flex-col gap-3" aria-labelledby="characteristic-options-label">
      <div className="flex items-center justify-between gap-3">
        <span
          id="characteristic-options-label"
          className="text-[10px] font-black uppercase tracking-widest text-slate-500"
        >
          Opções cadastradas
        </span>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          {optionsCount} {optionsCount === 1 ? 'opção' : 'opções'}
        </span>
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={newOptionValue}
          onChange={(event) => onNewOptionValueChange(event.target.value)}
          disabled={isBusy}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              void onAddOption();
            }
          }}
          className="flex-1 px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-bold dark:text-slate-100"
          placeholder="Nome da nova opção"
          aria-label="Nome da nova opção"
        />
        <button
          type="button"
          onClick={() => void onAddOption()}
          disabled={isBusy || !newOptionValue.trim()}
          className="px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-xs uppercase tracking-widest disabled:opacity-50"
        >
          Adicionar
        </button>
      </div>
      <input
        type="search"
        value={optionSearch}
        onChange={(event) => onOptionSearchChange(event.target.value)}
        disabled={isClosing || optionIdsOutOfSync}
        placeholder="Pesquisar opções..."
        aria-label={`Pesquisar opções da característica ${characteristicName || ''}`}
        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-bold dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500/20"
      />
      {optionSearch.trim().length > 0 && optionSearch.trim().length < 3 && (
        <p className="-mt-1 text-[11px] text-slate-400">
          Digite pelo menos 3 caracteres para pesquisar as opções.
        </p>
      )}
      <div className="max-h-[28rem] overflow-y-auto custom-scrollbar rounded-2xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
        {visibleOptions.length === 0 ? (
          <p className="px-4 py-8 text-center text-xs italic text-slate-400">
            {optionsCount === 0 ? 'Nenhuma opção cadastrada.' : 'Nenhuma opção encontrada.'}
          </p>
        ) : (
          visibleOptions.map((option) => (
            <div key={option.id} className="flex min-h-14 items-center gap-3 px-4 py-2.5">
              {editingOptionId === option.id ? (
                <input
                  type="text"
                  value={editingOptionValue}
                  onChange={(event) => onOptionEditChange(option.id, event.target.value)}
                  onBlur={() => void onCommitOptionEdit(option.id, editingOptionValue)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      void onCommitOptionEdit(option.id, editingOptionValue);
                    }
                    if (event.key === 'Escape') {
                      onCancelOptionEdit();
                    }
                  }}
                  disabled={isBusy}
                  aria-label={`Editar opção ${option.value}`}
                  className="min-w-0 flex-1 rounded-lg border border-blue-300 bg-white px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-blue-800 dark:bg-slate-950 dark:text-slate-100"
                />
              ) : (
                <span className="min-w-0 flex-1 text-xs font-bold text-slate-700 dark:text-slate-200">
                  {option.value}
                </span>
              )}
              {editingOptionId !== option.id && (
                <button
                  type="button"
                  onClick={() => onStartOptionEdit(option)}
                  disabled={isBusy || editingOptionId !== null}
                  aria-label={`Editar opção ${option.value}`}
                  title="Editar opção"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 disabled:opacity-40 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                >
                  <i className="bi bi-pencil" aria-hidden="true" />
                </button>
              )}
              {editingOptionId !== option.id && (
                <button
                  type="button"
                  onClick={() => void onRemoveOption(option)}
                  disabled={isBusy || editingOptionId !== null || optionsCount <= 1}
                  aria-label={`Remover opção ${option.value}`}
                  title={
                    optionsCount <= 1
                      ? 'A característica precisa de pelo menos uma opção'
                      : 'Remover opção'
                  }
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-red-500 transition-colors hover:bg-red-50 disabled:opacity-40 dark:hover:bg-red-500/10"
                >
                  <i className="bi bi-trash" aria-hidden="true" />
                </button>
              )}
            </div>
          ))
        )}
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-3 dark:border-slate-800">
        <p className="text-[11px] text-slate-500 dark:text-slate-400">
          {firstVisibleOption}–{lastVisibleOption} de {filteredOptionsCount} opções
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onPageChange((current) => Math.max(0, current - 1))}
            disabled={visiblePage === 0 || editingOptionId !== null}
            aria-label="Página anterior"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition-colors hover:bg-slate-100 disabled:opacity-40 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <i className="bi bi-chevron-left" aria-hidden="true" />
          </button>
          <span className="min-w-10 text-center text-xs font-bold text-slate-600 dark:text-slate-300">
            {visiblePage + 1} / {totalOptionPages}
          </span>
          <button
            type="button"
            onClick={() =>
              onPageChange((current) => Math.min(totalOptionPages - 1, current + 1))
            }
            disabled={visiblePage >= totalOptionPages - 1 || editingOptionId !== null}
            aria-label="Próxima página"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition-colors hover:bg-slate-100 disabled:opacity-40 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <i className="bi bi-chevron-right" aria-hidden="true" />
          </button>
        </div>
      </div>
    </section>
  );
}
