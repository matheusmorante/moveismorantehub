import React from 'react';
import Product from '../../../../types/product.type';

export default function ProductDescriptionTab({ formData, setFormData, onImprove, improving }: { formData: Partial<Product>; setFormData: React.Dispatch<React.SetStateAction<Partial<Product>>>; onImprove?: () => void; improving?: boolean }) {
    return <div className="max-w-4xl space-y-3">
        <h3 className="text-sm font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">Descrição do produto</h3>
        <div className="flex items-center justify-between gap-3"><p className="text-xs font-semibold text-slate-400">Descreva o produto, seus diferenciais e informações importantes para o catálogo.</p>{onImprove && <button type="button" onClick={onImprove} disabled={improving} className="rounded-xl bg-purple-100 px-3 py-2 text-[10px] font-black text-purple-700 disabled:opacity-50"><i className="bi bi-stars mr-1" />{improving ? 'Aperfeiçoando...' : 'Aperfeiçoar'}</button>}</div>
        <textarea rows={18} aria-label="Descrição detalhada do produto" value={formData.description || ''} onChange={(event) => setFormData(prev => ({ ...prev, description: event.target.value }))} placeholder="Descreva o produto..." className="w-full min-h-[360px] rounded-2xl border border-slate-200 dark:border-slate-800 bg-transparent p-4 text-sm font-semibold outline-none focus:border-blue-600 resize-y dark:text-slate-200" />
    </div>;
}
