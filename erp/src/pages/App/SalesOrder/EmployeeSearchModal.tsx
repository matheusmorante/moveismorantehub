import React, { useState, useEffect, useMemo } from "react";
import Person from "../../types/person.type";
import { subscribeToPeople } from '@/pages/utils/personService';

interface Props {
    onSelect: (sellerName: string) => void;
    onClose: () => void;
}

const EmployeeSearchModal = ({ onSelect, onClose }: Props) => {
    const [search, setSearch] = useState("");
    const [employees, setEmployees] = useState<Person[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // subscribeToPeople('employees') will automatically fetch employees + profiles with a position
        const unsub = subscribeToPeople('employees', (data) => {
            setEmployees(data.filter(p => p.active && !p.deleted));
            setLoading(false);
        });
        return () => { if (unsub) unsub(); };
    }, []);

    const filtered = useMemo(() => {
        if (!search.trim()) return employees;
        const s = search.toLowerCase();
        return employees.filter(e =>
            (e.fullName || '').toLowerCase().includes(s) ||
            (e.position || '').toLowerCase().includes(s)
        );
    }, [employees, search]);

    return (
        <div
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-[3px] animate-fade-in"
            onClick={onClose}
        >
            <div
                className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden animate-slide-up border border-slate-100 dark:border-slate-800"
                style={{ maxHeight: '85vh' }}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-8 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-blue-50 dark:bg-blue-900/10 shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="bg-blue-600 p-2.5 rounded-2xl shadow-lg shadow-blue-200 dark:shadow-blue-900/30">
                            <i className="bi bi-person-badge text-white text-xl" />
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-slate-800 dark:text-slate-100 tracking-tight">
                                Selecionar Atendente Principal
                            </h2>
                            <p className="text-[10px] uppercase font-black text-blue-600 dark:text-blue-400 tracking-widest mt-0.5">
                                Pesquise entre os funcionários
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-full transition-colors text-slate-400 hover:text-slate-600"
                    >
                        <i className="bi bi-x-lg text-xl" />
                    </button>
                </div>

                {/* Search Bar */}
                <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
                    <div className="relative">
                        <i className="bi bi-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            autoFocus
                            type="text"
                            placeholder="Busque por nome ou cargo..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all placeholder:font-normal placeholder:text-slate-400"
                        />
                        {search && (
                            <button
                                onClick={() => setSearch('')}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            >
                                <i className="bi bi-x-circle-fill" />
                            </button>
                        )}
                    </div>
                    <div className="flex items-center gap-4 mt-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        <span className="ml-auto">
                            {loading ? 'Carregando...' : `${filtered.length} funcionário(s) encontrados`}
                        </span>
                    </div>
                </div>

                {/* Employee List */}
                <div className="flex-1 overflow-y-auto custom-scrollbar bg-white dark:bg-slate-900">
                    {loading ? (
                        <div className="flex items-center justify-center py-16 gap-3 text-slate-400">
                            <i className="bi bi-hourglass-split animate-spin text-2xl" />
                            <span className="text-sm font-bold">Carregando funcionários...</span>
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-3">
                            <i className="bi bi-person-x text-4xl opacity-30" />
                            <p className="text-sm font-bold">Nenhum funcionário encontrado</p>
                        </div>
                    ) : (
                        <div className="flex flex-col p-4 gap-2">
                            {filtered.map(emp => (
                                <button
                                    key={emp.id}
                                    onClick={() => { onSelect(emp.fullName); onClose(); }}
                                    className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 dark:border-slate-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-200 dark:hover:border-blue-800/50 transition-all group text-left"
                                >
                                    <div className="flex flex-col gap-1">
                                        <span className="text-sm font-bold text-slate-800 dark:text-slate-100 group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors">
                                            {emp.fullName}
                                        </span>
                                        <div className="flex gap-2 items-center">
                                            {emp.position && (
                                                <span className="text-[10px] uppercase font-black tracking-widest text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                                                    {emp.position}
                                                </span>
                                            )}
                                            {emp.phone && (
                                                <span className="text-xs font-medium text-slate-500 flex items-center gap-1">
                                                    <i className="bi bi-telephone text-[10px]" />
                                                    {emp.phone}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <i className="bi bi-chevron-right text-slate-300 group-hover:text-blue-500 transition-colors" />
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 shrink-0 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
                    <p className="text-[10px] text-slate-400 font-bold">
                        Clique em qualquer funcionário para selecioná-lo
                    </p>
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-red-500 transition-colors"
                    >
                        Cancelar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EmployeeSearchModal;
