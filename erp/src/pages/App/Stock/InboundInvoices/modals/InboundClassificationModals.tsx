import React from 'react';
import { InboundAiExistingVariationModal } from './InboundAiExistingVariationModal';
import { InboundAiNewVariationModal } from './InboundAiNewVariationModal';
import type { InboundInvoiceItem } from '@/pages/utils/inboundNfe/inboundNfeTypes';
import type { AiClassification } from '../hooks/useInboundInvoiceClassification';
import { itemCostWithAdditionalCosts } from '@/pages/utils/inboundNfe/inboundItemCosts';

interface InboundClassificationModalsProps {
  isPreparingProduct: boolean;
  isClassifying: boolean;
  classifyingItem: InboundInvoiceItem | null;
  aiClassification: AiClassification | null;
  effectiveMarkup: string;
  isBusy?: boolean;
  error?: string;
  onEffectiveMarkupChange: (markup: string) => void;
  onConfirmExistingVariation: () => void;
  onConfirmNewVariation: () => void;
  onDiscardAndCreateNew: () => void;
}

export const InboundClassificationModals: React.FC<InboundClassificationModalsProps> = ({
  isPreparingProduct,
  isClassifying,
  classifyingItem,
  aiClassification,
  effectiveMarkup,
  isBusy = false,
  error = '',
  onEffectiveMarkupChange,
  onConfirmExistingVariation,
  onConfirmNewVariation,
  onDiscardAndCreateNew,
}) => {
  const finalCost = classifyingItem ? itemCostWithAdditionalCosts(classifyingItem) : 0;
  return (
    <>
      {error && <p role="alert" className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[1000007] max-w-xl rounded-xl bg-rose-50 p-4 text-sm text-rose-800 shadow-lg">{error}</p>}
      {isBusy && <p role="status" className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[1000007] rounded-xl bg-white p-4 text-sm text-indigo-700 shadow-lg"><i className="bi bi-arrow-repeat animate-spin mr-2" />Confirmando a classificação e o vínculo...</p>}
      {/* Modal: Preparando formulário */}
      {isPreparingProduct && (
        <div className="fixed inset-0 z-[1000006] flex items-center justify-center bg-slate-950/60 p-4">
          <section className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-2xl dark:bg-slate-900">
            <i className="bi bi-arrow-repeat text-3xl text-emerald-600 animate-spin inline-block" />
            <h3 className="mt-3 text-base font-black text-slate-800 dark:text-slate-100">
              Preparando formulário...
            </h3>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              Classificando categoria e estruturando dados do produto com IA.
            </p>
          </section>
        </div>
      )}

      {/* Modal: Classificando item com IA */}
      {isClassifying && classifyingItem && (
        <div className="fixed inset-0 z-[1000005] flex items-center justify-center bg-slate-950/60 p-4">
          <section className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 text-center">
            <i className="bi bi-stars text-3xl text-indigo-500 animate-pulse" />
            <h3 className="mt-3 text-base font-black text-slate-800 dark:text-slate-100">
              Analisando com IA...
            </h3>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Comparando com os produtos do fornecedor para sugerir o melhor vínculo.
            </p>
            <p className="mt-3 rounded-xl bg-slate-50 p-3 text-xs font-bold text-slate-700 dark:bg-slate-950 dark:text-slate-200">
              {classifyingItem.productDescription}
            </p>
          </section>
        </div>
      )}

      {!isClassifying && <InboundAiExistingVariationModal
        classifyingItem={classifyingItem} classification={aiClassification} isBusy={isBusy}
        onConfirm={onConfirmExistingVariation} onDiscardAndCreateNew={onDiscardAndCreateNew}
      />}

      {!isClassifying && <InboundAiNewVariationModal
        classifyingItem={classifyingItem} classification={aiClassification} finalCost={finalCost}
        effectiveMarkup={effectiveMarkup} onChangeMarkup={onEffectiveMarkupChange}
        isBusy={isBusy} onConfirm={onConfirmNewVariation} onDiscardAndCreateNew={onDiscardAndCreateNew}
      />}
    </>
  );
};
