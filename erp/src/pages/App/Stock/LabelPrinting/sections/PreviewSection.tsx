import React from 'react';
import { PreviewSectionProps } from '../types/LabelPrintingSections.types';
import LabelGrid from '../components/LabelGrid';

export const PreviewSection: React.FC<PreviewSectionProps> = (props) => {
    const { 
        config, printingMode, artVersion, savedArtConfigs, selectedImage, 
        cellImages, handleCellClick, labelItems, logoItems, currentPage, 
        setCurrentPage, handleDownloadImage, printLabels, isPrinting, isDownloading, 
        selectedCategory, previewContainerRef, previewScaleRef, gridRef, 
        previewZoom, setPreviewZoom, isPreviewFullscreen 
    } = props;

    return (
        <section className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2.5rem] p-6 sm:p-8 shadow-xl shadow-slate-200/50 dark:shadow-none flex flex-col animate-fade-in transition-all flex-1 min-w-0">
            {/* CABEÇALHO DO PREVIEW */}
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-6 shrink-0 border-b border-slate-100 dark:border-slate-800 pb-4">
                <div className="flex flex-col gap-1">
                    <h3 className="text-xs md:text-sm font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">
                        Preview de Impressão
                    </h3>
                    <p className="text-[10px] font-bold text-slate-500 uppercase">
                        Visualização em formato A4
                    </p>
                </div>

                <div className="flex items-center flex-wrap gap-3 shrink-0">
                    {/* CONTROLES DE PAGINAÇÃO E ZOOM */}
                    <div className="flex items-center gap-1 p-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
                        {/* Paginação */}
                        {(() => {
                            const totalCells = config.columns * config.rows;
                            const count = ((selectedCategory as string) === 'logos') 
                                ? logoItems.reduce((acc, curr) => acc + curr.quantity, 0)
                                : labelItems.reduce((acc, curr) => acc + curr.quantity, 0);
                            const totalPagesCount = Math.ceil(Math.max(count, 1) / totalCells);
                            
                            return (
                                <div className="flex items-center gap-1">
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); setCurrentPage(prev => Math.max(0, prev - 1)); }}
                                        disabled={currentPage === 0}
                                        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white dark:hover:bg-slate-800 text-slate-500 disabled:opacity-20 transition-all shadow-sm"
                                    >
                                        <i className="bi bi-chevron-left text-[10px]" />
                                    </button>
                                    <div className="px-2 py-1 flex items-center gap-1 text-[10px] font-black text-slate-800 dark:text-white bg-white dark:bg-slate-900 rounded-md border border-slate-100 dark:border-slate-800 shadow-sm">
                                        <span className="text-blue-500">{currentPage + 1}</span>
                                        <span className="text-slate-300">/</span>
                                        <span>{totalPagesCount}</span>
                                    </div>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); setCurrentPage(prev => Math.min(totalPagesCount - 1, prev + 1)); }}
                                        disabled={currentPage >= totalPagesCount - 1}
                                        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white dark:hover:bg-slate-800 text-slate-500 disabled:opacity-20 transition-all shadow-sm"
                                    >
                                        <i className="bi bi-chevron-right text-[10px]" />
                                    </button>
                                </div>
                            );
                        })()}

                        <div className="w-[1px] h-5 bg-slate-200 dark:bg-slate-700 mx-1" />

                        {/* Zoom */}
                        <div className="flex items-center gap-1">
                            <button 
                                onClick={() => setPreviewZoom(prev => Math.max(0.1, prev - 0.1))}
                                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white dark:hover:bg-slate-800 text-slate-500 shadow-sm"
                            >
                                <i className="bi bi-zoom-out text-[10px]" />
                            </button>
                            <div className="text-[10px] font-black w-8 text-center text-slate-500 bg-white dark:bg-slate-900 py-1 rounded-md border border-slate-100 dark:border-slate-800 shadow-sm">{Math.round(previewZoom * 100)}%</div>
                            <button 
                                onClick={() => setPreviewZoom(prev => Math.min(2.0, prev + 0.1))}
                                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white dark:hover:bg-slate-800 text-slate-500 shadow-sm"
                            >
                                <i className="bi bi-zoom-in text-[10px]" />
                            </button>
                        </div>
                    </div>

                    <div className="w-[1px] h-8 bg-slate-200 dark:bg-slate-800 mx-1 hidden sm:block" />

                    <div className="flex items-center gap-2 shrink-0">
                        <button 
                            onClick={handleDownloadImage}
                            disabled={isDownloading}
                            className="p-2 px-3 sm:px-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-[9px] font-black uppercase transition-all shadow-sm disabled:opacity-50 flex items-center gap-2"
                        >
                            <i className="bi bi-download" /> <span className="hidden sm:inline">Download</span> Imagem
                        </button>
                        <button 
                            onClick={printLabels}
                            disabled={isPrinting}
                            className="p-2 px-4 sm:px-6 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-[10px] font-black uppercase transition-all shadow-md hover:scale-105 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isPrinting ? (
                                <>
                                    <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                    <span>Gerando...</span>
                                </>
                            ) : (
                                <>
                                    <i className="bi bi-printer" /> Imprimir
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* CONTAINER DO PREVIEW */}
            <div 
                ref={previewContainerRef}
                className={`w-full flex-1 flex flex-col items-center relative transition-all duration-500 overflow-auto custom-scrollbar group/preview ${
                    isPreviewFullscreen ? 'fixed inset-0 z-[200] bg-white dark:bg-slate-900 p-10' : 'p-2 sm:p-4 min-h-[500px]'
                }`}
            >

                <div ref={previewScaleRef} style={{ 
                    transform: `scale(${previewZoom})`, 
                    transformOrigin: 'top center',
                    transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                }} className="relative mb-20 origin-top">
                    <div ref={gridRef} className="shadow-2xl bg-white">
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
