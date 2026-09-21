import { useMemo, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import VariationType, { VariationOption } from '../../types/variation.type';
import { checkVariationUsage, saveVariation, updateVariation } from '../../utils/variationService';
import { normalizeSearchTerm } from '../../utils/textUtils';
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

    const openForm = (attribute: VariationType | null) => {
        setEditingAttribute(attribute);
        setFormOpen(true);
    };

    const handleDeleteValue = async (attribute: VariationType, option: VariationOption) => {
        if (!window.confirm(`Tem certeza que deseja remover o valor "${option.value}" do atributo "${attribute.name}"?`)) return;

        try {
            if (await checkVariationUsage(attribute.name, option.value)) {
                toast.warning(`O valor "${option.value}" não pode ser excluído porque está vinculado a variações de produtos.`);
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
            toast.info('Todos os valores informados já existem nesse atributo.');
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
                const firstRowIsHeader = rows[0] && /atributo|valor/i.test(rows[0]);

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

                toast.success(`Importação concluída: ${changed} ${changed === 1 ? 'atributo alterado' : 'atributos alterados'}.`);
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
            <header className="shrink-0 bg-white dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800 px-5 py-6 md:px-8 shadow-sm relative z-20">
                <div className="max-w-7xl mx-auto flex flex-col lg:flex-row lg:items-end justify-between gap-5">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <i className="bi bi-stars text-2xl text-blue-600" aria-hidden="true" />
                            <h1 className="text-3xl font-black text-slate-800 dark:text-slate-100 tracking-tight">Atributos</h1>
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                            Gerencie propriedades utilizadas nas variações de produtos
                        </p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative min-w-0 sm:w-72">
                            <i className="bi bi-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                            <input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Buscar atributos..." className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500/20 dark:text-slate-200" />
                        </div>
                        <input ref={importInputRef} type="file" accept=".csv,text/csv" onChange={handleImportCSV} className="hidden" />
                        <button type="button" onClick={() => importInputRef.current?.click()} className="px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs font-black text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer">
                            <i className="bi bi-upload mr-2" aria-hidden="true" />Importar CSV
                        </button>
                        <button type="button" onClick={() => openForm(null)} className="px-5 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black shadow-lg shadow-blue-500/20 cursor-pointer">
                            <i className="bi bi-plus-lg mr-2" aria-hidden="true" />Novo atributo
                        </button>
                    </div>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
                <div className="max-w-7xl mx-auto space-y-4">
                    {loading ? (
                        <div className="bg-white dark:bg-slate-950 rounded-3xl border border-slate-100 dark:border-slate-800 p-12 text-center shadow-sm">
                            <i className="bi bi-arrow-clockwise animate-spin text-3xl text-blue-600" aria-hidden="true" />
                            <p className="text-xs font-black uppercase tracking-widest text-slate-400 mt-3">Carregando atributos...</p>
                        </div>
                    ) : filteredVariations.length === 0 ? (
                        <div className="bg-white dark:bg-slate-950 rounded-3xl border border-slate-100 dark:border-slate-800 p-12 text-center shadow-sm text-slate-400 font-bold">Nenhum atributo encontrado.</div>
                    ) : filteredVariations.map((attribute) => (
                        <AttributeCard key={attribute.id} attribute={attribute} onAddValues={handleAddValues} onDeleteAttribute={handleDelete} onDeleteValue={handleDeleteValue} onEdit={openForm} />
                    ))}
                </div>
            </main>

            <VariationFormModal isOpen={formOpen} onClose={() => setFormOpen(false)} onSuccess={refresh} variation={editingAttribute} allVariations={variations} />
        </div>
    );
};

export default Variations;
