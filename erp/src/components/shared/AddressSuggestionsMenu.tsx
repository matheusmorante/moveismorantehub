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
            {loading && suggestions.length === 0 && (
                <div className="p-3.5 text-center text-xs font-medium text-slate-400 flex items-center justify-center gap-2">
                    <div className="w-3.5 h-3.5 border-2 border-slate-300 border-t-blue-500 rounded-full animate-spin" />
                    Buscando endereços...
                </div>
            )}

            {!loading && suggestions.length === 0 && (
                <div className="p-3.5 text-center text-xs font-semibold text-slate-400">
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

                const singleLineText = s.display_name || [mainText, subText].filter(Boolean).join(', ');

                return (
                    <button
                        key={i}
                        type="button"
                        onClick={() => onSelect(s)}
                        className="w-full text-left px-4 py-3 hover:bg-blue-50/60 dark:hover:bg-blue-950/30 transition-all flex items-center text-slate-700 dark:text-slate-200"
                    >
                        <p className="flex-1 min-w-0 text-xs font-semibold text-slate-800 dark:text-slate-100 truncate group-hover/item:text-blue-600 dark:group-hover/item:text-blue-400 transition-colors">
                            {singleLineText}
                        </p>
                    </button>
                );
            })}
        </div>
    );
};
