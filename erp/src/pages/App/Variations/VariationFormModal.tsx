import React, { useEffect, useState } from 'react';
import VariationType, { AttributeDataType, VariationOption } from '../../types/variation.type';
import { getVariationErrorMessage, saveVariation } from '../../utils/variationService';
import { toast } from 'react-toastify';

interface VariationFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  variation?: VariationType | null;
  allVariations?: VariationType[];
}

type FormData = Pick<VariationType, 'name' | 'options' | 'active'> & {
  dataType: NonNullable<VariationType['dataType']>;
  unit: string;
  decimalPlaces: 1 | 2 | 3;
};

const normalizeDataType = (value?: AttributeDataType): NonNullable<VariationType['dataType']> => {
  if (value === 'text') return 'text_short';
  if (value === 'number') return 'integer';
  if (value === 'list') return 'radio';
  return value || 'text_short';
};

const isChoiceType = (value: AttributeDataType) => value === 'radio' || value === 'multi_select';
const normalizeText = (value: string) => value.trim().toLocaleLowerCase('pt-BR');

const VariationFormModal = ({
  isOpen,
  onClose,
  onSuccess,
  variation,
  allVariations = [],
}: VariationFormModalProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    options: [],
    active: true,
    dataType: 'text_short',
    unit: '',
    decimalPlaces: 2,
  });
  const [newOptionValue, setNewOptionValue] = useState('');

  useEffect(() => {
    if (!isOpen) return;

    setFormData(
      variation
        ? {
            name: variation.name,
            options: (variation.options ?? []).map((option, index) => ({
              ...option,
              sortOrder: option.sortOrder ?? index,
            })),
            active: variation.active ?? true,
            dataType: normalizeDataType(variation.dataType),
            unit:
              normalizeDataType(variation.dataType) === 'measure'
                ? ['cm', 'mm', 'm'].includes(variation.unit || '')
                  ? variation.unit || 'cm'
                  : 'cm'
                : variation.unit || '',
            decimalPlaces: variation.decimalPlaces ?? 2,
          }
        : {
            name: '',
            options: [],
            active: true,
            dataType: 'text_short',
            unit: '',
            decimalPlaces: 2,
          }
    );
    setNewOptionValue('');
  }, [variation, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !loading) onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, loading, onClose]);

  const addOption = () => {
    const value = newOptionValue.trim();
    if (!value) return;
    if (formData.options.some((option) => normalizeText(option.value) === normalizeText(value))) {
      toast.error('Esta opção já foi adicionada.');
      return;
    }

    const option: VariationOption = { id: '', value, sortOrder: formData.options.length };
    setFormData((current) => ({ ...current, options: [...current.options, option] }));
    setNewOptionValue('');
  };

  const updateOption = (index: number, value: string) => {
    setFormData((current) => ({
      ...current,
      options: current.options.map((option, optionIndex) =>
        optionIndex === index ? { ...option, value } : option
      ),
    }));
  };

  const removeOption = (index: number) => {
    setFormData((current) => ({
      ...current,
      options: current.options.filter((_, optionIndex) => optionIndex !== index),
    }));
  };

  const moveOption = (index: number, offset: -1 | 1) => {
    const targetIndex = index + offset;
    if (targetIndex < 0 || targetIndex >= formData.options.length) return;
    setFormData((current) => {
      const options = [...current.options];
      [options[index], options[targetIndex]] = [options[targetIndex], options[index]];
      return { ...current, options: options.map((option, order) => ({ ...option, sortOrder: order })) };
    });
  };

  const handleTypeChange = (dataType: NonNullable<VariationType['dataType']>) => {
    setFormData((current) => ({
      ...current,
      dataType,
      unit:
        dataType === 'weight'
          ? 'kg'
          : dataType === 'percentage'
            ? '%'
            : dataType === 'measure'
              ? ['cm', 'mm', 'm'].includes(current.unit)
                ? current.unit
                : 'cm'
              : '',
    }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const name = formData.name.trim();
    if (!name) {
      toast.error('O nome da característica é obrigatório.');
      return;
    }

    if (
      allVariations.some(
        (candidate) =>
          candidate.id !== variation?.id && normalizeText(candidate.name) === normalizeText(name)
      )
    ) {
      toast.error('Já existe uma característica com esse nome.');
      return;
    }

    if (isChoiceType(formData.dataType)) {
      const normalizedOptions = formData.options.map((option) => normalizeText(option.value));
      if (formData.options.some((option) => !option.value.trim())) {
        toast.error('Preencha ou remova as opções sem valor.');
        return;
      }
      if (new Set(normalizedOptions).size !== normalizedOptions.length) {
        toast.error('As opções não podem ter nomes duplicados.');
        return;
      }
      if (formData.options.length === 0) {
        toast.error('Adicione pelo menos uma opção para este tipo de preenchimento.');
        return;
      }
    }

    if (formData.dataType === 'measure' && !['cm', 'mm', 'm'].includes(formData.unit)) {
      toast.error('Selecione uma unidade de medida válida.');
      return;
    }

    setLoading(true);
    try {
      await saveVariation({
        id: variation?.id,
        name,
        options: isChoiceType(formData.dataType)
          ? formData.options.map((option, index) => ({ ...option, sortOrder: index }))
          : [],
        active: formData.active,
        dataType: formData.dataType,
        decimalPlaces: formData.dataType === 'decimal' ? formData.decimalPlaces : undefined,
        isCustom: variation?.isCustom ?? true,
        unit:
          formData.dataType === 'weight'
            ? 'kg'
            : formData.dataType === 'percentage'
              ? '%'
              : formData.dataType === 'measure'
                ? formData.unit
                : '',
      });
      toast.success(variation ? 'Característica atualizada!' : 'Característica criada com sucesso!');
      onSuccess?.();
      onClose();
    } catch (error: unknown) {
      const message = getVariationErrorMessage(error, 'Não foi possível salvar a característica.');
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const hasOptions = isChoiceType(formData.dataType);
  const isMeasure = formData.dataType === 'measure';
  const configuredPreviewOptions = formData.options
    .map((option) => option.value.trim())
    .filter(Boolean);
  const previewOptions = configuredPreviewOptions.length
    ? configuredPreviewOptions
    : formData.dataType === 'radio'
      ? ['Macio', 'Médio', 'Firme']
      : ['Madeira', 'Metal', 'Vidro'];

  const renderPreviewField = () => {
    switch (formData.dataType) {
      case 'radio':
        return (
          <div className="flex flex-wrap gap-2" aria-label="Exemplo de escolha única">
            {previewOptions.map((option, index) => (
              <span
                key={`${option}-${index}`}
                className={`rounded-xl border px-3 py-2 text-xs font-bold ${
                  index === 0
                    ? 'border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
                    : 'border-slate-200 bg-white text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
                }`}
              >
                {option}
              </span>
            ))}
          </div>
        );
      case 'multi_select':
        return (
          <div className="flex flex-col gap-2" aria-label="Exemplo de múltiplas escolhas">
            {previewOptions.map((option, index) => (
              <label
                key={`${option}-${index}`}
                className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
              >
                <input type="checkbox" checked={index === 0} disabled readOnly className="accent-blue-600" />
                {option}
              </label>
            ))}
          </div>
        );
      case 'integer':
        return <PreviewInput value="6" hint="Somente números inteiros" />;
      case 'decimal':
        return <PreviewInput value={(28.5).toFixed(formData.decimalPlaces).replace('.', ',')} />;
      case 'weight':
        return <PreviewInput value="120" suffix="kg" hint="Somente números inteiros" />;
      case 'percentage':
        return <PreviewInput value="80" suffix="%" />;
      case 'measure':
        return <PreviewInput value="180,00" suffix={formData.unit || 'cm'} />;
      case 'text_long':
        return (
          <textarea
            value="Descrição detalhada do revestimento"
            rows={3}
            disabled
            readOnly
            className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
          />
        );
      case 'boolean':
        return (
          <select
            value="true"
            disabled
            aria-label="Exemplo de sim ou não"
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
          >
            <option value="true">Sim</option>
            <option value="false">Não</option>
          </select>
        );
      case 'text_short':
      default:
        return <PreviewInput value="Casal Queen" />;
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Fechar modal"
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        onClick={loading ? undefined : onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="characteristic-form-title"
        className="relative bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800 flex flex-col max-h-[90vh]"
      >
        <div className="px-6 py-4 sm:px-8 sm:py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
          <h2 id="characteristic-form-title" className="text-xl sm:text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">
            {variation ? 'Editar característica' : 'Nova característica'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            aria-label="Fechar modal"
            className="p-2 text-slate-400 hover:text-red-500 transition-colors disabled:opacity-50"
          >
            <i className="bi bi-x-lg text-lg" aria-hidden="true" />
          </button>
        </div>

        <form id="characteristic-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto min-h-0 custom-scrollbar p-6 sm:p-8">
          <div className="flex flex-col gap-5">
            <label className="flex flex-col gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500">
              Nome da característica
              <input
                autoFocus
                maxLength={80}
                value={formData.name}
                onChange={(event) => setFormData((current) => ({ ...current, name: event.target.value }))}
                placeholder="Ex.: Firmeza, Material, Quantidade de portas"
                className="px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-bold normal-case tracking-normal text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500/20"
                required
              />
            </label>

            <label className="flex flex-col gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500">
              Tipo de preenchimento
              <select
                value={formData.dataType}
                onChange={(event) => handleTypeChange(event.target.value as FormData['dataType'])}
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

            {formData.dataType === 'decimal' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-2xl bg-blue-50/70 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 p-4">
                <label className="flex flex-col gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500">
                  Casas decimais
                  <select
                    value={formData.decimalPlaces}
                    onChange={(event) =>
                      setFormData((current) => ({
                        ...current,
                        decimalPlaces: Number(event.target.value) as FormData['decimalPlaces'],
                      }))
                    }
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
                  onChange={(event) => setFormData((current) => ({ ...current, unit: event.target.value }))}
                  className="px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-bold normal-case tracking-normal text-slate-800 dark:text-slate-100"
                >
                  <option value="cm">Centímetros (cm)</option>
                  <option value="mm">Milímetros (mm)</option>
                  <option value="m">Metros (m)</option>
                </select>
              </label>
            )}

            {hasOptions && (
              <section className="flex flex-col gap-3" aria-labelledby="characteristic-options-label">
                <label id="characteristic-options-label" className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                  Opções disponíveis
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newOptionValue}
                    onChange={(event) => setNewOptionValue(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        addOption();
                      }
                    }}
                    className="flex-1 px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-bold dark:text-slate-100"
                    placeholder="Ex.: Macio, Médio, Firme"
                  />
                  <button
                    type="button"
                    onClick={addOption}
                    className="px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-xs uppercase tracking-widest"
                  >
                    Adicionar
                  </button>
                </div>
                <div className="flex flex-col gap-2 max-h-64 overflow-y-auto custom-scrollbar">
                  {formData.options.length === 0 && (
                    <p className="text-xs text-slate-400 text-center py-4 italic">Nenhuma opção cadastrada.</p>
                  )}
                  {formData.options.map((option, index) => (
                    <div key={option.id || `${index}-${option.value}`} className="flex items-center gap-2">
                      <span className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-black text-slate-400 shrink-0">
                        {index + 1}
                      </span>
                      <input
                        type="text"
                        value={option.value}
                        onChange={(event) => updateOption(index, event.target.value)}
                        aria-label={`Opção ${index + 1}`}
                        className="flex-1 min-w-0 px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-xs font-bold dark:text-slate-200 focus:border-blue-500"
                      />
                      <button type="button" onClick={() => moveOption(index, -1)} disabled={index === 0} aria-label={`Mover ${option.value} para cima`} className="w-8 h-8 rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-slate-800">
                        <i className="bi bi-arrow-up" aria-hidden="true" />
                      </button>
                      <button type="button" onClick={() => moveOption(index, 1)} disabled={index === formData.options.length - 1} aria-label={`Mover ${option.value} para baixo`} className="w-8 h-8 rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-slate-800">
                        <i className="bi bi-arrow-down" aria-hidden="true" />
                      </button>
                      <button type="button" onClick={() => removeOption(index)} aria-label={`Remover opção ${option.value}`} className="w-9 h-9 rounded-xl bg-red-50 text-red-500 hover:bg-red-500 hover:text-white dark:bg-red-500/10 dark:hover:bg-red-500 transition-colors flex items-center justify-center shrink-0">
                        <i className="bi bi-trash text-xs" aria-hidden="true" />
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {variation && (
              <label className="flex items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-800 px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-200">
                <input
                  type="checkbox"
                  checked={formData.active}
                  onChange={(event) => setFormData((current) => ({ ...current, active: event.target.checked }))}
                  className="h-4 w-4 accent-blue-600"
                />
                Característica ativa para associação em categorias
              </label>
            )}

            <section
              aria-labelledby="characteristic-preview-title"
              className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4 dark:border-blue-900/40 dark:bg-blue-950/20 sm:p-5"
            >
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
                  <i className="bi bi-eye" aria-hidden="true" />
                </span>
                <div>
                  <h3 id="characteristic-preview-title" className="text-sm font-black text-slate-800 dark:text-slate-100">
                    Prévia no cadastro do produto
                  </h3>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    Exemplo de como esta característica será preenchida.
                  </p>
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
                <label className="mb-2 block text-xs font-bold text-slate-700 dark:text-slate-200">
                  {formData.name.trim() || 'Nome da característica'}
                </label>
                {renderPreviewField()}
                {hasOptions && configuredPreviewOptions.length === 0 && (
                  <p className="mt-2 text-[11px] text-slate-400">
                    Exibindo opções de exemplo. As opções cadastradas aparecerão aqui.
                  </p>
                )}
              </div>
            </section>
          </div>
        </form>

        <div className="p-5 sm:p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 flex justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-5 py-3 rounded-xl font-bold text-xs uppercase tracking-widest text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="characteristic-form"
            disabled={loading}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-200 dark:shadow-none transition-all flex items-center gap-2 disabled:opacity-60"
          >
            {loading ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <i className="bi bi-check-lg" aria-hidden="true" />}
            {variation ? 'Salvar alterações' : 'Criar característica'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default VariationFormModal;

function PreviewInput({ value, suffix, hint }: { value: string; suffix?: string; hint?: string }) {
  return (
    <>
      <div className="relative">
        <input
          type="text"
          value={value}
          disabled
          readOnly
          aria-label="Exemplo de preenchimento"
          className={`w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 ${suffix ? 'pr-14' : ''}`}
        />
        {suffix && (
          <span className="absolute inset-y-0 right-3 flex items-center text-xs font-bold text-slate-400">
            {suffix}
          </span>
        )}
      </div>
      {hint && <p className="mt-1.5 text-[11px] text-slate-400">{hint}</p>}
    </>
  );
}
