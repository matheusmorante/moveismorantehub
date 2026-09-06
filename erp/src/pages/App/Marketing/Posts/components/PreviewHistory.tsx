import React from 'react';
import { PostPreviewCache } from '../types/postCreator';

type Props = {
  previews: PostPreviewCache[]; selectedId?: string; currentHash?: string; busy: boolean;
  onSelect: (preview: PostPreviewCache) => void; onAccept: (preview: PostPreviewCache) => void;
  onPin: (preview: PostPreviewCache) => void; onDelete: (preview: PostPreviewCache) => void;
  onRegenerate: () => void;
};

export function PreviewHistory({ previews, selectedId, currentHash, busy, onSelect, onAccept, onPin, onDelete, onRegenerate }: Props) {
  if (!previews.length) return null;
  const selected = previews.find(item => item.id === selectedId);
  return <section className="mt-5 w-full border-t border-slate-800 pt-4">
    <div className="flex items-center justify-between gap-3">
      <div><h2 className="text-sm font-bold">Histórico</h2><p className="text-[11px] text-slate-400">Até 10 gerações; aceitas e fixadas são protegidas.</p></div>
      <button type="button" onClick={onRegenerate} disabled={busy} className="rounded border border-indigo-400 px-3 py-2 text-xs text-indigo-200 disabled:opacity-50">Gerar novamente</button>
    </div>
    {selected && <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg bg-slate-950/70 p-3 text-xs">
      {selected.accepted ? <span className="font-bold text-emerald-300">✓ Preview aceito</span> : <button type="button" onClick={() => onAccept(selected)} className="rounded bg-emerald-500 px-3 py-1.5 font-bold text-slate-950">Aceitar</button>}
      <button type="button" onClick={() => onPin(selected)} className="rounded border border-slate-600 px-3 py-1.5">{selected.pinned ? 'Desafixar' : 'Fixar'}</button>
      <button type="button" onClick={() => onDelete(selected)} className="rounded border border-red-500/60 px-3 py-1.5 text-red-300">Excluir</button>
      {currentHash && selected.inputHash !== currentHash && <span className="rounded bg-amber-400 px-2 py-1 font-bold text-slate-950">DESATUALIZADA</span>}
    </div>}
    <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
      {previews.map(item => <button type="button" key={item.id} onClick={() => onSelect(item)} className={`overflow-hidden rounded-lg border text-left ${selectedId === item.id ? 'border-indigo-400 ring-1 ring-indigo-400' : 'border-slate-700'}`}>
        <img src={item.imageUrl} alt="Geração anterior" className="aspect-[4/3] w-full object-cover" />
        <span className="flex min-h-10 items-center justify-between gap-1 bg-slate-950 p-2 text-[10px]">
          <span>{new Date(item.createdAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
          <span>{item.accepted ? '✓' : item.pinned ? '📌' : currentHash && item.inputHash !== currentHash ? 'Antiga' : 'Usar'}</span>
        </span>
      </button>)}
    </div>
  </section>;
}
