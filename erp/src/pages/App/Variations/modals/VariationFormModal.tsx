import { useMemo, useState, type FormEvent } from 'react';
import type {
  default as VariationType,
  CharacteristicFillConfiguration,
  CharacteristicGroup,
} from '../../../types/variation.type';
import type { ProductCategoryOption } from '../../../utils/characteristicGroupService';
import { CharacteristicOptionsSection } from '../components/CharacteristicOptionsSection';
import type { CharacteristicFormData } from '../domain/characteristicFormRules';
import {
  getCharacteristicFillTypeLabel,
  isChoiceCharacteristicType,
  normalizeManagedCharacteristicType,
} from '../domain/characteristicFormRules';
import { useCharacteristicForm } from '../hooks/useCharacteristicForm';

export interface VariationFormModalProps {
  readonly onClose: () => void;
  readonly onSuccess?: () => void | Promise<void>;
  readonly variation?: VariationType | null;
  readonly allVariations?: readonly VariationType[];
  readonly groups: readonly CharacteristicGroup[];
  readonly categories?: readonly ProductCategoryOption[];
  readonly defaultGroupId?: string;
}

const underlineInput =
  'w-full bg-transparent border-0 border-b border-slate-300 px-1 py-2 text-sm font-medium text-slate-800 outline-none focus:border-blue-600 focus:ring-0 disabled:opacity-50 dark:border-slate-700 dark:text-slate-100';
const sectionTitle = 'text-sm font-semibold text-slate-800 dark:text-slate-100';

const numberValue = (value: string): number | undefined => value.trim() === '' ? undefined : Number(value);
const normalizeCategorySearch = (value: string) => value
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLocaleLowerCase('pt-BR')
  .trim();

export const VariationFormModal = ({
  onClose,
  onSuccess,
  variation,
  allVariations = [],
  groups,
  categories = [],
  defaultGroupId,
}: VariationFormModalProps) => {
  const [categorySearchTerm, setCategorySearchTerm] = useState('');
  const {
    formData,
    changeFormData,
    handleTypeChange,
    save,
    saveStatus,
    saveError,
    isSaving,
  } = useCharacteristicForm({
    isOpen: true,
    onClose,
    onSuccess,
    variation,
    allVariations,
    groups,
    categories,
    defaultGroupId,
  });

  const updateConfiguration = (
    key: keyof CharacteristicFillConfiguration,
    value: number | undefined
  ) => changeFormData((current) => ({
    ...current,
    configuration: { ...current.configuration, [key]: value },
  }));

  const normalizedCategorySearch = normalizeCategorySearch(categorySearchTerm);
  const filteredCategoryApplications = useMemo(() =>
    formData.categoryApplications.filter((item) => {
      if (!normalizedCategorySearch) return true;
      const categoryName = categories.find((category) => category.id === item.categoryId)?.name ?? '';
      return normalizeCategorySearch(categoryName).includes(normalizedCategorySearch);
    }),
  [categories, formData.categoryApplications, normalizedCategorySearch]);
  const canSave = !isSaving && categories.length > 0 &&
    Boolean(formData.name.trim() && formData.groupId);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void save();
  };

  return (
    <>
      <button
        type="button"
        aria-label="Fechar formulário de característica"
        onClick={onClose}
        className="fixed inset-0 z-40 bg-slate-950/30 lg:hidden"
      />
      <aside
        role="dialog"
        aria-modal="false"
        aria-labelledby="characteristic-form-title"
        className="fixed inset-0 z-50 flex min-h-0 flex-col border-l border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950 lg:relative lg:inset-auto lg:z-auto lg:w-[min(560px,48vw)] lg:shrink-0 lg:shadow-none"
      >
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 dark:border-slate-800 sm:px-7">
          <div>
            <h2 id="characteristic-form-title" className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              {variation?.id ? 'Editar característica' : 'Nova característica'}
            </h2>
            <p className="mt-1 text-xs text-slate-500">Defina o grupo, o tipo e a aplicação por categoria.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Cancelar e fechar" className="p-1 text-sm text-slate-500 hover:text-slate-900 dark:hover:text-white">
            Fechar
          </button>
        </header>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-7 overflow-y-auto px-5 py-5 sm:px-7">
            <section className="space-y-4" aria-labelledby="characteristic-general-title">
              <h3 id="characteristic-general-title" className={sectionTitle}>Dados gerais</h3>
              <label className="block text-xs text-slate-500">
                Nome da característica *
                <input
                  maxLength={80}
                  value={formData.name}
                  onChange={(event) => changeFormData((current) => ({ ...current, name: event.target.value }))}
                  disabled={isSaving}
                  placeholder="Ex.: Material das portas"
                  className={underlineInput}
                />
              </label>
              <label className="block text-xs text-slate-500">
                Grupo *
                <select
                  value={formData.groupId}
                  onChange={(event) => changeFormData((current) => ({ ...current, groupId: event.target.value }))}
                  disabled={isSaving}
                  className={underlineInput}
                >
                  <option value="">Selecione um grupo</option>
                  {groups.map((group) => (
                    <option key={group.id} value={group.id}>{group.name}</option>
                  ))}
                </select>
              </label>
              <label className="block text-xs text-slate-500">
                Tipo de preenchimento *
                <select
                  value={formData.dataType}
                  onChange={(event) => handleTypeChange(event.target.value as CharacteristicFormData['dataType'])}
                  disabled={isSaving}
                  className={underlineInput}
                >
                  <option value="text_short">{getCharacteristicFillTypeLabel('text_short')}</option>
                  <option value="text_long">{getCharacteristicFillTypeLabel('text_long')}</option>
                  <option value="radio">Opção única</option>
                  <option value="multi_select">Opção múltipla</option>
                  <option value="boolean">Booleano</option>
                  <option value="integer">Número inteiro</option>
                  <option value="decimal">Número decimal</option>
                </select>
              </label>
            </section>

            {formData.dataType !== 'text_short' && formData.dataType !== 'text_long' && (
            <section className="space-y-4" aria-labelledby="characteristic-type-config-title">
              <h3 id="characteristic-type-config-title" className={sectionTitle}>Configurações do tipo</h3>
              {formData.dataType === 'boolean' && (
                <p className="text-xs text-slate-500">Preenchido com um interruptor Sim/Não.</p>
              )}
              {(formData.dataType === 'integer' || formData.dataType === 'decimal') && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <label className="text-xs text-slate-500">Mínimo<input type="number" step={formData.dataType === 'integer' ? 1 : 'any'} value={formData.configuration.minValue ?? ''} onChange={(event) => updateConfiguration('minValue', numberValue(event.target.value))} disabled={isSaving} className={underlineInput} /></label>
                    <label className="text-xs text-slate-500">Máximo<input type="number" step={formData.dataType === 'integer' ? 1 : 'any'} value={formData.configuration.maxValue ?? ''} onChange={(event) => updateConfiguration('maxValue', numberValue(event.target.value))} disabled={isSaving} className={underlineInput} /></label>
                  </div>
                  <label className="block text-xs text-slate-500">Unidade (opcional)<input value={formData.unit} onChange={(event) => changeFormData((current) => ({ ...current, unit: event.target.value }))} disabled={isSaving} placeholder="Ex.: cm, kg" className={underlineInput} /></label>
                  {formData.dataType === 'decimal' && (
                    <label className="block text-xs text-slate-500">Casas decimais
                      <select value={formData.decimalPlaces} onChange={(event) => changeFormData((current) => ({ ...current, decimalPlaces: Number(event.target.value) as 1 | 2 | 3 }))} disabled={isSaving} className={underlineInput}>
                        <option value={1}>1 casa</option><option value={2}>2 casas</option><option value={3}>3 casas</option>
                      </select>
                    </label>
                  )}
                </>
              )}
              {formData.dataType === 'multi_select' && (
                <div className="grid grid-cols-2 gap-4">
                  <label className="text-xs text-slate-500">Mínimo de seleções<input type="number" min="0" value={formData.configuration.minSelections ?? ''} onChange={(event) => updateConfiguration('minSelections', numberValue(event.target.value))} disabled={isSaving} className={underlineInput} /></label>
                  <label className="text-xs text-slate-500">Máximo de seleções<input type="number" min="0" value={formData.configuration.maxSelections ?? ''} onChange={(event) => updateConfiguration('maxSelections', numberValue(event.target.value))} disabled={isSaving} className={underlineInput} /></label>
                </div>
              )}
              {isChoiceCharacteristicType(formData.dataType) && (
                <CharacteristicOptionsSection
                  options={formData.options}
                  onOptionsChange={(options) => changeFormData((current) => ({ ...current, options }))}
                  disabled={isSaving}
                  characteristicName={formData.name}
                />
              )}
              <p className="text-[11px] text-slate-400">Preenchimento: {getCharacteristicFillTypeLabel(formData.dataType)}.</p>
            </section>
            )}

            <section className="space-y-3" aria-labelledby="characteristic-category-applications-title">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <h3 id="characteristic-category-applications-title" className={sectionTitle}>Aplicação por categoria</h3>
                </div>
              </div>
              {categories.length === 0 ? (
                <p className="text-xs text-amber-700 dark:text-amber-300">Nenhuma categoria de produto foi carregada.</p>
              ) : (
                <>
                  <input
                    type="search"
                    value={categorySearchTerm}
                    onChange={(event) => setCategorySearchTerm(event.target.value)}
                    placeholder="Pesquisar categoria..."
                    aria-label="Pesquisar categorias para configurar a característica"
                    disabled={isSaving}
                    className={underlineInput}
                  />
                  <div className="max-h-56 divide-y divide-slate-100 overflow-y-auto border-y border-slate-100 dark:divide-slate-800 dark:border-slate-800">
                  {filteredCategoryApplications.length === 0 ? (
                    <p className="py-3 text-xs text-slate-500">Nenhuma categoria encontrada.</p>
                  ) : filteredCategoryApplications.map((item) => {
                    const category = categories.find((candidate) => candidate.id === item.categoryId);
                    return (
                      <label
                        key={item.categoryId}
                        className="flex items-center justify-between gap-3 py-2"
                      >
                        <span className="flex min-w-0 items-center gap-2">
                          <span className="truncate text-xs font-medium text-slate-700 dark:text-slate-200">{category?.name ?? 'Categoria removida'}</span>
                        </span>
                        <span className="relative w-36 shrink-0">
                        <select
                          value={item.application}
                          onChange={(event) => changeFormData((current) => ({
                            ...current,
                            categoryApplications: current.categoryApplications.map((application) =>
                              application.categoryId === item.categoryId
                                ? { ...application, application: event.target.value as typeof item.application }
                                : application
                            ),
                          }))}
                          disabled={isSaving}
                          aria-label={`Aplicação de ${formData.name || 'característica'} em ${category?.name ?? 'categoria'}`}
                          title={item.application === 'unavailable' ? 'Não se aplica' : undefined}
                          className={`w-full bg-transparent border-0 border-b border-slate-300 px-1 py-1.5 text-xs outline-none focus:border-blue-600 focus:ring-0 dark:border-slate-700 dark:text-slate-100 ${item.application === 'required' ? 'font-semibold text-emerald-700 dark:text-emerald-300' : ''}`}
                        >
                          <option value="unavailable">Não se aplica</option>
                          <option value="optional">Opcional</option>
                          <option value="required">Obrigatória</option>
                        </select>
                        {item.application === 'unavailable' && (
                          <span aria-hidden="true" className="pointer-events-none absolute bottom-px left-0 right-6 top-0 flex items-center bg-white px-1 text-xs text-slate-700 dark:bg-slate-950 dark:text-slate-100">N/A</span>
                        )}
                        </span>
                      </label>
                    );
                  })}
                  </div>
                </>
              )}
            </section>
          </div>

          <footer className="shrink-0 border-t border-slate-200 px-5 py-4 dark:border-slate-800 sm:px-7">
            <p role="status" aria-live="polite" className={`mb-3 min-h-4 text-xs ${saveStatus === 'error' ? 'text-red-600' : 'text-slate-500'}`}>
              {saveStatus === 'saving' ? 'Salvando característica…' : saveStatus === 'error' ? saveError : 'As alterações serão salvas ao confirmar.'}
            </p>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={onClose} disabled={isSaving} className="px-3 py-2 text-sm font-medium text-slate-600 disabled:opacity-40 dark:text-slate-300">Cancelar</button>
              <button type="submit" disabled={!canSave} className="px-4 py-2 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-50">Salvar característica</button>
            </div>
          </footer>
        </form>
      </aside>
    </>
  );
};

export default VariationFormModal;
