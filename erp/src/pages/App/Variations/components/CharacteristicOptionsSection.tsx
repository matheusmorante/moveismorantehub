import { useMemo, useState } from 'react';
import type { VariationOption } from '../../../types/variation.type';
import { sortAttributeValuesNaturally } from '../../../utils/attributeValueSorting';
import { normalizeCharacteristicText } from '../domain/characteristicFormRules';

interface CharacteristicOptionsSectionProps {
  readonly options: readonly VariationOption[];
  readonly onOptionsChange: (options: VariationOption[]) => void;
  readonly disabled: boolean;
  readonly characteristicName: string;
}

const underlineInput =
  'w-full bg-transparent border-0 border-b border-slate-300 px-1 py-2 text-sm font-medium text-slate-800 outline-none focus:border-blue-600 focus:ring-0 disabled:opacity-50 dark:border-slate-700 dark:text-slate-100';

export function CharacteristicOptionsSection({
  options,
  onOptionsChange,
  disabled,
  characteristicName,
}: CharacteristicOptionsSectionProps) {
  const [newValue, setNewValue] = useState('');
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [error, setError] = useState('');
  const searchEnabled = options.length >= 8;

  const visibleOptions = useMemo(() => {
    const normalizedSearch = normalizeCharacteristicText(search).normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return sortAttributeValuesNaturally(options)
      .filter((option) => {
        if (!searchEnabled || !normalizedSearch) return true;
        return normalizeCharacteristicText(option.value)
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .includes(normalizedSearch);
      });
  }, [options, search, searchEnabled]);

  const sortOptions = (nextOptions: readonly VariationOption[]) =>
    sortAttributeValuesNaturally(nextOptions).map((option, sortOrder) => ({
      ...option,
      sortOrder,
    }));

  const addOption = () => {
    const value = newValue.trim();
    if (!value) return;
    if (options.some((option) => normalizeCharacteristicText(option.value) === normalizeCharacteristicText(value))) {
      setError('Esta opção já existe.');
      return;
    }
    onOptionsChange(sortOptions([...options, {
      id: globalThis.crypto?.randomUUID?.() ?? `new-option-${Date.now()}`,
      value,
      active: true,
      sortOrder: options.length,
    }]));
    setNewValue('');
    setError('');
  };

  const commitEdit = (optionId: string) => {
    const value = editingValue.trim();
    if (!value) {
      setError('A opção não pode ficar vazia.');
      return;
    }
    if (options.some((option) => option.id !== optionId && normalizeCharacteristicText(option.value) === normalizeCharacteristicText(value))) {
      setError('Esta opção já existe.');
      return;
    }
    onOptionsChange(sortOptions(options.map((option) => option.id === optionId ? { ...option, value } : option)));
    setEditingId(null);
    setEditingValue('');
    setError('');
  };

  const removeOption = (optionId: string) => {
    if (options.length <= 1) return;
    onOptionsChange(sortOptions(options.filter((option) => option.id !== optionId)));
    if (editingId === optionId) {
      setEditingId(null);
      setEditingValue('');
    }
    setError('');
  };

  return (
    <section className="space-y-3" aria-labelledby="characteristic-options-label">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 id="characteristic-options-label" className="text-xs font-bold text-slate-700 dark:text-slate-200">
            Opções
          </h3>
          <p className="mt-1 text-[11px] text-slate-400">Ordem automática: A–Z ou do menor para o maior.</p>
        </div>
        <span className="text-xs text-slate-500">{options.length} opções</span>
      </div>
      <div className="flex items-end gap-3">
        <label className="min-w-0 flex-1 text-xs text-slate-500">
          Nova opção
          <input
            value={newValue}
            onChange={(event) => setNewValue(event.target.value)}
            onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addOption(); } }}
            disabled={disabled}
            placeholder="Digite uma opção"
            className={underlineInput}
          />
        </label>
        <button
          type="button"
          onClick={addOption}
          disabled={disabled || !newValue.trim()}
          className="shrink-0 pb-2 text-sm font-semibold text-blue-700 disabled:opacity-40 dark:text-blue-300"
        >
          Adicionar
        </button>
      </div>
      {searchEnabled && (
        <label className="block text-xs text-slate-500">
          Pesquisar opções
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={`Buscar entre ${options.length} opções`}
            aria-label={`Pesquisar opções de ${characteristicName}`}
            className={underlineInput}
          />
        </label>
      )}
      {!searchEnabled && (
        <p className="text-[11px] text-slate-400">Pesquisa disponível a partir de 8 opções.</p>
      )}
      {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
      <div className="max-h-72 divide-y divide-slate-100 overflow-y-auto border-y border-slate-100 dark:divide-slate-800 dark:border-slate-800">
        {visibleOptions.length === 0 ? (
          <p className="py-6 text-center text-xs text-slate-400">Nenhuma opção encontrada.</p>
        ) : visibleOptions.map((option, index) => (
          <div key={option.id || `${option.value}-${index}`} className="flex min-h-12 items-center gap-2 py-1.5">
            {editingId === option.id ? (
              <input
                value={editingValue}
                onChange={(event) => setEditingValue(event.target.value)}
                onBlur={() => commitEdit(option.id)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') { event.preventDefault(); commitEdit(option.id); }
                  if (event.key === 'Escape') { setEditingId(null); setEditingValue(''); setError(''); }
                }}
                autoFocus
                disabled={disabled}
                aria-label={`Editar opção ${option.value}`}
                className={underlineInput}
              />
            ) : (
              <button
                type="button"
                onClick={() => { setEditingId(option.id); setEditingValue(option.value); setError(''); }}
                disabled={disabled}
                aria-label={`Editar opção ${option.value}`}
                title="Clique para editar"
                className={`min-w-0 flex-1 truncate text-left text-sm disabled:cursor-default ${option.active === false ? 'text-slate-400 line-through' : 'text-slate-800 hover:text-blue-700 dark:text-slate-100 dark:hover:text-blue-300'}`}
              >
                {option.value}
              </button>
            )}
            {option.active === false && editingId !== option.id && (
              <span className="text-[10px] text-slate-400">Inativa</span>
            )}
            <button
              type="button"
              onClick={() => removeOption(option.id)}
              disabled={disabled || options.length <= 1}
              aria-label={`Remover opção ${option.value}`}
              title={options.length <= 1 ? 'A característica precisa ter ao menos uma opção.' : 'Remover opção'}
              className="shrink-0 px-1.5 py-1 text-xs text-slate-500 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:text-red-400"
            >
              <i className="bi bi-trash" aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
