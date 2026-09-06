import React from 'react';

interface Props {
  showTitle: boolean;
  setShowTitle: (val: boolean) => void;
  showDe: boolean;
  setShowDe: (val: boolean) => void;
  showNormalPrice: boolean;
  setShowNormalPrice: (val: boolean) => void;
  showPor: boolean;
  setShowPor: (val: boolean) => void;
  showCurrency: boolean;
  setShowCurrency: (val: boolean) => void;
  showPromoPrice: boolean;
  setShowPromoPrice: (val: boolean) => void;
  showCents: boolean;
  setShowCents: (val: boolean) => void;
  showInstallments: boolean;
  setShowInstallments: (val: boolean) => void;
  showSafetyMargin: boolean;
  setShowSafetyMargin: (val: boolean) => void;
  onResetPositions: () => void;
}

export const PriceLabelEditorToolbar: React.FC<Props> = ({
  showTitle,
  setShowTitle,
  showDe,
  setShowDe,
  showNormalPrice,
  setShowNormalPrice,
  showPor,
  setShowPor,
  showCurrency,
  setShowCurrency,
  showPromoPrice,
  setShowPromoPrice,
  showCents,
  setShowCents,
  showInstallments,
  setShowInstallments,
  showSafetyMargin,
  setShowSafetyMargin,
  onResetPositions,
}) => {
  return (
    <div className="w-64 bg-slate-900 text-slate-200 border-r border-slate-800 p-4 flex flex-col gap-4 overflow-y-auto">
      <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
        Camadas Visíveis
      </div>

      <div className="flex flex-col gap-2">
        <label className="flex items-center justify-between p-2 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-xs cursor-pointer">
          <span>Título / Descrição</span>
          <input
            type="checkbox"
            checked={showTitle}
            onChange={(e) => setShowTitle(e.target.checked)}
            className="rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-0"
          />
        </label>

        <label className="flex items-center justify-between p-2 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-xs cursor-pointer">
          <span>Texto "De"</span>
          <input
            type="checkbox"
            checked={showDe}
            onChange={(e) => setShowDe(e.target.checked)}
            className="rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-0"
          />
        </label>

        <label className="flex items-center justify-between p-2 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-xs cursor-pointer">
          <span>Preço De (Riscado)</span>
          <input
            type="checkbox"
            checked={showNormalPrice}
            onChange={(e) => setShowNormalPrice(e.target.checked)}
            className="rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-0"
          />
        </label>

        <label className="flex items-center justify-between p-2 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-xs cursor-pointer">
          <span>Texto "Por"</span>
          <input
            type="checkbox"
            checked={showPor}
            onChange={(e) => setShowPor(e.target.checked)}
            className="rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-0"
          />
        </label>

        <label className="flex items-center justify-between p-2 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-xs cursor-pointer">
          <span>Símbolo "R$"</span>
          <input
            type="checkbox"
            checked={showCurrency}
            onChange={(e) => setShowCurrency(e.target.checked)}
            className="rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-0"
          />
        </label>

        <label className="flex items-center justify-between p-2 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-xs cursor-pointer">
          <span>Preço Principal</span>
          <input
            type="checkbox"
            checked={showPromoPrice}
            onChange={(e) => setShowPromoPrice(e.target.checked)}
            className="rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-0"
          />
        </label>

        <label className="flex items-center justify-between p-2 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-xs cursor-pointer">
          <span>Centavos ",00"</span>
          <input
            type="checkbox"
            checked={showCents}
            onChange={(e) => setShowCents(e.target.checked)}
            className="rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-0"
          />
        </label>

        <label className="flex items-center justify-between p-2 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-xs cursor-pointer">
          <span>Parcelamento</span>
          <input
            type="checkbox"
            checked={showInstallments}
            onChange={(e) => setShowInstallments(e.target.checked)}
            className="rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-0"
          />
        </label>
      </div>

      <div className="pt-4 border-t border-slate-800 flex flex-col gap-2">
        <label className="flex items-center justify-between p-2 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-xs cursor-pointer">
          <span>Margem de Segurança</span>
          <input
            type="checkbox"
            checked={showSafetyMargin}
            onChange={(e) => setShowSafetyMargin(e.target.checked)}
            className="rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-0"
          />
        </label>

        <button
          onClick={onResetPositions}
          className="mt-2 w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg transition-colors border border-slate-700"
        >
          Resetar Posições
        </button>
      </div>
    </div>
  );
};
