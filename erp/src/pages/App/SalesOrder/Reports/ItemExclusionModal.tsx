import React, { useState, useMemo } from 'react';

interface ItemExclusionModalProps {
    isOpen: boolean;
    onClose: () => void;
    items: any[];
    excludedItems: string[];
    onToggleItem: (productName: string) => void;
    onToggleAll: (selected: boolean) => void;
}

const ItemExclusionModal: React.FC<ItemExclusionModalProps> = ({ 
    isOpen, onClose, items, excludedItems, onToggleItem, onToggleAll 
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedSupplier, setSelectedSupplier] = useState<string>('');
    const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' }>({ key: 'qty', direction: 'desc' });

    const uniqueSuppliers = useMemo(() => {
        const suppliers = items.map(i => i.supplier).filter(Boolean);
        return Array.from(new Set(suppliers)).sort();
    }, [items]);

    const filteredAndSortedItems = useMemo(() => {
        let result = items.filter(item => {
            const matchesSearch = item.product.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                  (item.supplier && item.supplier.toLowerCase().includes(searchTerm.toLowerCase()));
            const matchesSupplier = selectedSupplier ? item.supplier === selectedSupplier : true;
            return matchesSearch && matchesSupplier;
        });

        if (sortConfig.key) {
            result.sort((a, b) => {
                const aVal = a[sortConfig.key];
                const bVal = b[sortConfig.key];
                if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }

        return result;
    }, [items, searchTerm, selectedSupplier, sortConfig]);

    const handleSort = (key: string) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <div className="bg-white dark:bg-slate-900 w-[95vw] max-w-[1600px] h-[90vh] rounded-[3rem] shadow-2xl overflow-hidden animate-slide-up flex flex-col">
                <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900 sticky top-0">
                    <div className="flex flex-col">
                        <h2 className="text-xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-3">
                            <i className="bi bi-filter-square-fill text-indigo-600 text-2xl"></i> Gerenciar Itens
                        </h2>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
                            Mostrando {filteredAndSortedItems.length} de {items.length} itens totais
                        </span>
                    </div>
                    <button onClick={onClose} className="w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-950 flex items-center justify-center text-slate-500 hover:text-red-500 transition-all">
                        <i className="bi bi-x-lg text-xl"></i>
                    </button>
                </div>

                <div className="px-10 py-8 bg-slate-50 dark:bg-slate-955 border-b border-slate-100 dark:border-slate-800 flex flex-wrap gap-6 items-center">
                    <div className="flex-1 min-w-[400px] relative flex items-center">
                        <div className="absolute left-5 text-slate-400 pointer-events-none">
                            <i className="bi bi-search text-base"></i>
                        </div>
                        <input 
                            type="text" 
                            placeholder="Pesquisar itens por nome..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-[1.5rem] pl-14 pr-6 py-4 text-sm font-bold text-slate-700 dark:text-slate-100 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-sm placeholder:text-slate-300"
                        />
                    </div>

                    <div className="w-full sm:w-64 relative">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-indigo-500 uppercase pointer-events-none">Filtro</div>
                        <select
                            value={selectedSupplier}
                            onChange={(e) => setSelectedSupplier(e.target.value)}
                            className="w-full bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-[1.5rem] pl-14 pr-4 py-4 text-xs font-black outline-none focus:border-indigo-500 transition-all text-slate-600 dark:text-slate-300 appearance-none cursor-pointer shadow-sm"
                        >
                            <option value="">TODOS FORNECEDORES</option>
                            {uniqueSuppliers.map(s => (
                                <option key={s as string} value={s as string}>{String(s).toUpperCase()}</option>
                            ))}
                        </select>
                        <i className="bi bi-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"></i>
                    </div>

                    <div className="flex items-center gap-3">
                        <button 
                            onClick={() => {
                                const namesToSelect = filteredAndSortedItems.map(i => i.product);
                                // Se estamos marcando todos os FILTRADOS, devemos removê-los da lista de excluídos
                                namesToSelect.forEach(name => {
                                    if (excludedItems.includes(name)) onToggleItem(name);
                                });
                            }}
                            className="px-6 py-4 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.1em] text-slate-600 hover:text-indigo-600 hover:border-indigo-200 transition-all shadow-sm flex items-center gap-2 whitespace-nowrap"
                        >
                            <i className="bi bi-check-all text-lg"></i>
                            Incluir Filtrados
                        </button>
                        <button 
                            onClick={() => {
                                const namesToExclude = filteredAndSortedItems.map(i => i.product);
                                // Se estamos limpando os FILTRADOS, devemos adicioná-los à lista de excluídos
                                namesToExclude.forEach(name => {
                                    if (!excludedItems.includes(name)) onToggleItem(name);
                                });
                            }}
                            className="px-6 py-4 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.1em] text-slate-600 hover:text-red-600 hover:border-red-200 transition-all shadow-sm flex items-center gap-2 whitespace-nowrap"
                        >
                            <i className="bi bi-x-circle text-sm"></i>
                            Excluir Filtrados
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    <table className="w-full text-left">
                        <thead className="sticky top-0 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 z-10">
                            <tr>
                                <th className="px-8 py-5 text-[9px] font-black uppercase tracking-widest text-slate-400 w-16">Incluir</th>
                                <th onClick={() => handleSort('product')} className="px-4 py-5 text-[9px] font-black uppercase tracking-widest text-slate-400 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                                    Descrição <i className={`bi bi-sort-${sortConfig.key === 'product' ? (sortConfig.direction === 'asc' ? 'down' : 'up') : 'down-up'} ml-1 opacity-40`}></i>
                                </th>
                                <th onClick={() => handleSort('supplier')} className="px-4 py-5 text-[9px] font-black uppercase tracking-widest text-slate-400 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                                    Fornecedor <i className={`bi bi-sort-${sortConfig.key === 'supplier' ? (sortConfig.direction === 'asc' ? 'down' : 'up') : 'down-up'} ml-1 opacity-40`}></i>
                                </th>
                                <th onClick={() => handleSort('qty')} className="px-4 py-5 text-[9px] font-black uppercase tracking-widest text-slate-400 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-right w-24">
                                    Qtd. <i className={`bi bi-sort-${sortConfig.key === 'qty' ? (sortConfig.direction === 'asc' ? 'down' : 'up') : 'down-up'} ml-1 opacity-40`}></i>
                                </th>
                                <th onClick={() => handleSort('profit')} className="px-8 py-5 text-[9px] font-black uppercase tracking-widest text-slate-400 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-right w-32">
                                    Lucro <i className={`bi bi-sort-${sortConfig.key === 'profit' ? (sortConfig.direction === 'asc' ? 'down' : 'up') : 'down-up'} ml-1 opacity-40`}></i>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                            {filteredAndSortedItems.map((item, index) => {
                                const isExcluded = excludedItems.includes(item.product);
                                return (
                                    <tr 
                                        key={index}
                                        onClick={() => onToggleItem(item.product)}
                                        className={`hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-all cursor-pointer ${isExcluded ? 'opacity-40 grayscale-[0.5]' : ''}`}
                                    >
                                        <td className="px-8 py-4">
                                            <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${!isExcluded ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`}>
                                                {!isExcluded && <i className="bi bi-check text-base"></i>}
                                            </div>
                                        </td>
                                        <td className="px-4 py-4">
                                            <p className="text-[11px] font-bold text-slate-700 dark:text-slate-200 leading-tight">{item.product}</p>
                                        </td>
                                        <td className="px-4 py-4">
                                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{item.supplier}</p>
                                        </td>
                                        <td className="px-4 py-4 text-right">
                                            <span className="text-[11px] font-black text-slate-500">{item.qty}</span>
                                        </td>
                                        <td className="px-8 py-4 text-right text-[11px] font-black text-emerald-600">
                                            {item.profit.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                <div className="p-8 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                    <button 
                        onClick={onClose}
                        className="w-full py-4 bg-slate-900 dark:bg-indigo-600 hover:opacity-90 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-indigo-500/10"
                    >
                        Concluído ({items.length - excludedItems.length} itens inclusos)
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ItemExclusionModal;
