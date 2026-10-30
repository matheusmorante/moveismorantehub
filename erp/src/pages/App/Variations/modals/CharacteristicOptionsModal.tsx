import { useState, type FormEvent } from 'react';
import { z } from 'zod';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import { flattenFormErrors, useZodForm } from '@/hooks/useZodForm';
import type { VariationOption } from '../../../types/variation.type';
import { getVariationErrorMessage } from '../../../utils/variationService';
import { CharacteristicOptionsSection } from '../components/CharacteristicOptionsSection';
import { normalizeCharacteristicText } from '../domain/characteristicFormRules';

const optionsFormSchema = z.object({
  options: z.array(z.object({
    id: z.string(),
    value: z.string().trim().min(1, 'A opção não pode ficar vazia.'),
    active: z.boolean().optional().default(true),
    sortOrder: z.number().int().nonnegative().optional(),
  })).min(1, 'Adicione pelo menos uma opção.'),
}).superRefine(({ options }, context) => {
  const normalizedValues = options.map((option) => normalizeCharacteristicText(option.value));
  if (new Set(normalizedValues).size !== normalizedValues.length) {
    context.addIssue({ code: 'custom', path: ['options'], message: 'As opções não podem ter nomes duplicados.' });
  }
  if (!options.some((option) => option.active !== false)) {
    context.addIssue({ code: 'custom', path: ['options'], message: 'Mantenha pelo menos uma opção ativa.' });
  }
});

interface CharacteristicOptionsModalProps {
  readonly characteristicName: string;
  readonly options: readonly VariationOption[];
  readonly onClose: () => void;
  readonly onSave: (options: VariationOption[]) => void | VariationOption[] | Promise<void | VariationOption[]>;
}

export function CharacteristicOptionsModal({
  characteristicName,
  options: initialOptions,
  onClose,
  onSave,
}: CharacteristicOptionsModalProps) {
  useBodyScrollLock(true);
  const [options, setOptions] = useState<VariationOption[]>(() => [...initialOptions]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const { validateAndRun } = useZodForm(optionsFormSchema, { options });

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSaving) return;
    setIsSaving(true);
    setSaveError('');
    try {
      const saved = await validateAndRun(
        { options },
        async (values) => onSave(values.options.map((option, sortOrder) => ({
          ...option,
          active: option.active !== false,
          sortOrder,
        }))),
        (errors) => setSaveError(Object.values(flattenFormErrors(errors))[0] || 'Confira as opções.'),
      );
      if (saved !== false) {
        if (Array.isArray(saved)) setOptions(saved);
        onClose();
      }
    } catch (error: unknown) {
      setSaveError(getVariationErrorMessage(error, 'Não foi possível salvar as opções.'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1000034] flex items-end justify-center bg-slate-950/40 p-0 sm:items-center sm:p-3 md:p-4 lg:p-6 xl:p-8 2xl:p-10">
      <button
        type="button"
        aria-label="Fechar gerenciamento de opções"
        onClick={onClose}
        disabled={isSaving}
        className="absolute inset-0"
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="characteristic-options-modal-title"
        className="relative z-10 flex h-[100dvh] max-h-[100dvh] w-full min-h-0 flex-col overflow-hidden border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950 sm:h-[min(92dvh,56rem)] sm:max-h-[92dvh] sm:max-w-xl sm:rounded-xl md:max-w-2xl lg:max-w-3xl xl:max-w-4xl 2xl:max-w-5xl"
      >
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-200 px-4 py-4 sm:px-5 md:px-6 lg:px-8 dark:border-slate-800">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300">Característica</p>
            <h2 id="characteristic-options-modal-title" className="mt-1 truncate text-lg font-semibold text-slate-900 dark:text-slate-100">
              Gerenciar opções
            </h2>
            <p className="mt-1 truncate text-sm text-slate-500">{characteristicName}</p>
          </div>
          <button type="button" onClick={onClose} disabled={isSaving} aria-label="Fechar" className="shrink-0 rounded-lg px-3 py-2 text-sm text-slate-500 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-40 dark:hover:bg-slate-800 dark:hover:text-white">
            <i className="bi bi-x-lg" aria-hidden="true" />
          </button>
        </header>

        <form onSubmit={(event) => void handleSubmit(event)} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5 sm:px-5 md:px-6 lg:px-8">
            <div className="mx-auto w-full max-w-3xl">
              <div className="mb-5 rounded-xl bg-blue-50 px-4 py-3 text-sm text-blue-900 dark:bg-blue-950/40 dark:text-blue-100">
                Adicione, edite ou remova os valores usados nesta característica.
              </div>
              <CharacteristicOptionsSection
                options={options}
                onOptionsChange={setOptions}
                disabled={isSaving}
                characteristicName={characteristicName}
              />
            </div>
          </div>

          <footer className="shrink-0 border-t border-slate-200 px-4 py-4 sm:px-5 md:px-6 lg:px-8 dark:border-slate-800">
            {saveError && <p role="alert" className="mb-3 text-sm text-red-600 dark:text-red-400">{saveError}</p>}
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
              <button type="button" onClick={onClose} disabled={isSaving} className="rounded-lg px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-40 dark:text-slate-300 dark:hover:bg-slate-800">
                Cancelar
              </button>
              <button type="submit" disabled={isSaving} className="rounded-lg bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50">
                {isSaving ? 'Salvando…' : 'Salvar opções'}
              </button>
            </div>
          </footer>
        </form>
      </section>
    </div>
  );
}
