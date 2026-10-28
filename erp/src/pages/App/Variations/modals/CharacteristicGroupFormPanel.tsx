import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { flattenFormErrors, useZodForm } from '@/hooks/useZodForm';
import type { default as VariationType, CharacteristicGroup } from '../../../types/variation.type';
import { getVariationErrorMessage } from '../../../utils/variationService';
import {
  deleteCharacteristicGroup,
  saveCharacteristicGroup,
} from '../../../utils/characteristicGroupService';
import {
  createCharacteristicGroupFormSchema,
  getInitialCharacteristicGroupFormData,
  type CharacteristicGroupFormData,
} from '../../../../../../shared-utils/characteristicGroupFormRules';

interface CharacteristicGroupFormPanelProps {
  readonly group?: CharacteristicGroup | null;
  readonly characteristics: readonly VariationType[];
  readonly groups: readonly CharacteristicGroup[];
  readonly onClose: () => void;
  readonly onSaved: (groupId: string) => void | Promise<void>;
  readonly onDeleted: () => void | Promise<void>;
  readonly onAddCharacteristic: (groupId: string) => void;
  readonly onEditCharacteristic: (characteristic: VariationType) => void;
}

const underlineInput =
  'w-full bg-transparent border-0 border-b border-slate-300 px-1 py-2 text-sm font-medium text-slate-800 outline-none focus:border-blue-600 focus:ring-0 dark:border-slate-700 dark:text-slate-100';

export function CharacteristicGroupFormPanel({
  group,
  characteristics,
  groups,
  onClose,
  onSaved,
  onDeleted,
  onAddCharacteristic,
  onEditCharacteristic,
}: CharacteristicGroupFormPanelProps) {
  const [formData, setFormData] = useState<CharacteristicGroupFormData>(() =>
    getInitialCharacteristicGroupFormData(group)
  );
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const schema = useMemo(() => createCharacteristicGroupFormSchema(groups), [groups]);
  const { validateAndRun } = useZodForm(schema, formData);
  const linkedCharacteristics = characteristics.filter((item) => item.groupId === group?.id);

  useEffect(() => {
    setFormData(getInitialCharacteristicGroupFormData(group));
    setSaveError('');
  }, [group?.id]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSaving) return;
    setIsSaving(true);
    setSaveError('');
    try {
      const savedId = await validateAndRun(
        formData,
        (values) => saveCharacteristicGroup(values, group?.description),
        (errors) => setSaveError(Object.values(flattenFormErrors(errors))[0] || 'Confira o nome do grupo.')
      );
      if (savedId !== false) await onSaved(savedId);
    } catch (error: unknown) {
      setSaveError(getVariationErrorMessage(error, 'Não foi possível salvar o grupo.'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!group || group.isDefault || linkedCharacteristics.length > 0) return;
    if (!window.confirm(`Excluir o grupo "${group.name}"?`)) return;
    setIsSaving(true);
    setSaveError('');
    try {
      await deleteCharacteristicGroup(group.id);
      await onDeleted();
    } catch (error: unknown) {
      setSaveError(getVariationErrorMessage(error, 'Não foi possível excluir o grupo.'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <button type="button" aria-label="Fechar formulário de grupo" onClick={onClose} className="fixed inset-0 z-40 bg-slate-950/30 lg:hidden" />
      <aside role="dialog" aria-modal="false" aria-labelledby="characteristic-group-form-title" className="fixed inset-0 z-50 flex min-h-0 flex-col border-l border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950 lg:relative lg:inset-auto lg:z-auto lg:w-[min(560px,48vw)] lg:shrink-0 lg:shadow-none">
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 dark:border-slate-800 sm:px-7">
          <div>
            <h2 id="characteristic-group-form-title" className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              {group ? 'Editar grupo' : 'Novo grupo'}
            </h2>
            <p className="mt-1 text-xs text-slate-500">Os grupos servem apenas para organizar as características.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Cancelar e fechar" className="p-1 text-sm text-slate-500 hover:text-slate-900 dark:hover:text-white">Fechar</button>
        </header>

        <form onSubmit={(event) => void handleSubmit(event)} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-7 overflow-y-auto px-5 py-5 sm:px-7">
            <section className="space-y-4" aria-labelledby="group-general-title">
              <h3 id="group-general-title" className="text-sm font-semibold text-slate-800 dark:text-slate-100">Dados do grupo</h3>
              <label className="block text-xs text-slate-500">Nome do grupo *
                <input maxLength={120} value={formData.name} onChange={(event) => setFormData((current) => ({ ...current, name: event.target.value }))} disabled={isSaving} placeholder="Ex.: Portas" className={underlineInput} />
              </label>
            </section>

            <section className="space-y-4" aria-labelledby="group-characteristics-title">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 id="group-characteristics-title" className="text-sm font-semibold text-slate-800 dark:text-slate-100">Características vinculadas</h3>
                  {group?.id && <p className="mt-1 text-xs text-slate-500">{linkedCharacteristics.length} {linkedCharacteristics.length === 1 ? 'característica' : 'características'}</p>}
                </div>
                {group?.id && <button type="button" onClick={() => onAddCharacteristic(group.id)} disabled={isSaving} className="text-xs font-semibold text-blue-700 disabled:opacity-40 dark:text-blue-300">Adicionar característica</button>}
              </div>
              {!group?.id ? (
                <p className="text-xs text-slate-500">Salve o grupo para vincular características.</p>
              ) : linkedCharacteristics.length === 0 ? (
                <p className="text-xs text-slate-500">Nenhuma característica neste grupo.</p>
              ) : (
                <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                  {linkedCharacteristics.map((characteristic) => (
                    <li key={characteristic.id} className="flex items-center justify-between gap-3 py-2">
                      <span className="min-w-0 truncate text-sm text-slate-700 dark:text-slate-200">{characteristic.name}</span>
                      <button type="button" onClick={() => onEditCharacteristic(characteristic)} className="shrink-0 text-xs text-blue-700 dark:text-blue-300">Editar</button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          <footer className="shrink-0 border-t border-slate-200 px-5 py-4 dark:border-slate-800 sm:px-7">
            {saveError && <p role="alert" className="mb-3 text-xs text-red-600">{saveError}</p>}
            <div className="flex items-center justify-between gap-3">
              {group && <button type="button" onClick={() => void handleDelete()} disabled={isSaving || group.isDefault || linkedCharacteristics.length > 0} title={group.isDefault ? 'Este grupo é usado como destino de criações legadas.' : linkedCharacteristics.length ? 'Mova ou exclua as características vinculadas antes.' : 'Excluir grupo'} className="text-xs font-medium text-red-700 disabled:opacity-40 dark:text-red-300">Excluir grupo</button>}
              <div className="ml-auto flex gap-3">
                <button type="button" onClick={onClose} disabled={isSaving} className="px-3 py-2 text-sm font-medium text-slate-600 disabled:opacity-40 dark:text-slate-300">Cancelar</button>
                <button type="submit" disabled={isSaving || !formData.name.trim()} className="px-4 py-2 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-50">{isSaving ? 'Salvando…' : 'Salvar grupo'}</button>
              </div>
            </div>
          </footer>
        </form>
      </aside>
    </>
  );
}
