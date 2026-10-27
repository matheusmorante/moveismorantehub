import { createPortal } from 'react-dom';
import type VariationType from '../../../types/variation.type';
import { CharacteristicOptionsSection } from '../components/CharacteristicOptionsSection';
import type { CharacteristicFormData } from '../domain/characteristicFormRules';
import { useCharacteristicForm } from '../hooks/useCharacteristicForm';

export interface VariationFormModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly onSuccess?: () => void | Promise<void>;
  readonly variation?: VariationType | null;
  readonly allVariations?: readonly VariationType[];
}

export const VariationFormModal = ({
  isOpen,
  onClose,
  onSuccess,
  variation,
  allVariations = [],
}: VariationFormModalProps) => {
  const {
    formData,
    newOptionValue,
    setNewOptionValue,
    optionSearch,
    setOptionSearch,
    setOptionPage,
    optionPageSize,
    setOptionPageSize,
    editingOptionId,
    editingOptionValue,
    saveStatus,
    saveError,
    savedCharacteristicId,
    optionIdsOutOfSync,
    isClosing,
    hasOptions,
    isMeasure,
    filteredOptions,
    visibleOptions,
    visiblePage,
    totalOptionPages,
    firstVisibleOption,
    lastVisibleOption,
    changeFormData,
    flushFormSave,
    closeModal,
    addOption,
    removeOption,
    commitOptionEdit,
    startOptionEdit,
    cancelOptionEdit,
    handleOptionEditChange,
    handleTypeChange,
  } = useCharacteristicForm({
    isOpen,
    onClose,
    onSuccess,
    variation,
    allVariations,
  });

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[1000040] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="characteristic-form-title"
        className="relative bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800 flex flex-col max-h-[90vh]"
      >
        <div className="px-6 py-4 sm:px-8 sm:py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div>
            <h2
              id="characteristic-form-title"
              className="text-xl sm:text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight"
            >
              {savedCharacteristicId ? 'Editar característica' : 'Nova característica'}
            </h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Gerencie as informações e opções.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void closeModal()}
            disabled={isClosing}
            aria-label="Fechar modal"
            className="p-2 text-slate-400 hover:text-red-500 transition-colors disabled:opacity-50"
          >
            <i className="bi bi-x-lg text-lg" aria-hidden="true" />
          </button>
        </div>

        <form
          id="characteristic-form"
          noValidate
          onSubmit={(event) => { event.preventDefault(); flushFormSave(); }}
          className="flex-1 overflow-y-auto min-h-0 custom-scrollbar p-6 sm:p-8"
        >
          <div className="flex flex-col gap-5">
            <label className="flex flex-col gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500">
              Nome da característica
              <input
                maxLength={80}
                value={formData.name}
                onChange={(event) =>
                  changeFormData((current) => ({ ...current, name: event.target.value }))
                }
                onBlur={flushFormSave}
                disabled={isClosing || optionIdsOutOfSync}
                placeholder="Ex.: Firmeza, Material, Quantidade de portas"
                className="px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-bold normal-case tracking-normal text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500/20"
                required
              />
            </label>

            <label className="flex flex-col gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500">
              Tipo da característica
              <select
                value={formData.dataType}
                onChange={(event) =>
                  handleTypeChange(event.target.value as CharacteristicFormData['dataType'])
                }
                onBlur={flushFormSave}
                disabled={isClosing || optionIdsOutOfSync}
                className="px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-bold normal-case tracking-normal text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="radio">Escolha única</option>
                <option value="multi_select">Múltiplas escolhas</option>
                <option value="integer">Número inteiro</option>
                <option value="decimal">Número decimal</option>
                <option value="weight">Peso (kg)</option>
                <option value="percentage">Porcentagem</option>
                <option value="measure">Medida</option>
                <option value="text_short">Texto curto</option>
                <option value="text_long">Texto longo</option>
                <option value="boolean">Sim ou não</option>
              </select>
            </label>

            {formData.dataType === 'radio' && (
              <p className="-mt-3 text-xs text-slate-500 dark:text-slate-400">
                O usuário poderá selecionar apenas uma opção.
              </p>
            )}
            {formData.dataType === 'multi_select' && (
              <p className="-mt-3 text-xs text-slate-500 dark:text-slate-400">
                O usuário poderá selecionar várias opções.
              </p>
            )}

            {formData.dataType === 'decimal' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-2xl bg-blue-50/70 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 p-4">
                <label className="flex flex-col gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500">
                  Casas decimais
                  <select
                    value={formData.decimalPlaces}
                    onChange={(event) =>
                      changeFormData((current) => ({
                        ...current,
                        decimalPlaces: Number(
                          event.target.value
                        ) as CharacteristicFormData['decimalPlaces'],
                      }))
                    }
                    onBlur={flushFormSave}
                    disabled={isClosing || optionIdsOutOfSync}
                    className="px-3 py-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-bold normal-case tracking-normal text-slate-800 dark:text-slate-100"
                  >
                    <option value={1}>1 casa</option>
                    <option value={2}>2 casas</option>
                    <option value={3}>3 casas</option>
                  </select>
                </label>
                <div className="flex flex-col gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500">
                  Prévia do valor
                  <output className="px-3 py-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-bold normal-case tracking-normal text-slate-800 dark:text-slate-100">
                    {(28.5).toFixed(formData.decimalPlaces).replace('.', ',')}
                  </output>
                </div>
              </div>
            )}

            {isMeasure && (
              <label className="flex flex-col gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500">
                Unidade de medida
                <select
                  value={formData.unit}
                  onChange={(event) =>
                    changeFormData((current) => ({ ...current, unit: event.target.value }))
                  }
                  onBlur={flushFormSave}
                  disabled={isClosing || optionIdsOutOfSync}
                  className="px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-bold normal-case tracking-normal text-slate-800 dark:text-slate-100"
                >
                  <option value="cm">Centímetros (cm)</option>
                  <option value="mm">Milímetros (mm)</option>
                  <option value="m">Metros (m)</option>
                </select>
              </label>
            )}

            {hasOptions && (
              <CharacteristicOptionsSection
                characteristicName={formData.name}
                optionsCount={formData.options.length}
                newOptionValue={newOptionValue}
                onNewOptionValueChange={setNewOptionValue}
                onAddOption={addOption}
                optionSearch={optionSearch}
                onOptionSearchChange={(value) => {
                  setOptionSearch(value);
                  setOptionPage(0);
                }}
                filteredOptionsCount={filteredOptions.length}
                visibleOptions={visibleOptions}
                editingOptionId={editingOptionId}
                editingOptionValue={editingOptionValue}
                onOptionEditChange={handleOptionEditChange}
                onCommitOptionEdit={commitOptionEdit}
                onCancelOptionEdit={cancelOptionEdit}
                onStartOptionEdit={startOptionEdit}
                onRemoveOption={removeOption}
                visiblePage={visiblePage}
                optionPageSize={optionPageSize}
                onPageSizeChange={(size) => {
                  setOptionPage(0);
                  setOptionPageSize(size);
                }}
                totalOptionPages={totalOptionPages}
                firstVisibleOption={firstVisibleOption}
                lastVisibleOption={lastVisibleOption}
                onPageChange={setOptionPage}
                isClosing={isClosing}
                saveStatus={saveStatus}
                optionIdsOutOfSync={optionIdsOutOfSync}
              />
            )}
          </div>
        </form>

        <div className="p-5 sm:p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 shrink-0">
          <p
            role="status"
            aria-live="polite"
            className={`text-xs font-semibold ${
              saveStatus === 'error'
                ? 'text-red-600 dark:text-red-400'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            {saveStatus === 'saving'
              ? 'Salvando alterações...'
              : saveStatus === 'pending'
                ? 'Alterações pendentes...'
                : saveStatus === 'error'
                  ? saveError
                  : 'Todas as alterações salvas automaticamente.'}
          </p>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default VariationFormModal;
