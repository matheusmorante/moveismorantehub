import React from 'react';

interface AddressSuggestionsMenuProps {
    suggestions: any[];
    loading: boolean;
    onSelect: (suggestion: any) => void;
}

export const AddressSuggestionsMenu: React.FC<AddressSuggestionsMenuProps> = ({
    suggestions,
    loading,
    onSelect,
}) => {
    return (
        <div className="mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl overflow-hidden max-h-64 overflow-y-auto custom-scrollbar animate-fade-in divide-y divide-slate-100 dark:divide-slate-800">
            <div className="px-3.5 py-2 bg-slate-50/80 dark:bg-slate-800/60 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <i className="bi bi-geo-alt-fill text-blue-600 dark:text-blue-400 text-xs" />
                    Sugestões de Endereço (Google Places)
                </span>
                {loading && (
                    <div className="w-3.5 h-3.5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                )}
            </div>

            {loading && suggestions.length === 0 && (
                <div className="p-4 text-center text-xs font-medium text-slate-400 flex items-center justify-center gap-2">
                    <div className="w-3.5 h-3.5 border-2 border-slate-300 border-t-blue-500 rounded-full animate-spin" />
                    Buscando no Google Maps...
                </div>
            )}

            {!loading && suggestions.length === 0 && (
                <div className="p-4 text-center text-xs font-semibold text-slate-400">
                    Nenhum endereço encontrado para esta busca.
                </div>
            )}

            {suggestions.map((s, i) => {
                const mainText = s.address?.road || s.address?.pedestrian || s.address?.suburb || s.display_name?.split(',')[0] || '';
                const subText = [
                    s.address?.neighbourhood || s.address?.suburb,
                    s.address?.city || s.address?.town,
                    s.address?.state || 'PR'
                ].filter(Boolean).join(', ');

                return (
                    <button
                        key={i}
                        type="button"
                        onClick={() => onSelect(s)}
                        className="w-full text-left px-4 py-3 hover:bg-blue-50/60 dark:hover:bg-blue-950/30 transition-all flex items-start gap-3 group/item text-slate-700 dark:text-slate-200"
                    >
                        <div className="w-6 h-6 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 mt-0.5 group-hover/item:scale-110 transition-transform">
                            <i className="bi bi-geo-alt-fill text-xs" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate group-hover/item:text-blue-600 dark:group-hover/item:text-blue-400 transition-colors">
                                {mainText}
                            </p>
                            {subText && (
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                                    {subText}
                                </p>
                            )}
                        </div>
                        <i className="bi bi-arrow-up-left text-slate-300 dark:text-slate-600 group-hover/item:text-blue-500 text-xs shrink-0 self-center transition-colors" />
                    </button>
                );
            })}
        </div>
    );
};
