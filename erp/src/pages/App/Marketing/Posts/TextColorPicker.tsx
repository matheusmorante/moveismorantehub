import { useRef, useState } from 'react';

type Props = {
  color: string;
  label: string;
  onChange: (color: string) => void;
  onCommit: (color: string) => void;
  recentColors: string[];
};

export default function TextColorPicker({ color, label, onChange, onCommit, recentColors }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [openedColor, setOpenedColor] = useState(color);
  const [pendingColor, setPendingColor] = useState(color);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [popupPosition, setPopupPosition] = useState({ left: 12, top: 12 });
  const selectColor = (nextColor: string) => {
    onChange(nextColor);
    setPendingColor(nextColor);
  };
  const openPicker = () => {
    const rect = triggerRef.current?.getBoundingClientRect();
    const popupWidth = 384;
    const left = rect && rect.right + popupWidth + 12 <= window.innerWidth ? rect.right + 12 : Math.max(12, (rect?.left || 12) - popupWidth - 12);
    const top = Math.max(12, Math.min(rect?.top || 12, window.innerHeight - 430));
    setPopupPosition({ left, top });
    setOpenedColor(color);
    setPendingColor(color);
    setIsOpen(true);
  };
  const closePicker = () => { if (pendingColor !== openedColor) onCommit(pendingColor); setIsOpen(false); };

  return <div className="relative flex items-center gap-2">
    <span className="text-xs font-bold text-slate-600 dark:text-slate-200">Cor</span>
    <button ref={triggerRef} type="button" onClick={openPicker} className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-xl border border-slate-300 bg-white p-0.5 shadow-xs transition-all active:scale-95 dark:border-slate-700 dark:bg-slate-900" title="Alterar cor">
      <span className="h-full w-full rounded-lg border border-white/60" style={{ backgroundColor: color }} />
    </button>
    <output className="w-18 font-mono text-[10px] font-bold uppercase text-slate-400">{color}</output>

    {isOpen && <>
      <div style={{ left: popupPosition.left, top: popupPosition.top }} className="fixed z-[10000] w-[calc(100%-2rem)] max-w-md rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400"><i className="bi bi-palette-fill" /></span>
            <div><h3 className="text-sm font-black uppercase tracking-tight text-slate-800 dark:text-white">Cor do texto</h3><p className="text-[10px] font-bold text-slate-400">{label}</p></div>
          </div>
          <button type="button" onClick={closePicker} className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800" aria-label="Fechar"><i className="bi bi-x-lg" /></button>
        </div>
        <div className="mb-4 flex items-center gap-3">
          <label className="relative flex h-11 w-11 cursor-pointer items-center justify-center overflow-hidden rounded-xl border border-slate-300 bg-gradient-to-r from-red-500 via-green-500 to-blue-500 p-0.5 shadow-md transition-all hover:scale-105 active:scale-95 dark:border-slate-700">
            <input type="color" value={color} onChange={event => selectColor(event.target.value)} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" />
            <span className="h-full w-full rounded-lg border border-white/60" style={{ backgroundColor: color }} />
          </label>
          <div><p className="text-[9px] font-bold uppercase text-slate-400">Cor da fonte</p><output className="font-mono text-sm font-black uppercase text-slate-800 dark:text-slate-200">{color}</output></div>
        </div>
        <div className="border-t border-slate-200 pt-3 dark:border-slate-800"><p className="mb-2 text-[9px] font-bold uppercase tracking-wider text-slate-400">Cores recentes</p><div className="flex flex-wrap gap-1.5">{recentColors.map(recentColor => <button key={recentColor} type="button" onClick={() => selectColor(recentColor)} className={`h-7 w-7 rounded-lg border shadow-2xs transition-all hover:scale-110 active:scale-95 ${recentColor.toLowerCase() === color.toLowerCase() ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-slate-300/40 dark:border-slate-700/60'}`} style={{ backgroundColor: recentColor }} title={recentColor} />)}</div></div>
      </div>
    </>}
  </div>;
}
