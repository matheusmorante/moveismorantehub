import React from "react";

export interface Category {
    id: string;
    label: string;
    icon: string;
    group: 'system' | 'user';
    keywords: string[];
}

interface SettingsSidebarProps {
    categories: Category[];
    isAdmin: boolean;
}

const SettingsSidebar: React.FC<SettingsSidebarProps> = ({ categories, isAdmin }) => {
    const scrollToSection = (id: string) => {
        window.location.hash = id;
        const element = document.getElementById(id);
        element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        window.dispatchEvent(new Event('hashchange'));
    };

    const userCats = categories.filter(c => c.group === 'user');
    const systemCats = categories.filter(c => c.group === 'system');

    return (
        <aside className="w-full flex flex-col gap-5 sticky top-28 h-fit bg-white/70 dark:bg-slate-900/70 backdrop-blur-md p-4 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-lg shadow-slate-200/20 dark:shadow-none z-10">
            
            {/* User Preferences */}
            <div className="flex flex-col gap-1.5">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1 px-2">
                    Minha Conta
                </h3>
                {userCats.map(cat => (
                    <button
                        key={cat.id}
                        onClick={() => scrollToSection(cat.id)}
                        className="flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all text-slate-600 dark:text-slate-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400 group text-left w-full cursor-pointer"
                    >
                        <i className={`bi ${cat.icon} text-sm transition-transform group-hover:scale-110 shrink-0 text-blue-500`} />
                        <span className="truncate">{cat.label}</span>
                    </button>
                ))}
            </div>

            {/* System Preferences (Admin Only) */}
            {isAdmin && systemCats.length > 0 && (
                <div className="flex flex-col gap-1.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1 px-2 flex items-center justify-between">
                        Sistema 
                        <span className="bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 px-2 py-0.5 rounded-full text-[8px] font-black uppercase">Admin</span>
                    </h3>
                    {systemCats.map(cat => (
                        <button
                            key={cat.id}
                            onClick={() => scrollToSection(cat.id)}
                            className="flex items-center gap-3 px-4 py-2.5 rounded-2xl text-[11px] font-bold uppercase tracking-wider transition-all text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-100 group text-left w-full cursor-pointer"
                        >
                            <i className={`bi ${cat.icon} text-sm transition-transform group-hover:scale-110 shrink-0 text-slate-400 group-hover:text-blue-500`} />
                            <span className="truncate">{cat.label}</span>
                        </button>
                    ))}
                </div>
            )}
        </aside>
    );
};

export default SettingsSidebar;
