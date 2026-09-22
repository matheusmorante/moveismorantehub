import { useMemo, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import VariationType, { VariationOption } from '../../types/variation.type';
import { checkVariationUsage, saveVariation, updateVariation } from '../../utils/variationService';
import { normalizeSearchTerm } from '../../utils/textUtils';
import { groupCharacteristicsByTopic } from '../../utils/technicalValuesService';
import { AttributeCard } from './AttributeCard';
import { parseAttributeValueBatch } from './attributeValueBatch';
import VariationFormModal from './VariationFormModal';
import { useVariations } from './useVariations';

const Variations = () => {
    const { variations, loading, handleDelete, refresh } = useVariations();
    const [searchTerm, setSearchTerm] = useState('');
    const [editingAttribute, setEditingAttribute] = useState<VariationType | null>(null);
    const [formOpen, setFormOpen] = useState(false);
    const importInputRef = useRef<HTMLInputElement>(null);

    const filteredVariations = useMemo(() => {
        const search = normalizeSearchTerm(searchTerm);
        return variations
            .filter((attribute) => (
                normalizeSearchTerm(attribute.name).includes(search) ||
                Boolean(attribute.id && normalizeSearchTerm(attribute.id).includes(search))
            ))
            .sort((left, right) => left.name.localeCompare(right.name, 'pt-BR', { sensitivity: 'base' }));
    }, [searchTerm, variations]);
    const groupedVariations = useMemo(
        () => groupCharacteristicsByTopic(filteredVariations),
        [filteredVariations]
    );

    const openForm = (attribute: VariationType | null) => {
        setEditingAttribute(attribute);
        setFormOpen(true);
    };

    const handleDeleteValue = async (attribute: VariationType, option: VariationOption) => {
        if (!window.confirm(`Tem certeza que deseja remover o valor "${option.value}" da característica "${attribute.name}"?`)) return;

        try {
            if (await checkVariationUsage(attribute.name, option.value)) {
                toast.warning(`O valor "${option.value}" não pode ser excluído porque está vinculado a produtos.`);
                return;
            }
            await updateVariation(attribute.id!, {
                options: attribute.options.filter((candidate) => candidate.id !== option.id)
            });
            toast.success('Valor removido com sucesso!');
            refresh();
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Erro desconhecido';
            toast.error(`Erro ao remover valor: ${message}`);
        }
    };

    const handleAddValues = async (attribute: VariationType, input: string): Promise<boolean> => {
        const newValues = parseAttributeValueBatch(input, attribute.options.map((option) => option.value));
        if (newValues.length === 0) {
            toast.info('Todos os valores informados já existem nessa característica.');
            return false;
        }

        try {
            await updateVariation(attribute.id!, {
                options: [...attribute.options, ...newValues.map((value) => ({ id: '', value }))]
            });
            toast.success(`${newValues.length} ${newValues.length === 1 ? 'valor adicionado' : 'valores adicionados'}!`);
            refresh();
            return true;
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Erro desconhecido';
            toast.error(`Erro ao adicionar valores: ${message}`);
            return false;
        }
    };

    const handleImportCSV = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (loadEvent) => {
            const text = typeof loadEvent.target?.result === 'string' ? loadEvent.target.result : '';
            if (!text) return;

            try {
                const rows = text.split(/\r?\n/).map((row) => row.trim()).filter(Boolean);
                const imported = new Map<string, Set<string>>();
                const firstRowIsHeader = rows[0] && /informacao|campo|atributo|valor/i.test(rows[0]);

                rows.slice(firstRowIsHeader ? 1 : 0).forEach((row) => {
                    const [rawName, ...rawValues] = row.split(',');
                    const name = rawName?.replaceAll('"', '').trim();
                    if (!name) return;
                    const values = parseAttributeValueBatch(rawValues.join(','));
                    const entry = imported.get(name) ?? new Set<string>();
                    values.forEach((value) => entry.add(value));
                    imported.set(name, entry);
                });

                let changed = 0;
                for (const [name, values] of imported) {
                    const existing = variations.find((attribute) => normalizeSearchTerm(attribute.name) === normalizeSearchTerm(name));
                    if (existing) {
                        const additions = parseAttributeValueBatch([...values].join(','), existing.options.map((option) => option.value));
                        if (additions.length === 0) continue;
                        await updateVariation(existing.id!, {
                            options: [...existing.options, ...additions.map((value) => ({ id: '', value }))]
                        });
                    } else {
                        await saveVariation({ name, active: true, options: [...values].map((value) => ({ id: '', value })) });
                    }
                    changed += 1;
                }

                toast.success(`Importação concluída: ${changed} ${changed === 1 ? 'campo alterado' : 'campos alterados'}.`);
                refresh();
            } catch (error: unknown) {
                const message = error instanceof Error ? error.message : 'Erro desconhecido';
                toast.error(`Erro ao importar CSV: ${message}`);
            }
        };
        reader.readAsText(file, 'UTF-8');
        event.target.value = '';
    };

    return (
        <div className="flex-1 flex flex-col h-full bg-slate-50/50 dark:bg-slate-900 overflow-hidden relative">
            <header className="shrink-0 bg-white dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800 px-4 py-3 sm:px-6 md:px-8 shadow-sm relative z-20">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
                    <div className="flex items-center gap-2.5 sm:gap-3">
                        <i className="bi bi-gear-wide-connected text-xl sm:text-2xl text-blue-600 shrink-0" aria-hidden="true" />
                        <h1 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight truncate">Características</h1>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-3 w-full md:w-auto">
                        <div className="relative flex-1 md:w-64 lg:w-72 min-w-0">
                            <i className="bi bi-search absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs" aria-hidden="true" />
                            <input
                                value={searchTerm}
                                onChange={(event) => setSearchTerm(event.target.value)}
                                placeholder="Buscar campos..."
                                className="w-full pl-9 pr-3 py-2 sm:py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500/20 dark:text-slate-200"
                            />
                        </div>
                        <input ref={importInputRef} type="file" accept=".csv,text/csv" onChange={handleImportCSV} className="hidden" />
                        <button
                            type="button"
                            onClick={() => importInputRef.current?.click()}
                            title="Importar CSV"
                            className="px-3 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl border border-slate-200 dark:border-slate-800 text-xs font-black text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer flex items-center justify-center shrink-0"
                        >
                            <i className="bi bi-upload sm:mr-2" aria-hidden="true" />
                            <span className="hidden sm:inline">Importar CSV</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => openForm(null)}
                            className="px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black shadow-md shadow-blue-500/20 cursor-pointer flex items-center justify-center gap-1.5 sm:gap-2 shrink-0"
                        >
                            <i className="bi bi-plus-lg" aria-hidden="true" />
                            <span>Nova característica</span>
                        </button>
                    </div>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto p-3 sm:p-5 md:p-8 custom-scrollbar">
                <div className="max-w-7xl mx-auto space-y-4">
                    {loading ? (
                        <div className="bg-white dark:bg-slate-950 rounded-3xl border border-slate-100 dark:border-slate-800 p-12 text-center shadow-sm">
                            <i className="bi bi-arrow-clockwise animate-spin text-3xl text-blue-600" aria-hidden="true" />
                            <p className="text-xs font-black uppercase tracking-widest text-slate-400 mt-3">Carregando características...</p>
                        </div>
                    ) : filteredVariations.length === 0 ? (
                        <div className="bg-white dark:bg-slate-950 rounded-3xl border border-slate-100 dark:border-slate-800 p-12 text-center shadow-sm text-slate-400 font-bold">
                            Nenhuma característica encontrada.
                        </div>
                    ) : groupedVariations.map((group) => (
                        <section key={group.title} className="space-y-3" aria-labelledby={`characteristic-topic-${group.title}`}>
                            <h2 id={`characteristic-topic-${group.title}`} className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 pb-2">
                                {group.title}
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-4">
                                {group.fields.map((attribute) => (
                                    <AttributeCard
                                        key={attribute.id}
                                        attribute={attribute}
                                        onAddValues={handleAddValues}
                                        onDeleteAttribute={handleDelete}
                                        onDeleteValue={handleDeleteValue}
                                        onEdit={openForm}
                                    />
                                ))}
                            </div>
                        </section>
                    ))}
                </div>
            </main>

            <VariationFormModal
                isOpen={formOpen}
                onClose={() => setFormOpen(false)}
                onSuccess={refresh}
                variation={editingAttribute}
                allVariations={variations}
            />
        </div>
    );
};

export default Variations;
