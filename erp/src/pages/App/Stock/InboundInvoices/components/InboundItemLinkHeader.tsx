import React, { useEffect, useRef, useState } from 'react';
import type { InboundInvoiceItem } from '@/pages/utils/inboundNfe/inboundNfeTypes';

interface InboundItemLinkHeaderProps {
  item: InboundInvoiceItem;
  isComposition: boolean;
  lockToNotApplicable?: boolean;
  supplierId?: string;
  quickRegisterDisabled: boolean;
  compositionLinks: any[];
  displayName?: string;
  displayCode?: string;
  displaySellingPrice: number;
  onRequestQuickRegister: () => void;
  onUpdateItem?: (itemNumber: number, update: Partial<InboundInvoiceItem>) => void;
}

export const InboundItemLinkHeader: React.FC<InboundItemLinkHeaderProps> = ({
  item,
  isComposition,
  lockToNotApplicable = false,
  supplierId,
  quickRegisterDisabled,
  compositionLinks,
  displayName,
  displayCode,
  displaySellingPrice,
  onRequestQuickRegister,
  onUpdateItem,
}) => {
  const isNotApplicable = lockToNotApplicable || item.linkMode === 'not_applicable';
  const isSingle = !isComposition && !isNotApplicable;
  const selectedMode = isNotApplicable ? 'Não se aplica' : isComposition ? 'Composto' : 'Único';
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isMenuOpen) return;
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!menuRootRef.current?.contains(event.target as Node)) setIsMenuOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsMenuOpen(false);
    };
    document.addEventListener('pointerdown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [isMenuOpen]);

  const selectMode = (mode: 'single' | 'composition' | 'not_applicable') => {
    if (lockToNotApplicable) return;
    if (mode === 'single') {
      if (!isSingle) {
        const first = compositionLinks[0];
        onUpdateItem?.(item.itemNumber, {
          linkMode: 'single',
          compositionLinks: [],
          matchedProductId: isNotApplicable
            ? undefined
            : first?.productId || item.matchedProductId,
          matchedVariationId: isNotApplicable
            ? undefined
            : first?.variationId || item.matchedVariationId,
          productErpName: isNotApplicable
            ? undefined
            : first?.productErpName || item.productErpName,
          linkedProductCode: isNotApplicable
            ? undefined
            : first?.linkedProductCode || item.linkedProductCode,
        });
      }
    } else if (mode === 'composition') {
      if (!isComposition) {
        const existingLinks = item.compositionLinks || [];
        const alreadyMigrated =
          item.matchedProductId &&
          existingLinks.some((link) => link.productId === item.matchedProductId);
        const migratedLinks =
          item.matchedProductId && !alreadyMigrated
            ? [
                {
                  id: crypto.randomUUID(),
                  productId: item.matchedProductId,
                  variationId: item.matchedVariationId,
                  productErpName: displayName || item.productErpName || 'Produto',
                  linkedProductCode: displayCode || item.linkedProductCode || '',
                  sellingPrice: displaySellingPrice,
                  apportionedCost: 0,
                  quantityMultiplier: 1,
                },
                ...existingLinks,
              ]
            : existingLinks;
        onUpdateItem?.(item.itemNumber, {
          linkMode: 'composition',
          compositionLinks: migratedLinks,
        });
      }
    } else if (!isNotApplicable) {
      onUpdateItem?.(item.itemNumber, {
        linkMode: 'not_applicable',
        matchedProductId: undefined,
        matchedVariationId: undefined,
        productErpName: undefined,
        linkedProductCode: undefined,
        sellingPrice: undefined,
        compositionLinks: [],
      });
    }
    setIsMenuOpen(false);
  };

  return (
    <div className={`relative mb-3 flex flex-wrap items-center justify-between gap-2 ${isMenuOpen ? 'z-20' : ''}`}>
      <span className="shrink-0 text-[10px] font-black uppercase tracking-widest text-slate-500">
        {isComposition ? 'Vincular produtos' : 'Vincular produto'}
      </span>

      <div className="ml-auto flex shrink-0 items-center gap-3">
        <div ref={menuRootRef} className="relative shrink-0">
        <button
          type="button"
          aria-label={`Modo de vínculo: ${selectedMode}`}
          aria-haspopup={lockToNotApplicable ? undefined : 'menu'}
          aria-expanded={isMenuOpen}
          aria-disabled={lockToNotApplicable}
          disabled={lockToNotApplicable}
          title={lockToNotApplicable ? 'Fornecedor exclusivo de Salvados: modo fixo em “Não se aplica”.' : undefined}
          onClick={() => setIsMenuOpen((open) => !open)}
          className={`inline-flex items-center gap-1.5 border-x-0 border-t-0 border-b px-1.5 py-1 text-left text-[10px] font-semibold transition-colors ${
            isNotApplicable
              ? 'border-b-amber-300 bg-transparent text-amber-800 dark:border-b-amber-800 dark:bg-transparent dark:text-amber-200'
              : 'border-b-slate-300 bg-transparent text-slate-700 hover:text-slate-950 dark:border-b-slate-700 dark:bg-transparent dark:text-slate-200 dark:hover:text-white'
          }`}
        >
          {selectedMode}
          <i className={`bi ${lockToNotApplicable ? 'bi-lock-fill' : 'bi-chevron-down'} text-[9px]`} aria-hidden="true" />
        </button>

        {isMenuOpen && !lockToNotApplicable && (
          <div
            role="menu"
            aria-label="Modo de vínculo"
            className="absolute right-0 top-full z-[1000020] mt-1 grid min-w-44 gap-0.5 rounded-lg border border-slate-200 bg-white p-1 shadow-xl dark:border-slate-700 dark:bg-slate-900"
          >
            <button
              type="button"
              role="menuitemradio"
              aria-checked={isSingle}
              disabled={isComposition && compositionLinks.length > 1}
              title={
                isComposition && compositionLinks.length > 1
                  ? `Remova produtos até restar apenas 1 para voltar ao modo Único (${compositionLinks.length} na lista)`
                  : undefined
              }
              onClick={() => selectMode('single')}
              className="flex items-center justify-between rounded px-2.5 py-2 text-left text-[11px] text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-300 dark:text-slate-200 dark:hover:bg-slate-800 dark:disabled:text-slate-600"
            >
              Único
              {isSingle && <i className="bi bi-check2 text-blue-600" aria-hidden="true" />}
            </button>
            <button
              type="button"
              role="menuitemradio"
              aria-checked={isComposition}
              onClick={() => selectMode('composition')}
              className="flex items-center justify-between rounded px-2.5 py-2 text-left text-[11px] text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Composto
              {isComposition && <i className="bi bi-check2 text-blue-600" aria-hidden="true" />}
            </button>
            <button
              type="button"
              role="menuitemradio"
              aria-checked={isNotApplicable}
              onClick={() => selectMode('not_applicable')}
              className="flex items-center justify-between rounded px-2.5 py-2 text-left text-[11px] text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Não se aplica
              {isNotApplicable && <i className="bi bi-check2 text-amber-600" aria-hidden="true" />}
            </button>

          </div>
        )}
      </div>

      <button
        type="button"
        aria-label="Cadastro rápido"
        title={
          quickRegisterDisabled
            ? isNotApplicable
              ? 'Indisponível em “Não se aplica”'
              : !supplierId?.trim()
                ? 'Vincule o fornecedor para usar o Cadastro rápido'
                : 'Este item já tem um produto vinculado'
            : undefined
        }
        disabled={quickRegisterDisabled}
        onClick={onRequestQuickRegister}
        className="inline-flex shrink-0 items-center gap-1.5 border-0 bg-transparent px-1 py-1.5 text-[10px] font-semibold text-slate-600 transition-colors hover:text-slate-950 disabled:cursor-not-allowed disabled:text-slate-400 dark:bg-transparent dark:text-slate-300 dark:hover:text-white dark:disabled:text-slate-500"
      >
        <i className="bi bi-lightning-fill" aria-hidden="true" />
        Cadastro rápido
      </button>
      </div>
    </div>
  );
};
