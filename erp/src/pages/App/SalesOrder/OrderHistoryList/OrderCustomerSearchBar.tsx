import React from 'react';

interface OrderCustomerSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSearchBlur?: (value: string) => void;
  onSearchFocus?: () => void;
  onKeyDown?: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  onClear?: () => void;
  placeholder?: string;
  className?: string;
}

export const OrderCustomerSearchBar: React.FC<OrderCustomerSearchBarProps> = ({
  value,
  onChange,
  onSearchBlur,
  onSearchFocus,
  onKeyDown,
  onClear,
  placeholder = 'Buscar pedido pelo nome do cliente (mín. 3 caracteres)...',
  className = '',
}) => {
  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      if (onClear) {
        onClear();
      } else {
        onChange('');
        onSearchBlur?.('');
      }
    }
    onKeyDown?.(event);
  };

  const handleClear = () => {
    if (onClear) {
      onClear();
    } else {
      onChange('');
      onSearchBlur?.('');
    }
  };

  return (
    <div className={`relative flex items-center w-full ${className}`}>
      <div
        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none flex items-center"
        aria-hidden="true"
      >
        <i className="bi bi-search text-sm" />
      </div>

      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={onSearchFocus}
        onBlur={(event) => onSearchBlur?.(event.currentTarget.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        aria-label={placeholder}
        className="w-full pl-10 pr-10 py-2 bg-transparent border-0 border-b-2 border-slate-200 dark:border-slate-700 rounded-none text-xs font-bold text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder:text-slate-500 shadow-none focus:outline-none focus:border-blue-500 dark:focus:border-blue-500 focus:ring-0 transition-colors"
      />

      {value && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
          title="Limpar busca de cliente"
          aria-label="Limpar busca de cliente"
        >
          <i className="bi bi-x-lg text-xs" aria-hidden="true" />
        </button>
      )}
    </div>
  );
};

export default OrderCustomerSearchBar;
