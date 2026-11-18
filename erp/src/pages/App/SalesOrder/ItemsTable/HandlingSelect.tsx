import React, { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Drill } from '@/components/shared/DrillIcon';
import { isGenericHandlingLabel } from '@/pages/utils/handlingMigration';
import type { HandlingOption } from '@/pages/utils/settingsService';

const STANDARD_HANDLING_GREEN = '#10b981';

interface HandlingSelectProps {
  options: HandlingOption[];
  value?: string;
  error?: string | boolean;
  className: string;
  title?: string;
  placeholder?: string;
  fitContent?: boolean;
  disabled?: boolean;
  ariaLabel?: string;
  useViewportMenu?: boolean;
  onChange: (value: string) => void;
}

const getHandlingColor = (option?: HandlingOption): string => {
  if (option?.color && option.color !== 'transparent') {
    const hex = option.color.trim().match(/^#([\da-f]{3}|[\da-f]{6}|[\da-f]{8})$/i)?.[1];
    if (hex) {
      const expanded = hex.length === 3
        ? hex.split('').map((channel) => channel + channel).join('')
        : hex.slice(0, 6);
      const red = parseInt(expanded.slice(0, 2), 16);
      const green = parseInt(expanded.slice(2, 4), 16);
      const blue = parseInt(expanded.slice(4, 6), 16);
      if (green > red && green >= blue) return STANDARD_HANDLING_GREEN;
    }
    return option.color;
  }
  if (option?.isAssemblyOutside) return '#dc2626';
  if (option?.includeInAssemblySchedule) return '#d97706';
  return '#64748b';
};

export const HandlingSelect: React.FC<HandlingSelectProps> = ({
  options,
  value,
  error,
  className,
  title,
  placeholder = 'Selecione',
  fitContent = false,
  disabled = false,
  ariaLabel = 'Manuseio',
  useViewportMenu = false,
  onChange,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0, width: 0, maxHeight: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const listboxId = useId();

  const selectedOption = options.find((option) => option.label === value);
  const hasAssemblyIcon = Boolean(
    selectedOption?.includeInAssemblySchedule || selectedOption?.isAssemblyOutside
  );
  const selectedColor = getHandlingColor(selectedOption);
  const isCurrentValueMissing =
    value && !selectedOption && !isGenericHandlingLabel(value);
  const menuOptions = [
    ...options.map((option) => ({
      label: option.label,
      value: option.label,
      option,
    })),
    ...(isCurrentValueMissing ? [{ label: `${value} (Atual)`, value, option: undefined }] : []),
  ];
  const selectedIndex = menuOptions.findIndex((option) => option.value === value);

  const openMenu = () => {
    const nextActiveIndex = selectedIndex >= 0 ? selectedIndex : 0;
    setActiveIndex(nextActiveIndex);
    setMenuPosition({ top: 0, left: 0, width: 0, maxHeight: 0 });
    setIsMenuOpen(true);
    window.requestAnimationFrame(() => optionRefs.current[nextActiveIndex]?.focus());
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
    triggerRef.current?.focus();
  };

  const moveActiveOption = (index: number) => {
    if (menuOptions.length === 0) return;
    const nextIndex = (index + menuOptions.length) % menuOptions.length;
    setActiveIndex(nextIndex);
    optionRefs.current[nextIndex]?.focus();
  };

  const handleOptionKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      moveActiveOption(index + 1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      moveActiveOption(index - 1);
    } else if (event.key === 'Home') {
      event.preventDefault();
      moveActiveOption(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      moveActiveOption(menuOptions.length - 1);
    }
  };

  useEffect(() => {
    if (!isMenuOpen || !useViewportMenu) return;

    const updateMenuPosition = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const margin = 8;
      const width = Math.min(Math.max(rect.width, 220), window.innerWidth - margin * 2);
      const left = Math.min(Math.max(margin, rect.left), window.innerWidth - width - margin);
      const availableBelow = Math.max(0, window.innerHeight - rect.bottom - margin);
      const openAbove = availableBelow < 140 && rect.top > 140;
      const maxHeight = openAbove
        ? Math.min(288, rect.top - margin)
        : Math.min(288, Math.max(96, availableBelow));

      setMenuPosition({
        top: openAbove ? rect.top - maxHeight : rect.bottom + 4,
        left,
        width,
        maxHeight,
      });
    };
    const handleOutsidePointer = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (target && !triggerRef.current?.contains(target) && !menuRef.current?.contains(target)) {
        setIsMenuOpen(false);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setIsMenuOpen(false);
        triggerRef.current?.focus();
      }
    };

    updateMenuPosition();
    window.addEventListener('resize', updateMenuPosition);
    document.addEventListener('scroll', updateMenuPosition, true);
    document.addEventListener('pointerdown', handleOutsidePointer);
    document.addEventListener('keydown', handleEscape);
    return () => {
      window.removeEventListener('resize', updateMenuPosition);
      document.removeEventListener('scroll', updateMenuPosition, true);
      document.removeEventListener('pointerdown', handleOutsidePointer);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isMenuOpen, useViewportMenu]);

  if (useViewportMenu) {
    return (
      <div className="relative flex min-w-0 items-center">
        {hasAssemblyIcon && (
          <Drill
            size={13}
            aria-hidden="true"
            className="absolute left-2 z-[1]"
            style={{ color: selectedColor }}
          />
        )}
        <button
          ref={triggerRef}
          type="button"
          role="combobox"
          aria-label={ariaLabel}
          aria-invalid={Boolean(error)}
          aria-haspopup="listbox"
          aria-expanded={isMenuOpen}
          aria-controls={listboxId}
          title={title}
          disabled={disabled}
          className={`${className} !pr-6 ${hasAssemblyIcon ? '!pl-7' : ''} text-left`}
          style={{
            color: disabled ? '#94a3b8' : selectedOption ? selectedColor : undefined,
            ...(fitContent ? { width: 'max-content', maxWidth: '100%' } : {}),
          }}
          onClick={() => {
            if (isMenuOpen) {
              setIsMenuOpen(false);
            } else {
              openMenu();
            }
          }}
          onKeyDown={(event) => {
            if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              if (!isMenuOpen) openMenu();
            }
          }}
        >
          {selectedOption?.label || (isCurrentValueMissing ? `${value} (Atual)` : placeholder)}
        </button>
        <i
          className={`bi ${isMenuOpen ? 'bi-chevron-up' : 'bi-chevron-down'} pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400`}
          aria-hidden="true"
        />
        {isMenuOpen && menuPosition.width > 0 && typeof document !== 'undefined' && createPortal(
          <div
            ref={menuRef}
            id={listboxId}
            role="listbox"
            aria-label={ariaLabel}
            className="fixed z-[100000000] min-w-0 overflow-y-auto overscroll-contain rounded-xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-700 dark:bg-slate-900"
            style={{
              top: menuPosition.top,
              left: menuPosition.left,
              width: menuPosition.width,
              maxHeight: menuPosition.maxHeight,
            }}
          >
            {menuOptions.length === 0 ? (
              <div className="px-3 py-2 text-sm text-slate-500 dark:text-slate-400">{placeholder}</div>
            ) : (
              menuOptions.map((entry, index) => {
                const isSelected = entry.value === value;
                const optionColor = entry.option ? getHandlingColor(entry.option) : '#64748b';
                const hasOptionAssemblyIcon = Boolean(
                  entry.option?.includeInAssemblySchedule || entry.option?.isAssemblyOutside
                );

                return (
                  <button
                    key={`${entry.value}-${index}`}
                    ref={(element) => { optionRefs.current[index] = element; }}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    tabIndex={activeIndex === index ? 0 : -1}
                    className={`flex min-h-11 w-full min-w-0 items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${isSelected ? 'bg-blue-50 dark:bg-blue-950/40' : 'hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                    style={{ color: optionColor }}
                    onFocus={() => setActiveIndex(index)}
                    onKeyDown={(event) => handleOptionKeyDown(event, index)}
                    onClick={() => {
                      if (entry.value !== value) onChange(entry.value);
                      closeMenu();
                    }}
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      {hasOptionAssemblyIcon && (
                        <Drill size={13} aria-hidden="true" className="shrink-0" style={{ color: optionColor }} />
                      )}
                      <span className="break-words">{entry.label}</span>
                    </span>
                    {isSelected && <i className="bi bi-check2 shrink-0" aria-hidden="true" />}
                  </button>
                );
              })
            )}
          </div>,
          document.body
        )}
      </div>
    );
  }

  return (
    <div className="relative flex min-w-0 items-center">
      {hasAssemblyIcon && (
        <Drill
          size={13}
          aria-hidden="true"
          className="absolute left-2 z-[1]"
          style={{ color: selectedColor }}
        />
      )}
      <select
        aria-label={ariaLabel}
        aria-invalid={Boolean(error)}
        title={title}
        disabled={disabled}
        className={`${className} !pr-6 ${hasAssemblyIcon ? '!pl-7' : ''}`}
        value={value || ''}
        style={{
          color: disabled ? '#94a3b8' : selectedOption ? selectedColor : undefined,
          ...(fitContent ? { width: 'max-content', maxWidth: '100%' } : {}),
        }}
        onChange={(event) => {
          const nextValue = event.target.value;
          if (nextValue && nextValue !== value) onChange(nextValue);
        }}
      >
        <option value="" disabled className="dark:bg-slate-900">
          {placeholder}
        </option>
        {options.map((option) => (
          <option
            key={option.label}
            value={option.label}
            className="dark:bg-slate-900"
            style={{ color: getHandlingColor(option) }}
          >
            {option.label}
          </option>
        ))}
        {isCurrentValueMissing && (
          <option value={value} className="italic text-slate-400">
            {value} (Atual)
          </option>
        )}
      </select>
      <i
        className="bi bi-chevron-down pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400"
        aria-hidden="true"
      />
    </div>
  );
};
