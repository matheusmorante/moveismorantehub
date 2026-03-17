import React from "react";
import { Link } from "react-router-dom";
import Product, { ProductVisibilitySettings } from "../../../types/product.type";
import { formatCurrency } from "../../../utils/formatters";
import { getCategoryBreadcrumb } from '@/pages/utils/categoryService';
import DropdownPortal from "../../../../components/shared/DropdownPortal";
import ProductMigrationModal from "../components/ProductMigrationModal";

interface ProductRowProps {
    product: Product;
    onEdit: (product: Product) => void;
    onDelete: (id: string) => void;
    onRestore: (id: string) => void;
    onPermanentDelete: (id: string) => void;
    onToggleActive: (id: string, currentStatus: boolean) => void;
    onShowHistory?: (product: Product) => void;
    onLaunchStock?: (product: any) => void;
    visibilitySettings: ProductVisibilitySettings;
    showTrash?: boolean;
    orderedColumnKeys?: string[];
    isSelected?: boolean;
    onToggleSelection?: () => void;
    categoryTree?: any;
    onRefresh?: () => void;
    onDuplicate?: (product: Product) => void;
}

const ProductRow = ({
    product,
    onEdit,
    onDelete,
    onRestore,
    onPermanentDelete,
    onToggleActive,
    onShowHistory,
    onLaunchStock,
    visibilitySettings,
    showTrash,
    orderedColumnKeys,
    isSelected,
    onToggleSelection,
    categoryTree,
    onRefresh,
    onDuplicate
}: ProductRowProps) => {
    const [isMenuOpen, setIsMenuOpen] = React.useState(false);
    const [isMigrationModalOpen, setIsMigrationModalOpen] = React.useState(false);
    const menuAnchorRef = React.useRef<HTMLButtonElement>(null);

    const renderCell = (key: string) => {
        if (!visibilitySettings[key as keyof ProductVisibilitySettings]) return null;

        switch (key) {
            case 'code':
                return (
                    <td key="code" className="px-6 py-4 text-left w-[1%] whitespace-nowrap">
                        <span className="font-mono text-xs text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg break-all whitespace-normal max-w-[150px] inline-block">
                            {product.code || "-"}
                        </span>
                    </td>
                );
            case 'description':
                return (
                    <td key="description" className="px-6 py-4 text-left">
                        <div className="flex items-center gap-4">
                            {/* Thumbnail with Variation Badge */}
                            {!product.isVariation && (
                                <div className="relative shrink-0">
                                    {product.images?.[0] ? (
                                        <img
                                            src={product.images[0]}
                                            alt=""
                                            className="w-12 h-12 rounded-xl object-cover border border-slate-100 dark:border-slate-800 shadow-sm group-hover:scale-105 transition-transform"
                                        />
                                    ) : (
                                        <div className="w-12 h-12 rounded-xl bg-slate-50 dark:bg-slate-900 flex items-center justify-center text-slate-300 border border-slate-100 dark:border-slate-800 group-hover:bg-slate-100 dark:group-hover:bg-slate-800 transition-colors">
                                            <i className="bi bi-image text-lg"></i>
                                        </div>
                                    )}
                                    {product.hasVariations && (
                                        <div 
                                            className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-indigo-600 text-white rounded-lg flex items-center justify-center shadow-lg border-2 border-white dark:border-slate-900 animate-in zoom-in duration-300" 
                                            title="Possui variações"
                                        >
                                            <i className="bi bi-layers-fill text-[10px]"></i>
                                        </div>
                                    )}
                                </div>
                            )}

                            {product.isVariation && (
                                <div className="flex items-center text-slate-300 dark:text-slate-700 ml-4 mr-1">
                                    <i className="bi bi-arrow-return-right text-sm" />
                                </div>
                            )}
                            <div className="flex flex-col">
                                <span className={`text-sm ${product.isParent ? 'font-black text-blue-600 dark:text-blue-400 uppercase tracking-tighter' : 'font-bold text-slate-700 dark:text-slate-200'}`}>
                                    {product.description}
                                </span>
                                <div className="flex items-center gap-2 mt-1">
                                    {product.isDraft && (
                                        <span className="flex items-center gap-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest border border-amber-200 dark:border-amber-900/40 shadow-sm">
                                            <i className="bi bi-file-earmark-text"></i> Rascunho
                                        </span>
                                    )}
                                    {product.itemType === 'service' ? (
                                        <span className="flex items-center gap-1 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest border border-amber-100 dark:border-amber-900/30">
                                            <i className="bi bi-tools"></i> Serviço
                                        </span>
                                    ) : (
                                        <>
                                            {product.isCombo && (
                                                <span className="flex items-center gap-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest border border-purple-200 dark:border-purple-900/40 shadow-sm animate-pulse-slow">
                                                    <i className="bi bi-layers-fill"></i> Combo/Jogo
                                                </span>
                                            )}
                                            <span className="flex items-center gap-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest border border-blue-100 dark:border-blue-900/30">
                                                <i className="bi bi-box-seam"></i> Produto
                                            </span>
                                            {product.condition && (
                                                <span className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest border ${product.condition === 'novo' ? 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-900/30' :
                                                    product.condition === 'usado' ? 'bg-purple-50 text-purple-600 border-purple-100 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-900/30' :
                                                        'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-900/30'
                                                    }`}>
                                                    {product.condition}
                                                </span>
                                            )}
                                        </>
                                    )}

                                </div>
                            </div>
                        </div>
                    </td>
                );

            case 'costPrice':
                if (product.isParent) return <td key="costPrice" className="px-6 py-4"></td>;
                return (
                    <td key="costPrice" className="px-6 py-4 text-right">
                        <span className="text-sm font-bold text-slate-600 dark:text-slate-400">
                            {formatCurrency(product.costPrice || 0)}
                        </span>
                    </td>
                );
            case 'unitPrice':
                if (product.isParent) return <td key="unitPrice" className="px-6 py-4"></td>;
                return (
                    <td key="unitPrice" className="px-6 py-4 text-right">
                        <span className="text-sm font-black text-blue-600 dark:text-blue-400">
                            {formatCurrency(product.unitPrice || 0)}
                        </span>
                    </td>
                );
            case 'stock':
                if (product.isParent) return <td key="stock" className="px-6 py-4"></td>;
                const isLowStock = (product.stock || 0) <= (product.minStock || 0);
                return (
                    <td key="stock" className="px-6 py-4 text-center">
                        <span className={`text-sm font-black ${isLowStock ? 'text-red-500 dark:text-red-400' : 'text-slate-700 dark:text-slate-300'}`}>
                            {product.itemType === 'service' ? '-' : (product.stock ?? 0)}
                        </span>
                    </td>
                );
            case 'category':
                if (product.isParent) return <td key="category" className="px-6 py-4"></td>;
                const categoryDisplay = getCategoryBreadcrumb(product.categoryIds || [], categoryTree);
                return (
                    <td key="category" className="px-6 py-4 text-left">
                        <div className="flex flex-wrap gap-x-2 gap-y-1 max-w-[250px]">
                            {categoryDisplay.split(' | ').map((path, idx) => {
                                const [parents, catName] = path.includes(' > ') ? path.split(' > ') : ["", path];
                                return (
                                    <div key={idx} className="text-[10px] font-bold uppercase tracking-widest leading-relaxed">
                                        {parents && <span className="text-slate-400 dark:text-slate-600 font-medium">{parents} &gt; </span>}
                                        <span className="text-slate-600 dark:text-slate-300">{catName}</span>
                                        {idx < categoryDisplay.split(' | ').length - 1 && <span className="ml-2 text-blue-500 opacity-50">|</span>}
                                    </div>
                                );
                            })}
                        </div>
                    </td>
                );
            case 'createdAt':
                return (
                    <td key="createdAt" className="px-6 py-4 text-left">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-950 px-2 py-1 rounded-lg border border-slate-100 dark:border-slate-800">
                            {product.createdAt ? new Date(product.createdAt).toLocaleDateString('pt-BR') : '-'}
                        </span>
                    </td>
                );
            case 'actions':
                return (
                    <td key="actions" className="px-6 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-2">
                            {showTrash ? (
                                <>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onRestore(product.id!); }}
                                        className="p-2 text-slate-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-xl transition-all shadow-sm bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800"
                                        title="Restaurar Produto"
                                    >
                                        <i className="bi bi-arrow-counterclockwise text-sm" />
                                    </button>

                                    <button
                                        onClick={(e) => { e.stopPropagation(); onPermanentDelete(product.id!); }}
                                        className="p-2 text-slate-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl transition-all shadow-sm bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800"
                                        title="Excluir Permanentemente"
                                    >
                                        <i className="bi bi-trash3-fill text-sm" />
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onToggleActive(product.id!, product.active); }}
                                        className={`p-2 rounded-xl transition-all shadow-sm border ${product.active
                                            ? 'text-emerald-500 hover:text-emerald-600 bg-emerald-50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-900/30'
                                            : 'text-slate-400 hover:text-slate-500 bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700'}`}
                                        title={product.active ? "Desativar Produto" : "Ativar Produto"}
                                    >
                                        <i className={`bi ${product.active ? 'bi-toggle-on' : 'bi-toggle-off'} text-lg`} />
                                    </button>

                                    <div className="relative">
                                        <button
                                            ref={menuAnchorRef}
                                            onClick={(e) => { e.stopPropagation(); setIsMenuOpen(!isMenuOpen); }}
                                            className={`p-2 rounded-xl transition-all shadow-sm border bg-white dark:bg-slate-950 hover:bg-slate-50 dark:hover:bg-slate-900 ${isMenuOpen ? 'border-blue-200 text-blue-600 ring-4 ring-blue-50 dark:ring-blue-900/10' : 'text-slate-400 dark:text-slate-500 border-slate-100 dark:border-slate-800'}`}
                                            title="Mais Ações"
                                        >
                                            <i className="bi bi-three-dots-vertical text-sm" />
                                        </button>

                                        <DropdownPortal
                                            isOpen={isMenuOpen}
                                            onClose={() => setIsMenuOpen(false)}
                                            anchorRef={menuAnchorRef}
                                            className="min-w-[180px]"
                                        >
                                            <div 
                                                className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-2xl py-2 flex flex-col z-[9999] animate-slide-up"
                                                onMouseLeave={() => setIsMenuOpen(false)}
                                            >
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setIsMenuOpen(false); onEdit(product); }}
                                                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-950 transition-colors text-left group"
                                                >
                                                    <i className="bi bi-pencil-fill text-blue-500" />
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">Editar Detalhes</span>
                                                </button>

                                                {!product.isVariation && onDuplicate && (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); setIsMenuOpen(false); onDuplicate(product); }}
                                                        className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-950 transition-colors text-left group"
                                                    >
                                                        <i className="bi bi-copy text-indigo-500" />
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">Duplicar Produto</span>
                                                    </button>
                                                )}

                                                {onShowHistory && !product.isParent && (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); setIsMenuOpen(false); onShowHistory(product); }}
                                                        className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-950 transition-colors text-left group"
                                                    >
                                                        <i className="bi bi-clock-history text-amber-500" />
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">Histórico de Preços</span>
                                                    </button>
                                                )}

                                                {product.itemType !== 'service' && !product.isParent && (
                                                    <>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); setIsMenuOpen(false); onLaunchStock?.(product); }}
                                                            className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-950 transition-colors text-left group"
                                                        >
                                                            <i className="bi bi-box-seam text-emerald-500" />
                                                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">Lançar Estoque</span>
                                                        </button>
                                                        
                                                        <Link
                                                            to="/stock/label-printing"
                                                            state={{ product }}
                                                            onClick={() => setIsMenuOpen(false)}
                                                            className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-950 transition-colors text-left group"
                                                        >
                                                            <i className="bi bi-printer text-indigo-500" />
                                                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">Imprimir Etiquetas</span>
                                                        </Link>
                                                    </>
                                                )}
                                                
                                                {/* Opção de Migração - Apenas para simples ou variações */}
                                                {(product.isVariation || !product.hasVariations) && !product.isParent && (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); setIsMenuOpen(false); setIsMigrationModalOpen(true); }}
                                                        className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-950 transition-colors text-left group border-t border-slate-50 dark:border-slate-800/50"
                                                    >
                                                        <i className="bi bi-shuffle text-blue-500" />
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">Migrar Referências</span>
                                                    </button>
                                                )}

                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setIsMenuOpen(false); onDelete(product.id!); }}
                                                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-left group border-t border-slate-50 dark:border-slate-800/50 mt-1"
                                                >
                                                    <i className="bi bi-trash-fill text-red-500" />
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-red-600 dark:text-red-400">Excluir Produto</span>
                                                </button>
                                            </div>
                                        </DropdownPortal>
                                    </div>
                                </>
                            )}
                        </div>
                    </td>
                );
            default:
                return null;
        }
    };

    return (
        <tr
            className={`transition-colors group cursor-pointer ${product.isParent ? 'bg-blue-50/30 dark:bg-blue-900/10' : product.isVariation ? 'bg-slate-50/20 dark:bg-slate-900/10' : 'bg-slate-50/50 dark:bg-slate-900/30'} hover:bg-slate-100/50 dark:hover:bg-slate-800/50`}
            onClick={() => onEdit(product)}
        >
            {/* Row Checkbox */}
            <td className="p-0 w-12 text-center">
                <label
                    className="flex items-center justify-center w-full h-full cursor-pointer py-4 px-6"
                    onClick={(e) => e.stopPropagation()}
                >
                    <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => onToggleSelection?.()}
                        className="w-4 h-4 text-blue-600 bg-white border-slate-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-slate-900 focus:ring-2 dark:bg-slate-800 dark:border-slate-700 cursor-pointer"
                    />
                </label>
            </td>

            {orderedColumnKeys ? orderedColumnKeys.map(key => renderCell(key)) : (
                <>
                    {renderCell('code')}
                    {renderCell('description')}
                    {renderCell('unitPrice')}
                    {renderCell('stock')}
                    {renderCell('actions')}
                </>
            )}
            
            {/* Modal de Migração */}
            {isMigrationModalOpen && (
                <ProductMigrationModal
                    sourceProduct={product}
                    onClose={() => setIsMigrationModalOpen(false)}
                    onSuccess={() => onRefresh?.()}
                />
            )}
        </tr>
    );
};

export default ProductRow;
