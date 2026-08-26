import type { ChangeEvent } from 'react';
import { getSideGridCellSize, type ImageGridSettings } from './postImageGrid';

type Props = {
  additionalImageCount: number;
  settings: ImageGridSettings;
  onChange: (settings: ImageGridSettings) => void;
};

const inputClass = 'rounded-lg border border-slate-200 px-2 py-2 text-xs font-bold outline-none dark:border-slate-700 dark:bg-slate-900';

export default function ImageGridControls({ additionalImageCount, settings, onChange }: Props) {
  const sideGrid = getSideGridCellSize(settings, additionalImageCount);
  const mainWidth = settings.gridWidth - settings.gapX - sideGrid.size;
  const update = <K extends keyof ImageGridSettings>(key: K, value: ImageGridSettings[K]) => onChange({ ...settings, [key]: value });
  const number = (key: keyof ImageGridSettings, minimum: number, fallback: number) => (event: ChangeEvent<HTMLInputElement>) => update(key, Math.max(minimum, Number(event.target.value) || fallback) as never);

  return <div className="flex flex-col gap-3 rounded-xl border border-blue-200 bg-white p-3 dark:border-blue-900 dark:bg-slate-800">
    <p className="text-[9px] font-black uppercase tracking-wider text-blue-500">Configurações do grid</p>
    <div className="grid grid-cols-2 gap-2">
      <label className="flex flex-col gap-1 text-[10px] font-black text-slate-500">Largura total<input type="number" min="400" max="1200" value={settings.gridWidth} onChange={number('gridWidth', 400, 400)} className={inputClass} /></label>
      <label className="flex flex-col gap-1 text-[10px] font-black text-slate-500">Altura total<input type="number" min="200" max="1200" value={settings.gridHeight} onChange={number('gridHeight', 200, 200)} className={inputClass} /></label>
      <label className="flex flex-col gap-1 text-[10px] font-black text-slate-500">Gap colunas<input type="number" min="0" max="300" value={settings.gapX} onChange={number('gapX', 0, 0)} className={inputClass} /></label>
      <label className="flex flex-col gap-1 text-[10px] font-black text-slate-500">Gap linhas<input type="number" min="0" max="300" value={settings.gapY} onChange={number('gapY', 0, 0)} className={inputClass} /></label>
    </div>
    <label className="flex flex-col gap-1 text-[10px] font-black text-slate-500">Escala: {settings.scale}%<input type="range" min="50" max="120" value={settings.scale} onChange={event => update('scale', Number(event.target.value))} className="accent-blue-600" /></label>
    <div className="grid grid-cols-2 gap-2 rounded-lg bg-slate-50 p-2 text-[10px] font-black text-slate-500 dark:bg-slate-900">
      <span>Linhas coluna 2</span><output className="text-right">{sideGrid.rightRowCount}</output>
      <span>Células 1:1</span><output className="text-right">{Math.round(sideGrid.size)} × {Math.round(sideGrid.size)} px</output>
      <span>Coluna 1 automática</span><output className="text-right">{Math.round(mainWidth)} px</output>
    </div>
    <div className="flex flex-col gap-2 border-t border-slate-200 pt-3 dark:border-slate-700">
      <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Mais variações</p>
      <label className="flex flex-col gap-1 text-[10px] font-black text-slate-500">Texto<input value={settings.moreColorsText} onChange={event => update('moreColorsText', event.target.value)} className={inputClass} /></label>
      <label className="flex items-center justify-between text-[10px] font-black text-slate-500">Cor da camada<input type="color" value={settings.moreColorsColor} onChange={event => update('moreColorsColor', event.target.value)} className="h-8 w-12 rounded border border-slate-200 p-1 dark:border-slate-700" /></label>
      <label className="flex flex-col gap-1 text-[10px] font-black text-slate-500">Transparência: {Math.round((1 - settings.moreColorsOpacity) * 100)}%<input type="range" min="0" max="100" value={Math.round(settings.moreColorsOpacity * 100)} onChange={event => update('moreColorsOpacity', Number(event.target.value) / 100)} className="accent-blue-600" /></label>
    </div>
    <div className="rounded-lg border border-dashed border-blue-200 p-2 text-[9px] font-bold leading-relaxed text-slate-400 dark:border-blue-900">
      Sem variações: 1 célula na coluna 1 e 2 na coluna 2. Com variações: foto 2 da variação 1 primeiro; depois, foto 1 das demais. A coluna 2 diminui e a coluna 1 compensa automaticamente.
    </div>
  </div>;
}
