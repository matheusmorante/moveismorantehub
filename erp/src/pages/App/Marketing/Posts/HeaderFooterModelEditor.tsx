import React, { useRef, useState } from 'react';
import FixedAspectImageCropper from './FixedAspectImageCropper';

type Props = {
  name: string;
  headerImage: string;
  footerImage: string;
  uploading: boolean;
  onNameChange: (name: string) => void;
  onImageChange: (kind: 'header' | 'footer', file: File) => void;
  onRemoveImage: (kind: 'header' | 'footer') => void;
  onClose: () => void;
};

export default function HeaderFooterModelEditor(props: Props) {
  const headerInput = useRef<HTMLInputElement>(null);
  const footerInput = useRef<HTMLInputElement>(null);
  const [cropRequest, setCropRequest] = useState<{ kind: 'header' | 'footer'; file: File } | null>(null);
  const imagePicker = (kind: 'header' | 'footer', image: string, input: React.RefObject<HTMLInputElement>, size: string) => (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-300"><span>{kind === 'header' ? 'Cabeçalho' : 'Rodapé'}</span><span className="text-[10px] text-slate-400">{size}</span></div>
      <button type="button" onClick={() => input.current?.click()} style={{ aspectRatio: '1080 / 170' }} className="relative flex w-full items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-slate-300 bg-slate-100 dark:border-slate-700 dark:bg-slate-800">
        {image ? <img src={image} alt={kind} className="h-full w-full object-contain" /> : <span className="text-xs font-bold text-slate-400"><i className="bi bi-image mr-1" />Adicionar imagem</span>}
        <span className="absolute inset-x-0 bottom-0 bg-black/60 py-1 text-[10px] font-bold text-white">Clique para alterar</span>
      </button>
      <input ref={input} hidden type="file" accept="image/png,image/jpeg,image/webp" onChange={event => { const file = event.target.files?.[0]; if (file) setCropRequest({ kind, file }); event.target.value = ''; }} />
      {image && <button type="button" onClick={() => props.onRemoveImage(kind)} className="mt-1 text-[10px] font-bold text-rose-600">Remover imagem</button>}
    </div>
  );
  return <><div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/60 p-4">
    <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900">
      <div className="flex items-center justify-between"><h4 className="text-sm font-black text-slate-800 dark:text-slate-100">Cabeçalho e rodapé</h4><button type="button" onClick={props.onClose}><i className="bi bi-x-lg" /></button></div>
      <label className="mt-4 block text-xs font-bold text-slate-600 dark:text-slate-300">Nome do modelo<input value={props.name} onChange={event => props.onNameChange(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-800" /></label>
      <div className="mt-4 space-y-5">{imagePicker('header', props.headerImage, headerInput, '1080 × 170 px')}{imagePicker('footer', props.footerImage, footerInput, '1080 × 170 px')}</div>
      <button type="button" disabled={props.uploading} onClick={props.onClose} className="mt-5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-black text-white disabled:opacity-50">{props.uploading ? 'Enviando...' : 'Concluir'}</button>
    </div>
  </div>{cropRequest && <FixedAspectImageCropper file={cropRequest.file} kind={cropRequest.kind} onCancel={() => setCropRequest(null)} onConfirm={file => { props.onImageChange(cropRequest.kind, file); setCropRequest(null); }} />}</>;
}
