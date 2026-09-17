import React, { useState, useRef } from 'react';
import { toast } from 'react-toastify';
import DropdownPortal from '@/components/shared/DropdownPortal';

export interface ChannelStatusBadgesProps {
    readonly active?: boolean;
    readonly catalogStatus?: 'published' | 'hidden' | 'draft' | string;
    readonly onToggleActive?: (e: React.MouseEvent) => void;
    readonly onToggleCatalog?: (e: React.MouseEvent) => void;
    readonly canManageCatalog?: boolean;
    readonly isParent?: boolean;
    readonly size?: 'sm' | 'xs';
    readonly disabled?: boolean;
    readonly isDraft?: boolean;
    readonly activeVariationsCount?: number;
    readonly totalVariationsCount?: number;
    readonly disabledReason?: string;
}

/**
 * Badges de status por canal (ERP e Catálogo Digital) com comportamento estrito para produto pai e variações.
 */
export const ChannelStatusBadges: React.FC<ChannelStatusBadgesProps> = ({
    active = true,
    catalogStatus = 'hidden',
    onToggleActive,
    onToggleCatalog,
    canManageCatalog = true,
    isParent = false,
    size = 'sm',
    disabled = false,
    isDraft = false,
    activeVariationsCount,
    totalVariationsCount,
    disabledReason
}) => {
    const [showPopover, setShowPopover] = useState(false);
    const [showDisabledPopover, setShowDisabledPopover] = useState(false);
    const erpBadgeAnchorRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const isCatalogPublished = !isDraft && catalogStatus === 'published';
    const isERPActive = !isDraft && active !== false;

    const textSize = size === 'xs' ? 'text-[9px]' : 'text-[10px]';
    const py = size === 'xs' ? 'py-0.5' : 'py-1';
    const pxTag = size === 'xs' ? 'px-1.5' : 'px-2';
    const pxStatus = size === 'xs' ? 'px-2' : 'px-2.5';
    const dotSize = size === 'xs' ? 'w-1.5 h-1.5' : 'w-2 h-2';

    const handleERPClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (isParent) return; // O status do pai é estritamente derivado das variações
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
        <div ref={containerRef} className="inline-flex items-center gap-2 flex-wrap" onClick={(e) => e.stopPropagation()}>
            {/* Tag/Badge ERP */}
            {isParent ? (
                /* No pai: Somente visualização com popover explicativo no hover */
                <div
                    ref={erpBadgeAnchorRef}
                    className="relative inline-flex items-center cursor-help"
                    onMouseEnter={() => setShowPopover(true)}
                    onMouseLeave={() => setShowPopover(false)}
                    aria-label="Status ERP derivado das variações"
                >
                    <div
                        className={`inline-flex items-stretch rounded-lg shadow-2xs border transition-all select-none overflow-hidden ${
                            isERPActive
                                ? 'border-emerald-200/80 dark:border-emerald-800/50'
                                : 'border-slate-200/80 dark:border-slate-700/60'
                        }`}
                    >
                        {/* Tag Fixa ERP */}
                        <span className={`bg-blue-50/90 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 font-extrabold ${textSize} ${pxTag} ${py} flex items-center border-r border-blue-100 dark:border-blue-900/40`}>
                            ERP
                        </span>

                        {/* Status Somente Leitura ERP */}
                        <span className={`${pxStatus} ${py} flex items-center gap-1.5 font-bold ${textSize} ${
                            isERPActive
                                ? 'bg-emerald-50/70 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400'
                                : 'bg-slate-100/90 dark:bg-slate-800/90 text-slate-600 dark:text-slate-400'
                        }`}>
                            <span className={`${dotSize} rounded-full shrink-0 ${isERPActive ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                            <span>{isERPActive ? 'Ativo' : 'Desativado'}</span>
                        </span>
                    </div>

                    {/* Popover Explicativo no Hover do Pai */}
                    {showPopover && (
                        <DropdownPortal
                            isOpen={showPopover}
                            anchorRef={erpBadgeAnchorRef}
                            className="min-w-[260px] max-w-[280px] pointer-events-none"
                            onClose={() => setShowPopover(false)}
                        >
                            <div className="p-3 bg-slate-900/95 dark:bg-slate-800/95 text-white text-[11px] rounded-xl shadow-2xl border border-slate-700 backdrop-blur-xs animate-in fade-in zoom-in-95 duration-150 select-none">
                                <div className="flex items-center gap-1.5 font-bold text-amber-300 mb-1">
                                    <i className="bi bi-info-circle-fill text-[12px]" />
                                    <span>Status Calculado pelas Variações</span>
                                </div>
                                <p className="text-slate-200 leading-snug">
                                    O produto pai fica <strong>Ativo</strong> enquanto ao menos uma variação estiver ativa, e só fica <strong>Desativado</strong> se todas as suas variações estiverem desativadas.
                                </p>
                                {typeof activeVariationsCount === 'number' && typeof totalVariationsCount === 'number' && (
                                    <div className="mt-2 pt-1.5 border-t border-slate-700/80 flex items-center justify-between text-[10px] text-slate-300 font-medium">
                                        <span>Variações ativas:</span>
                                        <span className={`font-bold px-1.5 py-0.5 rounded ${activeVariationsCount > 0 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'}`}>
                                            {activeVariationsCount} de {totalVariationsCount} ativas
                                        </span>
                                    </div>
                                )}
                                <div className="mt-1 text-[9px] text-slate-400 italic text-center">
                                    Altere o status diretamente em cada variação filha.
                                </div>
                            </div>
                        </DropdownPortal>
                    )}
                </div>
            ) : (
                /* Na variação: Botão interativo normal */
                <button
                    type="button"
                    onClick={handleERPClick}
                    disabled={disabled}
                    onMouseEnter={() => disabled && setShowDisabledPopover(true)}
                    onMouseLeave={() => disabled && setShowDisabledPopover(false)}
                    aria-label={`Status ERP: ${isERPActive ? 'Ativo' : 'Desativado'}`}
                    title={
                        disabled 
                            ? undefined
                            : isDraft
                            ? "Produto em rascunho. Termine o cadastramento para poder ativá-lo no ERP."
                            : isERPActive
                            ? "Clique para desativar esta variação no ERP"
                            : "Clique para ativar esta variação no ERP"
                    }
                    className={`inline-flex items-stretch rounded-lg shadow-2xs border transition-all select-none overflow-hidden active:scale-95 ${
                        disabled 
                            ? 'border-slate-300 dark:border-slate-700 opacity-60 cursor-help bg-slate-200 dark:bg-slate-800 grayscale'
                            : isERPActive
                                ? 'border-emerald-200/80 dark:border-emerald-800/50 hover:border-emerald-300 cursor-pointer'
                                : 'border-slate-200/80 dark:border-slate-700/60 hover:border-slate-300 cursor-pointer'
                    }`}
                >
                    {/* Tag Fixa ERP */}
                    <span className={`bg-blue-50/90 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 font-extrabold ${textSize} ${pxTag} ${py} flex items-center border-r border-blue-100 dark:border-blue-900/40`}>
                        ERP
                    </span>

                    {/* Status Interativo ERP */}
                    <span className={`${pxStatus} ${py} flex items-center gap-1.5 font-bold ${textSize} ${
                        disabled
                            ? 'bg-slate-200/90 dark:bg-slate-800/90 text-slate-500 dark:text-slate-500'
                            : isERPActive
                            ? 'bg-emerald-50/70 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400'
                            : 'bg-slate-100/90 dark:bg-slate-800/90 text-slate-600 dark:text-slate-400'
                    }`}>
                        <span className={`${dotSize} rounded-full shrink-0 ${isERPActive ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                        <span>{isERPActive ? 'Ativo' : 'Desativado'}</span>
                    </span>
                </button>
            )}

            {/* Botão Catálogo (apenas para itens que não são agrupadores de produto pai) */}
            {!isParent && (
                <button
                    type="button"
                    onClick={handleCatalogClick}
                    disabled={disabled || (!isDraft && !canManageCatalog && !onToggleCatalog)}
                    onMouseEnter={() => disabled && setShowDisabledPopover(true)}
                    onMouseLeave={() => disabled && setShowDisabledPopover(false)}
                    aria-label={`Status Catálogo: ${isCatalogPublished ? 'Publicado' : 'Oculto'}`}
                    title={
                        disabled
                            ? undefined
                            : isDraft
                            ? "Produto em rascunho. Termine o cadastramento para poder publicá-lo no Catálogo."
                            : !canManageCatalog
                            ? "Gerenciamento de catálogo indisponível"
                            : isCatalogPublished
                            ? "Clique para ocultar do Catálogo Digital"
                            : "Clique para publicar no Catálogo Digital"
                    }
                    className={`inline-flex items-stretch rounded-lg shadow-2xs border transition-all select-none overflow-hidden active:scale-95 ${
                        disabled 
                            ? 'border-slate-300 dark:border-slate-700 opacity-60 cursor-help bg-slate-200 dark:bg-slate-800 grayscale'
                            : isCatalogPublished
                                ? 'border-emerald-200/80 dark:border-emerald-800/50 hover:border-emerald-300 cursor-pointer'
                                : 'border-slate-200/80 dark:border-slate-700/60 hover:border-slate-300 cursor-pointer'
                    }`}
                >
                    {/* Tag Fixa Catálogo */}
                    <span className={`bg-purple-50/90 dark:bg-purple-950/40 text-purple-800 dark:text-purple-300 font-extrabold ${textSize} ${pxTag} ${py} flex items-center border-r border-purple-100 dark:border-purple-900/40`}>
                        Catálogo
                    </span>

                    {/* Status Interativo Catálogo */}
                    <span className={`${pxStatus} ${py} flex items-center gap-1.5 font-bold ${textSize} ${
                        disabled
                            ? 'bg-slate-200/90 dark:bg-slate-800/90 text-slate-500 dark:text-slate-500'
                            : isCatalogPublished
                            ? 'bg-emerald-50/70 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400'
                            : 'bg-slate-100/90 dark:bg-slate-800/90 text-slate-600 dark:text-slate-400'
                    }`}>
                        <span className={`${dotSize} rounded-full shrink-0 ${isCatalogPublished ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                        <span>{isCatalogPublished ? 'Publicado' : 'Oculto'}</span>
                    </span>
                </button>
            )}

            {showDisabledPopover && disabledReason && (
                <DropdownPortal
                    isOpen={showDisabledPopover}
                    anchorRef={containerRef}
                    className="min-w-[220px] max-w-[260px] pointer-events-none"
                    onClose={() => setShowDisabledPopover(false)}
                >
                    <div className="p-3 bg-slate-900/95 dark:bg-slate-800/95 text-white text-[11px] rounded-xl shadow-2xl border border-slate-700 backdrop-blur-xs animate-in fade-in zoom-in-95 duration-150 select-none">
                        <div className="flex items-center gap-1.5 font-bold text-amber-300 mb-1">
                            <i className="bi bi-info-circle-fill text-[12px]" />
                            <span>Ação Indisponível</span>
                        </div>
                        <p className="text-slate-200 leading-snug">
                            {disabledReason}
                        </p>
                    </div>
                </DropdownPortal>
            )}
        </div>
    );
};

export default ChannelStatusBadges;
