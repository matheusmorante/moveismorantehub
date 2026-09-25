import React from "react";

export interface Category {
    id: string;
    label: string;
    icon: string;
    group: 'system' | 'user' | 'operation';
    keywords: string[];
}

interface SettingsSidebarProps {
    categories: Category[];
    isAdmin?: boolean;
}

const SettingsSidebar: React.FC<SettingsSidebarProps> = ({ categories, isAdmin = true }) => {
    const scrollToSection = (id: string) => {
        window.location.hash = id;
        const element = document.getElementById(id);
        element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        window.dispatchEvent(new Event('hashchange'));
    };

    const userCats = categories.filter(c => c.group === 'user');
    const operationCats = categories.filter(c => c.group === 'operation');
    const systemCats = categories.filter(c => c.group === 'system');
    const renderCategory = (cat: Category, isOperation = false) => (
        <button
            key={cat.id}
            onClick={() => scrollToSection(cat.id)}
            className={`flex items-center gap-3 px-4 ${isOperation ? 'py-2.5 text-[11px]' : 'py-3 text-xs'} rounded-2xl font-bold uppercase tracking-wider transition-all text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-100 group text-left w-full cursor-pointer`}
        >
            <i className={`bi ${cat.icon} text-sm transition-transform group-hover:scale-110 shrink-0 ${isOperation ? 'text-emerald-500' : 'text-slate-400 group-hover:text-blue-500'}`} />
            <span className="truncate">{cat.label}</span>
        </button>
    );

    return (
        <aside className="w-64 shrink-0 flex flex-col gap-5 sticky top-28 h-fit max-h-[calc(100vh-8rem)] overflow-y-auto bg-white/70 dark:bg-slate-900/70 backdrop-blur-md p-4 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-lg shadow-slate-200/20 dark:shadow-none z-10">
            
            {/* User Preferences */}
            <div className="flex flex-col gap-1.5">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1 px-2">
                    Minha Conta
                </h3>
                {userCats.map(cat => renderCategory(cat))}
            </div>

            {isAdmin && operationCats.length > 0 && (
                <div className="flex flex-col gap-1.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1 px-2 flex items-center justify-between">
                        Operação
                        <span className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 px-2 py-0.5 rounded-full text-[8px] font-black uppercase">Admin</span>
                    </h3>
                    {operationCats.map(cat => renderCategory(cat, true))}
                </div>
            )}

            {/* System Preferences (Admin Only) */}
            {isAdmin && systemCats.length > 0 && (
                <div className="flex flex-col gap-1.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1 px-2 flex items-center justify-between">
                        Sistema 
                        <span className="bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 px-2 py-0.5 rounded-full text-[8px] font-black uppercase">Admin</span>
                    </h3>
                    {systemCats.map(cat => renderCategory(cat))}
                </div>
            )}
        </aside>
    );
};

export default SettingsSidebar;
