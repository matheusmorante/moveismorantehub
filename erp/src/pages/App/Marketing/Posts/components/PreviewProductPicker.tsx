import React, { useEffect, useRef, useState } from 'react';
import { Product } from '@/pages/types/product.type';

type Props = { search: string; products: Product[]; selected: Product | null; loading: boolean; onSearch: (value: string) => void; onSelect: (id: string) => void };

export function PreviewProductPicker({ search, products, selected, loading, onSearch, onSelect }: Props) {
  const [open, setOpen] = useState(false); const container = useRef<HTMLDivElement>(null);
  useEffect(() => { const close = (event: MouseEvent) => { if (!container.current?.contains(event.target as Node)) setOpen(false); }; document.addEventListener('mousedown', close); return () => document.removeEventListener('mousedown', close); }, []);
  const clear = () => { onSearch(''); onSelect(''); setOpen(false); };
  const showSuggestions = open && !selected && search.trim().length >= 2;
  return <div ref={container} className="relative text-xs font-semibold">Produto para preview padrão<div className={`mt-1 flex items-center rounded border ${selected ? 'border-emerald-500/60 bg-emerald-500/10' : 'border-slate-700 bg-slate-950'}`}><i className={`bi ${selected ? 'bi-check-circle-fill text-emerald-400' : 'bi-search text-slate-500'} ml-2`} /><input value={selected ? (selected.name || selected.title || '') : search} onFocus={() => setOpen(true)} onChange={event => { onSearch(event.target.value); setOpen(true); }} placeholder="Buscar produto" className="min-w-0 flex-1 bg-transparent p-2 outline-none" />{selected && <button type="button" onClick={clear} aria-label="Limpar produto selecionado" className="px-2 text-slate-300 hover:text-white">✕</button>}</div>{selected && <p className="mt-1 text-[10px] text-emerald-300">Produto selecionado</p>}{showSuggestions && <div className="absolute z-40 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-slate-700 bg-slate-950 p-1 shadow-xl">{products.map(product => <button key={product.id} type="button" onClick={() => { onSelect(product.id || ''); setOpen(false); }} className="block w-full rounded px-3 py-2 text-left text-xs hover:bg-slate-800">{product.name || product.title}</button>)}{loading && <p className="p-3 text-slate-400">Buscando produtos…</p>}{!loading && !products.length && <p className="p-3 text-slate-500">Nenhum produto encontrado.</p>}</div>}</div>;
}
