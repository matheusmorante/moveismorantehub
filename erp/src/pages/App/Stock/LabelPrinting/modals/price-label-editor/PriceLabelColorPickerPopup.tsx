import React from 'react';
import type { Opportunity, PriceLabelLayerKey } from '../../types/PriceLabelArtEditorTypes';

interface PriceLabelColorPickerPopupProps {
  isOpen: boolean;
  onClose: () => void;
  allOppOptions: Opportunity[];
  selectedOppId: string;
  selectedElement: PriceLabelLayerKey;
  oppColorsMap: Record<string, Record<string, string>>;
  getDefaultBg: (oppId?: string) => string;
  colorHistory: string[];
  onOppColorChange: (oppId: string, color: string, isCurrentActiveOpp: boolean) => void;
}

export const PriceLabelColorPickerPopup: React.FC<PriceLabelColorPickerPopupProps> = ({
  isOpen,
  onClose,
  allOppOptions,
  selectedOppId,
  selectedElement,
  oppColorsMap,
  getDefaultBg,
  colorHistory,
  onOppColorChange,
}) => {
  if (!isOpen) return null;

  return (
    <>
      {/* Overlay desfocado cobrindo a tela */}
      <div
        className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-[9999]"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
      />

      {/* Modal flutuante de cor por Tipo de Etiqueta */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-5 z-[10000] animate-fade-in flex flex-col max-h-[85vh]"
      >
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center font-black">
              <i className="bi bi-palette-fill text-base" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight">
                Cores por Tipo de Etiqueta
              </h3>
              <p className="text-[10px] text-slate-400 font-bold">
                Configure a cor e veja as cores recentes para cada modalidade
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center justify-center transition-colors cursor-pointer"
          >
            <i className="bi bi-x-lg text-xs" />
          </button>
        </div>

        {/* Lista de Tópicos por Tipo de Etiqueta */}
        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-1">
          {allOppOptions.map((opp) => {
            const isCurrentActiveOpp = selectedOppId === opp.id;
            const oppColor = (() => {
              if (selectedElement && oppColorsMap[opp.id]?.[selectedElement]) {
                return oppColorsMap[opp.id][selectedElement];
              }
              if (selectedElement === 'background') return getDefaultBg(opp.id);
              if (selectedElement === 'promoPrice') return '#1e3a8a';
              if (
                selectedElement === 'title' ||
                selectedElement === 'deText' ||
                selectedElement === 'normalPrice' ||
                selectedElement === 'porText' ||
                selectedElement === 'currencySymbol' ||
                selectedElement === 'cents' ||
                selectedElement === 'installments'
              ) {
                return '#000000';
              }
              return '#000000';
            })();

            return (
              <div
                key={opp.id}
                className={`p-4 rounded-2xl border transition-all ${
                  isCurrentActiveOpp
                    ? 'bg-blue-50/40 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800'
                    : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800'
                }`}
              >
                {/* Nome do Tipo de Etiqueta */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${isCurrentActiveOpp ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-600'}`}
                    />
                    <span className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wide">
                      {opp.name}
                    </span>
                  </div>
                  {isCurrentActiveOpp && (
                    <span className="text-[9px] font-black uppercase bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300 px-2 py-0.5 rounded-md">
                      VISÃO ATUAL
                    </span>
                  )}
                </div>

                {/* Seletor de Cor + Hex */}
                <div className="flex items-center gap-3 mb-3">
                  <label className="relative flex items-center justify-center w-10 h-10 rounded-xl border border-slate-300 dark:border-slate-700 shadow-md cursor-pointer overflow-hidden bg-gradient-to-r from-red-500 via-green-500 to-blue-500 p-0.5 shrink-0 hover:scale-105 active:scale-95 transition-all">
                    <input
                      type="color"
                      value={oppColor}
                      onChange={(e) => onOppColorChange(opp.id, e.target.value, isCurrentActiveOpp)}
                      className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                    />
                    <div
                      className="w-full h-full rounded-lg border border-white/60"
                      style={{ backgroundColor: oppColor }}
                    />
                  </label>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[9px] font-bold text-slate-400 uppercase leading-none">
                      Cor da Fonte
                    </span>
                    <span className="text-xs font-mono font-black text-slate-800 dark:text-slate-200 uppercase tracking-wide">
                      {oppColor}
                    </span>
                  </div>
                </div>

                {/* Cores Recentes Usadas */}
                {colorHistory.length > 0 && (
                  <div className="flex flex-col gap-1.5 pt-2 border-t border-slate-200/60 dark:border-slate-800">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider leading-none">
                      Cores Recentes:
                    </span>
                    <div className="flex items-center gap-1.5 flex-wrap select-none">
                      {colorHistory.map((color, cIdx) => (
                        <button
                          key={`${opp.id}-${color}-${cIdx}`}
                          type="button"
                          onClick={() => onOppColorChange(opp.id, color, isCurrentActiveOpp)}
                          className={`w-7 h-7 rounded-lg border shadow-2xs hover:scale-110 active:scale-95 transition-all cursor-pointer ${
                            color.toLowerCase() === oppColor.toLowerCase()
                              ? 'border-blue-500 dark:border-blue-400 ring-2 ring-blue-500/20'
                              : 'border-slate-300/40 dark:border-slate-700/60'
                          }`}
                          style={{ backgroundColor: color }}
                          title={color}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
};

export default PriceLabelColorPickerPopup;
