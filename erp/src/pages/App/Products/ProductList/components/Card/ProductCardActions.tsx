import React, { useState, useRef, useCallback } from 'react';
import Product from '@/pages/types/product.type';
import DropdownPortal from '@/components/shared/DropdownPortal';
import { useAuth } from '@/context/AuthContext';
import { isProductIdentificationLabelOnlyProfile } from '@/pages/utils/accessRoles';
export interface ProductCardActionsProps {
  readonly product: Product;
  readonly showEditButton?: boolean;
  readonly canDeleteProducts: boolean;
  readonly onEdit: (product: Product) => void;
  readonly onDuplicate?: (product: Product) => void;
  readonly onShowHistory?: (product: Product) => void;
  readonly onLaunchStock?: (product: Product) => void;
  readonly onDelete: (id: string) => void;
  readonly onOpenSalesModal: () => void;
}

/**
 * Menu dropdown de ações rápidas no cabeçalho do Card de Produto.
 */
export const ProductCardActions: React.FC<ProductCardActionsProps> = ({
  product,
  showEditButton = true,
  canDeleteProducts,
  onEdit,
  onDuplicate,
  onDelete,
  onOpenSalesModal,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuAnchorRef = useRef<HTMLButtonElement>(null);
  const { profile } = useAuth();
  const isLabelOnlyProfile = isProductIdentificationLabelOnlyProfile(profile);
  const isDraft =
    Boolean(product.isDraft) || Boolean((product as any).is_draft) || product.status === 'draft';

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

      {!isLabelOnlyProfile && <button
        ref={menuAnchorRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsMenuOpen((prev) => !prev);
        }}
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
      </button>}

      {isMenuOpen && !isLabelOnlyProfile && (
        <DropdownPortal
          isOpen={isMenuOpen}
          onClose={() => setIsMenuOpen(false)}
          anchorRef={menuAnchorRef}
          className="min-w-[170px]"
        >
          <div
            role="menu"
            className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-2xl py-2 flex flex-col z-[9999] animate-slide-up"
            onMouseLeave={() => setIsMenuOpen(false)}
          >
            {!isLabelOnlyProfile && !product.isParent && (
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
                  Duplicar Produto
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
          </div>
        </DropdownPortal>
      )}
    </div>
  );
};

export default ProductCardActions;
