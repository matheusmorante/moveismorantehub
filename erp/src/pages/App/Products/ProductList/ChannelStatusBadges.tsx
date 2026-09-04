import React from 'react';
import { toast } from 'react-toastify';

interface ChannelStatusBadgesProps {
    active?: boolean;
    catalogStatus?: 'published' | 'hidden' | 'draft' | string;
    onToggleActive?: (e: React.MouseEvent) => void;
    onToggleCatalog?: (e: React.MouseEvent) => void;
    canManageCatalog?: boolean;
    isParent?: boolean;
    size?: 'sm' | 'xs';
    disabled?: boolean;
    isDraft?: boolean;
}

export const ChannelStatusBadges: React.FC<ChannelStatusBadgesProps> = ({
    active = true,
    catalogStatus = 'hidden',
    onToggleActive,
    onToggleCatalog,
    canManageCatalog = true,
    isParent = false,
    size = 'sm',
    disabled = false,
    isDraft = false
}) => {
    const isCatalogPublished = !isDraft && catalogStatus === 'published';
    const isERPActive = !isDraft && active !== false;

    const textSize = size === 'xs' ? 'text-[9px]' : 'text-[10px]';
    const py = size === 'xs' ? 'py-0.5' : 'py-1';
    const pxTag = size === 'xs' ? 'px-1.5' : 'px-2';
    const pxStatus = size === 'xs' ? 'px-2' : 'px-2.5';
    const dotSize = size === 'xs' ? 'w-1.5 h-1.5' : 'w-2 h-2';

    const handleERPClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (isDraft) {
            toast.warning("Este produto é um rascunho. Termine o cadastramento para poder ativá-lo no ERP.");
            return;
        }
        onToggleActive?.(e);
    };

    const handleCatalogClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (isDraft) {
            toast.warning("Este produto é um rascunho. Termine o cadastramento para poder publicá-lo no Catálogo.");
            return;
        }
        onToggleCatalog?.(e);
    };

    return (
        <div className="inline-flex items-center gap-2 flex-wrap" onClick={(e) => e.stopPropagation()}>
            {/* Botão ERP */}
            <button
                type="button"
                onClick={handleERPClick}
                disabled={disabled}
                title={
                    isDraft
                        ? "Produto em rascunho. Termine o cadastramento para poder ativá-lo no ERP."
                        : isERPActive
                        ? "Clique para desativar no ERP"
                        : "Clique para ativar no ERP"
                }
                className={`inline-flex items-stretch rounded-lg shadow-2xs border transition-all cursor-pointer select-none overflow-hidden active:scale-95 ${
                    isERPActive
                        ? 'border-emerald-200/80 dark:border-emerald-800/50 hover:border-emerald-300'
                        : 'border-slate-200/80 dark:border-slate-700/60 hover:border-slate-300'
                } ${disabled ? 'opacity-80 cursor-default active:scale-100' : ''}`}
            >
                {/* Tag Fixa ERP */}
                <span className={`bg-blue-50/90 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 font-extrabold ${textSize} ${pxTag} ${py} flex items-center border-r border-blue-100 dark:border-blue-900/40`}>
                    ERP
                </span>

                {/* Status Interativo ERP */}
                <span className={`${pxStatus} ${py} flex items-center gap-1.5 font-bold ${textSize} ${
                    isERPActive
                        ? 'bg-emerald-50/70 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400'
                        : 'bg-slate-100/90 dark:bg-slate-800/90 text-slate-600 dark:text-slate-400'
                }`}>
                    <span className={`${dotSize} rounded-full shrink-0 ${isERPActive ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                    <span>{isERPActive ? 'Ativo' : 'Inativo'}</span>
                </span>
            </button>

            {/* Botão Catálogo (apenas para itens que não são agrupadores de produto pai) */}
            {!isParent && (
                <button
                    type="button"
                    onClick={handleCatalogClick}
                    disabled={disabled || (!isDraft && !canManageCatalog && !onToggleCatalog)}
                    title={
                        isDraft
                            ? "Produto em rascunho. Termine o cadastramento para poder publicá-lo no Catálogo."
                            : !canManageCatalog
                            ? "Gerenciamento de catálogo indisponível"
                            : isCatalogPublished
                            ? "Clique para ocultar do Catálogo Digital"
                            : "Clique para publicar no Catálogo Digital"
                    }
                    className={`inline-flex items-stretch rounded-lg shadow-2xs border transition-all cursor-pointer select-none overflow-hidden active:scale-95 ${
                        isCatalogPublished
                            ? 'border-emerald-200/80 dark:border-emerald-800/50 hover:border-emerald-300'
                            : 'border-slate-200/80 dark:border-slate-700/60 hover:border-slate-300'
                    } ${disabled ? 'opacity-80 cursor-default active:scale-100' : ''}`}
                >
                    {/* Tag Fixa Catálogo */}
                    <span className={`bg-purple-50/90 dark:bg-purple-950/40 text-purple-800 dark:text-purple-300 font-extrabold ${textSize} ${pxTag} ${py} flex items-center border-r border-purple-100 dark:border-purple-900/40`}>
                        Catálogo
                    </span>

                    {/* Status Interativo Catálogo */}
                    <span className={`${pxStatus} ${py} flex items-center gap-1.5 font-bold ${textSize} ${
                        isCatalogPublished
                            ? 'bg-emerald-50/70 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400'
                            : 'bg-slate-100/90 dark:bg-slate-800/90 text-slate-600 dark:text-slate-400'
                    }`}>
                        <span className={`${dotSize} rounded-full shrink-0 ${isCatalogPublished ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                        <span>{isCatalogPublished ? 'Publicado' : 'Oculto'}</span>
                    </span>
                </button>
            )}
        </div>
    );
};

export default ChannelStatusBadges;
