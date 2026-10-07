import React, { useState } from 'react';
import { Opportunity } from '../../types/PriceLabelArtEditorTypes';

interface PriceLabelMenuBarProps {
  onDownloadPng: () => void;
  onCopyImage: () => void;
  onRenameTitle: () => void;
  onOpenLayersModal: () => void;
  showSafetyMargin: boolean;
  onToggleSafetyMargin: () => void;
  selectedOppId: string;
  onSelectOpportunityContext: (oppId: string) => void;
  allOppOptions: Opportunity[];
  onOpenDataFillModal: () => void;
  onOpenTestValuesModal: () => void;
}

export const PriceLabelMenuBar: React.FC<PriceLabelMenuBarProps> = ({
  onDownloadPng,
  onCopyImage,
  onRenameTitle,
  onOpenLayersModal,
  showSafetyMargin,
  onToggleSafetyMargin,
  selectedOppId,
  onSelectOpportunityContext,
  allOppOptions,
  onOpenDataFillModal,
  onOpenTestValuesModal,
}) => {
  const [isFileMenuOpen, setIsFileMenuOpen] = useState(false);

  return (
    <div className="flex items-center justify-start gap-3 bg-slate-200/80 dark:bg-slate-900 border-b border-slate-300 dark:border-slate-800 px-4 sm:px-6 lg:px-8 py-1.5 shrink-0 overflow-visible relative z-[1000]">
      <div className="flex items-center gap-3 shrink-0 flex-nowrap">
        {/* ARQUIVO DROPDOWN */}
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => setIsFileMenuOpen(!isFileMenuOpen)}
            className="px-2 py-1 text-xs font-black text-slate-800 dark:text-slate-100 hover:text-blue-600 dark:hover:text-blue-400 transition cursor-pointer flex items-center gap-1"
          >
            <span>Arquivo</span>
            <i className="bi bi-chevron-down text-[9px] text-slate-400" />
          </button>

          {isFileMenuOpen && (
            <div
              style={{ zIndex: 99999 }}
              className="absolute left-0 top-full mt-1.5 w-52 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 py-1.5 z-[1100] animate-fade-in"
            >
              <button
                type="button"
                onClick={() => {
                  setIsFileMenuOpen(false);
                  onDownloadPng();
                }}
                className="w-full px-3.5 py-2 text-left text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-blue-950 flex items-center gap-2.5 cursor-pointer"
              >
                <i className="bi bi-file-earmark-arrow-down-fill text-emerald-600 text-sm" />
                <span>Baixar PNG</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsFileMenuOpen(false);
                  onCopyImage();
                }}
                className="w-full px-3.5 py-2 text-left text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-blue-950 flex items-center gap-2.5 cursor-pointer"
              >
                <i className="bi bi-clipboard-check-fill text-blue-600 text-sm" />
                <span>Copiar Imagem</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsFileMenuOpen(false);
                  onRenameTitle();
                }}
                className="w-full px-3.5 py-2 text-left text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-blue-950 flex items-center gap-2.5 cursor-pointer border-t border-slate-100 dark:border-slate-800"
              >
                <i className="bi bi-pencil-square text-purple-600 text-sm" />
                <span>Nomear Arte</span>
              </button>
            </div>
          )}
        </div>

        {/* CAMADAS BUTTON */}
        <button
          type="button"
          onClick={onOpenLayersModal}
          title="Gerenciar Camadas"
          className="p-1.5 text-xs font-black text-slate-800 dark:text-slate-100 hover:text-blue-600 dark:hover:text-blue-400 transition cursor-pointer flex items-center justify-center rounded-lg hover:bg-slate-300/50 dark:hover:bg-slate-800 shrink-0"
        >
          <i className="bi bi-layers-fill text-blue-600 text-sm" />
        </button>

        {/* MARGEM DE SEGURANÇA BUTTON */}
        <button
          type="button"
          onClick={onToggleSafetyMargin}
          title="Exibir ou ocultar a borda da margem de segurança da impressão"
          className={`p-1.5 text-xs font-black transition cursor-pointer rounded-lg shrink-0 flex items-center justify-center ${
            showSafetyMargin
              ? 'text-red-600 hover:bg-red-100 dark:hover:bg-red-950/50'
              : 'text-slate-600 hover:bg-slate-300/50 dark:text-slate-400 dark:hover:bg-slate-800'
          }`}
        >
          <i className="bi bi-bounding-box-circles text-sm" />
        </button>

        <div className="h-5 w-px bg-slate-300 dark:bg-slate-700 shrink-0 mx-1" />

        {/* SELETOR DE CONTEXTO */}
        <div className="flex items-center gap-1.5 shrink-0 bg-blue-50/70 dark:bg-slate-800/70 border border-blue-200 dark:border-slate-700 rounded-xl px-2.5 py-1">
          <i className="bi bi-tag-fill text-blue-600 dark:text-blue-400 text-xs shrink-0" />
          <span className="text-[9px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-wider shrink-0">
            Visão:
          </span>
          <select
            value={selectedOppId}
            onChange={(e) => onSelectOpportunityContext(e.target.value)}
            className="bg-transparent text-slate-800 dark:text-white text-xs font-black uppercase outline-none cursor-pointer pr-1"
            title="Alternar visão de contexto do tipo de etiqueta"
          >
            {allOppOptions.map((opp) => (
              <option
                key={opp.id}
                value={opp.id}
                className="bg-white dark:bg-slate-900 text-slate-800 dark:text-white font-bold"
              >
                {opp.name}
              </option>
            ))}
          </select>
        </div>

        <div className="h-5 w-px bg-slate-300 dark:bg-slate-700 shrink-0 mx-1" />

        {/* BOTÃO PRODUTO MODELO */}
        <button
          type="button"
          onClick={onOpenDataFillModal}
          title="Escolher produto modelo ou preencher dados da etiqueta"
          className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-slate-800 dark:to-slate-900 hover:from-emerald-100 hover:to-teal-100 dark:hover:from-slate-700 dark:hover:to-slate-800 text-slate-800 dark:text-white border border-emerald-200 dark:border-slate-700 rounded-xl cursor-pointer shadow-xs transition-all active:scale-95 text-xs font-black uppercase tracking-wider shrink-0"
        >
          <i className="bi bi-box-seam-fill text-emerald-600 dark:text-emerald-400 text-sm" />
          <span>Produto Modelo</span>
        </button>

        {/* BOTÃO TESTE DE VALORES */}
        <button
          type="button"
          onClick={onOpenTestValuesModal}
          title="Simular e testar numerações nos preços da etiqueta com sliders (0 a 9)"
          className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-slate-800 dark:to-slate-900 hover:from-purple-100 hover:to-indigo-100 dark:hover:from-slate-700 dark:hover:to-slate-800 text-slate-800 dark:text-white border border-purple-200 dark:border-slate-700 rounded-xl cursor-pointer shadow-xs transition-all active:scale-95 text-xs font-black uppercase tracking-wider shrink-0"
        >
          <i className="bi bi-sliders text-purple-600 dark:text-purple-400 text-sm" />
          <span>Teste de Valores</span>
        </button>
      </div>
    </div>
  );
};

export default PriceLabelMenuBar;
