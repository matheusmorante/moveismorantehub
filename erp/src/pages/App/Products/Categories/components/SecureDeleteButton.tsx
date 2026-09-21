import React from 'react';

interface SecureDeleteButtonProps {
    readonly disabled: boolean;
    readonly disabledReason?: string;
    readonly onDelete: () => void;
    readonly ariaLabel: string;
    readonly title?: string;
    readonly size?: 'sm' | 'md';
}

export const SecureDeleteButton: React.FC<SecureDeleteButtonProps> = ({
    disabled,
    disabledReason,
    onDelete,
    ariaLabel,
    title = 'Excluir',
    size = 'md'
}) => {
    const sizeClasses = size === 'sm' ? 'p-1 text-xs' : 'p-1.5 text-sm';

    if (disabled) {
        return (
            <div
                tabIndex={0}
                role="region"
                aria-label={disabledReason || ariaLabel}
                aria-disabled="true"
                className="relative group inline-flex items-center justify-center cursor-not-allowed outline-none focus-visible:ring-2 focus-visible:ring-amber-500 rounded-lg"
            >
                <button
                    type="button"
                    disabled
                    tabIndex={-1}
                    aria-label={ariaLabel}
                    className={`${sizeClasses} text-slate-300 dark:text-slate-600 bg-transparent border-0 pointer-events-none rounded-lg`}
                >
                    <i className="bi bi-trash" />
                </button>

                {/* Tooltip flutuante acessível no hover e no focus */}
                <div
                    role="tooltip"
                    className="absolute bottom-full right-0 mb-2 hidden group-hover:flex group-focus:flex group-focus-within:flex flex-col gap-1 w-64 p-2.5 bg-slate-900/95 dark:bg-slate-950/95 backdrop-blur-sm text-slate-100 text-[11px] leading-relaxed rounded-xl shadow-2xl border border-slate-700/80 z-[9999] pointer-events-none animate-in fade-in zoom-in-95 duration-150"
                >
                    <div className="flex items-start gap-1.5 font-bold text-amber-400">
                        <i className="bi bi-exclamation-triangle-fill text-xs shrink-0 mt-0.5" />
                        <span>Ação indisponível</span>
                    </div>
                    <span className="text-slate-300 font-normal">
                        {disabledReason}
                    </span>
                </div>
            </div>
        );
    }

    return (
        <button
            type="button"
            onClick={onDelete}
            title={title}
            aria-label={ariaLabel}
            className={`${sizeClasses} text-red-600 hover:text-red-700 bg-red-50/80 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/50 dark:text-red-400 rounded-lg transition-colors border border-red-200/50 dark:border-red-900/50 cursor-pointer shadow-2xs`}
        >
            <i className="bi bi-trash" />
        </button>
    );
};
