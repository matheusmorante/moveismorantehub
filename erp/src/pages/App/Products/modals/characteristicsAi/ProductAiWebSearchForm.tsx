import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { ProductAiCharacteristicsModalFormValues } from '../../../../../../../shared-utils/productAiFormSchemas';
import { CharacteristicsPrerequisitesCard } from './CharacteristicsPrerequisitesCard';

interface ProductAiWebSearchFormProps {
  form: UseFormReturn<ProductAiCharacteristicsModalFormValues>;
  onSubmit: (values: ProductAiCharacteristicsModalFormValues) => void;
  onCancel: () => void;
  isAnalyzing: boolean;
  isBlocked: boolean;
  productName: string;
  effectiveCategory: string;
  brand: string;
  model: string;
  hasName: boolean;
  hasCategory: boolean;
  hasBrand: boolean;
  hasModel: boolean;
  hasDescription: boolean;
  imageCount: number;
  isPrerequisitesMet: boolean;
}

export const ProductAiWebSearchForm: React.FC<ProductAiWebSearchFormProps> = ({
  form,
  onSubmit,
  onCancel,
  isAnalyzing,
  isBlocked,
  productName,
  effectiveCategory,
  brand,
  model,
  hasName,
  hasCategory,
  hasBrand,
  hasModel,
  hasDescription,
  imageCount,
  isPrerequisitesMet,
}) => {
  return (
    <form
      id="ai-web-search-form"
      onSubmit={form.handleSubmit(onSubmit)}
      className="flex flex-col flex-1 overflow-hidden"
    >
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 custom-scrollbar">
        <CharacteristicsPrerequisitesCard
          productName={productName}
          effectiveCategory={effectiveCategory}
          brand={brand}
          model={model}
          hasName={hasName}
          hasCategory={hasCategory}
          hasBrand={hasBrand}
          hasModel={hasModel}
          hasDescription={hasDescription}
          imageCount={imageCount}
          isPrerequisitesMet={isPrerequisitesMet}
        />

        <div className="space-y-1.5">
          <label
            htmlFor="additionalInfo"
            className="block text-xs font-bold text-slate-700 dark:text-slate-300"
          >
            Informações Adicionais (Opcional)
          </label>
          <textarea
            id="additionalInfo"
            {...form.register('additionalInfo')}
            disabled={isAnalyzing || isBlocked}
            rows={4}
            placeholder="Insira detalhes adicionais para ajudar a identificar o produto (ex: tipo de puxador, corrediça telescópica, link ou notas do fabricante)..."
            className="w-full text-xs rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3.5 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all resize-none"
          />
          {form.formState.errors.additionalInfo && (
            <p className="text-[11px] text-red-500">
              {form.formState.errors.additionalInfo.message}
            </p>
          )}
          <span className="text-[10px] text-slate-400 block">
            A pesquisa prioriza o site oficial do fabricante e cruza especificações técnicas com fotos e dados disponíveis.
          </span>
        </div>
      </div>

      {/* Rodapé Modo 1 */}
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
          disabled={!isPrerequisitesMet || isBlocked || isAnalyzing}
          className={`px-5 py-2.5 rounded-2xl text-xs font-bold text-white shadow-md flex items-center gap-2 transition-all ${
            !isPrerequisitesMet || isBlocked || isAnalyzing
              ? 'bg-slate-300 dark:bg-slate-700 text-slate-500 cursor-not-allowed shadow-none'
              : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 shadow-amber-500/20 active:scale-95 cursor-pointer'
          }`}
        >
          {isAnalyzing ? (
            <>
              <i className="bi bi-arrow-repeat animate-spin text-sm" />
              <span>Pesquisando na internet...</span>
            </>
          ) : (
            <>
              <i className="bi bi-stars text-sm" />
              <span>Consultar com IA</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
};
