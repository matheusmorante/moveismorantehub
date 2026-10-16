import React from 'react';

interface WarrantyReaderHeaderProps {
  orderCode: string;
  pdfUrl?: string | null;
  onClose: () => void;
}

export const WarrantyReaderHeader: React.FC<WarrantyReaderHeaderProps> = ({
  orderCode,
  pdfUrl,
  onClose,
}) => {
  return (
    <header className="h-14 px-4 sm:px-6 bg-slate-900 border-b border-slate-800 flex items-center justify-between gap-4 shrink-0 shadow-md">
      {/* Lado Esquerdo: Identificação */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-8 h-8 rounded-xl bg-[#032354] border border-[#feb004]/50 text-white flex items-center justify-center shrink-0 shadow-sm">
          <i className="bi bi-shield-check text-[#feb004] text-base" />
        </div>
        <div className="flex items-center gap-2 truncate">
          <h2 className="text-sm font-black text-white tracking-wide truncate">
            Termo de Garantia — Pedido #{orderCode}
          </h2>
          <span className="text-[9px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 shrink-0">
            Cadastrado
          </span>
        </div>
      </div>

      {/* Lado Direito: Link PDF e Fechar */}
      <div className="flex items-center gap-2">
        {pdfUrl && (
          <a
            href={pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors border border-slate-700"
            title="Abrir arquivo PDF original em nova aba"
          >
            <i className="bi bi-box-arrow-up-right text-xs" />
            <span>PDF Original</span>
          </a>
        )}
        <button
          type="button"
          onClick={onClose}
          className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-800 hover:bg-rose-600 text-slate-400 hover:text-white transition-all shadow-sm cursor-pointer"
          title="Fechar Visualização (Esc)"
        >
          <i className="bi bi-x-lg text-sm" />
        </button>
      </div>
    </header>
  );
};
