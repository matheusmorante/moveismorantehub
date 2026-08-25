import type { HorizontalTextAlignment, VerticalTextAlignment } from './textAlignment';

type Props = {
  horizontal: HorizontalTextAlignment;
  vertical: VerticalTextAlignment;
  onHorizontalChange: (value: HorizontalTextAlignment) => void;
  onVerticalChange: (value: VerticalTextAlignment) => void;
};

const buttonClass = 'flex-1 rounded-lg border border-slate-200 bg-white py-2 text-xs font-black text-slate-600 hover:border-blue-400 hover:bg-blue-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200';
const activeClass = ' border-blue-500 bg-blue-50 text-blue-600 dark:bg-blue-950/40';

export default function TextAlignmentControls({ horizontal, vertical, onHorizontalChange, onVerticalChange }: Props) {
  return <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800">
    <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Alinhamento na área</p>
    <div className="flex gap-1">
      {([['left', 'bi-text-left', 'Esquerda'], ['center', 'bi-text-center', 'Centro'], ['right', 'bi-text-right', 'Direita']] as const).map(([value, icon, label]) => <button key={value} type="button" onClick={() => onHorizontalChange(value)} className={buttonClass + (horizontal === value ? activeClass : '')} title={label}><i className={`bi ${icon}`} /></button>)}
    </div>
    <div className="flex gap-1">
      {([['top', '↑', 'Topo'], ['middle', '↕', 'Meio'], ['bottom', '↓', 'Base']] as const).map(([value, icon, label]) => <button key={value} type="button" onClick={() => onVerticalChange(value)} className={buttonClass + (vertical === value ? activeClass : '')} title={label}>{icon}</button>)}
    </div>
  </div>;
}
