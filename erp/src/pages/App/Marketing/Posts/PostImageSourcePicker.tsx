export type PostImageOption = { key: string; label: string; url: string; variationName?: string };

type Props = {
  activeSlot?: 'main' | 'secondary';
  mainImageSource: string;
  options: PostImageOption[];
  secondaryImageSource: string;
  onMainImageSourceChange: (source: string) => void;
  onSecondaryImageSourceChange: (source: string) => void;
};

function ImageSlot({ label, value, options, onChange }: { label: string; value: string; options: PostImageOption[]; onChange: (value: string) => void }) {
  return <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-800">
    <p className="mb-2 px-1 text-[9px] font-black uppercase tracking-wider text-slate-400">{label}</p>
    <div className="flex gap-1.5 overflow-x-auto pb-1">
      {options.map(option => <button key={option.key} type="button" onClick={() => onChange(option.key)} className={`w-14 shrink-0 rounded-lg border p-1 text-left transition ${value === option.key ? 'border-pink-500 ring-2 ring-pink-500/20' : 'border-slate-200 hover:border-pink-300 dark:border-slate-700'}`} title={option.label}>
        <img src={option.url} alt={option.label} className="h-10 w-full rounded object-contain" />
        <span className="mt-1 block truncate text-center text-[8px] font-bold text-slate-500">{option.label.replace('Imagem ', 'Img. ')}</span>
      </button>)}
      {!options.length && <span className="px-2 py-3 text-[10px] font-bold text-slate-400">Sem imagens</span>}
    </div>
  </div>;
}

export default function PostImageSourcePicker({ activeSlot, mainImageSource, options, secondaryImageSource, onMainImageSourceChange, onSecondaryImageSourceChange }: Props) {
  return <div className="flex w-full min-w-0 shrink-0 flex-col gap-2">
    {activeSlot !== 'secondary' && <ImageSlot label="Imagem da área 1" value={mainImageSource} options={options} onChange={onMainImageSourceChange} />}
    {activeSlot !== 'main' && <ImageSlot label="Imagem da área 2" value={secondaryImageSource} options={options} onChange={onSecondaryImageSourceChange} />}
  </div>;
}
