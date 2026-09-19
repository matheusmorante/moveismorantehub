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
            <div className={`flex flex-col gap-2 max-w-[1600px] mx-auto pt-2 pb-4 px-6 min-h-screen no-print transition-all`}>
                <HeaderSection {...state as any} />

                {!state.selectedCategory ? (
                    <LabelPrintingCategoryTabs {...state as any} />
                ) : (
                    <div className="flex flex-col gap-6 animate-fade-in lg:flex-row lg:items-start">
                        {/* SEÇÃO DA FILA (PRODUTOS OU LOGOS) */}
                                    <QueueSection {...state as any} />

                                    {/* PREVIEW: sidebar em desktop; abaixo da fila em telas menores. */}
                                    <PreviewSection {...state as any} />
                              </div>
                  )}
              </div>

              <PrintPortalSection {...state as any} />

              <ModalsSection {...state as any} />
        </>
    );
};

export default LabelPrinting;

