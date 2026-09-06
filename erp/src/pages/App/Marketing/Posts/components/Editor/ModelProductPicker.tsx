import React, { useEffect, useRef, useState } from 'react';
import { usePostEditor } from './usePostEditor';
export function ModelProductPicker({ editor: e, onSelected }: { editor: ReturnType<typeof usePostEditor>; onSelected?: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (!open) e.setSearch(''); }, [open]);
  const select = async (id: string) => { await e.selectProduct(id); onSelected?.(id); setOpen(false); };
  const loadMore = () => {
    const node = listRef.current;
    if (node && node.scrollTop + node.clientHeight >= node.scrollHeight - 48 && !e.loading && e.products.length < e.total) e.setPage(e.page + 1);
  };
  return <div className="relative">
    <button title="Usado somente para visualizar o template" onClick={() => setOpen(value => !value)}
      className="h-9 max-w-64 rounded-md border border-slate-700 bg-slate-900 px-3 text-xs text-left hover:border-slate-500 flex items-center gap-2">
      <i className="bi bi-eye text-indigo-300" />
      <span className="truncate">{e.product ? e.product.name || e.product.title : 'Produto de preview'}</span>
      {e.product && <span onClick={event => { event.stopPropagation(); void select(''); }} className="text-slate-400 hover:text-white" aria-label="Limpar produto de preview">×</span>}
      <i className="bi bi-chevron-down text-[10px]" />
    </button>
    {open && <div className="absolute right-0 top-11 z-50 w-80 rounded-lg border border-slate-700 bg-slate-900 p-2 shadow-2xl">
      <label className="sr-only" htmlFor="template-model-product">Buscar produto de preview</label>
      <div className="relative"><i className="bi bi-search absolute left-2 top-2 text-slate-500" /><input id="template-model-product" autoFocus aria-label="Buscar produto de preview"
        className="w-full rounded bg-slate-950 py-2 pl-7 pr-2 text-xs outline-none ring-indigo-500 focus:ring-1" placeholder="Buscar produto..."
        value={e.search} onChange={event => e.setSearch(event.target.value)} /></div>
      <div ref={listRef} onScroll={loadMore} className="mt-2 max-h-64 overflow-y-auto">
        {e.products.filter(product => !!product.id).map(product => <button key={product.id} onClick={() => void select(product.id!)} className="block w-full rounded px-2 py-2 text-left text-xs hover:bg-slate-800">
          {product.name || product.title}
        </button>)}
        {!e.loading && e.products.length === 0 && <p className="p-3 text-center text-xs text-slate-500">Nenhum produto encontrado.</p>}
        {e.loading && <p className="p-3 text-center text-xs text-slate-400">Buscando produtos…</p>}
      </div>
      <p className="px-1 pt-2 text-[10px] text-slate-500">Usado somente para visualizar o template.</p>
    </div>}
  </div>;
}
