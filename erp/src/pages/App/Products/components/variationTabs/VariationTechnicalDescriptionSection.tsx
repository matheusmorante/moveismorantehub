import React, { useState } from 'react';
import type Product from '@/pages/types/product.type';
import type { Variation } from '@/pages/types/product.type';
import { aiService } from '@/pages/utils/aiService';
import { toast } from 'react-toastify';
import { flattenFormErrors, useZodForm } from '@/hooks/useZodForm';
import { productDescriptionAiFormSchema } from '../../../../../../../shared-utils/productAiFormSchemas';

export interface VariationTechnicalDescriptionSectionProps {
  readonly formData: Variation & { readonly material?: string | null };
  readonly parentProduct: Product & { readonly attributes?: Variation['attributes'] };
  readonly handleChange: <K extends keyof Variation>(field: K, value: Variation[K]) => void;
  readonly isSingleVariation?: boolean;
  readonly showAiImprove?: boolean;
  readonly parentNormalizedValues: Record<string, any>;
}

export const VariationTechnicalDescriptionSection: React.FC<
  VariationTechnicalDescriptionSectionProps
> = ({
  formData,
  parentProduct,
  handleChange,
  isSingleVariation = false,
  showAiImprove = false,
  parentNormalizedValues,
}) => {
  const [isImprovingDescription, setIsImprovingDescription] = useState(false);
  const descriptionForm = useZodForm(productDescriptionAiFormSchema, { title: '', currentDescription: '' });

  const handleImproveDescriptionWithAI = async () => {
    const title = (formData.name || parentProduct.name || parentProduct.description || '').trim();
    const mergedTechnicalValues = {
      ...parentNormalizedValues,
      ...(formData.technicalValues || {}),
    };

    await descriptionForm.validateAndRun({
      currentDescription: formData.description || '',
      title,
      material: formData.material || parentProduct.material,
      brand: parentProduct.brand,
      line: parentProduct.line,
      width: formData.syncWidth ? parentProduct.width : formData.width,
      height: formData.syncHeight ? parentProduct.height : formData.height,
      depth: formData.syncDepth ? parentProduct.depth : formData.depth,
      weight: formData.syncWeight ? parentProduct.weight : formData.weight,
      technicalValues: mergedTechnicalValues,
    }, async (values) => {
      setIsImprovingDescription(true);
      try {
        const result = await aiService.improveProductDescription(values);
        handleChange('description', result.improvedDescription);
        toast.success('Descrição da variação aperfeiçoada com sucesso! ✨');
      } catch (error: unknown) {
        console.error(error);
        const msg =
          error instanceof Error ? error.message : 'Erro ao aperfeiçoar descrição com IA.';
        toast.error(msg);
      } finally {
        setIsImprovingDescription(false);
      }
    }, (errors) => toast.error(Object.values(flattenFormErrors(errors))[0]));
  };

  return (
    <div className="flex flex-col gap-2 bg-slate-50 dark:bg-slate-950 p-6 rounded-3xl border border-slate-100 dark:border-slate-800">
      <div className="flex items-center justify-between">
        <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-600 flex items-center gap-2">
          Descrição da Variação
        </h4>
        <div className="flex items-center gap-2">
          {showAiImprove && !formData.syncDescription && (
            <button
              type="button"
              onClick={handleImproveDescriptionWithAI}
              disabled={isImprovingDescription}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-100/80 hover:bg-purple-200/80 dark:bg-purple-955/60 dark:hover:bg-purple-900/60 border border-purple-200 dark:border-purple-800/70 text-amber-600 dark:text-amber-400 font-black uppercase text-[9px] tracking-wider transition-all disabled:opacity-50 active:scale-95 shadow-sm cursor-pointer"
            >
              {isImprovingDescription ? (
                <>
                  <i className="bi bi-arrow-repeat animate-spin text-amber-500" />
                  Aperfeiçoando...
                </>
              ) : (
                <>
                  <i className="bi bi-stars text-amber-500 text-xs font-bold" />
                  Aperfeiçoar com IA
                </>
              )}
            </button>
          )}
          <button
            type="button"
            disabled={isSingleVariation}
            onClick={() => handleChange('syncDescription', !formData.syncDescription)}
            className={`p-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all disabled:cursor-not-allowed disabled:opacity-70 ${
              formData.syncDescription
                ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-955/30'
                : 'text-slate-400 bg-slate-100 dark:bg-slate-850'
            }`}
            title={
              formData.syncDescription
                ? 'Desvincular Descrição do Pai'
                : 'Sincronizar Descrição com o Pai'
            }
          >
            <i
              className={`bi ${formData.syncDescription ? 'bi-link text-emerald-600' : 'bi-link-45deg text-slate-400'}`}
            />
            <span className="text-[9px] font-black uppercase">
              {formData.syncDescription ? 'Sincronizado' : 'Manual'}
            </span>
          </button>
        </div>
      </div>
      {formData.syncDescription ? (
        <div className="w-full mt-2 p-4 bg-slate-100 dark:bg-slate-900/50 rounded-2xl border border-slate-200/50 dark:border-slate-800 text-xs font-semibold text-slate-500 min-h-[80px]">
          <span className="whitespace-pre-wrap">{parentProduct?.description || ''}</span>
        </div>
      ) : (
        <textarea
          rows={4}
          value={formData.description || ''}
          onChange={(e) => handleChange('description', e.target.value)}
          placeholder="Descrição específica desta variação (se vazia, sincroniza com o pai no e-commerce)..."
          className="w-full mt-2 p-4 bg-transparent border-b-2 border-t-0 border-x-0 border-slate-200 dark:border-slate-800 outline-none text-xs font-bold focus:border-blue-600 dark:focus:border-blue-400 transition-all resize-none dark:text-slate-100"
        />
      )}
    </div>
  );
};
