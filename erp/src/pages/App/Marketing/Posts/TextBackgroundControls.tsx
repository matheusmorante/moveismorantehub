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
};

type Props = {
  value: TextBackground;
  onChange: (value: TextBackground) => void;
};

export default function TextBackgroundControls({ value, onChange }: Props) {
  const update = <K extends keyof TextBackground>(key: K, next: TextBackground[K]) => onChange({ ...value, [key]: next });
  const spacing = (side: 'Left' | 'Right' | 'Top' | 'Bottom') => value[`padding${side}`] ?? (side === 'Left' || side === 'Right' ? value.paddingX : value.paddingY) ?? 0;

  return <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800">
    <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Fundo do texto</p>
    <label className="flex items-center justify-between gap-2 text-[10px] font-black text-slate-500">Cor
      <input type="color" value={value.color} onChange={event => update('color', event.target.value)} className="h-8 w-12 cursor-pointer rounded-lg border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-900" />
    </label>
    <p className="text-[10px] font-black text-slate-500">Espaçamento</p>
    <div className="grid grid-cols-2 gap-2">
      {([['Left', 'Esquerdo'], ['Right', 'Direito'], ['Top', 'Cima'], ['Bottom', 'Embaixo']] as const).map(([side, label]) => <label key={side} className="flex flex-col gap-1 text-[10px] font-black text-slate-500">{label}
        <input type="number" min="0" max="200" value={spacing(side)} onChange={event => update(`padding${side}`, Math.max(0, Number(event.target.value) || 0))} className="rounded-lg border border-slate-200 px-2 py-2 text-xs font-bold outline-none dark:border-slate-700 dark:bg-slate-900" />
      </label>)}
    </div>
    <label className="flex flex-col gap-1 text-[10px] font-black text-slate-500">Transparência: {Math.round((1 - value.opacity) * 100)}%
      <input type="range" min="0" max="100" value={Math.round(value.opacity * 100)} onChange={event => update('opacity', Number(event.target.value) / 100)} className="accent-pink-600" />
    </label>
  </div>;
}
