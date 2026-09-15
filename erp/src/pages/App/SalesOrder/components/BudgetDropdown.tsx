import { useState, useRef, useEffect } from "react";

interface BudgetDropdownProps {
    onNewBudget: () => void;
    onViewList: () => void;
    isViewingBudgets: boolean;
}

const BudgetDropdown = ({ onNewBudget, onViewList, isViewingBudgets }: BudgetDropdownProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleNewBudget = () => {
        setIsOpen(false);
        onNewBudget();
    };

    const handleViewList = () => {
        setIsOpen(false);
        onViewList();
    };

    return (
        <div className="relative" ref={ref}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-black uppercase tracking-widest text-[10px] sm:text-xs shadow-lg transition-all active:scale-95 w-full sm:w-auto h-full ${
                    isViewingBudgets 
                        ? "bg-indigo-600 text-white shadow-indigo-200" 
                        : "bg-slate-100 hover:bg-slate-200 text-slate-600 shadow-slate-200"
                }`}
            >
                <i className="bi bi-calculator-fill text-sm" />
                Orçamentos
                <i className={`bi bi-chevron-${isOpen ? 'up' : 'down'} text-[10px] opacity-70 ml-1`} />
            </button>

            {isOpen && (
                <div className="absolute right-0 top-[calc(100%+8px)] w-60 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-2xl shadow-slate-200/60 dark:shadow-none z-50 overflow-hidden animate-slide-up">
                    <div className="p-3 border-b border-slate-50 dark:border-slate-800">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 px-1">
                            Opções de Orçamento
                        </p>
                    </div>
                    <div className="p-2 flex flex-col gap-1">
                        <button
                            onClick={handleViewList}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all text-left group active:scale-[0.98] ${isViewingBudgets ? 'bg-indigo-50/50 dark:bg-indigo-900/10' : ''}`}
                        >
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center bg-slate-100 dark:bg-slate-800 group-hover:scale-110 transition-transform text-indigo-600 shadow-sm border border-slate-200 dark:border-slate-700`}>
                                <i className="bi bi-list-check text-base" />
                            </div>
                            <div>
                                <p className="font-black text-xs text-slate-800 dark:text-slate-100 uppercase tracking-tight leading-none mb-1">
                                    Lista de Orçamentos
                                </p>
                                <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest">
                                    Visualizar propostas salvas
                                </p>
                            </div>
                        </button>

                        <button
                            onClick={handleNewBudget}
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all text-left group active:scale-[0.98]"
                        >
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-slate-100 dark:bg-slate-800 group-hover:scale-110 transition-transform text-indigo-600 shadow-sm border border-slate-200 dark:border-slate-700">
                                <i className="bi bi-plus-lg text-base" />
                            </div>
                            <div>
                                <p className="font-black text-xs text-slate-800 dark:text-slate-100 uppercase tracking-tight leading-none mb-1">
                                    Novo Orçamento
                                </p>
                                <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest">
                                    Criar nova proposta comercial
                                </p>
                            </div>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BudgetDropdown;
