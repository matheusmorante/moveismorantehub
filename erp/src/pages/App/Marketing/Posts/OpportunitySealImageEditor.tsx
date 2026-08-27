import { useRef, useState } from 'react';
import FixedAspectImageCropper from './FixedAspectImageCropper';

type Props = {
  image: string;
  uploading: boolean;
  onImageChange: (file: File) => void;
  onRemoveImage: () => void;
  onClose: () => void;
};

const MAX_FILE_SIZE = 2 * 1024 * 1024;

export default function OpportunitySealImageEditor({ image, uploading, onImageChange, onRemoveImage, onClose }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const selectFile = (file?: File) => {
    if (!file) return;
    if (file.size > MAX_FILE_SIZE) return alert('A imagem do selo deve ter no máximo 2 MB.');
    setCropFile(file);
  };

  return <><div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/60 p-4">
    <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900">
      <div className="flex items-center justify-between"><h4 className="text-sm font-black text-slate-800 dark:text-slate-100">Imagem do selo</h4><button type="button" onClick={onClose}><i className="bi bi-x-lg" /></button></div>
      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Proporção 8:2 (800 × 200 px). PNG, JPG ou WebP, com até 2 MB.</p>
      <button type="button" onClick={() => inputRef.current?.click()} style={{ aspectRatio: '800 / 200' }} className="relative mt-4 flex w-full items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-slate-300 bg-slate-100 dark:border-slate-700 dark:bg-slate-800">
        {image ? <img src={image} alt="Selo de oportunidade" className="h-full w-full object-contain" /> : <span className="text-xs font-bold text-slate-400"><i className="bi bi-image mr-1" />Adicionar imagem do selo</span>}
        <span className="absolute inset-x-0 bottom-0 bg-black/60 py-1 text-[10px] font-bold text-white">Clique para alterar e recortar</span>
      </button>
      <input ref={inputRef} hidden type="file" accept="image/png,image/jpeg,image/webp" onChange={event => { selectFile(event.target.files?.[0]); event.target.value = ''; }} />
      {image && <button type="button" onClick={onRemoveImage} className="mt-2 text-[10px] font-bold text-rose-600">Remover imagem</button>}
      <div className="mt-5 flex justify-end"><button type="button" disabled={uploading} onClick={onClose} className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-black text-white disabled:opacity-50">{uploading ? 'Enviando...' : 'Concluir'}</button></div>
    </div>
  </div>{cropFile && <FixedAspectImageCropper file={cropFile} kind="seal" onCancel={() => setCropFile(null)} onConfirm={file => { onImageChange(file); setCropFile(null); }} />}</>;
}
