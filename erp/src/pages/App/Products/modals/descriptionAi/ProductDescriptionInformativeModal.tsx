import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  productAiDescriptiveTextFormSchema,
  ProductAiDescriptiveTextFormValues,
} from '../../../../../../../shared-utils/productAiFormSchemas';

export interface ProductDescriptionInformativeModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly onSubmit: (informativeText: string) => Promise<void> | void;
  readonly isGenerating?: boolean;
}

export const ProductDescriptionInformativeModal: React.FC<ProductDescriptionInformativeModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isGenerating = false,
}) => {
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
    }
  }, [isOpen, reset]);

  if (!isOpen) return null;

  const handleFormSubmit = async (values: ProductAiDescriptiveTextFormValues) => {
    await onSubmit(values.descriptiveText);
  };

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
              <i className="bi bi-file-text" />
            </div>
            <div>
              <h3
                id="informative-text-modal-title"
                className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5"
              >
                <span>Gerar Descrição com Texto Informativo</span>
                <i className="bi bi-stars text-amber-500 text-xs" />
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Cole dados brutos, notas ou especificações encontradas sobre o produto
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

        {/* Form Body */}
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
      </div>
    </div>
  );
};

export default ProductDescriptionInformativeModal;
