import React from 'react';

type PriceFontSizeScale = {
  tens?: number;
  hundreds?: number;
  thousands?: number;
  tenThousands?: number;
};

type PriceFontSizeScaleKey = keyof PriceFontSizeScale;

interface LabelGridModelToolbarState {
  readonly isInactive: boolean;
  readonly isDesignMode: boolean;
  readonly isPromoPreview: boolean;
  readonly selectedElement: string | null;
  readonly activeBackground: string;
  readonly snapEnabled: boolean;
  readonly showColorPalette: boolean;
  readonly activeColor: string;
  readonly activeSize: number;
  readonly activeBold: boolean;
  readonly activeAlign: string;
  readonly activeVerticalAlign: string;
  readonly priceFontSizes: PriceFontSizeScale;
  readonly fontFamily: string;
  readonly priceFormat: 'standard' | 'split';
}

interface LabelGridModelToolbarHandlers {
  readonly onExitDesignMode: () => void;
  readonly onChangePreviewMode: (isPromoPreview: boolean) => void;
  readonly onAddExtraField: () => void;
  readonly onUpdateStyle: (key: string, value: string | number | boolean) => void;
  readonly onToggleSnap: () => void;
  readonly onToggleColorPalette: (show: boolean) => void;
  readonly onPriceFontSizeChange: (scale: PriceFontSizeScaleKey, value: number) => void;
  readonly onCycleAlign: () => void;
  readonly onCycleVerticalAlign: () => void;
  readonly onFontFamilyChange: (fontFamily: string) => void;
  readonly onTogglePriceFormat: () => void;
  readonly onClearSelection: () => void;
}

interface LabelGridModelToolbarProps {
  readonly state: LabelGridModelToolbarState;
  readonly handlers: LabelGridModelToolbarHandlers;
}

export const LabelGridModelToolbar: React.FC<LabelGridModelToolbarProps> = ({
  state,
  handlers,
}) => (
  <div
    className={`px-12 py-3 border-b min-h-[85px] flex items-center justify-between transition-all ${state.isInactive && !state.isDesignMode ? 'bg-slate-50/50 grayscale opacity-50' : 'bg-white dark:bg-slate-900 shadow-sm border-blue-500/20'}`}
  >
    <div className="flex items-center gap-6 flex-wrap">
      <button
        onClick={handlers.onExitDesignMode}
        className="px-5 py-3 bg-slate-800 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-700 transition-all flex items-center gap-2 shadow-lg active:scale-95 shrink-0"
      >
        <i className="bi bi-chevron-left" /> Voltar
      </button>

      <div className="h-8 w-px bg-slate-200 hidden sm:block" />

      <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 p-1 rounded-2xl">
        <button
          onClick={() => handlers.onChangePreviewMode(false)}
          className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase transition-all ${!state.isPromoPreview ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
        >
          Preço Normal
        </button>
        <button
          onClick={() => handlers.onChangePreviewMode(true)}
          className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase transition-all ${state.isPromoPreview ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
        >
          Promocional
        </button>
      </div>

      <button
        onClick={handlers.onAddExtraField}
        className="px-5 py-3 bg-blue-50 text-blue-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all flex items-center gap-2 shadow-sm border border-blue-100 active:scale-95 shrink-0"
      >
        <i className="bi bi-fonts" /> Texto+
      </button>

      <div className="h-8 w-px bg-slate-200" />

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex flex-col items-center gap-1">
          <div className="relative">
            <button
              className="w-9 h-9 rounded-xl border-2 border-slate-200 shadow-sm transition-all hover:scale-110 active:scale-90"
              style={{
                backgroundColor:
                  state.activeBackground === 'transparent' ? '#fff' : state.activeBackground,
              }}
            >
              <input
                type="color"
                value={state.activeBackground === 'transparent' ? '#ffffff' : state.activeBackground}
                onChange={(event) => handlers.onUpdateStyle('bg', event.target.value)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              {state.activeBackground === 'transparent' ? (
                <div className="absolute inset-x-0 top-1/2 h-0.5 bg-red-500 -rotate-45" />
              ) : null}
              <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow-sm border border-slate-100">
                <i
                  className={`bi bi-${state.selectedElement ? 'square-fill' : 'card-heading'} text-[8px] text-slate-500`}
                />
              </div>
            </button>
            {state.activeBackground !== 'transparent' && (
              <button
                onClick={() => handlers.onUpdateStyle('bg', 'transparent')}
                className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white rounded-full flex items-center justify-center text-[10px] shadow-sm hover:bg-rose-600 transition-colors"
              >
                <i className="bi bi-x" />
              </button>
            )}
          </div>
        </div>

        <div className="h-8 w-px bg-slate-200 mx-1" />

        <button
          onClick={handlers.onToggleSnap}
          title={state.snapEnabled ? 'Desativar Ímã de Centro' : 'Ativar Ímã de Centro'}
          className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all ${state.snapEnabled ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600'}`}
        >
          <i className={`bi bi-magnet${state.snapEnabled ? '-fill' : ''} text-base`} />
        </button>

        <div className="h-6 w-px bg-slate-200 mx-1" />

        <div className="relative">
          <button
            disabled={state.isInactive}
            onClick={() => handlers.onToggleColorPalette(!state.showColorPalette)}
            className={`flex flex-col items-center px-2 py-1 rounded-xl transition-all ${state.showColorPalette ? 'bg-slate-100' : 'hover:bg-slate-50'} ${state.isInactive ? 'opacity-30 cursor-not-allowed' : ''}`}
          >
            <span className="text-[12px] font-black leading-none" style={{ color: state.activeColor }}>
              A
            </span>
            <div
              className="h-[2.5px] w-4 mt-0.5 rounded-full"
              style={{ backgroundColor: state.activeColor }}
            />
          </button>
          {state.showColorPalette && (
            <>
              <div
                className="fixed inset-0 z-[1000]"
                onClick={() => handlers.onToggleColorPalette(false)}
              />
              <div className="absolute top-full left-0 mt-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-3 rounded-2xl shadow-2xl z-[1001] w-48">
                <div className="grid grid-cols-5 gap-2">
                  {[
                    '#000000',
                    '#ffffff',
                    '#ef4444',
                    '#f97316',
                    '#f59e0b',
                    '#eab308',
                    '#84cc16',
                    '#22c55e',
                    '#10b981',
                    '#14b8a6',
                    '#06b6d4',
                    '#0ea5e9',
                    '#3b82f6',
                    '#6366f1',
                    '#8b5cf6',
                    '#a855f7',
                    '#d946ef',
                    '#ec4899',
                    '#f43f5e',
                  ].map((color) => (
                    <button
                      key={color}
                      onClick={() => handlers.onUpdateStyle('color', color)}
                      className="w-6 h-6 rounded-md hover:scale-125 transition-transform"
                      style={{
                        backgroundColor: color,
                        border: color.toLowerCase() === '#ffffff' ? '1px solid #ddd' : 'none',
                      }}
                    >
                      {state.activeColor.toLowerCase() === color.toLowerCase() && (
                        <i
                          className={`bi bi-check text-[10px] ${color.toLowerCase() === '#ffffff' ? 'text-black' : 'text-white'}`}
                        />
                      )}
                    </button>
                  ))}
                </div>
                <div className="h-px bg-slate-50 my-2" />
                <div className="relative group">
                  <button className="w-full text-[7px] font-black uppercase text-slate-400 py-1">
                    Mais...
                  </button>
                  <input
                    type="color"
                    value={state.activeColor}
                    onChange={(event) => handlers.onUpdateStyle('color', event.target.value)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                </div>
              </div>
            </>
          )}
        </div>

        <div
          className={`flex flex-col items-center gap-0.5 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-xl ${state.isInactive ? 'opacity-30' : ''}`}
        >
          <span className="text-[7px] font-black uppercase text-slate-400">Base</span>
          <input
            disabled={state.isInactive}
            type="number"
            value={Math.round(state.activeSize)}
            onChange={(event) => handlers.onUpdateStyle('size', parseInt(event.target.value) || 1)}
            className="w-9 bg-transparent border-none text-[11px] font-black text-center outline-none cursor-pointer"
          />
        </div>

        {(state.selectedElement === 'mainPrice' || state.selectedElement === 'oldPrice') && (
          <div className="flex items-center gap-1.5 animate-in slide-in-from-left-2 duration-300">
            <div className="h-6 w-px bg-slate-200 mx-1" />
            <div className="flex flex-col items-center gap-0.5 bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded-xl border border-slate-100">
              <span className="text-[6px] font-black uppercase text-slate-400">10+</span>
              <input
                type="number"
                value={state.priceFontSizes.tens || 0}
                onChange={(event) =>
                  handlers.onPriceFontSizeChange('tens', parseInt(event.target.value) || 0)
                }
                className="w-8 bg-transparent border-none text-[10px] font-black text-center outline-none text-slate-600"
              />
            </div>
            <div className="flex flex-col items-center gap-0.5 bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded-xl border border-slate-100">
              <span className="text-[6px] font-black uppercase text-slate-400">100+</span>
              <input
                type="number"
                value={state.priceFontSizes.hundreds || 0}
                onChange={(event) =>
                  handlers.onPriceFontSizeChange('hundreds', parseInt(event.target.value) || 0)
                }
                className="w-8 bg-transparent border-none text-[10px] font-black text-center outline-none text-slate-600"
              />
            </div>
            <div className="flex flex-col items-center gap-0.5 bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded-xl border border-slate-100">
              <span className="text-[6px] font-black uppercase text-slate-400">1k+</span>
              <input
                type="number"
                value={state.priceFontSizes.thousands || 0}
                onChange={(event) =>
                  handlers.onPriceFontSizeChange('thousands', parseInt(event.target.value) || 0)
                }
                className="w-8 bg-transparent border-none text-[10px] font-black text-center outline-none text-slate-600"
              />
            </div>
            <div className="flex flex-col items-center gap-0.5 bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded-xl border border-slate-100">
              <span className="text-[6px] font-black uppercase text-slate-400">10k+</span>
              <input
                type="number"
                value={state.priceFontSizes.tenThousands || 0}
                onChange={(event) =>
                  handlers.onPriceFontSizeChange('tenThousands', parseInt(event.target.value) || 0)
                }
                className="w-8 bg-transparent border-none text-[10px] font-black text-center outline-none text-slate-600"
              />
            </div>
          </div>
        )}

        <button
          disabled={state.isInactive}
          onClick={() => handlers.onUpdateStyle('bold', !state.activeBold)}
          className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all ${state.activeBold ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600'} ${state.isInactive ? 'opacity-30 cursor-not-allowed' : ''}`}
        >
          <i className="bi bi-type-bold text-base" />
        </button>

        <div className="h-6 w-px bg-slate-200 mx-1" />

        <button
          disabled={state.isInactive}
          onClick={handlers.onCycleAlign}
          className={`w-9 h-9 flex items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-xl hover:bg-slate-200 transition-all text-slate-600 ${state.isInactive ? 'opacity-30 cursor-not-allowed' : ''}`}
        >
          <i
            className={`bi bi-text-${state.activeAlign === 'center' ? 'center' : state.activeAlign === 'left' ? 'left' : 'right'} text-base`}
          />
        </button>

        <button
          onClick={handlers.onCycleVerticalAlign}
          className="p-3 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all shadow-sm flex flex-col items-center gap-1 group"
        >
          <i
            className={`bi bi-align-${state.activeVerticalAlign === 'middle' ? 'center' : state.activeVerticalAlign} text-slate-600`}
          />
          <span className="text-[7px] font-black uppercase text-slate-400 group-hover:text-blue-500">
            Vert
          </span>
        </button>
      </div>

      <div className="h-8 w-px bg-slate-200 mx-2" />

      <div className="flex items-center gap-2">
        <i className="bi bi-fonts text-slate-400" />
        <select
          value={state.fontFamily}
          onChange={(event) => handlers.onFontFamilyChange(event.target.value)}
          className="bg-slate-50 border-none text-[10px] font-bold px-3 py-2 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 shadow-sm min-w-[120px]"
        >
          <option value="Inter">Inter (Padrão)</option>
          <option value="Montserrat">Montserrat</option>
          <option value="Oswald">Oswald</option>
          <option value="Roboto">Roboto</option>
          <option value="Playfair Display">Playfair</option>
          <option value="Bebas Neue">Bebas Neue</option>
          <option value="Libre Barcode 128">Barcode Font</option>
        </select>
      </div>

      <div className="h-8 w-px bg-slate-200 mx-2" />

      {state.selectedElement === 'mainPrice' && (
        <div className="flex items-center gap-2 bg-blue-50/50 p-1 rounded-2xl border border-blue-100">
          <span className="text-[8px] font-black text-blue-600 uppercase px-3">
            Preço: {state.priceFormat === 'split' ? 'Separado' : 'Unificado'}
          </span>
          <button
            onClick={handlers.onTogglePriceFormat}
            className={`px-4 py-1.5 rounded-xl text-[8px] font-black uppercase transition-all ${state.priceFormat === 'split' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-white text-slate-400 hover:bg-blue-100'}`}
          >
            {state.priceFormat === 'split' ? 'Mudar p/ Unificado' : 'Mudar p/ Separado'}
          </button>
        </div>
      )}
    </div>

    <div className="flex items-center gap-4 shrink-0">
      <div className="flex flex-col items-end">
        <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">
          Selecionado
        </span>
        <span className="text-[10px] font-black uppercase tracking-tighter text-blue-600 truncate max-w-[120px]">
          {state.selectedElement === 'name'
            ? 'Produto'
            : state.selectedElement === 'mainPrice'
              ? 'Preço Principal'
              : state.selectedElement === 'oldPrice'
                ? 'Preço Antigo'
                : state.selectedElement === 'priceSymbol'
                  ? 'Símbolo R$'
                  : state.selectedElement === 'priceDecimals'
                    ? 'Centavos'
                    : 'Nenhum'}
        </span>
      </div>
      {state.selectedElement && (
        <button
          onClick={handlers.onClearSelection}
          className="w-9 h-9 flex items-center justify-center bg-rose-50 text-rose-500 rounded-xl transition-all hover:bg-rose-500 hover:text-white"
        >
          <i className="bi bi-x-lg text-sm" />
        </button>
      )}
    </div>
  </div>
);
