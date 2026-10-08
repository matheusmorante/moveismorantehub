import React from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  canPrintProductIdentificationLabels,
  isProductIdentificationLabelOnlyProfile,
} from '@/pages/utils/accessRoles';
import Product from '../../../../../types/product.type';
import { getProductKind, isNonConventionalProduct } from '../../../../../utils/productKindRules';
import { ChannelStatusBadges } from '../Shared/ChannelStatusBadges';
import type { CardVariationItem } from '../Variations/ProductCardVariationList';
import { VariationItemActions } from '../Variations/VariationItemActions';
import { ProductCardActions } from './ProductCardActions';

interface ProductCardHeaderProps {
  product: Product;
  readOnly?: boolean;
  canDeleteProducts: boolean;
  showCatalogControl?: boolean;
  isParent: boolean;
  isVariation: boolean;
  isDraft: boolean;
  canManageCatalog: boolean;
  hasParentVariations: boolean;
  singleVariation?: CardVariationItem;
  showVariations: boolean;
  setShowVariations: React.Dispatch<React.SetStateAction<boolean>>;
  oppName: string | undefined;
  showTrash: boolean | undefined;
  onEdit: (product: Product) => void;
  onLaunchStock?: (product: Product) => void;
  onDelete: (id: string) => void;
  onToggleActive: (id: string, currentStatus: boolean) => void;
  onDeactivateCatalog: (id: string) => void;
  onShowHistory?: (product: Product) => void;
  onDuplicate?: (product: Product) => void;
  onMoveToAnotherFamily?: (variation: CardVariationItem) => void;
  onMergeWithAnotherVariation?: (variation: CardVariationItem) => void;
  onOpenSalesModal: () => void;
}

export const ProductCardHeader: React.FC<ProductCardHeaderProps> = ({
  product,
  readOnly = false,
  canDeleteProducts,
  showCatalogControl = true,
  isParent,
  isVariation,
  isDraft,
  canManageCatalog,
  hasParentVariations,
  singleVariation,
  showVariations,
  setShowVariations,
  oppName,
  showTrash,
  onEdit,
  onLaunchStock,
  onDelete,
  onToggleActive,
  onDeactivateCatalog,
  onShowHistory,
  onDuplicate,
  onMoveToAnotherFamily,
  onMergeWithAnotherVariation,
  onOpenSalesModal,
}) => {
  const { profile } = useAuth();
  const isLabelOnlyProfile = isProductIdentificationLabelOnlyProfile(profile);
  const canPrintIdentificationLabel = canPrintProductIdentificationLabels(profile);
  const [activeVariationMenuId, setActiveVariationMenuId] = React.useState<string | null>(null);
  const variationMenuAnchorRef = React.useRef<HTMLButtonElement>(null);
  const variationMenuId = singleVariation?.id || singleVariation?.variationId || 'single-variation';
  const isVariationMenuOpen = activeVariationMenuId === variationMenuId;
  const singleVariationId = singleVariation?.variationId || singleVariation?.id || product.id!;

  return (
    <div className="flex justify-between items-center mb-2 gap-2 flex-wrap">
      {/* Lado Esquerdo: Botão Dropdown de Variações + Código do Produto */}
      <div className="flex items-center gap-1.5">
        {hasParentVariations && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowVariations((prev) => !prev);
            }}
            className={`px-2 py-1 rounded-lg flex items-center gap-1 text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
              showVariations
                ? 'bg-slate-300 dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-xs'
                : 'bg-slate-300/60 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600'
            }`}
            title={showVariations ? 'Ocultar Variações' : 'Mostrar Variações'}
          >
            <i
              className={`bi bi-chevron-${showVariations ? 'down' : 'right'} text-xs font-black`}
            />
            <span>Variações ({(product as any).allVariations.length})</span>
          </button>
        )}
        {product.code ? (
          <span className="font-mono text-[9px] text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200/80 dark:border-slate-700 font-bold">
            {product.code}
          </span>
        ) : null}
      </div>

      {/* Canto Superior Direito: Todos os Selos + Botões de Ação */}
      <div
        className="flex items-center gap-2 flex-wrap justify-end ml-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 1. Status de Canais (ERP e Catálogo) */}
        <ChannelStatusBadges
          active={singleVariation ? singleVariation.active !== false : product.active !== false}
          catalogStatus={singleVariation?.status || product.status}
          isParent={isParent && !singleVariation}
          isNonConventional={isNonConventionalProduct(product)}
          isSalvado={getProductKind(product) === 'salvado'}
          canManageCatalog={canManageCatalog}
          canToggleActive={canDeleteProducts}
          showCatalogControl={showCatalogControl}
          isDraft={isDraft}
          activeVariationsCount={
            singleVariation
              ? undefined
              : ((product as any).activeVariationsCount ??
                product.variations?.filter((v: any) => v.active !== false).length)
          }
          totalVariationsCount={
            singleVariation
              ? undefined
              : ((product as any).totalVariationsCount ?? product.variations?.length)
          }
          onToggleActive={(e) => {
            e.stopPropagation();
            onToggleActive(
              singleVariationId,
              singleVariation ? singleVariation.active !== false : product.active !== false
            );
          }}
          onToggleCatalog={(e) => {
            e.stopPropagation();
            onDeactivateCatalog(singleVariationId);
          }}
          disabled={Boolean(singleVariation?.mergedToVariationId)}
          disabledReason={
            singleVariation?.mergedToVariationId
              ? 'Esta variação foi mesclada e seu status não pode ser alterado diretamente.'
              : undefined
          }
          size="xs"
        />

        {/* 2. Selo de Rascunho */}
        {isDraft && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-300 dark:border-amber-800 select-none">
            <i className="bi bi-file-earmark-text text-amber-600 text-[9px]" />
            Rascunho
          </span>
        )}

        {/* 3. Selo de Oportunidade */}
        {!isVariation && oppName && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300/80 dark:border-amber-800/60 select-none shadow-2xs">
            <i className="bi bi-fire text-amber-600 dark:text-amber-400 text-[9px]" />
            {oppName}
          </span>
        )}

        {/* 4. Selo de Tipo (Serviço) */}
        {!isVariation && product.itemType === 'service' && (
          <span className="text-[8px] px-2 py-0.5 rounded-full font-black uppercase tracking-widest bg-amber-100 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400">
            Serviço
          </span>
        )}

        {readOnly && !showTrash && !isLabelOnlyProfile ? (
          <button
            type="button"
            onClick={() => onEdit(product)}
            aria-label={`Ver detalhes de ${product.name || product.title || 'produto'}`}
            title="Ver detalhes"
            className="w-8 h-8 flex items-center justify-center rounded-xl text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30"
          >
            <i className="bi bi-eye" />
          </button>
        ) : (
        /* Botões de Ação */
        <>
        {!showTrash && singleVariation && (
          <>
            {!readOnly && <button
              type="button"
              onClick={() => onEdit(product)}
              aria-label={isDraft ? 'Retomar cadastro' : 'Editar Produto'}
              title={isDraft ? 'Retomar cadastro' : 'Editar Produto'}
              className="w-7 h-7 flex items-center justify-center bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-all border border-slate-100 dark:border-slate-700 shrink-0 cursor-pointer"
            >
              <i
                className={
                  isDraft
                    ? 'bi bi-play-fill text-sm text-blue-600 dark:text-blue-400'
                    : 'bi bi-pencil text-xs'
                }
              />
            </button>}
            {(!isLabelOnlyProfile || canPrintIdentificationLabel) && <button
              ref={variationMenuAnchorRef}
              type="button"
              onClick={() => setActiveVariationMenuId(isVariationMenuOpen ? null : variationMenuId)}
              aria-haspopup="menu"
              aria-expanded={isVariationMenuOpen}
              aria-label="Ações da variação"
              title="Opções da variação"
              className={`w-7 h-7 flex items-center justify-center rounded-lg transition-all border shrink-0 cursor-pointer ${isVariationMenuOpen ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 text-indigo-600' : 'bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-400 hover:text-slate-600 hover:bg-slate-100'}`}
            >
              <i className="bi bi-three-dots-vertical text-xs" />
            </button>}
            {(!isLabelOnlyProfile || canPrintIdentificationLabel) && <VariationItemActions
              product={product}
              variation={singleVariation}
              anchorRef={variationMenuAnchorRef}
              isMenuOpen={isVariationMenuOpen}
              onSetActiveVarMenuId={setActiveVariationMenuId}
              onEdit={onEdit}
              onShowHistory={onShowHistory}
              onLaunchStock={onLaunchStock}
              onMoveToAnotherFamily={onMoveToAnotherFamily}
              onMergeWithAnotherVariation={onMergeWithAnotherVariation}
            />}
          </>
        )}
        {!showTrash && !isVariation && !singleVariation && (
          <ProductCardActions
            product={product}
            showEditButton={!readOnly}
            canDeleteProducts={canDeleteProducts}
            onEdit={onEdit}
            onDuplicate={onDuplicate}
            onShowHistory={onShowHistory}
            onLaunchStock={onLaunchStock}
            onDelete={onDelete}
            onOpenSalesModal={onOpenSalesModal}
          />
        )}
        </>
        )}
      </div>
    </div>
  );
};
