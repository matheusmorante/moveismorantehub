import React from 'react';
import { LabelPrintingCategoryTabs } from './components/LabelPrintingCategoryTabs';
import { useLabelPrintingState } from './hooks/useLabelPrintingState';
import { HeaderSection } from './sections/HeaderSection';
import { QueueSection } from './sections/QueueSection';
import { PreviewSection } from './sections/PreviewSection';
import { PrintPortalSection } from './sections/PrintPortalSection';
import { ModalsSection } from './sections/ModalsSection';

const LabelPrinting: React.FC = () => {
  const state = useLabelPrintingState();

  return (
    <>
      <div
        className={`flex flex-col gap-2 max-w-[1600px] mx-auto pt-2 pb-4 px-6 min-h-screen no-print transition-all`}
      >
        <HeaderSection {...state} />
        {state.layoutsLoading && <p role="status" className="flex items-center gap-2 text-sm text-blue-700"><span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />Consultando modelos de etiquetas…</p>}
        {(state.layoutsError || state.layoutsQueryError || state.layoutPreferenceError) && <p role="alert" className="text-sm text-red-700">{state.layoutsError || state.layoutsQueryError || state.layoutPreferenceError}</p>}

        {!state.selectedCategory ? (
          <LabelPrintingCategoryTabs
            selectedCategory={state.selectedCategory}
            onSelectCategory={state.setSelectedCategory}
          />
        ) : (
          <div className="flex flex-col gap-6 animate-fade-in lg:flex-row lg:items-start">
            {/* SEÇÃO DA FILA (PRODUTOS OU LOGOS) */}
            <QueueSection {...state} />

            {/* PREVIEW: sidebar em desktop; abaixo da fila em telas menores. */}
            <PreviewSection {...state} />
          </div>
        )}
      </div>

      <PrintPortalSection {...state} />

      <ModalsSection {...state} />
    </>
  );
};

export default LabelPrinting;
