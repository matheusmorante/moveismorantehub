import React from 'react';
import { PreviewSectionProps } from '../types/LabelPrintingSections.types';
import LabelGrid from '../components/LabelGrid';

export const PreviewSection: React.FC<PreviewSectionProps> = (props) => {
    const [actionsOpen, setActionsOpen] = React.useState(false);
    const {
        config, printingMode, artVersion, savedArtConfigs, selectedImage,
        cellImages, handleCellClick, labelItems, logoItems, currentPage,
        setCurrentPage, handleDownloadImage, printLabels, isPrinting, isDownloading,
        selectedCategory, previewContainerRef, previewScaleRef, gridRef,
        previewZoom, setPreviewZoom, isPreviewFullscreen
    } = props;
    const totalCells = config.columns * config.rows;
    const count = ((selectedCategory as string) === 'logos')
        ? logoItems.reduce((acc, curr) => acc + curr.quantity, 0)
        : labelItems.reduce((acc, curr) => acc + curr.quantity, 0);
    const totalPagesCount = Math.ceil(Math.max(count, 1) / totalCells);

    return (
        <section className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2.5rem] p-4 sm:p-6 lg:p-8 shadow-xl shadow-slate-200/50 dark:shadow-none flex flex-col animate-fade-in transition-all flex-1 min-w-0 overflow-hidden">
            <div className="flex flex-row items-center justify-between gap-1 sm:gap-3 mb-5 shrink-0 border-b border-slate-100 dark:border-slate-800 pb-4 min-w-0">
                <h3 className="text-xs md:text-sm font-black uppercase tracking-widest text-slate-700 dark:text-slate-200 shrink-0">
                    Preview
                </h3>

                <div className="flex flex-none items-center justify-center gap-0 sm:gap-1 min-w-0">
                    <button onClick={(e) => { e.stopPropagation(); setCurrentPage(prev => Math.max(0, prev - 1)); }} disabled={currentPage === 0} aria-label="Página anterior" className="w-6 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-20 transition-all">
                        <i className="bi bi-chevron-left text-[10px]" />
                    </button>
                    <span className="text-[10px] font-black text-slate-600 dark:text-slate-300 min-w-[34px] text-center">{currentPage + 1}/{totalPagesCount}</span>
                    <button onClick={(e) => { e.stopPropagation(); setCurrentPage(prev => Math.min(totalPagesCount - 1, prev + 1)); }} disabled={currentPage >= totalPagesCount - 1} aria-label="Próxima página" className="w-6 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-20 transition-all">
                        <i className="bi bi-chevron-right text-[10px]" />
                    </button>
                    <span className="h-5 w-px bg-slate-200 dark:bg-slate-700 mx-1" />
                    <button onClick={() => setPreviewZoom(prev => Math.max(0.1, prev - 0.1))} aria-label="Diminuir zoom" className="w-6 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
                        <i className="bi bi-zoom-out text-[10px]" />
                    </button>
                    <span className="text-[10px] font-black w-10 text-center text-slate-500">{Math.round(previewZoom * 100)}%</span>
                    <button onClick={() => setPreviewZoom(prev => Math.min(2.0, prev + 0.1))} aria-label="Aumentar zoom" className="w-6 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
                        <i className="bi bi-zoom-in text-[10px]" />
                    </button>
                </div>

                <div className="relative flex items-center justify-end shrink-0">
                    <button type="button" onClick={() => setActionsOpen(prev => !prev)} aria-label="Ações do preview" aria-expanded={actionsOpen} className="w-7 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
                        <i className="bi bi-three-dots-vertical" />
                    </button>
                    {actionsOpen && (
                        <div className="absolute right-0 top-11 z-30 flex min-w-[170px] flex-col gap-1 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-700 dark:bg-slate-900">
                            <button onClick={() => { setActionsOpen(false); handleDownloadImage(); }} disabled={isDownloading} className="flex items-center gap-2 rounded-lg px-3 py-2 text-left text-[9px] font-black uppercase text-slate-600 hover:bg-slate-50 disabled:opacity-50 dark:text-slate-300 dark:hover:bg-slate-800">
                                <i className="bi bi-download" /> Download imagem
                            </button>
                            <button onClick={() => { setActionsOpen(false); printLabels(); }} disabled={isPrinting} className="flex items-center gap-2 rounded-lg px-3 py-2 text-left text-[9px] font-black uppercase text-slate-600 hover:bg-slate-50 disabled:opacity-50 dark:text-slate-300 dark:hover:bg-slate-800">
                                {isPrinting ? <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <i className="bi bi-printer" />}
                                {isPrinting ? 'Gerando...' : 'Imprimir'}
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <div ref={previewContainerRef} className={`w-full flex-1 flex flex-col items-center relative transition-all duration-500 overflow-auto custom-scrollbar group/preview ${
                isPreviewFullscreen ? 'fixed inset-0 z-[200] bg-white dark:bg-slate-900 p-6 sm:p-10' : 'p-2 sm:p-4 min-h-[360px] sm:min-h-[500px]'
            }`}>
                <div ref={previewScaleRef} style={{ transform: `scale(${previewZoom})`, transformOrigin: 'top center', transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)' }} className="relative mb-6 origin-top">
                    <div ref={gridRef}>
                        {(() => {
                            const activeLayoutId = String(config.layoutId || 'preco_2x5_restored');
                            const activeArtConfig = savedArtConfigs[activeLayoutId] || savedArtConfigs['preco_2x5_restored'] || config.artConfig;
                            return (
                                <LabelGrid
                                    config={{ ...config, printingMode, _artVersion: artVersion, artConfig: activeArtConfig }}
                                    image={selectedImage}
                                    cellImages={cellImages}
                                    onCellClick={handleCellClick}
                                    labelItems={labelItems}
                                    logoItems={logoItems}
                                    currentPage={currentPage}
                                    previewMode
                                />
                            );
                        })()}
                    </div>
                </div>
            </div>

        </section>
    );
};
