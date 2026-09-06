import React from 'react';
import { ElementModel, elementLabel } from '../types/postCreator';

type Props = { model: ElementModel; onClose: () => void };

export function ElementModelDetailsModal({ model, onClose }: Props) {
  return <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 p-4" onMouseDown={onClose}>
    <article className="w-full max-w-xl rounded-xl border border-slate-700 bg-slate-900 text-white shadow-2xl" onMouseDown={event => event.stopPropagation()}>
      <header className="flex items-start justify-between border-b border-slate-700 p-5">
        <div><p className="text-xs text-indigo-300">{elementLabel[model.elementType]}</p><h2 className="mt-1 text-lg font-bold">{model.name}</h2></div>
        <button type="button" onClick={onClose} aria-label="Fechar detalhes">✕</button>
      </header>
      <div className="space-y-5 p-5">
        <section><h3 className="text-xs font-bold uppercase tracking-wide text-slate-400">Prompt visual</h3><p className="mt-2 whitespace-pre-wrap rounded-lg bg-slate-950 p-3 text-sm text-slate-200">{model.prompt || 'Nenhum prompt visual definido.'}</p></section>
        <section><h3 className="text-xs font-bold uppercase tracking-wide text-slate-400">Anexos ({model.referenceFiles.length})</h3>{model.referenceFiles.length ? <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3">{model.referenceFiles.map(reference => <figure key={reference.id} className="overflow-hidden rounded-lg border border-slate-700"><img src={reference.fileUrl} alt={reference.name} className="h-28 w-full object-cover" /><figcaption className="truncate p-2 text-xs">{reference.name}</figcaption></figure>)}</div> : <p className="mt-2 text-sm text-slate-500">Nenhum anexo.</p>}</section>
      </div>
    </article>
  </div>;
}
