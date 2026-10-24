import type React from 'react';
import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DropdownPortal from '@/components/shared/DropdownPortal';
import { useAuth } from '@/context/AuthContext';
import type { LabelPrintType } from '@/pages/App/Products/components/modals/product/LabelPrintSelectionModal';
import type Product from '@/pages/types/product.type';
import {
  canPrintProductIdentificationLabels,
  getProductIdentificationLabelActionAvailability,
  isProductIdentificationLabelOnlyProfile,
} from '@/pages/utils/accessRoles';
import {
  buildProductVariationName,
  getSelectedProductDisplayName,
  normalizeProductVariationName,
} from '@/pages/utils/productVariationDefaults';
import type { ActionProductLike } from '../ProductRowActionsCell';

export interface ParentProductActionsProps {
  readonly product: Product;
  readonly singleVariation?: ActionProductLike;
  readonly showTrash?: boolean;
  readonly showEditButton?: boolean;
  readonly canDeleteProducts: boolean;
  readonly isDraft: boolean;
  readonly onEdit: (product: Product) => void;
  readonly onRestore: (id: string) => void;
  readonly onDelete: (id: string) => void;
  readonly onMoveToTrash?: (product: Product) => void;
  readonly onPermanentDelete?: (id: string) => void;
  readonly onDuplicate?: (product: Product) => void;
  readonly onLaunchStock?: (product: Product) => void;
  readonly onOpenSalesModal: () => void;
  readonly onOpenLabelModal: (type: LabelPrintType) => void;
  readonly onMoveToAnotherFamily?: (product: ActionProductLike) => void;
  readonly onMergeWithAnotherVariation?: (product: ActionProductLike) => void;
}

export const ParentProductActions: React.FC<ParentProductActionsProps> = ({
  product,
  singleVariation,
  showTrash,
  showEditButton = true,
  canDeleteProducts,
  isDraft,
  onEdit,
  onRestore,
  onDelete,
  onMoveToTrash,
  onPermanentDelete: _onPermanentDelete,
  onDuplicate,
  onOpenSalesModal,
  onOpenLabelModal,
  onMoveToAnotherFamily,
  onMergeWithAnotherVariation,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuAnchorRef = useRef<HTMLButtonElement>(null);
  const navigate = useNavigate();
  const { profile } = useAuth();
  const isLabelOnlyProfile = isProductIdentificationLabelOnlyProfile(profile);
  const canPrintIdentificationLabel = canPrintProductIdentificationLabels(profile);
  const identificationLabelAvailability = getProductIdentificationLabelActionAvailability({
    canPrint: canPrintIdentificationLabel,
    hasSingleVariation: Boolean(singleVariation),
    isDraft,
    isMerged: Boolean(singleVariation?.mergedToVariationId),
  });

  if (showTrash && !isLabelOnlyProfile) {
    return (
      <button
        type="button"
        onClick={() => onRestore(product.id || '')}
        className="p-1 text-emerald-600 hover:text-emerald-700 cursor-pointer"
        title="Restaurar"
        aria-label="Restaurar produto"
      >
        <i className="bi bi-arrow-counterclockwise" />
      </button>
    );
  }

  const handlePrintSingleVariationLabel = () => {
    if (!singleVariation) return;
    const parentTitle = product.name || product.title || '';
    const varName =
      singleVariation.displayName ||
      (singleVariation as any).variation ||
      singleVariation.description;
    const variationName =
      getSelectedProductDisplayName(product, singleVariation) || varName || parentTitle;
    const fullName = variationName.toLowerCase().includes(parentTitle.toLowerCase())
      ? normalizeProductVariationName(parentTitle, variationName)
      : buildProductVariationName(parentTitle, variationName);

    navigate('/estoque/etiquetas?cat=identificacao', {
      state: {
        product: {
          ...product,
          ...singleVariation,
          id: singleVariation.variationId || singleVariation.id || product.id,
          parentId: product.id,
          name: fullName,
          title: fullName,
          description: fullName,
          variation: varName,
          variationName: varName,
          sku: singleVariation.sku || singleVariation.code || product.sku || product.code,
          barcode:
            (singleVariation as any).barcode ||
            singleVariation.sku ||
            singleVariation.code ||
            product.sku ||
            product.code,
          unitPrice: singleVariation.unitPrice ?? product.unitPrice,
          isVariation: true,
          images: singleVariation.images || product.images,
          parentImages: product.images,
        },
        quantity: 10,
        fillSheet: true,
      },
    });
  };

  return (
    <div className="flex items-center justify-center gap-2">
      {showEditButton && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onEdit(product);
          }}
          className="w-8 h-8 flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/40 rounded-xl transition-all border border-slate-200/80 dark:border-slate-700 shadow-2xs cursor-pointer active:scale-95"
          title={isDraft ? 'Retomar cadastro' : 'Editar Produto'}
          aria-label={isDraft ? 'Retomar cadastro' : 'Editar Produto'}
        >
          <i
            className={
              isDraft
                ? 'bi bi-play-fill text-sm font-bold text-blue-600 dark:text-blue-400'
                : 'bi bi-pencil text-xs font-bold'
            }
          />
        </button>
      )}

      {!isLabelOnlyProfile && (
        <div className="relative">
          <button
            ref={menuAnchorRef}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsMenuOpen((prev) => !prev);
            }}
            aria-label="Mais opções"
            aria-haspopup="menu"
            aria-expanded={isMenuOpen}
            className="w-8 h-8 flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/40 rounded-xl transition-all border border-slate-200/80 dark:border-slate-700 shadow-2xs cursor-pointer active:scale-95"
            title="Mais opções"
          >
            <i className="bi bi-three-dots text-xs font-bold" />
          </button>

          {isMenuOpen && (
            <DropdownPortal
              isOpen={isMenuOpen}
              onClose={() => setIsMenuOpen(false)}
              anchorRef={menuAnchorRef}
              className="min-w-[200px]"
            >
              <div
                role="menu"
                className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-2xl py-2 flex flex-col z-[9999] animate-slide-up"
                onMouseLeave={() => setIsMenuOpen(false)}
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsMenuOpen(false);
                    onEdit(product);
                  }}
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-950 transition-colors text-left group w-full cursor-pointer"
                >
                  <i
                    className={
                      isDraft ? 'bi bi-play-fill text-blue-500' : 'bi bi-pencil-fill text-blue-500'
                    }
                  />
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">
                    {isDraft ? 'Retomar cadastro' : 'Editar Produto'}
                  </span>
                </button>

                {onDuplicate && (
                  <button
                    type="button"
                    role="menuitem"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsMenuOpen(false);
                      onDuplicate(product);
                    }}
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-950 transition-colors text-left group cursor-pointer"
                  >
                    <i className="bi bi-copy text-blue-500" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">
                      Duplicar
                    </span>
                  </button>
                )}

                {(!product.isParent || Boolean(singleVariation)) && (
                  <button
                    type="button"
                    role="menuitem"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsMenuOpen(false);
                      onOpenSalesModal();
                    }}
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-950 transition-colors text-left group cursor-pointer"
                  >
                    <i className="bi bi-receipt text-indigo-500" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">
                      Histórico de Vendas
                    </span>
                  </button>
                )}

                {singleVariation && !isDraft && !singleVariation.mergedToVariationId && (
                  <>
                    {identificationLabelAvailability.canPrintLabel && (
                      <button
                        type="button"
                        role="menuitem"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsMenuOpen(false);
                          handlePrintSingleVariationLabel();
                        }}
                        className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-950 transition-colors text-left group w-full cursor-pointer"
                      >
                        <i className="bi bi-qr-code text-blue-500" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">
                          Imprimir Etiqueta de Identificação
                        </span>
                      </button>
                    )}

                    {onMoveToAnotherFamily && (
                      <button
                        type="button"
                        role="menuitem"
                        onClick={async (e) => {
                          e.stopPropagation();
                          setIsMenuOpen(false);

                          if (!singleVariation.supplierId && !product.supplierId) {
                            const { toast } = await import('react-toastify');
                            toast.error(
                              'Este produto não possui um fornecedor. Selecione um fornecedor antes de mover ou mesclar suas variações.'
                            );
                            return;
                          }

                          const attrs = singleVariation.attributes || [];
                          const hasValidAttribute = attrs.some(
                            (a: any) => a.name?.trim() && a.value?.trim()
                          );

                          if (!hasValidAttribute) {
                            const { toast } = await import('react-toastify');
                            toast.error('Este produto deve ter uma característica e um valor definidos.');
                            return;
                          }

                          onMoveToAnotherFamily(singleVariation);
                        }}
                        className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-950 transition-colors text-left group w-full cursor-pointer"
                      >
                        <i className="bi bi-arrow-left-right text-indigo-500" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">
                          Mover para outro produto pai
                        </span>
                      </button>
                    )}

                    {onMergeWithAnotherVariation && (
                      <button
                        type="button"
                        role="menuitem"
                        onClick={async (e) => {
                          e.stopPropagation();
                          setIsMenuOpen(false);

                          if (!singleVariation.supplierId && !product.supplierId) {
                            const { toast } = await import('react-toastify');
                            toast.error(
                              'Este produto não possui um fornecedor. Selecione um fornecedor antes de mover ou mesclar suas variações.'
                            );
                            return;
                          }

                          onMergeWithAnotherVariation(singleVariation);
                        }}
                        className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-950 transition-colors text-left group w-full cursor-pointer"
                      >
                        <i className="bi bi-intersect text-violet-500" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">
                          Mesclar com outra variação
                        </span>
                      </button>
                    )}
                  </>
                )}

                <div className="border-t border-slate-50 dark:border-slate-800/50 my-1">
                  <button
                    type="button"
                    role="menuitem"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsMenuOpen(false);
                      onOpenLabelModal('price');
                    }}
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-950 transition-colors text-left group w-full cursor-pointer"
                  >
                    <i className="bi bi-tag-fill text-emerald-500" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">
                      Etiq. de Preço
                    </span>
                  </button>
                </div>

                {isDraft && canDeleteProducts && (
                  <div className="border-t border-slate-50 dark:border-slate-800/50 my-1">
                    <button
                      type="button"
                      role="menuitem"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsMenuOpen(false);
                        if (product.id) onDelete(product.id);
                      }}
                      className="flex items-center gap-3 px-4 py-2.5 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors text-left group w-full text-red-600 dark:text-red-400 cursor-pointer"
                      title="Descartar Rascunho"
                    >
                      <i className="bi bi-trash3-fill text-red-500" />
                      <span className="text-[10px] font-black uppercase tracking-widest font-bold">
                        Descartar Rascunho
                      </span>
                    </button>
                  </div>
                )}

                {!isDraft && canDeleteProducts && (
                  <div className="border-t border-slate-50 dark:border-slate-800/50 my-1">
                    <button
                      type="button"
                      role="menuitem"
                      disabled={product.can_trash !== true}
                      aria-disabled={product.can_trash !== true}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (product.can_trash !== true) return;
                        setIsMenuOpen(false);
                        if (onMoveToTrash) {
                          onMoveToTrash(product);
                        } else if (product.id) {
                          onDelete(product.id);
                        }
                      }}
                      className={`flex items-center gap-3 px-4 py-2.5 transition-colors text-left group w-full ${
                        product.can_trash !== true
                          ? 'opacity-40 cursor-not-allowed text-slate-400 dark:text-slate-600'
                          : 'hover:bg-red-50 dark:hover:bg-red-950/30 text-red-600 dark:text-red-400 cursor-pointer'
                      }`}
                      title={
                        product.can_trash === undefined
                          ? 'Verificando elegibilidade para a lixeira...'
                          : product.can_trash === true
                            ? 'Mover produto e variações para a lixeira'
                            : product.trash_block_reason ||
                              'Este produto não pode ser movido para a lixeira porque possui operações históricas vinculadas a uma ou mais variações.'
                      }
                      aria-label={
                        product.can_trash === undefined
                          ? 'Mover para lixeira: Verificando elegibilidade...'
                          : product.can_trash === true
                            ? 'Mover para lixeira (produto e todas as variações)'
                            : `Mover para lixeira: ${product.trash_block_reason || 'Este produto não pode ser movido para a lixeira porque possui operações históricas vinculadas a uma ou mais variações.'}`
                      }
                    >
                      <i className="bi bi-trash3-fill text-red-500" />
                      <span className="text-[10px] font-black uppercase tracking-widest font-bold">
                        Mover para lixeira
                      </span>
                    </button>
                  </div>
                )}
              </div>
            </DropdownPortal>
          )}
        </div>
      )}
    </div>
  );
};
