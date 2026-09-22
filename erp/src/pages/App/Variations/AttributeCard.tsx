import { useMemo, useState } from 'react';
import VariationType, { VariationOption } from '../../types/variation.type';
import { normalizeSearchTerm } from '../../utils/textUtils';

const VALUE_PREVIEW_LIMIT = 15;

interface AttributeCardProps {
    readonly attribute: VariationType;
    readonly onAddValues: (attribute: VariationType, input: string) => Promise<boolean>;
    readonly onDeleteAttribute: (attributeId: string, event: React.MouseEvent) => void;
    readonly onDeleteValue: (attribute: VariationType, option: VariationOption) => Promise<void>;
    readonly onEdit: (attribute: VariationType) => void;
}

export function AttributeCard({ attribute, onAddValues, onDeleteAttribute, onDeleteValue, onEdit }: AttributeCardProps) {
    const canAddOptions = ['radio', 'multi_select'].includes(attribute.dataType || '');
    const [isExpanded, setIsExpanded] = useState(false);
    const [showAll, setShowAll] = useState(false);
    const [valueSearch, setValueSearch] = useState('');
    const [isAdding, setIsAdding] = useState(false);
    const [newValues, setNewValues] = useState('');
    const [menuOpen, setMenuOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const filteredValues = useMemo(() => {
        const search = normalizeSearchTerm(valueSearch);
        if (!search) return attribute.options;
        return attribute.options.filter((option) => normalizeSearchTerm(option.value).includes(search));
    }, [attribute.options, valueSearch]);

    const visibleValues = valueSearch || showAll ? filteredValues : filteredValues.slice(0, VALUE_PREVIEW_LIMIT);
    const hiddenValueCount = Math.max(0, filteredValues.length - visibleValues.length);
    const hasManyValues = attribute.options.length > VALUE_PREVIEW_LIMIT;

    const submitValues = async () => {
        if (!newValues.trim() || isSaving) return;
        setIsSaving(true);
        const saved = await onAddValues(attribute, newValues);
        setIsSaving(false);
        if (saved) {
            setNewValues('');
            setIsAdding(false);
            setShowAll(true);
        }
    };

    const getSubtitle = () => {
        switch (attribute.dataType) {
            case 'measure':
                return 'Número Decimal';
            case 'integer':
                return 'Número Inteiro';
            case 'number':
                return 'Número Inteiro';
            case 'decimal':
                return 'Número Decimal';
            case 'text':
            case 'text_short':
            case 'text_long':
                return 'Texto';
            case 'radio':
                return `Escolha única • ${attribute.options.length} ${attribute.options.length === 1 ? 'opção' : 'opções'}`;
            case 'multi_select':
                return `Escolha múltipla • ${attribute.options.length} ${attribute.options.length === 1 ? 'opção' : 'opções'}`;
            default:
                return 'Texto';
        }
    };

    return (
        <article className="bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-sm overflow-visible">
            <div className="flex items-center gap-3 px-5 py-4 sm:px-6">
                <div className="min-w-0 flex-1 flex items-center justify-between gap-4 text-left">
                    <span className="min-w-0">
                        <span className="block text-base sm:text-lg font-black text-slate-800 dark:text-slate-100 truncate">{attribute.name}</span>
                        <span className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mt-0.5">
                            {getSubtitle()}
                        </span>
                    </span>
                </div>

                <div className="relative shrink-0">
                    <button type="button" onClick={() => setMenuOpen((current) => !current)} className="w-9 h-9 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer" aria-label={`Abrir ações do atributo ${attribute.name}`} aria-expanded={menuOpen}>
                        <i className="bi bi-three-dots-vertical" aria-hidden="true" />
                    </button>
                    {menuOpen && (
                        <div className="absolute right-0 top-11 z-30 w-52 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl p-1.5">
                            <button type="button" onClick={() => { setMenuOpen(false); setIsExpanded(true); }} className="w-full px-3 py-2 text-left rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">
                                <i className="bi bi-eye mr-2" aria-hidden="true" />Detalhes
                            </button>
                            <button type="button" onClick={() => { setMenuOpen(false); onEdit(attribute); }} className="w-full px-3 py-2 text-left rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">
                                <i className="bi bi-pencil mr-2" aria-hidden="true" />Editar atributo
                            </button>
                            {canAddOptions && <button type="button" onClick={() => { setMenuOpen(false); setIsExpanded(true); setIsAdding(true); }} className="w-full px-3 py-2 text-left rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">
                                <i className="bi bi-plus-circle mr-2" aria-hidden="true" />Adicionar opções
                            </button>}
                            <button type="button" onClick={(event) => { setMenuOpen(false); onDeleteAttribute(attribute.id!, event); }} className="w-full px-3 py-2 text-left rounded-xl text-xs font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 cursor-pointer">
                                <i className="bi bi-trash mr-2" aria-hidden="true" />Excluir atributo
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {isExpanded && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50" onClick={() => setIsExpanded(false)}>
                  <div role="dialog" aria-modal="true" className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-3xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-2xl p-5 sm:p-7 space-y-5" onClick={(event) => event.stopPropagation()}>
                    <div className="flex items-start justify-between gap-4">
                      <div><h2 className="text-xl font-black text-slate-800 dark:text-slate-100">{attribute.name}</h2><p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">Detalhes • {getSubtitle()}</p></div>
                      <button type="button" onClick={() => setIsExpanded(false)} className="w-9 h-9 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer" aria-label="Fechar detalhes"><i className="bi bi-x-lg" /></button>
                    </div>
                    {!canAddOptions ? (
                        <div className="rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4 flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                                <i className="bi bi-info-circle text-sm" aria-hidden="true" />
                            </div>
                            <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                                Esta característica é preenchida como <strong className="text-slate-800 dark:text-slate-100 font-black">{attribute.dataType === 'measure' ? 'Número Decimal' : attribute.dataType === 'integer' ? 'Número Inteiro' : 'Texto'}</strong> diretamente na ficha do produto. Não utiliza lista pré-definida de opções.
                            </p>
                        </div>
                    ) : (
                        <>
                            {canAddOptions && (
                                <div className="relative max-w-xl">
                                    <i className="bi bi-search absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs" aria-hidden="true" />
                                    <input value={valueSearch} onChange={(event) => setValueSearch(event.target.value)} placeholder={`Buscar entre ${attribute.options.length} valores...`} aria-label={`Buscar valores de ${attribute.name}`} className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500/20 dark:text-slate-200" />
                                </div>
                            )}

                            <div className="flex flex-wrap gap-2">
                                {visibleValues.map((option) => (
                                    <span key={option.id || option.value} className="h-8 px-3 rounded-full flex items-center gap-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-600 dark:text-slate-300">
                                        {option.value}
                                        <button type="button" onClick={() => void onDeleteValue(attribute, option)} className="text-slate-400 hover:text-red-500 cursor-pointer" aria-label={`Remover valor ${option.value}`}>
                                            <i className="bi bi-x-lg text-[9px]" aria-hidden="true" />
                                        </button>
                                    </span>
                                ))}
                                {filteredValues.length === 0 && <span className="text-xs italic text-slate-400">Nenhum valor encontrado.</span>}
                            </div>

                            {hasManyValues && !valueSearch && (
                                <button type="button" onClick={() => setShowAll((current) => !current)} className="text-xs font-black text-blue-600 hover:text-blue-700 cursor-pointer">
                                    {showAll ? 'Mostrar menos' : `Mostrar mais ${hiddenValueCount}`}
                                </button>
                            )}

                            {!isAdding ? (
                                <button type="button" onClick={() => setIsAdding(true)} className="text-xs font-black text-blue-600 hover:text-blue-700 cursor-pointer">
                                    <i className="bi bi-plus-lg mr-1" aria-hidden="true" />Adicionar opção
                                </button>
                            ) : (
                                <div className="flex flex-col sm:flex-row gap-2 max-w-2xl">
                                    <input autoFocus value={newValues} onChange={(event) => setNewValues(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); void submitValues(); } if (event.key === 'Escape') setIsAdding(false); }} placeholder="Ex: Branco, Preto, Cinza" aria-label={`Adicionar valores ao atributo ${attribute.name}`} className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500/20 dark:text-slate-200" />
                                    <div className="flex gap-2">
                                        <button type="button" onClick={() => setIsAdding(false)} className="px-3 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">Cancelar</button>
                                        <button type="button" onClick={() => void submitValues()} disabled={isSaving || !newValues.trim()} className="px-4 py-2 rounded-xl text-xs font-black bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 cursor-pointer">{isSaving ? 'Salvando...' : 'Adicionar'}</button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                  </div>
                </div>
            )}
        </article>
    );
}
