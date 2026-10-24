import type React from 'react';
import { useCallback, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DropdownPortal from '@/components/shared/DropdownPortal';
import { useAuth } from '@/context/AuthContext';
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
import type { CardVariationItem } from '../Variations/ProductCardVariationList';

export interface ProductCardActionsProps {
  readonly product: Product;
  readonly singleVariation?: CardVariationItem;
  readonly showEditButton?: boolean;
  readonly canDeleteProducts: boolean;
  readonly onEdit: (product: Product) => void;
  readonly onDuplicate?: (product: Product) => void;
  readonly onShowHistory?: (product: Product) => void;
  readonly onLaunchStock?: (product: Product) => void;
  readonly onDelete: (id: string) => void;
  readonly onMoveToTrash?: (product: Product) => void;
  readonly onPermanentDelete?: (id: string) => void;
  readonly onMoveToAnotherFamily?: (variation: CardVariationItem) => void;
  readonly onMergeWithAnotherVariation?: (variation: CardVariationItem) => void;
  readonly onOpenSalesModal: () => void;
}

/**
 * Menu dropdown de ações rápidas no cabeçalho do Card de Produto.
 */
export const ProductCardActions: React.FC<ProductCardActionsProps> = ({
  product,
  singleVariation,
  showEditButton = true,
  canDeleteProducts,
  onEdit,
  onDuplicate,
  onDelete,
  onMoveToTrash,
  onMoveToAnotherFamily,
  onMergeWithAnotherVariation,
  onOpenSalesModal,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuAnchorRef = useRef<HTMLButtonElement>(null);
  const navigate = useNavigate();
  const { profile } = useAuth();
  const isLabelOnlyProfile = isProductIdentificationLabelOnlyProfile(profile);
  const canPrintIdentificationLabel = canPrintProductIdentificationLabels(profile);
  const isDraft =
    Boolean(product.isDraft) || Boolean((product as any).is_draft) || product.status === 'draft';
  const identificationLabelAvailability = getProductIdentificationLabelActionAvailability({
    canPrint: canPrintIdentificationLabel,
    hasSingleVariation: Boolean(singleVariation),
    isDraft,
    isMerged: Boolean(singleVariation?.mergedToVariationId),
  });
  const canOpenMenu =
    !isLabelOnlyProfile || identificationLabelAvailability.canOpenMenu;

  const handlePrintIdentificationLabel = useCallback(() => {
    if (!singleVariation) return;
    const parentTitle = product.name || product.title || '';
    const varName = singleVariation.name || (singleVariation as any).displayName || '';
    const variationName =
      getSelectedProductDisplayName(product, singleVariation) || varName || parentTitle;
    const fullName = variationName.toLowerCase().includes(parentTitle.toLowerCase())
      ? normalizeProductVariationName(parentTitle, variationName)
      : buildProductVariationName(parentTitle, variationName);

    navigate('/estoque/etiquetas?cat=identificacao', {
      state: {
        product: {
          ...product,
          id: singleVariation.id || product.id,
          parentId: product.id,
          name: fullName,
          title: fullName,
          description: fullName,
          variation: varName,
          variationName: varName,
          sku: singleVariation.sku || product.sku || product.code,
          barcode:
            (singleVariation as any).barcode ||
            (singleVariation as any).ean ||
            singleVariation.sku ||
            product.code,
          unitPrice: singleVariation.unitPrice || singleVariation.price || product.unitPrice,
          isVariation: true,
          images:
            Array.isArray(singleVariation.images) && singleVariation.images.length > 0
              ? singleVariation.images
              : product.images,
          parentImages: product.images,
        },
        quantity: 10,
        fillSheet: true,
      },
    });
  }, [navigate, product, singleVariation]);

  const handleDeleteClick = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();
      setIsMenuOpen(false);

      if (isDraft && canDeleteProducts) {
        if (product.id) onDelete(product.id);
        return;
      }
    },
    [product.id, isDraft, canDeleteProducts, onDelete]
  );

  const handleOpenMenu = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMenuOpen((prev) => !prev);
  }, []);

  return (
    <div className="relative flex items-center gap-1 ml-1">
      {showEditButton && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onEdit(product);
          }}
          className="w-7 h-7 flex items-center justify-center bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-all border border-slate-100 dark:border-slate-700 shrink-0 cursor-pointer"
          title={isDraft ? 'Retomar cadastro' : 'Editar Produto'}
          aria-label={isDraft ? 'Retomar cadastro' : 'Editar Produto'}
        >
          <i
            className={
              isDraft
                ? 'bi bi-play-fill text-sm text-blue-600 dark:text-blue-400'
                : 'bi bi-pencil text-xs'
            }
          />
        </button>
      )}

      {canOpenMenu && (
        <button
          ref={menuAnchorRef}
          type="button"
          onClick={handleOpenMenu}
          aria-haspopup="menu"
          aria-expanded={isMenuOpen}
          aria-label="Opções do produto"
          className={`w-7 h-7 flex items-center justify-center rounded-lg transition-all border shrink-0 cursor-pointer ${
            isMenuOpen
              ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 text-indigo-600'
              : 'bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-400 hover:text-slate-600 hover:bg-slate-100'
          }`}
          title="Opções"
        >
          <i className="bi bi-three-dots text-xs" />
        </button>
      )}

      {isMenuOpen && canOpenMenu && (
        <DropdownPortal
          isOpen={isMenuOpen}
          onClose={() => setIsMenuOpen(false)}
          anchorRef={menuAnchorRef}
          className="min-w-[190px]"
        >
          <div
            role="menu"
            className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-2xl py-2 flex flex-col z-[9999] animate-slide-up"
            onMouseLeave={() => setIsMenuOpen(false)}
          >
            {singleVariation && identificationLabelAvailability.canPrintLabel && (
              <button
                type="button"
                role="menuitem"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMenuOpen(false);
                  handlePrintIdentificationLabel();
                }}
                className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-950 transition-colors text-left group cursor-pointer"
              >
                <i className="bi bi-qr-code text-blue-500" />
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">
                  Imprimir Etiqueta de Identificação
                </span>
              </button>
              )}

            {!isLabelOnlyProfile && (!product.isParent || Boolean(singleVariation)) && (
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
                <i className="bi bi-receipt text-blue-500" />
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">
                  Ver Pedidos Vinculados
                </span>
              </button>
            )}

            {!isLabelOnlyProfile && !product.isVariation && onDuplicate && (
              <button
                type="button"
                role="menuitem"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMenuOpen(false);
                  onDuplicate(product);
                }}
                className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-950 transition-colors text-left group border-t border-slate-50 dark:border-slate-800/50 mt-1 cursor-pointer"
              >
                <i className="bi bi-copy text-indigo-500" />
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">
                  Duplicar
                </span>
              </button>
            )}

            {!isLabelOnlyProfile &&
              singleVariation &&
              !isDraft &&
              !singleVariation.mergedToVariationId &&
              onMoveToAnotherFamily && (
                <button
                  type="button"
                  role="menuitem"
                  onClick={async (e) => {
                    e.stopPropagation();
                    setIsMenuOpen(false);

                    if (!product.supplierId) {
                      const { toast } = await import('react-toastify');
                      toast.error(
                        'Este produto não possui um fornecedor. Selecione um fornecedor antes de mover ou mesclar suas variações.'
                      );
                      return;
                    }

                    const attrs = singleVariation.attributes || [];
                    const hasValidAttribute = attrs.some(
                      (a: any) =>
                        typeof a === 'object' &&
                        a !== null &&
                        'name' in a &&
                        'value' in a &&
                        (a as any).name?.trim() &&
                        (a as any).value?.trim()
                    );

                    if (!hasValidAttribute) {
                      const { toast } = await import('react-toastify');
                      toast.error('Este produto deve ter uma característica e um valor definidos.');
                      return;
                    }

                    onMoveToAnotherFamily(singleVariation);
                  }}
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-950 transition-colors text-left group border-t border-slate-50 dark:border-slate-800/50 mt-1 cursor-pointer"
                >
                  <i className="bi bi-arrow-left-right text-indigo-500" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">
                    Mover para Outro Pai
                  </span>
                </button>
              )}

            {!isLabelOnlyProfile &&
              singleVariation &&
              !isDraft &&
              !singleVariation.mergedToVariationId &&
              onMergeWithAnotherVariation && (
                <button
                  type="button"
                  role="menuitem"
                  onClick={async (e) => {
                    e.stopPropagation();
                    setIsMenuOpen(false);

                    if (!product.supplierId) {
                      const { toast } = await import('react-toastify');
                      toast.error(
                        'Este produto não possui um fornecedor. Selecione um fornecedor antes de mover ou mesclar suas variações.'
                      );
                      return;
                    }

                    onMergeWithAnotherVariation(singleVariation);
                  }}
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-950 transition-colors text-left group cursor-pointer"
                >
                  <i className="bi bi-bezier2 text-violet-500" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">
                    Mesclar Variação
                  </span>
                </button>
              )}

            {!isLabelOnlyProfile && isDraft && canDeleteProducts && (
              <div className="border-t border-slate-50 dark:border-slate-800/50 my-1">
                <button
                  type="button"
                  role="menuitem"
                  onClick={handleDeleteClick}
                  className="flex items-center gap-3 px-4 py-2.5 transition-colors text-left group w-full hover:bg-red-50 dark:hover:bg-red-950/30 text-red-600 dark:text-red-400 cursor-pointer"
                  title="Descartar Rascunho"
                >
                  <i className="bi bi-trash3-fill text-red-500" />
                  <span className="text-[10px] uppercase tracking-widest font-bold">
                    Descartar Rascunho
                  </span>
                </button>
              </div>
            )}

            {!isLabelOnlyProfile && !isDraft && canDeleteProducts && (
              <div className="border-t border-slate-50 dark:border-slate-800/50 mt-1 pt-1">
                <button
                  type="button"
                  role="menuitem"
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
                  disabled={product.can_trash !== true}
                  aria-disabled={product.can_trash !== true}
                  className={`flex items-center gap-3 px-4 py-2.5 transition-colors text-left group w-full ${
                    product.can_trash !== true
                      ? 'text-slate-400 dark:text-slate-600 cursor-not-allowed opacity-40'
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
                  <i className="bi bi-trash3-fill text-red-500" aria-hidden="true" />
                  <span className="text-[10px] uppercase tracking-widest font-bold">
                    Mover para lixeira
                  </span>
                </button>
              </div>
            )}
          </div>
        </DropdownPortal>
      )}
    </div>
  );
};

export default ProductCardActions;
