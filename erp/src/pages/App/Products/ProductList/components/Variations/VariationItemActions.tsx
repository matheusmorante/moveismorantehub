import React from 'react';
import { useNavigate } from 'react-router-dom';
import Product from '@/pages/types/product.type';
import DropdownPortal from '@/components/shared/DropdownPortal';
import { useAuth } from '@/context/AuthContext';
import {
  canPrintProductIdentificationLabels,
  isProductIdentificationLabelOnlyProfile,
} from '@/pages/utils/accessRoles';
import type { CardVariationItem } from './ProductCardVariationList';

interface VariationItemActionsProps {
  readonly product: Product;
  readonly variation: CardVariationItem;
  readonly anchorRef: React.RefObject<HTMLButtonElement>;
  readonly isMenuOpen: boolean;
  readonly isUsageChecking?: boolean;
  readonly isUsed?: boolean;
  readonly onSetActiveVarMenuId: (id: string | null) => void;
  readonly onEdit: (product: Product) => void;
  readonly onShowHistory?: (product: Product) => void;
  readonly onLaunchStock?: (product: Product) => void;
  readonly onMoveToAnotherFamily?: (variation: CardVariationItem) => void;
  readonly onMergeWithAnotherVariation?: (variation: CardVariationItem) => void;
  readonly onCheckAndAskDelete?: (variationId: string) => void;
}

export const VariationItemActions: React.FC<VariationItemActionsProps> = ({
  product,
  variation: v,
  anchorRef,
  isMenuOpen,
  onSetActiveVarMenuId,
  onEdit,
  onMoveToAnotherFamily,
  onMergeWithAnotherVariation,
}) => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const isLabelOnlyProfile = isProductIdentificationLabelOnlyProfile(profile);
  const canPrintIdentificationLabel = canPrintProductIdentificationLabels(profile);

  if (!isMenuOpen || (isLabelOnlyProfile && !canPrintIdentificationLabel)) return null;

  const handlePrintIdentificationLabel = () => {
    const parentTitle = product.name || product.title || '';
    const varName = v.name || (v as any).displayName || '';
    const fullName =
      parentTitle && varName && !parentTitle.includes(varName)
        ? `${parentTitle} - ${varName}`
        : varName || parentTitle;

    navigate('/estoque/etiquetas?cat=identificacao', {
      state: {
        product: {
          ...product,
          id: v.id || product.id,
          parentId: product.id,
          name: fullName,
          title: fullName,
          description: fullName,
          variation: varName,
          variationName: varName,
          sku: v.sku || product.sku || product.code,
          barcode: (v as any).barcode || (v as any).ean || v.sku || product.code,
          unitPrice: v.unitPrice || v.price || product.unitPrice,
          isVariation: true,
          images: Array.isArray(v.images) && v.images.length > 0 ? v.images : product.images,
          parentImages: product.images,
        },
        quantity: 10,
        fillSheet: true,
      },
    });
  };

  return (
    <DropdownPortal
      isOpen={true}
      anchorRef={anchorRef}
      onClose={() => onSetActiveVarMenuId(null)}
      className="w-48 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-100 dark:border-slate-700 py-1.5 z-50 text-xs font-bold text-slate-700 dark:text-slate-200"
    >
      {canPrintIdentificationLabel && !v.mergedToVariationId && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSetActiveVarMenuId(null);
            handlePrintIdentificationLabel();
          }}
          className="w-full px-3.5 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 cursor-pointer text-blue-600 dark:text-blue-400"
        >
          <i className="bi bi-qr-code text-blue-500" />
          Imprimir Etiqueta de Identificação
        </button>
      )}
      {!isLabelOnlyProfile && !v.mergedToVariationId && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSetActiveVarMenuId(null);
            onEdit(product);
          }}
          className="w-full px-3.5 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 cursor-pointer"
        >
          <i className="bi bi-pencil text-slate-400" />
          Editar Produto
        </button>
      )}
      {!isLabelOnlyProfile && onMoveToAnotherFamily && !v.mergedToVariationId && (
        <button
          type="button"
          onClick={async (e) => {
            e.stopPropagation();
            onSetActiveVarMenuId(null);

            if (!product.supplierId) {
              const { toast } = await import('react-toastify');
              toast.error(
                'Este produto não possui um fornecedor. Selecione um fornecedor antes de mover ou mesclar suas variações.'
              );
              return;
            }

            const attrs = v.attributes || [];
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
              toast.error('Este produto deve ter um atributo / valor definido.');
              return;
            }

            onMoveToAnotherFamily(v);
          }}
          className="w-full px-3.5 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 cursor-pointer text-indigo-600 dark:text-indigo-400"
        >
          <i className="bi bi-arrow-left-right" />
          Mover para Outro Pai
        </button>
      )}
      {!isLabelOnlyProfile && onMergeWithAnotherVariation && !v.mergedToVariationId && (
        <button
          type="button"
          onClick={async (e) => {
            e.stopPropagation();
            onSetActiveVarMenuId(null);

            if (!product.supplierId) {
              const { toast } = await import('react-toastify');
              toast.error(
                'Este produto não possui um fornecedor. Selecione um fornecedor antes de mover ou mesclar suas variações.'
              );
              return;
            }

            onMergeWithAnotherVariation(v);
          }}
          className="w-full px-3.5 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 cursor-pointer text-violet-600 dark:text-violet-400"
        >
          <i className="bi bi-bezier2" />
          Mesclar Variação
        </button>
      )}
      {v.mergedToVariationId && (
        <div className="px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/50 mt-1 mx-1 rounded-lg border border-slate-100 dark:border-slate-800">
          <span className="text-[10px] text-slate-400">
            Esta variação foi mesclada e é mantida apenas para histórico. Nenhuma ação está
            disponível.
          </span>
        </div>
      )}
    </DropdownPortal>
  );
};
