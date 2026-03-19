import React, { useState, useEffect, useMemo } from "react";
import Person from "../../types/person.type";
import { subscribeToPeople } from '@/pages/utils/personService';

interface Props {
    onSelect: (sellerName: string) => void;
    onClose: () => void;
}

const SellerSearchModal = ({ onSelect, onClose }: Props) => {
    const [search, setSearch] = useState("");
    const [people, setPeople] = useState<Person[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsub = subscribeToPeople('employees', (data) => {
            setPeople(data.filter(p => p.active && !p.deleted));
            setLoading(false);
        });
        return unsub;
    }, []);

    const filtered = useMemo(() => {
        if (!search.trim()) return people;
        const s = search.toLowerCase();
        return people.filter(p =>
            (p.fullName || '').toLowerCase().includes(s) ||
            (p.nickname || '').toLowerCase().includes(s) ||
            (p.position || '').toLowerCase().includes(s)
        );
    }, [people, search]);

    return (
        <div
            className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in"
            onClick={onClose}
        >
            <div
                className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[2.5rem] shadow-premium-lg flex flex-col overflow-hidden animate-reveal border border-white/20 dark:border-slate-800"
                style={{ height: '70vh', maxHeight: '700px' }}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-8 py-7 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-blue-50/50 dark:bg-blue-950/20 shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="bg-blue-600 w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                            <i className="bi bi-person-badge-fill text-white text-xl" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-slate-800 dark:text-slate-100 tracking-tight">
                                Selecionar Vendedor
                            </h2>
                            <p className="text-[10px] uppercase font-black text-blue-600 dark:text-blue-400 tracking-widest mt-0.5">
                                Funcionários Disponíveis
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 flex items-center justify-center hover:bg-rose-50 dark:hover:bg-rose-950/30 text-slate-400 hover:text-rose-500 rounded-xl transition-all"
                    >
                        <i className="bi bi-x-lg" />
                    </button>
                </div>

                {/* Search Bar */}
                <div className="px-8 py-5 border-b border-slate-100 dark:border-slate-800 shrink-0">
                    <div className="relative">
                        <i className="bi bi-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            autoFocus
                            type="text"
                            placeholder="Busque pelo nome ou cargo..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm font-bold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all placeholder:font-normal placeholder:text-slate-400"
                        />
                    </div>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4 text-slate-400">
                            <i className="bi bi-person-badge animate-pulse text-4xl opacity-20" />
                            <span className="text-sm font-bold animate-pulse">Carregando vendedores...</span>
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-4">
                            <i className="bi bi-person-x text-5xl opacity-20" />
                            <div className="text-center">
                                <p className="text-sm font-bold">Nenhum funcionário encontrado</p>
                                <p className="text-xs text-slate-400 opacity-60">Certifique-se que o vendedor está cadastrado como funcionário</p>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-2">
                            {filtered.map((p) => (
                                <button
                                    key={p.id}
                                    onClick={() => { onSelect(p.fullName); onClose(); }}
                                    className="flex items-center gap-4 p-4 rounded-[1.5rem] hover:bg-blue-50 dark:hover:bg-blue-900/10 border border-transparent hover:border-blue-100 dark:hover:border-blue-800 transition-all group text-left"
                                >
                                    <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 font-black text-lg group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm">
                                        {(p.fullName || 'V').charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="text-sm font-black text-slate-800 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                            {p.fullName}
                                        </h4>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-0.5">
                                            {p.position || 'Funcionário'}
                                        </p>
                                    </div>
                                    <div className="opacity-0 group-hover:opacity-100 transition-all">
                                        <i className="bi bi-chevron-right text-blue-600" />
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-8 py-4 border-t border-slate-100 dark:border-slate-800 shrink-0 bg-slate-50/50 dark:bg-slate-900/50">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest text-center">
                        Total de {filtered.length} vendedores disponíveis
                    </p>
                </div>
            </div>
            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes reveal { from { transform: scale(0.9) translateY(20px); opacity: 0; } to { transform: scale(1) translateY(0); opacity: 1; } }
                .animate-reveal { animation: reveal 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
            `}} />
        </div>
    );
};

export default SellerSearchModal;
