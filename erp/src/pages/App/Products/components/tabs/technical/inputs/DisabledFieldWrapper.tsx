import React from 'react';

export interface DisabledFieldInfoButtonProps {
  readonly disabledReason?: string;
  readonly onClick: () => void;
  readonly className?: string;
}

/**
 * Botão informativo com ícone de alerta no rótulo de campos desativados por dependência.
 */
export const DisabledFieldInfoButton: React.FC<DisabledFieldInfoButtonProps> = ({
  disabledReason,
  onClick,
  className = '',
}) => {
  if (!disabledReason) return null;

  return (
    <button
      type="button"
      onClick={onClick}
      title={disabledReason}
      aria-label={disabledReason}
      className={`inline-flex items-center text-amber-500 hover:text-amber-600 dark:text-amber-400 cursor-pointer ${className}`}
    >
      <i className="bi bi-info-circle text-[11px]" />
    </button>
  );
};

export interface DisabledFieldWrapperProps {
  readonly isDisabled: boolean;
  readonly disabledReason?: string;
  readonly showTooltip: boolean;
  readonly onToggleTooltip: () => void;
  readonly onShowTooltip: () => void;
  readonly onHideTooltip: () => void;
  readonly children: React.ReactNode;
}

/**
 * Envolve campos desativados fornecendo overlay clicável/acessível e tooltip flutuante explicativo.
 */
export const DisabledFieldWrapper: React.FC<DisabledFieldWrapperProps> = ({
  isDisabled,
  disabledReason,
  showTooltip,
  onToggleTooltip,
  onShowTooltip,
  onHideTooltip,
  children,
}) => {
  return (
    <div
      className="relative"
      onMouseEnter={() => {
        if (isDisabled) onShowTooltip();
      }}
      onMouseLeave={() => {
        if (isDisabled) onHideTooltip();
      }}
    >
      {isDisabled && (
        <div
          tabIndex={0}
          role="button"
          aria-label={disabledReason}
          title={disabledReason}
          onClick={onToggleTooltip}
          onFocus={onShowTooltip}
          onBlur={onHideTooltip}
          className="absolute inset-0 z-20 cursor-not-allowed bg-transparent"
        />
      )}

      {children}

      {isDisabled && showTooltip && disabledReason && (
        <div
          role="tooltip"
          className="absolute left-0 bottom-full mb-2 z-50 flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold shadow-2xl border border-slate-700 pointer-events-none transition-all duration-200 animate-in fade-in slide-in-from-bottom-1 max-w-[280px]"
        >
          <i
            className="bi bi-info-circle-fill text-amber-400 text-sm shrink-0"
            aria-hidden="true"
          />
          <span className="leading-snug">{disabledReason}</span>
          <div className="absolute top-full left-6 -mt-1 border-4 border-transparent border-t-slate-900" />
        </div>
      )}
    </div>
  );
};
