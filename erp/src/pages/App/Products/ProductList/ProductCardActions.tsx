import React from 'react';
import { Link } from 'react-router-dom';
import Product from '../../../types/product.type';
import { formatCurrency } from '../../../utils/formatters';
import DropdownPortal from '../../../../components/shared/DropdownPortal';

interface ProductCardActionsProps {
    product: Product;
    onEdit: (product: Product) => void;
    onDuplicate?: (product: Product) => void;
    onShowHistory?: (product: Product) => void;
    onLaunchStock?: (product: any) => void;
    onDelete: (id: string) => void;
    onOpenSalesModal: () => void;
    onOpenWhatsApp: (message: string) => void;
}

export const ProductCardActions: React.FC<ProductCardActionsProps> = ({
    product,
    onEdit,
    onDuplicate,
    onShowHistory,
    onLaunchStock,
    onDelete,
    onOpenSalesModal,
    onOpenWhatsApp,
}) => {
    const [isMenuOpen, setIsMenuOpen] = React.useState(false);
    const menuAnchorRef = React.useRef<HTMLButtonElement>(null);
    const isDraft = Boolean(product.isDraft) || Boolean((product as any).is_draft) || product.status === 'draft';

    const handleWhatsAppClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsMenuOpen(false);
        const pPrice = Number(product.promoPrice) > 0 && Number(product.promoPrice) < Number(product.unitPrice)
            ? product.promoPrice
            : product.unitPrice;
        const msg = `*${product.name || product.title || product.description}*\n*Código/SKU:* ${product.sku || product.code || 'S/REF'}\n*Preço:* ${formatCurrency(pPrice || 0)}\n\nConfira mais detalhes em nosso catálogo oficial!`;
        onOpenWhatsApp(msg);
    };

    return (
        <div className="relative flex items-center gap-1 ml-1">
            <button
                onClick={(e) => { e.stopPropagation(); onEdit(product); }}
                className="w-7 h-7 flex items-center justify-center bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-all border border-slate-100 dark:border-slate-700 shrink-0 cursor-pointer"
                title="Editar Produto"
            >
                <i className="bi bi-pencil text-xs" />
            </button>

            <button
                ref={menuAnchorRef}
                onClick={(e) => { e.stopPropagation(); setIsMenuOpen(!isMenuOpen); }}
                className={`w-7 h-7 flex items-center justify-center rounded-lg transition-all border shrink-0 cursor-pointer ${
                    isMenuOpen 
                        ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 text-indigo-600' 
                        : 'bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-400 hover:text-slate-600 hover:bg-slate-100'
                }`}
                title="Opções"
            >
                <i className="bi bi-three-dots text-xs" />
            </button>

            {isMenuOpen && (
                <DropdownPortal
                    isOpen={isMenuOpen}
                    onClose={() => setIsMenuOpen(false)}
                anchorRef={menuAnchorRef}
                className="min-w-[170px]"
            >
                <div 
                    className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-2xl py-2 flex flex-col z-[9999] animate-slide-up"
                    onMouseLeave={() => setIsMenuOpen(false)}
                >
                    <button
                        onClick={(e) => { e.stopPropagation(); setIsMenuOpen(false); onEdit(product); }}
                        className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-950 transition-colors text-left group cursor-pointer"
                    >
                        <i className="bi bi-pencil-fill text-blue-500" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">Editar Produto</span>
                    </button>

                    {onShowHistory && !product.isParent && (
                        <button
                            onClick={(e) => { e.stopPropagation(); setIsMenuOpen(false); onShowHistory(product); }}
                            className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-950 transition-colors text-left group cursor-pointer"
                        >
                            <i className="bi bi-clock-history text-amber-500" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">Histórico de Preços</span>
                        </button>
                    )}

                    {!product.isParent && (
                        <button
                            onClick={(e) => { e.stopPropagation(); setIsMenuOpen(false); onOpenSalesModal(); }}
                            className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-950 transition-colors text-left group cursor-pointer"
                        >
                            <i className="bi bi-receipt text-blue-500" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">Ver Pedidos Vinculados</span>
                        </button>
                    )}

                    <Link
                        to={`/marketing/posts?product=${product.id}`}
                        onClick={(e) => { e.stopPropagation(); setIsMenuOpen(false); }}
                        className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-950 transition-colors text-left group"
                    >
                        <i className="bi bi-instagram text-pink-500" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">Posts Redes Sociais</span>
                    </Link>

                    {!product.isVariation && onDuplicate && (
                        <button
                            onClick={(e) => { e.stopPropagation(); setIsMenuOpen(false); onDuplicate(product); }}
                            className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-950 transition-colors text-left group border-t border-slate-50 dark:border-slate-800/50 mt-1 cursor-pointer"
                        >
                            <i className="bi bi-copy text-indigo-500" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">Duplicar Produto</span>
                        </button>
                    )}

                    <button
                        onClick={handleWhatsAppClick}
                        className="flex items-center gap-3 px-4 py-2.5 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors text-left group cursor-pointer"
                    >
                        <i className="bi bi-whatsapp text-emerald-600 dark:text-emerald-400" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-300">Enviar por WhatsApp</span>
                    </button>

                    {product.itemType !== 'service' && !product.isParent && (
                        <button
                            onClick={(e) => { e.stopPropagation(); setIsMenuOpen(false); onLaunchStock?.(product); }}
                            className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-950 transition-colors text-left group cursor-pointer"
                        >
                            <span className="flex items-center gap-0.5 text-emerald-500">
                                <i className="bi bi-box-seam-fill" />
                                <i className="bi bi-arrow-left-right text-[9px]" />
                            </span>
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">Movimentações de Estoque</span>
                        </button>
                    )}

                    {isDraft && (
                        <div className="border-t border-slate-50 dark:border-slate-800/50 my-1">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsMenuOpen(false);
                                    if (product.id) onDelete(product.id);
                                }}
                                className="flex items-center gap-3 px-4 py-2.5 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors text-left group w-full text-red-600 dark:text-red-400 cursor-pointer"
                                title="Descartar Rascunho"
                            >
                                <i className="bi bi-trash3-fill text-red-500" />
                                <span className="text-[10px] font-black uppercase tracking-widest font-bold">Descartar Rascunho</span>
                            </button>
                        </div>
                    )}
                </div>
            </DropdownPortal>
            )}
        </div>
    );
};
