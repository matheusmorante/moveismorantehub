import React, { useMemo, useState } from 'react';
import { TechnicalCombobox } from './TechnicalCombobox';
import { TechnicalFieldDefinition } from '@/pages/utils/technicalValuesService';
import { normalizeSearchTerm } from '@/pages/utils/textUtils';

type Props = { field: TechnicalFieldDefinition; value: any; disabled?: boolean; isInvalid?: boolean; onChange: (value: any) => void };

export const TechnicalFieldInput: React.FC<Props> = ({ field, value, disabled, isInvalid, onChange }) => {
    const type = field.dataType || 'list';
    const maxLength = 120;
    if (type === 'text_short' || type === 'text') return <input value={value ?? ''} maxLength={maxLength} disabled={disabled} onChange={e => onChange(e.target.value)} className="w-full border-b-2 border-slate-300 bg-transparent py-2 text-xs outline-none focus:border-blue-600" />;
    if (type === 'integer' || type === 'number') return <input type="number" step="1" value={value ?? ''} disabled={disabled} onChange={e => onChange(e.target.value === '' ? '' : Number(e.target.value))} className="w-full border-b-2 border-slate-300 bg-transparent py-2 text-xs outline-none focus:border-blue-600" />;
    if (type === 'decimal' || type === 'measure') return <input type="number" step="any" value={value ?? ''} disabled={disabled} onChange={e => onChange(e.target.value === '' ? '' : Number(e.target.value))} className="w-full border-b-2 border-slate-300 bg-transparent py-2 text-xs outline-none focus:border-blue-600" />;
    if (type === 'radio') return <div className="flex flex-wrap gap-2">{field.options.map(o => <label key={o.id || o.value} className="text-xs"><input type="radio" disabled={disabled} checked={value === o.value} onChange={() => onChange(o.value)} /> <span className="ml-1">{o.value}</span></label>)}</div>;
    if (type === 'multi_select') {
        const selected = Array.isArray(value) ? value : value ? String(value).split(',').map(v => v.trim()).filter(Boolean) : [];
        return <MultiSelect options={field.options} selected={selected} disabled={disabled} onChange={onChange} />;
    }
    return <TechnicalCombobox fieldName={field.name} value={Array.isArray(value) ? value.join(', ') : value ?? ''} options={field.options} isInvalid={isInvalid} disabled={disabled} onChange={onChange} />;
};

function MultiSelect({ options, selected, disabled, onChange }: { options: readonly { id?: string; value: string }[]; selected: string[]; disabled?: boolean; onChange: (v: string[]) => void }) {
    const [query, setQuery] = useState('');
    const filtered = useMemo(() => options.filter(o => normalizeSearchTerm(o.value).includes(normalizeSearchTerm(query))), [options, query]);
    return <div className="space-y-2"><input value={query} disabled={disabled} onChange={e => setQuery(e.target.value)} placeholder="Pesquisar opções..." className="w-full border-b-2 border-slate-300 bg-transparent py-2 text-xs outline-none" /><div className="flex max-h-32 flex-wrap gap-2 overflow-auto">{filtered.map(o => <label key={o.id || o.value} className="text-xs"><input type="checkbox" disabled={disabled} checked={selected.includes(o.value)} onChange={e => onChange(e.target.checked ? [...selected, o.value] : selected.filter(v => v !== o.value))} /> <span className="ml-1">{o.value}</span></label>)}</div></div>;
}
