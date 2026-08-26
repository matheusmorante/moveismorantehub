import type { PostImageOption } from './PostImageSourcePicker';

type Props = {
  options: PostImageOption[];
  selectedSource: string;
  fallbackText: string;
  values: Record<string, string>;
  onSelect: (source: string) => void;
  onChange: (source: string, value: string) => void;
};

export default function InstallmentByImageGallery({ options, selectedSource, fallbackText, values, onSelect, onChange }: Props) {
  const text = values[selectedSource] ?? fallbackText;

  return <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800">
    <div>
      <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Parcelamento por foto</p>
      <p className="mt-1 text-[10px] font-medium text-slate-400">Escolha uma foto e defina o texto que aparecerá quando ela for a foto principal.</p>
    </div>
    <div className="flex gap-1.5 overflow-x-auto pb-1">
      {options.map(option => <button key={option.key} type="button" onClick={() => onSelect(option.key)} className={`w-16 shrink-0 rounded-lg border p-1 transition ${selectedSource === option.key ? 'border-pink-500 ring-2 ring-pink-500/20' : 'border-slate-200 hover:border-pink-300 dark:border-slate-700'}`} title={option.label}>
        <img src={option.url} alt={option.label} className="h-11 w-full rounded object-contain" />
        <span className="mt-1 block truncate text-center text-[8px] font-bold text-slate-500">{option.label.replace('Imagem ', 'Img. ')}</span>
      </button>)}
      {!options.length && <span className="py-2 text-[10px] font-bold text-slate-400">Sem fotos disponíveis.</span>}
    </div>
    {selectedSource && <label className="flex flex-col gap-1 text-[10px] font-black text-slate-500">Texto desta foto
      <input value={text} onChange={event => onChange(selectedSource, event.target.value)} placeholder={fallbackText} className="rounded-lg border border-slate-200 px-2 py-2 text-xs font-bold outline-none dark:border-slate-700 dark:bg-slate-900" />
    </label>}
  </div>;
}
