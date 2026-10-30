import React, { useEffect, useRef, useState } from 'react';

interface ItemsTableHeaderProps {
  readonly productsCount: number;
  readonly servicesCount: number;
  readonly onAddItem: (itemType: 'product' | 'composition' | 'service') => void;
}

export const ItemsTableHeader: React.FC<ItemsTableHeaderProps> = ({
  productsCount,
  servicesCount,
  onAddItem,
}) => {
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  const menuContainerRef = useRef<HTMLDivElement>(null);
  const addButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isAddMenuOpen) return undefined;
    const closeOnOutsideClick = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node) || !menuContainerRef.current?.contains(target)) {
        setIsAddMenuOpen(false);
      }
    };
    document.addEventListener('pointerdown', closeOnOutsideClick);
    return () => document.removeEventListener('pointerdown', closeOnOutsideClick);
  }, [isAddMenuOpen]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter') event.stopPropagation();
    if (event.key === 'Escape' && isAddMenuOpen) {
      event.stopPropagation();
      setIsAddMenuOpen(false);
      addButtonRef.current?.focus();
    }
  };

  const handleBlur = (event: React.FocusEvent<HTMLDivElement>) => {
    const nextTarget = event.relatedTarget;
    if (!(nextTarget instanceof Node) || !event.currentTarget.contains(nextTarget)) {
      setIsAddMenuOpen(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/70 pb-2.5 dark:border-slate-800">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs font-bold text-slate-500 dark:text-slate-400">
        <span className="inline-flex items-center gap-1.5">
          <i className="bi bi-box-seam text-blue-600 dark:text-blue-400" aria-hidden="true" />
          {productsCount} {productsCount === 1 ? 'produto' : 'produtos'}
        </span>
        <span aria-hidden="true" className="text-slate-300 dark:text-slate-600">·</span>
        <span className="inline-flex items-center gap-1.5">
          <i className="bi bi-tools text-amber-600 dark:text-amber-400" aria-hidden="true" />
          {servicesCount} {servicesCount === 1 ? 'serviço' : 'serviços'}
        </span>
      </div>

      <div ref={menuContainerRef} className="relative" onBlur={handleBlur} onKeyDown={handleKeyDown}>
        <button
          ref={addButtonRef}
          type="button"
          aria-expanded={isAddMenuOpen}
          aria-controls="items-table-add-menu"
          onClick={() => setIsAddMenuOpen((open) => !open)}
          className="flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400"
        >
          <i className="bi bi-plus-lg text-xs" aria-hidden="true" />
          Adicionar item
          <i className={`bi bi-chevron-${isAddMenuOpen ? 'up' : 'down'} text-xs`} aria-hidden="true" />
        </button>

        {isAddMenuOpen && (
          <div
            id="items-table-add-menu"
            role="group"
            aria-label="Tipo de item para adicionar"
            className="absolute right-0 z-30 mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-slate-200 bg-white p-1 shadow-xl dark:border-slate-700 dark:bg-slate-900"
          >
            <button
              type="button"
              aria-label="Produto"
              onClick={() => {
                onAddItem('product');
                setIsAddMenuOpen(false);
              }}
              className="flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              <i className="bi bi-box-seam mt-1 text-sm text-blue-600 dark:text-blue-400" aria-hidden="true" />
              <span className="flex flex-col gap-0.5">
                <span className="text-sm font-medium text-slate-800 dark:text-slate-100">Produto</span>
                <span className="text-xs font-normal text-slate-500 dark:text-slate-400">Produto individual</span>
              </span>
            </button>
            <button
              type="button"
              aria-label="Produto composto"
              onClick={() => {
                onAddItem('composition');
                setIsAddMenuOpen(false);
              }}
              className="flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-blue-50/70 dark:hover:bg-blue-950/30"
            >
              <i className="bi bi-boxes mt-1 text-sm text-blue-600 dark:text-blue-400" aria-hidden="true" />
              <span className="flex flex-col gap-0.5">
                <span className="text-sm font-medium text-slate-800 dark:text-slate-100">Produto composto</span>
                <span className="text-xs font-normal text-slate-500 dark:text-slate-400">Kit com vários produtos</span>
              </span>
            </button>
            <button
              type="button"
              aria-label="Serviço"
              onClick={() => {
                onAddItem('service');
                setIsAddMenuOpen(false);
              }}
              className="flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-amber-50/70 dark:hover:bg-amber-950/30"
            >
              <i className="bi bi-wrench-adjustable mt-1 text-sm text-orange-500 dark:text-orange-400" aria-hidden="true" />
              <span className="flex flex-col gap-0.5">
                <span className="text-sm font-medium text-slate-800 dark:text-slate-100">Serviço</span>
                <span className="text-xs font-normal text-slate-500 dark:text-slate-400">Serviço adicional</span>
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
