import React from 'react';

export const STOCK_ORIGIN_LOCKED_TITLE =
  'Bloqueado porque há um produto cadastrado vinculado ao item. Remova o produto selecionado no campo Produto para liberar e alterar a origem do estoque.';

interface StockOriginSelectProps {
  id?: string;
  value?: string;
  isLinkedProduct: boolean;
  error?: string | boolean;
  errorId?: string;
  ariaLabel?: string;
  selectClassName?: string;
  lockIconClassName?: string;
  onChange: (value: string) => void;
}

export const StockOriginSelect: React.FC<StockOriginSelectProps> = ({
  id,
  value,
  isLinkedProduct,
  error,
  errorId,
  ariaLabel,
  selectClassName = '',
  lockIconClassName = 'bi bi-lock-fill pointer-events-none absolute right-6 z-10 text-[9px] text-amber-500',
  onChange,
}) => (
  <span className="relative inline-flex items-center" title={isLinkedProduct ? STOCK_ORIGIN_LOCKED_TITLE : undefined}>
    {isLinkedProduct && <i className={lockIconClassName} aria-hidden="true" />}
    <select
      id={id}
      className={selectClassName}
      value={value ?? ''}
      disabled={isLinkedProduct}
      onChange={(event) => onChange(event.target.value)}
      title={isLinkedProduct ? STOCK_ORIGIN_LOCKED_TITLE : 'Origem do estoque'}
      aria-label={ariaLabel}
      aria-required="true"
      aria-invalid={Boolean(error)}
      aria-describedby={error && errorId ? errorId : undefined}
    >
      <option value="">Selecione</option>
      <option value="novo">Convencional</option>
      <option value="salvado">Salvados</option>
      <option value="usado">Usados</option>
    </select>
  </span>
);
