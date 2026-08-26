import { useRef } from 'react';

type Props = {
  images: string[];
  names: Record<string, string>;
  selected: string;
  uploading: boolean;
  onSelect: (url: string) => void;
  onNameChange: (url: string, name: string) => void;
  onUpload: (file: File) => void;
};

export default function InstallmentImageGallery({ images, names, selected, uploading, onSelect, onNameChange, onUpload }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  return <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800">
    <div><p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Imagem do parcelamento</p><p className="mt-1 text-[10px] font-medium text-slate-400">A imagem mantém qualquer proporção.</p></div>
    <div className="flex gap-2 overflow-x-auto pb-1">
      {images.map((url, index) => <div key={url} className="w-28 shrink-0">
        <button type="button" onClick={() => onSelect(url)} className={`h-16 w-full rounded-lg border p-1 ${selected === url ? 'border-pink-500 ring-2 ring-pink-500/20' : 'border-slate-200 dark:border-slate-700'}`}><img src={url} alt={names[url] || `Imagem de parcelamento ${index + 1}`} className="h-full w-full object-contain" /></button>
        <input value={names[url] || ''} onClick={event => event.stopPropagation()} onChange={event => onNameChange(url, event.target.value)} placeholder={`Parcelamento ${index + 1}`} aria-label={`Nome da imagem de parcelamento ${index + 1}`} className="mt-1 w-full rounded-md border border-slate-200 px-1.5 py-1 text-[9px] font-bold outline-none focus:border-pink-400 dark:border-slate-700 dark:bg-slate-900" />
      </div>)}
      <button type="button" disabled={uploading} onClick={() => inputRef.current?.click()} className="flex h-16 w-20 shrink-0 flex-col items-center justify-center rounded-lg border border-dashed border-pink-400 text-[9px] font-black text-pink-600 disabled:opacity-50"><i className="bi bi-plus-lg text-base" />{uploading ? 'Enviando' : 'Adicionar'}</button>
    </div>
    <input ref={inputRef} hidden type="file" accept="image/png,image/jpeg,image/webp" onChange={event => { const file = event.target.files?.[0]; if (file) onUpload(file); event.target.value = ''; }} />
  </div>;
}
