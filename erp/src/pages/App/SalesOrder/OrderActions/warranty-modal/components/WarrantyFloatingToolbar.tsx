import React from 'react';

interface WarrantyFloatingToolbarProps {
  activePage: number;
  totalPages: number;
  zoomLevel: number;
  onPageChange: (page: number) => void;
  onZoomChange: (updater: (prev: number) => number) => void;
  onResetZoom: () => void;
}

export const WarrantyFloatingToolbar: React.FC<WarrantyFloatingToolbarProps> = ({
  activePage,
  totalPages,
  zoomLevel,
  onPageChange,
  onZoomChange,
  onResetZoom,
}) => {
  return (
    <div className="sticky top-2 z-30 flex items-center gap-2 sm:gap-3 bg-slate-900/90 backdrop-blur-md px-3 py-1.5 sm:px-4 sm:py-2 rounded-2xl border border-slate-700/80 shadow-2xl transition-all">
      {/* Botão Anterior */}
      <button
        type="button"
        disabled={activePage <= 1}
        onClick={() => onPageChange(activePage - 1)}
        className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-25 disabled:hover:bg-transparent disabled:hover:text-slate-400 transition-all cursor-pointer disabled:cursor-not-allowed"
        title="Página anterior"
      >
        <i className="bi bi-chevron-left text-xs sm:text-sm font-bold" />
      </button>

      {/* Slots de Paginação (Exatamente 5 posições com a página atual na mediana) */}
      <div className="flex items-center gap-1">
        {[-2, -1, 0, 1, 2].map((offset) => {
          const pageNum = activePage + offset;
          const isValid = pageNum >= 1 && pageNum <= totalPages;
          const isCurrent = offset === 0;

          if (!isValid) {
            return (
              <div
                key={`slot-empty-${offset}`}
                className="w-7 h-7 sm:w-8 sm:h-8 shrink-0 pointer-events-none"
                aria-hidden="true"
              />
            );
          }

          if (isCurrent) {
            return (
              <div
                key={`slot-page-${pageNum}`}
                className="w-7 h-7 sm:w-8 sm:h-8 shrink-0 flex items-center justify-center rounded-xl bg-[#032354] text-white font-black text-xs shadow-md ring-2 ring-[#feb004] select-none cursor-default"
                title={`Página atual: ${pageNum}`}
              >
                {pageNum}
              </div>
            );
          }

          return (
            <button
              key={`slot-page-${pageNum}`}
              type="button"
              onClick={() => onPageChange(pageNum)}
              className="w-7 h-7 sm:w-8 sm:h-8 shrink-0 flex items-center justify-center rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 font-bold text-xs transition-all cursor-pointer"
              title={`Ir para a página ${pageNum}`}
            >
              {pageNum}
            </button>
          );
        })}
      </div>

      {/* Botão Próxima */}
      <button
        type="button"
        disabled={activePage >= totalPages}
        onClick={() => onPageChange(activePage + 1)}
        className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-25 disabled:hover:bg-transparent disabled:hover:text-slate-400 transition-all cursor-pointer disabled:cursor-not-allowed"
        title="Próxima página"
      >
        <i className="bi bi-chevron-right text-xs sm:text-sm font-bold" />
      </button>

      {/* Divisor */}
      <div className="h-5 w-px bg-slate-700/80 my-auto shrink-0 mx-1" />

      {/* Controles de Zoom — Apenas um campo de porcentagem */}
      <div className="flex items-center gap-1 sm:gap-1.5">
        <button
          type="button"
          onClick={() => onZoomChange((prev) => Math.max(prev - 15, 60))}
          className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-xl hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
          title="Diminuir Zoom (-)"
        >
          <i className="bi bi-zoom-out text-xs sm:text-sm" />
        </button>
        <button
          type="button"
          onClick={onResetZoom}
          className="text-[11px] sm:text-xs font-black px-2 py-1 rounded-lg text-center font-mono text-[#feb004] hover:bg-slate-800 transition-colors select-none cursor-pointer"
          title="Redefinir zoom para 100%"
        >
          {zoomLevel}%
        </button>
        <button
          type="button"
          onClick={() => onZoomChange((prev) => Math.min(prev + 15, 160))}
          className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-xl hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
          title="Aumentar Zoom (+)"
        >
          <i className="bi bi-zoom-in text-xs sm:text-sm" />
        </button>
      </div>
    </div>
  );
};
