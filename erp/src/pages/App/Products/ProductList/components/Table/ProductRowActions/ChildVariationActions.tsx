import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import DropdownPortal from '@/components/shared/DropdownPortal';
import { useAuth } from '@/context/AuthContext';
import {
  canPrintProductIdentificationLabels,
  isProductIdentificationLabelOnlyProfile,
} from '@/pages/utils/accessRoles';
import {
  buildProductVariationName,
  getSelectedProductDisplayName,
  normalizeProductVariationName,
} from '@/pages/utils/productVariationDefaults';
import type { ActionProductLike } from '../ProductRowActionsCell';

export interface ChildVariationActionsProps {
  readonly product: ActionProductLike;
  readonly onMoveToAnotherFamily?: (product: ActionProductLike) => void;
  readonly onMergeWithAnotherVariation?: (product: ActionProductLike) => void;
  readonly onRefresh?: () => void;
}

export const ChildVariationActions: React.FC<ChildVariationActionsProps> = ({
  product,
  onMoveToAnotherFamily,
  onMergeWithAnotherVariation,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuAnchorRef = useRef<HTMLButtonElement>(null);
  const navigate = useNavigate();
  const { profile } = useAuth();
  const isLabelOnlyProfile = isProductIdentificationLabelOnlyProfile(profile);
  const canPrintIdentificationLabel = canPrintProductIdentificationLabels(profile);

  if (isLabelOnlyProfile && !canPrintIdentificationLabel) return null;

  const handlePrintIdentificationLabel = () => {
    const parentTitle = (product as any).name || (product as any).title || '';
    const varName = product.displayName || (product as any).variation || product.description;
    const variationName = getSelectedProductDisplayName(product, product) || varName || parentTitle;
    const fullName = variationName.toLowerCase().includes(parentTitle.toLowerCase())
      ? normalizeProductVariationName(parentTitle, variationName)
      : buildProductVariationName(parentTitle, variationName);

    navigate('/estoque/etiquetas?cat=identificacao', {
      state: {
        product: {
          ...product,
          id: product.variationId || product.id,
          parentId: (product as any).productId || (product as any).parentId,
          name: fullName,
          title: fullName,
          description: fullName,
          variation: varName,
          variationName: varName,
          sku: product.sku || product.code,
          barcode: (product as any).barcode || product.sku || product.code,
          unitPrice: product.unitPrice,
          isVariation: true,
          images: product.images,
          parentImages: (product as any).parentImages,
        },
        quantity: 10,
        fillSheet: true,
      },
    });
  };

  return (
    <div className="relative inline-flex">
      <button
        ref={menuAnchorRef}
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          setIsMenuOpen((value) => !value);
        }}
        aria-label="Mais opções da variação"
        aria-expanded={isMenuOpen}
        className="w-8 h-8 inline-flex items-center justify-center rounded-xl border border-slate-200/80 bg-slate-100 text-slate-700 transition-all hover:bg-blue-50 hover:text-blue-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 cursor-pointer"
        title="Mais opções do produto"
      >
        <i className="bi bi-three-dots text-xs font-bold" />
      </button>
      {isMenuOpen && (
        <DropdownPortal
          isOpen={isMenuOpen}
          onClose={() => setIsMenuOpen(false)}
          anchorRef={menuAnchorRef}
          className="min-w-[220px]"
        >
          <div
            role="menu"
            className="rounded-2xl border border-slate-100 bg-white py-2 shadow-2xl dark:border-slate-800 dark:bg-slate-900"
          >
            {product.mergedToVariationId ? (
              <div className="px-4 py-2.5 text-left">
                <span className="text-[10px] text-slate-400">
                  Esta variação foi mesclada e é mantida apenas para histórico. Nenhuma ação está
                  disponível.
                </span>
              </div>
            ) : (
              <>
                {canPrintIdentificationLabel && <button
                  type="button"
                  role="menuitem"
                  onClick={(event) => {
                    event.stopPropagation();
                    setIsMenuOpen(false);
                    handlePrintIdentificationLabel();
                  }}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-950 cursor-pointer"
                >
                  <i className="bi bi-qr-code text-blue-500" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">
                    Imprimir Etiqueta de Identificação
                  </span>
                </button>}
                {!isLabelOnlyProfile && onMoveToAnotherFamily && (
                  <button
                    type="button"
                    role="menuitem"
                    onClick={async (event) => {
                      event.stopPropagation();
                      setIsMenuOpen(false);

                      if (!product.supplierId) {
                        const { toast } = await import('react-toastify');
                        toast.error(
                          'Este produto não possui um fornecedor. Selecione um fornecedor antes de mover ou mesclar suas variações.'
                        );
                        return;
                      }

                      const attrs = product.attributes || [];
                      const hasValidAttribute = attrs.some(
                        (a: any) => a.name?.trim() && a.value?.trim()
                      );

                      if (!hasValidAttribute) {
                        const { toast } = await import('react-toastify');
                        toast.error('Este produto deve ter um atributo / valor definido.');
                        return;
                      }

                      onMoveToAnotherFamily(product);
                    }}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-950 cursor-pointer"
                  >
                    <i className="bi bi-arrow-left-right text-indigo-500" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">
                      Mover para outro produto pai
                    </span>
                  </button>
                )}
                {!isLabelOnlyProfile && onMergeWithAnotherVariation && (
                  <button
                    type="button"
                    role="menuitem"
                    onClick={async (event) => {
                      event.stopPropagation();
                      setIsMenuOpen(false);

                      if (!product.supplierId) {
                        const { toast } = await import('react-toastify');
                        toast.error(
                          'Este produto não possui um fornecedor. Selecione um fornecedor antes de mover ou mesclar suas variações.'
                        );
                        return;
                      }

                      onMergeWithAnotherVariation(product);
                    }}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-950 cursor-pointer"
                  >
                    <i className="bi bi-intersect text-violet-500" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">
                      Mesclar com outra variação
                    </span>
                  </button>
                )}
              </>
            )}
          </div>
        </DropdownPortal>
      )}
    </div>
  );
};
