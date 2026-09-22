import React, { useMemo, useState } from 'react';
import { TechnicalCombobox } from './TechnicalCombobox';
import { TechnicalFieldDefinition } from '@/pages/utils/technicalValuesService';
import { normalizeSearchTerm } from '@/pages/utils/textUtils';

type Props = { field: TechnicalFieldDefinition; value: any; disabled?: boolean; isInvalid?: boolean; onChange: (value: any) => void };

export const TechnicalFieldInput: React.FC<Props> = ({ field, value, disabled, isInvalid, onChange }) => {
    const type = field.dataType || 'list';
    const maxLength = 120;
    if (type === 'text_short' || type === 'text') return <input value={value ?? ''} maxLength={maxLength} disabled={disabled} onChange={e => onChange(e.target.value)} className="w-full border-b-2 border-slate-300 bg-transparent py-2 text-xs outline-none focus:border-blue-600" />;
    if (type === 'integer' || type === 'number') return <input type="number" step="1" placeholder={/porta|gaveta/i.test(field.name) ? 'Insira a quantidade de portas' : 'Insira um número inteiro'} value={value ?? ''} disabled={disabled} onChange={e => onChange(e.target.value === '' ? '' : Number(e.target.value))} className="w-full border-b-2 border-slate-300 bg-transparent py-2 text-xs outline-none focus:border-blue-600" />;
    if (type === 'decimal' || type === 'measure') return <DecimalInput value={value} disabled={disabled} onChange={onChange} />;
    if (type === 'radio') return <ChoiceSearch options={field.options} value={value} disabled={disabled} multiple={false} onChange={onChange} />;
    if (type === 'multi_select') {
        const selected = Array.isArray(value) ? value : value ? String(value).split(',').map(v => v.trim()).filter(Boolean) : [];
        return <ChoiceSearch options={field.options} value={selected} disabled={disabled} multiple onChange={onChange} />;
    }
    return <TechnicalCombobox fieldName={field.name} value={Array.isArray(value) ? value.join(', ') : value ?? ''} options={field.options} isInvalid={isInvalid} disabled={disabled} onChange={onChange} />;
};

function DecimalInput({ value, disabled, onChange }: { value: any; disabled?: boolean; onChange: (value: any) => void }) {
    const [draft, setDraft] = useState(() => formatDecimal(value));

    React.useEffect(() => {
        setDraft(formatDecimal(value));
    }, [value]);

    const handleMaskedChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const digits = event.target.value.replace(/\D/g, '').replace(/^0+(?=\d)/, '');
        if (!digits) {
            setDraft('');
            onChange('');
            return;
        }
        const numeric = Number(digits) / 100;
        setDraft(formatDecimal(numeric));
        onChange(numeric);
    };

    return <input
        type="text"
        inputMode="decimal"
        placeholder="0,00"
        value={draft}
        disabled={disabled}
        onChange={handleMaskedChange}
        className="w-full border-b-2 border-slate-300 bg-transparent py-2 text-xs outline-none focus:border-blue-600"
    />;
}

function formatDecimal(value: any): string {
    if (value === '' || value === null || value === undefined) return '';
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric.toFixed(2).replace('.', ',') : '';
}

function ChoiceSearch({ options, value, disabled, multiple, onChange }: { options: readonly { id?: string; value: string }[]; value: string | string[]; disabled?: boolean; multiple: boolean; onChange: (v: any) => void }) {
    const [query, setQuery] = useState('');
    const searchRef = React.useRef<HTMLDivElement>(null);
    const selected = (Array.isArray(value) ? value : [value].filter(Boolean))
        .filter(item => normalizeSearchTerm(String(item)) !== normalizeSearchTerm('Não se aplica'));
    const term = normalizeSearchTerm(query);
    const displayValue = query || selected.join(', ');
    const filtered = useMemo(() => term.length < 2 ? [] : options.filter(o => normalizeSearchTerm(o.value).includes(term)), [options, term]);
    const exactMatch = term.length >= 2 ? options.find(o => normalizeSearchTerm(o.value) === term) : undefined;
    const isSelected = term.length === 0
        ? selected.length > 0
        : Boolean(exactMatch && selected.some(item => normalizeSearchTerm(item) === term));

    React.useEffect(() => {
        if (!exactMatch || isSelected || disabled) return;
        onChange(multiple ? [...selected, exactMatch.value] : exactMatch.value);
    }, [exactMatch, isSelected, disabled, multiple, onChange, selected]);

    React.useEffect(() => {
        const closeSuggestions = (event: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) setQuery('');
        };
        document.addEventListener('mousedown', closeSuggestions);
        return () => document.removeEventListener('mousedown', closeSuggestions);
    }, []);

    return <div ref={searchRef} className="relative space-y-2">
        <div className="relative">
            <input value={displayValue} disabled={disabled} onChange={e => setQuery(e.target.value)} placeholder="Digite pelo menos 2 caracteres para pesquisar..." className={`w-full border-b-2 bg-transparent py-2 pr-8 text-xs outline-none focus:border-blue-600 ${isSelected ? 'border-emerald-500 text-emerald-700 dark:text-emerald-400' : 'border-slate-300'}`} />
            {isSelected && <i className="bi bi-check-lg absolute right-1 top-1/2 -translate-y-1/2 text-emerald-600 dark:text-emerald-400" aria-label="Opção selecionada" />}
        </div>
        {term.length >= 2 && <div className="absolute left-0 right-0 top-full z-40 mt-1 flex max-h-48 flex-col gap-1 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-700 dark:bg-slate-900">
            {filtered.map(o => <label key={o.id || o.value} className="text-xs"><input type={multiple ? 'checkbox' : 'radio'} name={multiple ? undefined : `technical-${options.map(x => x.id || x.value).join('-')}`} disabled={disabled} checked={selected.includes(o.value)} onChange={e => onChange(multiple ? (e.target.checked ? [...selected, o.value] : selected.filter(v => v !== o.value)) : o.value)} /> <span className="ml-1">{o.value}</span></label>)}
            {filtered.length === 0 && <span className="text-[10px] text-slate-400">Nenhuma opção encontrada.</span>}
        </div>}
    </div>;
}
