import React from 'react';
import { PreviewSectionProps } from '../types/LabelPrintingSections.types';
import LabelGrid from '../components/LabelGrid';
import { getLabelPaperDimensions } from '../utils/labelGridLayout';

export const PreviewSection: React.FC<PreviewSectionProps> = (props) => {
  const [actionsOpen, setActionsOpen] = React.useState(false);
  const {
    config,
    printingMode,
    artVersion,
    savedArtConfigs,
    selectedImage,
    cellImages,
    handleCellClick,
    labelItems,
    logoItems,
    currentPage,
    setCurrentPage,
    handleDownloadImage,
    printLabels,
    printLabelsNormally,
    isPrinting,
    isDownloading,
    selectedCategory,
    previewContainerRef,
    previewScaleRef,
    gridRef,
    previewZoom,
    setPreviewZoom,
    isPreviewFullscreen,
  } = props;
  const totalCells = config.columns * config.rows;
  const count =
    (selectedCategory as string) === 'logos'
      ? logoItems.reduce((acc, curr) => acc + curr.quantity, 0)
      : labelItems.reduce((acc, curr) => acc + curr.quantity, 0);
  const totalPagesCount = Math.ceil(Math.max(count, 1) / totalCells);
  const embedded = typeof window !== 'undefined' && window.location.pathname === '/mobile/etiquetas';
  const paperSize = getLabelPaperDimensions(config);
  const paperWidthPx = Number.parseFloat(paperSize.w) * 96 / 25.4;
  const paperHeightPx = Number.parseFloat(paperSize.h) * 96 / 25.4;

  return (
    <section className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white p-3 shadow-xl shadow-slate-200/50 transition-all animate-fade-in dark:border-slate-800 dark:bg-slate-900 sm:p-6 lg:p-8">
      <div className="mb-3 grid min-w-0 shrink-0 grid-cols-[minmax(0,1fr)_auto] grid-rows-[auto_auto] gap-x-1 gap-y-2 border-b border-slate-100 pb-3 dark:border-slate-800 sm:mb-5 sm:flex sm:items-center sm:justify-between sm:gap-3 sm:pb-4">
        <h3 className="min-w-0 break-words text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-200 md:text-sm">
          Preview
        </h3>

        <div className="col-span-2 row-start-2 flex w-full min-w-0 items-center justify-between gap-0 sm:order-none sm:w-auto sm:flex-none sm:justify-center sm:gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setCurrentPage((prev) => Math.max(0, prev - 1));
            }}
            disabled={currentPage === 0}
            aria-label="Página anterior"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-all hover:bg-slate-50 disabled:opacity-20 dark:hover:bg-slate-800 sm:h-8 sm:w-8"
          >
            <i className="bi bi-chevron-left text-[10px]" />
          </button>
          <span className="text-[10px] font-black text-slate-600 dark:text-slate-300 min-w-[34px] text-center">
            {currentPage + 1}/{totalPagesCount}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setCurrentPage((prev) => Math.min(totalPagesCount - 1, prev + 1));
            }}
            disabled={currentPage >= totalPagesCount - 1}
            aria-label="Próxima página"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-all hover:bg-slate-50 disabled:opacity-20 dark:hover:bg-slate-800 sm:h-8 sm:w-8"
          >
            <i className="bi bi-chevron-right text-[10px]" />
          </button>
          <span className="h-5 w-px bg-slate-200 dark:bg-slate-700 mx-1" />
          <button
            onClick={() => setPreviewZoom((prev) => Math.max(0.1, prev - 0.1))}
            aria-label="Diminuir zoom"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-all hover:bg-slate-50 dark:hover:bg-slate-800 sm:h-8 sm:w-8"
          >
            <i className="bi bi-zoom-out text-[10px]" />
          </button>
          <span className="text-[10px] font-black w-10 text-center text-slate-500">
            {Math.round(previewZoom * 100)}%
          </span>
          <button
            onClick={() => setPreviewZoom((prev) => Math.min(2.0, prev + 0.1))}
            aria-label="Aumentar zoom"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-all hover:bg-slate-50 dark:hover:bg-slate-800 sm:h-8 sm:w-8"
          >
            <i className="bi bi-zoom-in text-[10px]" />
          </button>
        </div>

        <div className="relative col-start-2 row-start-1 flex shrink-0 items-center justify-end sm:order-none">
          <button
            type="button"
            onClick={() => setActionsOpen((prev) => !prev)}
            aria-label="Ações do preview"
            aria-expanded={actionsOpen}
            className="flex h-10 w-10 items-center justify-center text-slate-500 transition-colors hover:text-slate-700 dark:hover:text-slate-300 sm:h-9 sm:w-9"
          >
            <i className="bi bi-three-dots-vertical" />
          </button>
          {actionsOpen && (
            <div className="absolute right-0 top-11 z-30 flex min-w-[170px] flex-col gap-1 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-700 dark:bg-slate-900">
              <button
                onClick={() => {
                  setActionsOpen(false);
                  handleDownloadImage();
                }}
                disabled={isDownloading}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-left text-[9px] font-black uppercase text-slate-600 hover:bg-slate-50 disabled:opacity-50 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <i className="bi bi-download" /> Download imagem
              </button>
              {(selectedCategory === 'identificacao' || selectedCategory === 'precos') && (
                <button
                  type="button"
                  aria-label="Impressão avançada beta"
                  onClick={() => {
                    setActionsOpen(false);
                    printLabels();
                  }}
                  disabled={isPrinting}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-left text-[9px] font-black uppercase text-slate-600 hover:bg-slate-50 disabled:opacity-50 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  {isPrinting ? (
                    <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <i className="bi bi-printer-fill text-blue-600" />
                  )}
                  <span>Impressão avançada</span>
                  <span className="rounded bg-amber-100 px-1 py-0.5 text-[8px] font-black text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">BETA</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setActionsOpen(false);
                  printLabelsNormally();
                }}
                disabled={isPrinting}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-left text-[9px] font-black uppercase text-slate-600 hover:bg-slate-50 disabled:opacity-50 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                {isPrinting ? (
                  <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  <i className="bi bi-printer" />
                )}
                {isPrinting ? 'Preparando...' : 'Imprimir'}
              </button>
            </div>
          )}
        </div>
      </div>

      <div
        ref={previewContainerRef}
        className={`w-full flex-1 flex flex-col items-center relative transition-all duration-500 overflow-auto custom-scrollbar group/preview ${
          isPreviewFullscreen
            ? 'fixed inset-0 z-[200] bg-white p-2 dark:bg-slate-900 sm:p-10'
            : 'min-h-[300px] p-1.5 sm:min-h-[500px] sm:p-4'
        }`}
      >
        <div
          className={embedded ? 'shrink-0' : 'contents'}
          style={embedded ? { width: paperWidthPx * previewZoom, height: paperHeightPx * previewZoom } : undefined}
        >
        <div
          ref={previewScaleRef}
          style={{
            ...(embedded ? { width: paperWidthPx } : {}),
            transform: `scale(${previewZoom})`,
            transformOrigin: embedded ? 'top left' : 'top center',
            transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
          className="relative mb-6 origin-top"
        >
          <div ref={gridRef}>
            {(() => {
              const activeLayoutId = String(config.layoutId || 'preco_2x5_restored');
              const activeArtConfig =
                savedArtConfigs[activeLayoutId] ||
                savedArtConfigs['preco_2x5_restored'] ||
                config.artConfig;
              return (
                <LabelGrid
                  config={{
                    ...config,
                    printingMode,
                    _artVersion: artVersion,
                    artConfig: activeArtConfig,
                  }}
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
      </div>
    </section>
  );
};
