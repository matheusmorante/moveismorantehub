export type TextBackground = {
  color: string;
  paddingX: number;
  paddingY: number;
  opacity: number;
};

type Props = {
  value: TextBackground;
  onChange: (value: TextBackground) => void;
};

export default function TextBackgroundControls({ value, onChange }: Props) {
  const update = <K extends keyof TextBackground>(key: K, next: TextBackground[K]) => onChange({ ...value, [key]: next });

  return <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800">
    <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Fundo do texto</p>
    <label className="flex items-center justify-between gap-2 text-[10px] font-black text-slate-500">Cor
      <input type="color" value={value.color} onChange={event => update('color', event.target.value)} className="h-8 w-12 cursor-pointer rounded-lg border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-900" />
    </label>
    <label className="flex flex-col gap-1 text-[10px] font-black text-slate-500">Padding horizontal
      <input type="number" min="0" max="200" value={value.paddingX} onChange={event => update('paddingX', Math.max(0, Number(event.target.value) || 0))} className="rounded-lg border border-slate-200 px-2 py-2 text-xs font-bold outline-none dark:border-slate-700 dark:bg-slate-900" />
    </label>
    <label className="flex flex-col gap-1 text-[10px] font-black text-slate-500">Padding vertical
      <input type="number" min="0" max="200" value={value.paddingY} onChange={event => update('paddingY', Math.max(0, Number(event.target.value) || 0))} className="rounded-lg border border-slate-200 px-2 py-2 text-xs font-bold outline-none dark:border-slate-700 dark:bg-slate-900" />
    </label>
    <label className="flex flex-col gap-1 text-[10px] font-black text-slate-500">Transparência: {Math.round((1 - value.opacity) * 100)}%
      <input type="range" min="0" max="100" value={Math.round(value.opacity * 100)} onChange={event => update('opacity', Number(event.target.value) / 100)} className="accent-pink-600" />
    </label>
  </div>;
}
