import type React from 'react';
import { useState } from 'react';
import type { Product, Variation } from '@/pages/types/product.type';
import { aiService } from '@/pages/utils/aiService';
import { toast } from 'react-toastify';

export interface VariationDescriptionTabProps {
  readonly formData: Variation;
  readonly setFormData: React.Dispatch<React.SetStateAction<Variation | null>>;
  readonly parentProduct: Product;
  readonly handleChange: <K extends keyof Variation>(field: K, value: Variation[K]) => void;
  readonly isSingleVariation?: boolean;
  readonly showAiImprove?: boolean;
}

export const VariationDescriptionTab: React.FC<VariationDescriptionTabProps> = ({
  formData,
  setFormData,
  parentProduct,
  handleChange,
  isSingleVariation = false,
  showAiImprove = false,
}) => {
  const [isImprovingDescription, setIsImprovingDescription] = useState(false);

  const isSynced = isSingleVariation || formData.syncDescription !== false;
  const parentDescription = parentProduct.description || '';
  const effectiveValue = isSynced ? parentDescription : formData.description || '';

  const handleToggleSync = () => {
    if (isSingleVariation) return;
    const nextSync = !isSynced;
    setFormData((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        syncDescription: nextSync,
        description: nextSync
          ? parentProduct.description || ''
          : prev.description || parentProduct.description || '',
      };
    });
  };

  const handleImproveDescriptionWithAI = async () => {
    const title = (formData.name || parentProduct.name || parentProduct.description || '').trim();
    setIsImprovingDescription(true);
    try {
      const result = await aiService.improveProductDescription({
        currentDescription: formData.description || '',
        title,
        technicalValues: formData.technicalValues,
        width: formData.syncWidth ? parentProduct.width : formData.width,
        height: formData.syncHeight ? parentProduct.height : formData.height,
        depth: formData.syncDepth ? parentProduct.depth : formData.depth,
        weight: formData.syncWeight ? parentProduct.weight : formData.weight,
      });
      handleChange('description', result.improvedDescription);
    } catch {
      toast.error('Não foi possível aperfeiçoar a descrição.');
    } finally {
      setIsImprovingDescription(false);
    }
  };

  return (
    <div className="space-y-3 animate-in fade-in duration-200">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">
          Descrição da variação
        </h3>
        <div className="flex items-center gap-2">
          {showAiImprove && !isSynced && !isSingleVariation && (
            <button
              type="button"
              onClick={handleImproveDescriptionWithAI}
              disabled={isImprovingDescription}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-100/80 hover:bg-purple-200/80 dark:bg-purple-955/60 dark:hover:bg-purple-900/60 border border-purple-200 dark:border-purple-800/70 text-purple-700 dark:text-purple-300 font-black uppercase text-[10px] tracking-wider transition-all disabled:opacity-50 active:scale-95 shadow-sm cursor-pointer"
            >
              {isImprovingDescription ? (
                <>
                  <i
                    className="bi bi-arrow-repeat animate-spin text-purple-600 dark:text-purple-400"
                    aria-hidden="true"
                  />
                  <span>Aperfeiçoando...</span>
                </>
              ) : (
                <>
                  <i
                    className="bi bi-stars text-purple-600 dark:text-purple-400 text-xs font-bold"
                    aria-hidden="true"
                  />
                  <span>Aperfeiçoar com IA</span>
                </>
              )}
            </button>
          )}

          <button
            type="button"
            disabled={isSingleVariation}
            onClick={handleToggleSync}
            title={
              isSingleVariation
                ? 'A única variação herda os dados do produto.'
                : isSynced
                  ? 'Clique para personalizar a descrição desta variação'
                  : 'Clique para herdar a descrição do produto pai'
            }
            className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all ${
              isSingleVariation ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'
            } ${
              isSynced
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <i className={`bi ${isSynced ? 'bi-link' : 'bi-link-45deg'}`} aria-hidden="true" />
            <span>{isSynced ? 'Descrição Herdada do Pai' : 'Descrição Personalizada'}</span>
          </button>
        </div>
      </div>

      <p className="text-xs font-semibold text-slate-400">
        {isSynced
          ? parentDescription
            ? 'Esta variação está herdando a descrição do produto pai. Clique em "Descrição Personalizada" caso queira definir um texto exclusivo.'
            : 'O produto pai ainda não possui descrição cadastrada. Clique em "Descrição Personalizada" para adicionar uma descrição específica a esta variação.'
          : 'Defina a descrição específica desta variação ou clique em "Descrição Herdada do Pai" para reutilizar a do produto principal.'}
      </p>

      <textarea
        id="variation-description-input"
        aria-label="Descrição da variação"
        rows={16}
        value={effectiveValue}
        disabled={isSingleVariation || isSynced}
        onChange={(event) => handleChange('description', event.target.value)}
        placeholder={
          isSynced
            ? 'Herdando a descrição do produto pai...'
            : 'Descrição específica desta variação...'
        }
        className="w-full min-h-[320px] rounded-2xl border border-slate-200 dark:border-slate-800 bg-transparent p-4 text-sm font-semibold outline-none focus:border-blue-600 resize-y dark:text-slate-200 disabled:cursor-not-allowed disabled:opacity-70"
      />
    </div>
  );
};

export default VariationDescriptionTab;
