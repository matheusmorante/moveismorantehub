import * as React from 'react';

interface SettingsSectionProps {
    id: string;
    title: string;
    icon: string;
    isVisible: boolean;
    children: React.ReactNode;
    defaultOpen?: boolean;
    isSearching?: boolean;
    isAdminOnly?: boolean;
}

export function AdminOnlyBadge({ className = '' }: { className?: string }) {
    return (
        <span className={`inline-flex items-center gap-1.5 bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider shadow-2xs select-none ${className}`}>
            <i className="bi bi-shield-lock-fill text-[10px] text-amber-600 dark:text-amber-400" />
            Apenas Administrador
        </span>
    );
}

export default function SettingsSection({
    id,
    title,
    icon,
    isVisible,
    children,
    defaultOpen = false,
    isSearching = false,
    isAdminOnly = false
}: SettingsSectionProps) {
    const [isOpen, setIsOpen] = React.useState(defaultOpen);

    // Se houver busca ativa, abre a seção para exibir os resultados encontrados
    React.useEffect(() => {
        if (isSearching) {
            setIsOpen(true);
        }
    }, [isSearching]);

    // Abre a seção caso o usuário navegue diretamente pelo hash
    React.useEffect(() => {
        const handleHashChange = () => {
            const currentHash = window.location.hash.replace('#', '');
            if (currentHash === id) {
                setIsOpen(true);
            }
        };
        handleHashChange();
        window.addEventListener('hashchange', handleHashChange);
        return () => window.removeEventListener('hashchange', handleHashChange);
    }, [id]);

    if (!isVisible) return null;

    return (
        <div id={id} className="scroll-mt-32 border-b border-slate-100 dark:border-slate-800/70 last:border-b-0 py-1">
            {/* Linha do Sumário Clean do Tópico com setinha no final */}
            <button
                type="button"
                onClick={() => setIsOpen(prev => !prev)}
                className="w-full flex items-center justify-between py-3.5 px-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-2xl transition-all group text-left cursor-pointer select-none"
            >
                <div className="flex items-center gap-4">
                    <i className={`bi ${icon} text-slate-500 dark:text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 text-lg transition-colors shrink-0`} />
                    <span className="text-xs font-black text-slate-700 dark:text-slate-200 uppercase tracking-widest group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {title}
                    </span>
                    {isAdminOnly && <AdminOnlyBadge className="ml-1" />}
                </div>

                <div className="w-7 h-7 rounded-xl flex items-center justify-center text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 group-hover:bg-slate-100 dark:group-hover:bg-slate-800 transition-all">
                    <i className={`bi bi-chevron-down text-xs font-bold transition-transform duration-200 ${isOpen ? 'rotate-180 text-blue-600 dark:text-blue-400' : ''}`} />
                </div>
            </button>

            {/* Conteúdo Expansível (Campos exibidos diretamente em baixo do título) */}
            {isOpen && (
                <div className="mt-2 mb-4 mx-2 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xl shadow-slate-200/20 dark:shadow-none divide-y divide-slate-50 dark:divide-slate-800/50 overflow-hidden animate-in fade-in zoom-in-98 duration-200">
                    {children}
                </div>
            )}
        </div>
    );
}


