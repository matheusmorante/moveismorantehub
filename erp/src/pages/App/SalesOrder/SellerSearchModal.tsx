import React, { useState, useEffect, useRef } from 'react';
import { subscribeToPeople } from '@/pages/utils/personService';
import Person from '@/pages/types/person.type';
import DropdownPortal from '@/components/shared/DropdownPortal';

interface Props {
    onSelect: (name: string) => void;
    onClose: () => void;
    anchorRef: React.RefObject<HTMLElement>;
    onAddNew: () => void;
}

const SellerSearchModal = ({ onSelect, onClose, anchorRef, onAddNew }: Props) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [employees, setEmployees] = useState<Person[]>([]);
    const [filteredEmployees, setFilteredEmployees] = useState<Person[]>([]);
    const [loading, setLoading] = useState(true);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const unsub = subscribeToPeople('employees', (data) => {
            const activeEmployees = data.filter(e => e.active);
            setEmployees(activeEmployees);
            setFilteredEmployees(activeEmployees);
            setLoading(false);
        });
        return unsub;
    }, []);

    useEffect(() => {
        const lowerTerm = searchTerm.toLowerCase();
        setFilteredEmployees(
            employees.filter(e => 
                (e.fullName || '').toLowerCase().includes(lowerTerm) || 
                (e.nickname && e.nickname.toLowerCase().includes(lowerTerm)) ||
                (e.position && e.position.toLowerCase().includes(lowerTerm))
            )
        );
    }, [searchTerm, employees]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node) && 
                anchorRef.current && !anchorRef.current.contains(event.target as Node)) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onClose, anchorRef]);

    return (
        <DropdownPortal anchorRef={anchorRef} isOpen={true} className="min-w-[320px]">
            <div 
                ref={dropdownRef}
                className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-premium-lg overflow-hidden animate-slide-up flex flex-col"
                style={{ maxHeight: '400px' }}
            >
                <div className="p-3 bg-slate-50/50 dark:bg-slate-950/30 border-b border-slate-100 dark:border-slate-800 flex gap-2">
                    <div className="relative flex-1">
                        <i className="bi bi-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
                        <input
                            autoFocus
                            type="text"
                            className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                            placeholder="Buscar ou apelido..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button 
                        onClick={(e) => {
                            e.stopPropagation();
                            onAddNew();
                        }}
                        className="w-10 h-10 flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg shadow-blue-500/20 active:scale-95 transition-all shrink-0"
                        title="Cadastrar Novo Vendedor"
                    >
                        <i className="bi bi-plus-lg text-lg" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-1">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-8 gap-3">
                            <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Carregando...</span>
                        </div>
                    ) : filteredEmployees.length > 0 ? (
                        <div className="flex flex-col">
                            {filteredEmployees.map((e) => (
                                <button
                                    key={e.id}
                                    type="button"
                                    onClick={() => {
                                        onSelect(e.nickname || e.fullName);
                                        onClose();
                                    }}
                                    className="flex items-center gap-3 p-3 hover:bg-blue-50 dark:hover:bg-blue-950/20 rounded-xl transition-all group text-left w-full"
                                >
                                    <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-800 flex items-center justify-center group-hover:bg-white dark:group-hover:bg-slate-700 transition-colors shadow-sm">
                                        <i className="bi bi-person text-slate-400 group-hover:text-blue-500" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{e.fullName}</span>
                                        <div className="flex items-center gap-2">
                                            {e.nickname && <span className="text-[9px] font-black uppercase text-blue-500/70 tracking-tighter">@{e.nickname}</span>}
                                            {e.position && <span className="text-[9px] font-black uppercase text-slate-400 tracking-tighter">{e.position}</span>}
                                        </div>
                                    </div>
                                    <div className="ml-auto opacity-0 group-hover:opacity-100 transition-all">
                                        <i className="bi bi-check-lg text-blue-500" />
                                    </div>
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-8 gap-2">
                            <i className="bi bi-person-x text-slate-200 dark:text-slate-800 text-3xl" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Nenhum vendedor encontrado</span>
                        </div>
                    )}
                </div>
            </div>
        </DropdownPortal>
    );
};

export default SellerSearchModal;
