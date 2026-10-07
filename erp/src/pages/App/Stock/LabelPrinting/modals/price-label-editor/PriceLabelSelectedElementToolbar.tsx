import React from 'react';
import { FONT_OPTIONS } from '../../types/PriceLabelArtEditorTypes';
import type { PriceLabelLayerKey } from '../../types/PriceLabelArtEditorTypes';

interface PriceLabelSelectedElementToolbarProps {
  selectedElement: PriceLabelLayerKey;
  selectedElements: Set<PriceLabelLayerKey>;
  onClearSelection: () => void;
  priceLabelLayers: { key: PriceLabelLayerKey; label: string; icon: string }[];
  activeFontFamily: string;
  onFontChange: (font: string) => void;
  onBatchFontFamily: (font: string) => void;
  onBatchFontSize: (size: number) => void;
  dePricePorGroupGap: number;
  setDePricePorGroupGap: (gap: number) => void;
  // Sizes and magnitude
  scaleTens: number;
  setScaleTens: (val: number) => void;
  showPromoPriceTens: boolean;
  setShowPromoPriceTens: (val: boolean) => void;
  scaleHundreds: number;
  setScaleHundreds: (val: number) => void;
  showPromoPriceHundreds: boolean;
  setShowPromoPriceHundreds: (val: boolean) => void;
  scaleThousands: number;
  setScaleThousands: (val: number) => void;
  showPromoPriceThousands: boolean;
  setShowPromoPriceThousands: (val: boolean) => void;
  // Font sizes for other elements
  titleFontSizeTens: number;
  setTitleFontSizeTens: (val: number) => void;
  setTitleFontSizeHundreds: (val: number) => void;
  setTitleFontSizeThousands: (val: number) => void;
  deFontSizeTens: number;
  setDeFontSizeTens: (val: number) => void;
  setDeFontSizeHundreds: (val: number) => void;
  setDeFontSizeThousands: (val: number) => void;
  normalPriceFontSizeTens: number;
  setNormalPriceFontSizeTens: (val: number) => void;
  setNormalPriceFontSizeHundreds: (val: number) => void;
  setNormalPriceFontSizeThousands: (val: number) => void;
  porFontSizeTens: number;
  setPorFontSizeTens: (val: number) => void;
  setPorFontSizeHundreds: (val: number) => void;
  setPorFontSizeThousands: (val: number) => void;
  currencyFontSizeTens: number;
  setCurrencyFontSizeTens: (val: number) => void;
  setCurrencyFontSizeHundreds: (val: number) => void;
  setCurrencyFontSizeThousands: (val: number) => void;
  centsFontSizeTens: number;
  setCentsFontSizeTens: (val: number) => void;
  setCentsFontSizeHundreds: (val: number) => void;
  setCentsFontSizeThousands: (val: number) => void;
  installmentsFontSizeTens: number;
  setInstallmentsFontSizeTens: (val: number) => void;
  setInstallmentsFontSizeHundreds: (val: number) => void;
  setInstallmentsFontSizeThousands: (val: number) => void;
  // Color
  activeColor: string;
  onToggleColorPicker: (e: React.MouseEvent) => void;
  showSizeDropdown: boolean;
  setShowSizeDropdown: (show: boolean) => void;
}

export const PriceLabelSelectedElementToolbar: React.FC<PriceLabelSelectedElementToolbarProps> = ({
  selectedElement,
  selectedElements,
  onClearSelection,
  priceLabelLayers,
  activeFontFamily,
  onFontChange,
  onBatchFontFamily,
  onBatchFontSize,
  dePricePorGroupGap,
  setDePricePorGroupGap,
  scaleTens,
  setScaleTens,
  showPromoPriceTens,
  setShowPromoPriceTens,
  scaleHundreds,
  setScaleHundreds,
  showPromoPriceHundreds,
  setShowPromoPriceHundreds,
  scaleThousands,
  setScaleThousands,
  showPromoPriceThousands,
  setShowPromoPriceThousands,
  titleFontSizeTens,
  setTitleFontSizeTens,
  setTitleFontSizeHundreds,
  setTitleFontSizeThousands,
  deFontSizeTens,
  setDeFontSizeTens,
  setDeFontSizeHundreds,
  setDeFontSizeThousands,
  normalPriceFontSizeTens,
  setNormalPriceFontSizeTens,
  setNormalPriceFontSizeHundreds,
  setNormalPriceFontSizeThousands,
  porFontSizeTens,
  setPorFontSizeTens,
  setPorFontSizeHundreds,
  setPorFontSizeThousands,
  currencyFontSizeTens,
  setCurrencyFontSizeTens,
  setCurrencyFontSizeHundreds,
  setCurrencyFontSizeThousands,
  centsFontSizeTens,
  setCentsFontSizeTens,
  setCentsFontSizeHundreds,
  setCentsFontSizeThousands,
  installmentsFontSizeTens,
  setInstallmentsFontSizeTens,
  setInstallmentsFontSizeHundreds,
  setInstallmentsFontSizeThousands,
  activeColor,
  onToggleColorPicker,
  showSizeDropdown,
  setShowSizeDropdown,
}) => {
  return (
    <div className="flex items-center justify-start gap-3 bg-slate-100 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 lg:px-8 py-2 shrink-0 overflow-visible relative z-30 min-h-[44px]">
      {/* BOTÃO DESMARCAR */}
      <button
        type="button"
        onClick={onClearSelection}
        disabled={!selectedElement && selectedElements.size === 0}
        title="Desmarcar Seleção"
        className={`w-8 h-8 rounded-xl transition cursor-pointer shrink-0 flex items-center justify-center ${
          selectedElement || selectedElements.size > 0
            ? 'bg-amber-100 text-amber-800 border border-amber-300 hover:bg-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800'
            : 'text-slate-300 dark:text-slate-700 cursor-not-allowed opacity-40 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800'
        }`}
      >
        <i className="bi bi-cursor-fill text-xs" />
      </button>

      <div className="h-6 w-px bg-slate-300 dark:bg-slate-800 shrink-0 mx-0.5" />

      {/* SELEÇÃO ATIVA: FERRAMENTAS DA CAMADA ATIVA */}
      {selectedElements.size > 1 ? (
        <div className="flex items-center gap-3.5 shrink-0 flex-nowrap animate-fade-in">
          {/* Identificador de Seleção em Lote */}
          <div className="flex flex-col gap-0.5 items-start shrink-0">
            <span className="text-[9px] font-bold text-slate-500 uppercase leading-none">
              Seleção:
            </span>
            <div className="flex items-center gap-1.5 px-3 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-wider shrink-0 shadow-xs h-8">
              <i className="bi bi-layers-half text-xs" />
              <span>{selectedElements.size} Elementos</span>
            </div>
          </div>

          {/* SELETOR DE FONTE EM LOTE */}
          <div className="flex flex-col gap-0.5 items-start shrink-0">
            <span className="text-[9px] font-bold text-slate-500 uppercase leading-none">
              Fonte (Lote):
            </span>
            <select
              value=""
              onChange={(e) => onBatchFontFamily(e.target.value)}
              className="bg-white dark:bg-slate-900 text-slate-800 dark:text-white border border-slate-300 dark:border-slate-700 rounded-xl px-2.5 py-1 text-xs font-bold outline-none h-8 cursor-pointer shadow-xs"
            >
              <option value="" disabled>
                Alterar tipografia...
              </option>
              {FONT_OPTIONS.map((font) => (
                <option key={font.value} value={font.value} style={{ fontFamily: font.value }}>
                  {font.label}
                </option>
              ))}
            </select>
          </div>

          {/* TAMANHO DA FONTE EM LOTE */}
          <div className="flex flex-col gap-0.5 items-start shrink-0">
            <span className="text-[9px] font-bold text-slate-500 uppercase leading-none">
              Tamanho (Lote):
            </span>
            <div className="flex items-center gap-1 h-8">
              <input
                type="number"
                min="1"
                max="1000"
                placeholder="Ex: 24"
                onChange={(e) => onBatchFontSize(Number(e.target.value))}
                className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-2 py-1 text-xs font-black w-16 text-center h-8"
              />
              <span className="text-[10px] font-bold text-slate-400">px</span>
            </div>
          </div>
        </div>
      ) : selectedElement ? (
        <div className="flex items-center gap-3.5 shrink-0 flex-nowrap animate-fade-in">
          {/* Identificador do Elemento Ativo */}
          <div className="flex flex-col gap-0.5 items-start shrink-0">
            <span className="text-[9px] font-bold text-slate-500 uppercase leading-none">
              Elemento:
            </span>
            <div className="flex items-center gap-1.5 px-3 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-wider shrink-0 shadow-xs h-8">
              <i
                className={`bi ${priceLabelLayers.find((l) => l.key === selectedElement)?.icon}`}
              />
              <span>{priceLabelLayers.find((l) => l.key === selectedElement)?.label}</span>
            </div>
          </div>

          {/* SELETOR DE FONTE / TIPOGRAFIA */}
          {selectedElement !== 'background' && selectedElement !== 'dePricePorGroup' && (
            <div className="flex flex-col gap-0.5 items-start shrink-0">
              <span className="text-[9px] font-bold text-slate-500 uppercase leading-none">
                Fonte:
              </span>
              <select
                value={activeFontFamily}
                onChange={(e) => onFontChange(e.target.value)}
                className="bg-white dark:bg-slate-900 text-slate-800 dark:text-white border border-slate-300 dark:border-slate-700 rounded-xl px-2.5 py-1 text-xs font-bold outline-none h-8 cursor-pointer shadow-xs"
              >
                {FONT_OPTIONS.map((font) => (
                  <option key={font.value} value={font.value} style={{ fontFamily: font.value }}>
                    {font.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* CONTROLE DE ESPAÇAMENTO (GAP) DO GRUPO FLEX DE/POR */}
          {selectedElement === 'dePricePorGroup' && (
            <div className="flex flex-col gap-0.5 items-start shrink-0">
              <span className="text-[9px] font-bold text-blue-600 dark:text-blue-400 uppercase leading-none">
                Espaçamento do Grupo:
              </span>
              <div className="flex items-center gap-1 h-8">
                <input
                  type="number"
                  min="0"
                  max="200"
                  value={dePricePorGroupGap}
                  onChange={(e) => setDePricePorGroupGap(Number(e.target.value))}
                  className="bg-white dark:bg-slate-900 border border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400 rounded-xl px-2 py-1 text-xs font-black w-16 text-center h-8"
                />
                <span className="text-[10px] font-bold text-slate-400">px</span>
              </div>
            </div>
          )}

          {/* SELETOR DE TAMANHO FLUTUANTE */}
          {selectedElement !== 'background' && selectedElement !== 'dePricePorGroup' && (
            <div className="relative shrink-0 flex items-center">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowSizeDropdown(!showSizeDropdown);
                }}
                className="px-2 py-1 text-xs font-black text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 bg-transparent border-0 cursor-pointer flex items-center gap-1.5 transition-colors"
              >
                <span>Tamanho</span>
                <i
                  className={`bi bi-chevron-down text-[10px] transition-transform ${showSizeDropdown ? 'rotate-180' : ''}`}
                />
              </button>

              {showSizeDropdown && (
                <>
                  <div
                    className="fixed inset-0 z-[100]"
                    onClick={() => setShowSizeDropdown(false)}
                  />
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="absolute top-full left-0 mt-1 w-72 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-4 z-[200] animate-fade-in flex flex-col gap-3"
                  >
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                      <span className="text-[10px] font-black text-slate-800 dark:text-white uppercase tracking-wider">
                        Tamanho da Fonte (px)
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowSizeDropdown(false)}
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                      >
                        <i className="bi bi-x-lg text-xs" />
                      </button>
                    </div>

                    {selectedElement === 'promoPrice' ? (
                      <>
                        {/* 1. DEZENA */}
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                            Dezena:
                          </span>
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                min="1"
                                max="1000"
                                value={scaleTens}
                                onChange={(e) => setScaleTens(Number(e.target.value))}
                                className="bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-2 py-1 text-xs font-black w-16 text-center h-8"
                              />
                              <span className="text-[10px] font-bold text-slate-400">px</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setShowPromoPriceTens(!showPromoPriceTens)}
                              title={showPromoPriceTens ? 'Ocultar Dezena' : 'Exibir Dezena'}
                              className={`w-8 h-8 rounded-xl text-xs font-black flex items-center justify-center transition-colors cursor-pointer border ${
                                showPromoPriceTens
                                  ? 'bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800'
                                  : 'bg-slate-100 text-slate-400 border-slate-300 dark:bg-slate-800 dark:text-slate-500'
                              }`}
                            >
                              <i
                                className={`bi ${showPromoPriceTens ? 'bi-eye-fill' : 'bi-eye-slash-fill'}`}
                              />
                            </button>
                          </div>
                        </div>

                        {/* 2. CENTENA */}
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                            Centena:
                          </span>
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                min="1"
                                max="1000"
                                value={scaleHundreds}
                                onChange={(e) => setScaleHundreds(Number(e.target.value))}
                                className="bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-2 py-1 text-xs font-black w-16 text-center h-8"
                              />
                              <span className="text-[10px] font-bold text-slate-400">px</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setShowPromoPriceHundreds(!showPromoPriceHundreds)}
                              title={
                                showPromoPriceHundreds ? 'Ocultar Centena' : 'Exibir Centena'
                              }
                              className={`w-8 h-8 rounded-xl text-xs font-black flex items-center justify-center transition-colors cursor-pointer border ${
                                showPromoPriceHundreds
                                  ? 'bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800'
                                  : 'bg-slate-100 text-slate-400 border-slate-300 dark:bg-slate-800 dark:text-slate-500'
                              }`}
                            >
                              <i
                                className={`bi ${showPromoPriceHundreds ? 'bi-eye-fill' : 'bi-eye-slash-fill'}`}
                              />
                            </button>
                          </div>
                        </div>

                        {/* 3. MILHAR */}
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                            Milhar:
                          </span>
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                min="1"
                                max="1000"
                                value={scaleThousands}
                                onChange={(e) => setScaleThousands(Number(e.target.value))}
                                className="bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-2 py-1 text-xs font-black w-16 text-center h-8"
                              />
                              <span className="text-[10px] font-bold text-slate-400">px</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setShowPromoPriceThousands(!showPromoPriceThousands)}
                              title={showPromoPriceThousands ? 'Ocultar Milhar' : 'Exibir Milhar'}
                              className={`w-8 h-8 rounded-xl text-xs font-black flex items-center justify-center transition-colors cursor-pointer border ${
                                showPromoPriceThousands
                                  ? 'bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800'
                                  : 'bg-slate-100 text-slate-400 border-slate-300 dark:bg-slate-800 dark:text-slate-500'
                              }`}
                            >
                              <i
                                className={`bi ${showPromoPriceThousands ? 'bi-eye-fill' : 'bi-eye-slash-fill'}`}
                              />
                            </button>
                          </div>
                        </div>
                      </>
                    ) : (
                      /* TAMANHO ÚNICO PARA TODOS OS OUTROS ELEMENTOS */
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                          Tamanho da Fonte:
                        </span>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min="1"
                            max="1000"
                            value={
                              selectedElement === 'title'
                                ? titleFontSizeTens
                                : selectedElement === 'deText'
                                  ? deFontSizeTens
                                  : selectedElement === 'normalPrice'
                                    ? normalPriceFontSizeTens
                                    : selectedElement === 'porText'
                                      ? porFontSizeTens
                                      : selectedElement === 'currencySymbol'
                                        ? currencyFontSizeTens
                                        : selectedElement === 'cents'
                                          ? centsFontSizeTens
                                          : installmentsFontSizeTens
                            }
                            onChange={(e) => {
                              const v = Number(e.target.value);
                              if (selectedElement === 'title') {
                                setTitleFontSizeTens(v);
                                setTitleFontSizeHundreds(v);
                                setTitleFontSizeThousands(v);
                              } else if (selectedElement === 'deText') {
                                setDeFontSizeTens(v);
                                setDeFontSizeHundreds(v);
                                setDeFontSizeThousands(v);
                              } else if (selectedElement === 'normalPrice') {
                                setNormalPriceFontSizeTens(v);
                                setNormalPriceFontSizeHundreds(v);
                                setNormalPriceFontSizeThousands(v);
                              } else if (selectedElement === 'porText') {
                                setPorFontSizeTens(v);
                                setPorFontSizeHundreds(v);
                                setPorFontSizeThousands(v);
                              } else if (selectedElement === 'currencySymbol') {
                                setCurrencyFontSizeTens(v);
                                setCurrencyFontSizeHundreds(v);
                                setCurrencyFontSizeThousands(v);
                              } else if (selectedElement === 'cents') {
                                setCentsFontSizeTens(v);
                                setCentsFontSizeHundreds(v);
                                setCentsFontSizeThousands(v);
                              } else if (selectedElement === 'installments') {
                                setInstallmentsFontSizeTens(v);
                                setInstallmentsFontSizeHundreds(v);
                                setInstallmentsFontSizeThousands(v);
                              }
                            }}
                            className="bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-2 py-1 text-xs font-black w-20 text-center h-8"
                          />
                          <span className="text-[10px] font-bold text-slate-400">px</span>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* SELETOR DE COR COMPACTO */}
          {selectedElement !== 'dePricePorGroup' && (
            <div className="relative shrink-0 flex items-center">
              <button
                type="button"
                onClick={onToggleColorPicker}
                className="relative flex items-center justify-center w-8 h-8 rounded-xl border border-slate-300 dark:border-slate-700 shadow-xs cursor-pointer overflow-hidden p-0.5 bg-white dark:bg-slate-900 active:scale-95 transition-all"
                title="Alterar Cor"
              >
                <div
                  className="w-full h-full rounded-lg border border-white/60"
                  style={{ backgroundColor: activeColor }}
                />
              </button>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
};

export default PriceLabelSelectedElementToolbar;
