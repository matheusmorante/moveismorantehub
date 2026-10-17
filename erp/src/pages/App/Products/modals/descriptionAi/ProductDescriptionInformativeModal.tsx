import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type Product from '../../../../types/product.type';
import {
  productAiDescriptiveTextFormSchema,
  ProductAiDescriptiveTextFormValues,
} from '../../../../../../../shared-utils/productAiFormSchemas';
import { validateProductDescriptionPrerequisites } from '../../components/tabs/productDescriptionPrerequisites';

export interface ProductDescriptionInformativeModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly onSubmit: (informativeText: string) => Promise<void> | void;
  readonly onGenerateFromCharacteristics?: () => Promise<void> | void;
  readonly formData?: Partial<Product>;
  readonly isGenerating?: boolean;
}

export const ProductDescriptionInformativeModal: React.FC<ProductDescriptionInformativeModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  onGenerateFromCharacteristics,
  formData = {},
  isGenerating = false,
}) => {
  const [activeMode, setActiveMode] = useState<'characteristics' | 'informative_text'>('informative_text');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProductAiDescriptiveTextFormValues>({
    resolver: zodResolver(productAiDescriptiveTextFormSchema),
    defaultValues: {
      descriptiveText: '',
      additionalInfo: '',
    },
  });

  React.useEffect(() => {
    if (isOpen) {
      reset({ descriptiveText: '', additionalInfo: '' });
      const missing = validateProductDescriptionPrerequisites(formData);
      if (missing.length === 0 && onGenerateFromCharacteristics) {
        setActiveMode('characteristics');
      } else {
        setActiveMode('informative_text');
      }
    }
  }, [isOpen, reset, formData, onGenerateFromCharacteristics]);

  if (!isOpen) return null;

  const handleFormSubmit = async (values: ProductAiDescriptiveTextFormValues) => {
    await onSubmit(values.descriptiveText);
  };

  const missingPrerequisites = validateProductDescriptionPrerequisites(formData);
  const isCharacteristicsReady = missingPrerequisites.length === 0;

  const techValues = formData.technicalValues || {};
  const displayBrand = formData.brand || techValues['Marca'] || techValues['marca'] || '';
  const displayModel =
    formData.model ||
    formData.line ||
    techValues['Modelo/Linha'] ||
    techValues['Modelo / Linha'] ||
    techValues['Modelo'] ||
    techValues['modelo'] ||
    techValues['Linha'] ||
    '';
  const displayColor = formData.color || techValues['Cor'] || techValues['cor'] || '';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="informative-text-modal-title"
      className="fixed inset-0 z-[1000020] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 flex items-center justify-center text-lg shadow-sm">
              <i className="bi bi-stars" />
            </div>
            <div>
              <h3
                id="informative-text-modal-title"
                className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5"
              >
                <span>Gerar Descrição com IA</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Gere uma descrição profissional por características ou texto descritivo
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isGenerating}
            aria-label="Fechar"
            className="w-8 h-8 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center justify-center cursor-pointer"
          >
            <i className="bi bi-x-lg text-xs" />
          </button>
        </div>

        {/* Seletor de Modo (Abas) */}
        {onGenerateFromCharacteristics && (
          <div className="px-5 pt-3 pb-0 bg-slate-50/40 dark:bg-slate-950/20 border-b border-slate-100 dark:border-slate-800 flex gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setActiveMode('characteristics')}
              className={`pb-2.5 px-3 text-xs font-bold border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
                activeMode === 'characteristics'
                  ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                  : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
              }`}
            >
              <i className="bi bi-card-checklist" />
              <span>1. Características do Cadastro</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveMode('informative_text')}
              className={`pb-2.5 px-3 text-xs font-bold border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
                activeMode === 'informative_text'
                  ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                  : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
              }`}
            >
              <i className="bi bi-file-earmark-text" />
              <span>2. Texto Descritivo / Anotações</span>
            </button>
          </div>
        )}

        {/* Modo 1: A partir das características */}
        {activeMode === 'characteristics' && onGenerateFromCharacteristics ? (
          <div className="flex flex-col">
            <div className="p-5 space-y-4">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800 space-y-2.5">
                <div className="text-xs font-bold text-slate-700 dark:text-slate-200">
                  Dados identificados para a descrição:
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-400 font-medium">Nome:</span>{' '}
                    <strong className="text-slate-700 dark:text-slate-300 font-semibold">{formData.name || '—'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium">Marca:</span>{' '}
                    <strong className="text-slate-700 dark:text-slate-300 font-semibold">{displayBrand || '—'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium">Modelo:</span>{' '}
                    <strong className="text-slate-700 dark:text-slate-300 font-semibold">{displayModel || '—'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium">Cor:</span>{' '}
                    <strong className="text-slate-700 dark:text-slate-300 font-semibold">{displayColor || '—'}</strong>
                  </div>
                </div>
              </div>

              {!isCharacteristicsReady ? (
                <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-800 dark:text-amber-300">
                  <div className="flex items-center gap-2 font-bold mb-1">
                    <i className="bi bi-exclamation-triangle" />
                    <span>Campos recomendados pendentes</span>
                  </div>
                  <p>
                    Preencha no cadastro: <strong>{missingPrerequisites.join(', ')}</strong>. Ou utilize a aba ao lado para gerar colando o <strong>Texto Descritivo</strong>.
                  </p>
                </div>
              ) : (
                <p className="text-[11px] text-slate-400 dark:text-slate-500 leading-relaxed">
                  💡 A IA usará as características do produto (marca, modelo, cor, dimensões e especificações) para compor uma descrição comercial detalhada.
                </p>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-950/40">
              <button
                type="button"
                onClick={onClose}
                disabled={isGenerating}
                className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={onGenerateFromCharacteristics}
                disabled={isGenerating || !isCharacteristicsReady}
                aria-label="Gerar descrição a partir das características"
                className="px-5 py-2.5 rounded-2xl text-xs font-bold text-white shadow-md flex items-center gap-2 transition-all bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 shadow-amber-500/20 active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGenerating ? (
                  <>
                    <i className="bi bi-arrow-repeat animate-spin text-sm" />
                    <span>Gerando descrição...</span>
                  </>
                ) : (
                  <>
                    <i className="bi bi-stars text-sm" />
                    <span>Gerar Descrição</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          /* Modo 2: Texto Descritivo / Anotações */
          <form onSubmit={handleSubmit(handleFormSubmit)} className="flex flex-col">
            <div className="p-5 space-y-4">
              <div className="space-y-1.5">
                <label
                  htmlFor="informativeText"
                  className="block text-xs font-bold text-slate-700 dark:text-slate-300"
                >
                  Texto Informativo / Anotações do Produto <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="informativeText"
                  {...register('descriptiveText')}
                  disabled={isGenerating}
                  rows={7}
                  placeholder="Exemplo: Sofá retrátil e reclinável, espuma D28, tecido veludo castor, madeira de eucalipto tratada, pés em madeira maciça, largura 220cm, altura 105cm, profundidade aberto 160cm..."
                  className="w-full text-xs rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3.5 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all resize-y"
                />
                {errors.descriptiveText && (
                  <p className="text-[11px] text-red-500">{errors.descriptiveText.message}</p>
                )}
              </div>

              <p className="text-[11px] text-slate-400 dark:text-slate-500 leading-relaxed">
                💡 A IA usará essas informações para redigir uma descrição comercial atraente e estruturada com introdução vendedora, lista de características e dimensões.
              </p>
            </div>

            {/* Footer */}
            <div className="px-5 py-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-950/40">
              <button
                type="button"
                onClick={onClose}
                disabled={isGenerating}
                className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isGenerating}
                aria-label="Gerar descrição via texto informativo"
                className="px-5 py-2.5 rounded-2xl text-xs font-bold text-white shadow-md flex items-center gap-2 transition-all bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 shadow-amber-500/20 active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGenerating ? (
                  <>
                    <i className="bi bi-arrow-repeat animate-spin text-sm" />
                    <span>Gerando descrição...</span>
                  </>
                ) : (
                  <>
                    <i className="bi bi-stars text-sm" />
                    <span>Gerar Descrição</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ProductDescriptionInformativeModal;
