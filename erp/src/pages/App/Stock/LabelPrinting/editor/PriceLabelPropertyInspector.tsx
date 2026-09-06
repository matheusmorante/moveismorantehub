import React from 'react';
import { PriceLabelLayerKey, FONT_OPTIONS } from './PriceLabelArtEditorTypes';

interface Props {
  selectedElement: PriceLabelLayerKey;
  activeFontFamily: string;
  activeFontSize: number;
  activeColor: string;
  colorHistory: string[];
  onFontChange: (fontVal: string) => void;
  onFontSizeChange: (size: number) => void;
  onColorSelect: (color: string) => void;
}

export const PriceLabelPropertyInspector: React.FC<Props> = ({
  selectedElement,
  activeFontFamily,
  activeFontSize,
  activeColor,
  colorHistory,
  onFontChange,
  onFontSizeChange,
  onColorSelect,
}) => {
  if (!selectedElement) {
    return (
      <div className="w-72 bg-slate-900 text-slate-400 border-l border-slate-800 p-4 text-xs flex flex-col justify-center items-center text-center">
        <span className="text-2xl mb-2">👆</span>
        Clique em qualquer elemento na etiqueta para editar suas propriedades de fonte, tamanho e cor.
      </div>
    );
  }

  return (
    <div className="w-72 bg-slate-900 text-slate-200 border-l border-slate-800 p-4 flex flex-col gap-4 overflow-y-auto">
      <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
        Inspetor: <span className="text-blue-400 font-semibold">{selectedElement}</span>
      </div>

      {/* Família de Fonte */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs text-slate-400">Família de Fonte</label>
        <select
          value={activeFontFamily}
          onChange={(e) => onFontChange(e.target.value)}
          className="bg-slate-800 border border-slate-700 text-slate-200 rounded-lg p-2 text-xs focus:ring-1 focus:ring-blue-500"
        >
          {FONT_OPTIONS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
      </div>

      {/* Tamanho da Fonte */}
      <div className="flex flex-col gap-1.5">
        <div className="flex justify-between items-center text-xs">
          <label className="text-slate-400">Tamanho da Fonte</label>
          <span className="font-mono text-blue-400 font-bold">{activeFontSize}px</span>
        </div>
        <input
          type="range"
          min={8}
          max={200}
          value={activeFontSize}
          onChange={(e) => onFontSizeChange(parseInt(e.target.value, 10))}
          className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
        />
      </div>

      {/* Seletor de Cores */}
      <div className="flex flex-col gap-2 pt-2 border-t border-slate-800">
        <label className="text-xs text-slate-400">Cor do Elemento</label>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={activeColor}
            onChange={(e) => onColorSelect(e.target.value)}
            className="w-8 h-8 rounded border-0 bg-transparent cursor-pointer"
          />
          <input
            type="text"
            value={activeColor}
            onChange={(e) => onColorSelect(e.target.value)}
            className="flex-1 bg-slate-800 border border-slate-700 text-slate-200 rounded-lg p-1.5 text-xs font-mono"
          />
        </div>

        {/* Histórico Recente de Cores */}
        <div className="flex flex-wrap gap-1.5 mt-2">
          {colorHistory.map((c, i) => (
            <button
              key={i}
              onClick={() => onColorSelect(c)}
              style={{ backgroundColor: c }}
              className="w-6 h-6 rounded-md border border-slate-700 hover:scale-110 transition-transform"
              title={c}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
