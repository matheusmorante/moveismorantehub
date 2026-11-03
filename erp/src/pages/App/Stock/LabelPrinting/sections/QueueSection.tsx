import React from 'react';
import { QueueSectionProps } from '../types/LabelPrintingSections.types';
import LabelQueue from '../components/LabelQueue';
import { requestConfirmation } from '@/components/shared/confirmationService';

export const QueueSection: React.FC<QueueSectionProps> = (props) => {
  const {
    selectedCategory,
    printingMode,
    config,
    products,
    selectedProductToAdd,
    setSelectedProductToAdd,
    productAddQty,
    setProductAddQty,
    handleProductSelect,
    handleReplaceProduct,
    labelItems,
    setLabelItems,
    logoItems,
    setLogoItems,
    isDownloading,
    handleAddBlankLabel,
    cellInputRef,
    handleLogoUpload,
    setIsAssetManagerModalOpen,
  } = props;

  const activeItems = selectedCategory === 'logos' ? logoItems : labelItems;
  const totalLabels = activeItems.reduce((acc, curr) => acc + (curr.quantity || 1), 0);
  const totalProducts = activeItems.length;

  return (
    <section className="flex w-full min-w-0 shrink-0 flex-col rounded-2xl border border-slate-100 bg-white p-2.5 shadow-xl shadow-slate-200/50 transition-all dark:border-slate-800 dark:bg-slate-900 sm:p-6 lg:basis-[45%] lg:p-8 xl:basis-[42%]">
      <div className="flex flex-col gap-5 mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">
        {/* TOPO: TÍTULO E BOTÕES GERAIS */}
        <div className="flex min-w-0 flex-wrap items-start justify-between gap-3 sm:gap-4">
          <div className="flex min-w-0 flex-col gap-1">
            <h3 className="break-words text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-200 md:text-sm">
              {selectedCategory === 'logos' ? 'Gerenciar Etiquetas' : 'Etiquetas a Imprimir'}
            </h3>
            {selectedCategory === 'logos' ? (
              <p className="text-[8px] font-bold text-slate-400 uppercase">
                Organize e configure seus ativos para impressão
              </p>
            ) : selectedCategory !== 'precos' ? (
              <p className="text-[10px] font-bold text-slate-500">
                {totalLabels} etiquetas • {totalProducts} itens
              </p>
            ) : null}
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {selectedCategory === 'precos' && handleAddBlankLabel && (
              <>
                <button
                  type="button"
                  onClick={() => handleAddBlankLabel(1)}
                  className="p-2.5 px-4 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl transition-all font-black text-[9px] uppercase tracking-widest flex items-center gap-2 border border-blue-100 dark:border-blue-900/40 shadow-sm cursor-pointer"
                >
                  Adicionar
                </button>
              </>
            )}
            {selectedCategory === 'logos' && (
              <button
                onClick={() => setIsAssetManagerModalOpen?.(true)}
                className="p-2.5 px-4 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl hover:bg-slate-100 transition-all font-black text-[9px] uppercase tracking-widest flex items-center gap-2 border border-slate-100 dark:border-slate-700 shadow-sm cursor-pointer"
              >
                <i className="bi bi-grid-fill" /> Biblioteca
              </button>
            )}

            {selectedCategory === 'identificacao' && handleAddBlankLabel && (
              <button
                type="button"
                onClick={() => handleAddBlankLabel(1)}
                className="p-2.5 px-4 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl transition-all font-black text-[9px] uppercase tracking-widest flex items-center gap-2 border border-blue-100 dark:border-blue-900/40 shadow-sm cursor-pointer"
                title="Adicionar etiqueta"
              >
                <i className="bi bi-plus-lg" /> Adicionar
              </button>
            )}

            {selectedCategory !== 'precos' &&
              selectedCategory !== 'identificacao' &&
              activeItems.length > 0 && (
                <button
                  onClick={async () => {
                    if (await requestConfirmation({
                      title: 'Limpar fila de etiquetas?',
                      message: 'Todos os itens desta fila serão removidos.',
                      confirmLabel: 'Limpar fila',
                      type: 'warning',
                    })) {
                      if (selectedCategory === 'logos') setLogoItems([]);
                      else setLabelItems([]);
                    }
                  }}
                  className="p-2.5 px-4 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-xl hover:bg-red-100 transition-all font-black text-[9px] uppercase tracking-widest border border-red-100 dark:border-red-900/30 cursor-pointer"
                  title="Limpar Fila"
                >
                  <i className="bi bi-trash3-fill" />
                </button>
              )}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-6">
        <div className="min-h-[120px] min-w-0 flex-1 overflow-y-auto overflow-x-hidden pr-1 custom-scrollbar sm:min-h-[300px] sm:pr-2">
          <div className="min-w-0 space-y-3 sm:space-y-4">
            {selectedCategory === 'logos' ? (
              <LabelQueue
                labelItems={logoItems}
                setLabelItems={setLogoItems}
                printingMode="simple"
                config={config}
                products={products}
                selectedCategory={selectedCategory}
              />
            ) : (
              <LabelQueue
                labelItems={labelItems}
                setLabelItems={setLabelItems}
                printingMode={printingMode}
                config={config}
                products={products}
                onSelectProduct={async (idx, product) => {
                  const replacedItem = labelItems[idx];
                  if (await handleProductSelect(product, 1)) {
                    setLabelItems((prev) => prev.filter((item) => item !== replacedItem));
                  }
                }}
                onReplaceProduct={handleReplaceProduct}
                selectedCategory={selectedCategory}
              />
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
