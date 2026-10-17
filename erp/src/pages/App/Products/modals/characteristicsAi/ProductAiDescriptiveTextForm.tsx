import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { ProductAiDescriptiveTextFormValues } from '../../../../../../../shared-utils/productAiFormSchemas';

interface ProductAiDescriptiveTextFormProps {
  form: UseFormReturn<ProductAiDescriptiveTextFormValues>;
  onSubmit: (values: ProductAiDescriptiveTextFormValues) => void;
  onCancel: () => void;
  isAnalyzing: boolean;
  isBlocked: boolean;
}

export const ProductAiDescriptiveTextForm: React.FC<ProductAiDescriptiveTextFormProps> = ({
  form,
  onSubmit,
  onCancel,
  isAnalyzing,
  isBlocked,
}) => {
  return (
    <form
      id="ai-descriptive-text-form"
      onSubmit={form.handleSubmit(onSubmit)}
      className="flex flex-col flex-1 overflow-hidden"
    >
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 custom-scrollbar">
        <div className="p-4 rounded-2xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 text-xs text-blue-900 dark:text-blue-200 flex items-start gap-3">
          <i className="bi bi-info-circle-fill text-lg text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <strong className="block font-bold">Como funciona o preenchimento por texto:</strong>
            <p className="text-[11px] text-blue-800 dark:text-blue-300 leading-relaxed">
              Cole a mensagem do fornecedor, texto do catálogo, ficha técnica ou especificações brutas.
              A IA analisará o texto e estruturará automaticamente: Nome, Marca, Modelo, Dimensões, Descrição comercial e Características técnicas!
            </p>
          </div>
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="descriptiveText"
            className="block text-xs font-bold text-slate-700 dark:text-slate-300"
          >
            Texto Descritivo / Ficha Técnica do Produto <span className="text-red-500">*</span>
          </label>
          <textarea
            id="descriptiveText"
            {...form.register('descriptiveText')}
            disabled={isAnalyzing || isBlocked}
            rows={8}
            placeholder="Cole aqui o texto completo recebido do fornecedor, especificações de catálogo, medidas, cores, portas, gavetas..."
            className="w-full text-xs font-mono rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3.5 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all resize-y"
          />
          {form.formState.errors.descriptiveText && (
            <p className="text-[11px] text-red-500">
              {form.formState.errors.descriptiveText.message}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="descriptiveAdditionalInfo"
            className="block text-xs font-bold text-slate-700 dark:text-slate-300"
          >
            Instruções Extras (Opcional)
          </label>
          <input
            id="descriptiveAdditionalInfo"
            type="text"
            {...form.register('additionalInfo')}
            disabled={isAnalyzing || isBlocked}
            placeholder="Instruções específicas para a IA (ex: focar nas medidas com espelho, etc.)..."
            className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all"
          />
        </div>
      </div>

      {/* Rodapé Modo 2 */}
      <div className="px-5 py-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-950/40 shrink-0">
        <button
          type="button"
          onClick={onCancel}
          disabled={isAnalyzing}
          className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isBlocked || isAnalyzing}
          className={`px-5 py-2.5 rounded-2xl text-xs font-bold text-white shadow-md flex items-center gap-2 transition-all ${
            isBlocked || isAnalyzing
              ? 'bg-slate-300 dark:bg-slate-700 text-slate-500 cursor-not-allowed shadow-none'
              : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 shadow-amber-500/20 active:scale-95 cursor-pointer'
          }`}
        >
          {isAnalyzing ? (
            <>
              <i className="bi bi-arrow-repeat animate-spin text-sm" />
              <span>Processando texto...</span>
            </>
          ) : (
            <>
              <i className="bi bi-stars text-sm" />
              <span>Gerar com IA</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
};
