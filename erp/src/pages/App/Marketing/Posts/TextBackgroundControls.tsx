export type TextBackground = {
  color: string;
  paddingLeft?: number;
  paddingRight?: number;
  paddingTop?: number;
  paddingBottom?: number;
  // Mantidos para carregar os templates salvos antes da separação por lado.
  paddingX?: number;
  paddingY?: number;
  opacity: number;
  borderColor?: string;
  borderWidth?: number;
};

type Props = {
  value: TextBackground;
  onChange: (value: TextBackground) => void;
  title?: string;
  hideSpacing?: boolean;
};

export default function TextBackgroundControls({ value, onChange, title = 'Fundo do texto', hideSpacing = false }: Props) {
  const update = <K extends keyof TextBackground>(key: K, next: TextBackground[K]) => onChange({ ...value, [key]: next });
  const horizontalSpacing = value.paddingX ?? value.paddingLeft ?? value.paddingRight ?? 0;
  const verticalSpacing = value.paddingY ?? value.paddingTop ?? value.paddingBottom ?? 0;
  const updateHorizontalSpacing = (next: number) => onChange({ ...value, paddingX: next, paddingLeft: next, paddingRight: next });
  const updateVerticalSpacing = (next: number) => onChange({ ...value, paddingY: next, paddingTop: next, paddingBottom: next });

  return <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800">
    <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">{title}</p>
    <label className="flex items-center justify-between gap-2 text-[10px] font-black text-slate-500">Cor
      <input type="color" value={value.color} onChange={event => update('color', event.target.value)} className="h-8 w-12 cursor-pointer rounded-lg border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-900" />
    </label>
    <div className="grid grid-cols-2 gap-2">
      <label className="flex flex-col gap-1 text-[10px] font-black text-slate-500">Cor da borda<input type="color" value={value.borderColor || '#0f172a'} onChange={event => update('borderColor', event.target.value)} className="h-8 w-full cursor-pointer rounded-lg border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-900" /></label>
      <label className="flex flex-col gap-1 text-[10px] font-black text-slate-500">Borda (px)<input type="number" min="0" max="40" value={value.borderWidth || 0} onChange={event => update('borderWidth', Math.max(0, Math.min(40, Number(event.target.value) || 0)))} className="rounded-lg border border-slate-200 px-2 py-2 text-xs font-bold outline-none dark:border-slate-700 dark:bg-slate-900" /></label>
    </div>
    {!hideSpacing && <>
      <p className="text-[10px] font-black text-slate-500">Espaçamento</p>
      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-1 text-[10px] font-black text-slate-500">Horizontal
          <input type="number" min="0" max="200" value={horizontalSpacing} onChange={event => updateHorizontalSpacing(Math.max(0, Number(event.target.value) || 0))} className="rounded-lg border border-slate-200 px-2 py-2 text-xs font-bold outline-none dark:border-slate-700 dark:bg-slate-900" />
        </label>
        <label className="flex flex-col gap-1 text-[10px] font-black text-slate-500">Vertical
          <input type="number" min="0" max="200" value={verticalSpacing} onChange={event => updateVerticalSpacing(Math.max(0, Number(event.target.value) || 0))} className="rounded-lg border border-slate-200 px-2 py-2 text-xs font-bold outline-none dark:border-slate-700 dark:bg-slate-900" />
        </label>
      </div>
    </>}
    <label className="flex flex-col gap-1 text-[10px] font-black text-slate-500">Transparência: {Math.round((1 - value.opacity) * 100)}%
      <input type="range" min="0" max="100" value={Math.round(value.opacity * 100)} onChange={event => update('opacity', Number(event.target.value) / 100)} className="accent-pink-600" />
    </label>
  </div>;
}
