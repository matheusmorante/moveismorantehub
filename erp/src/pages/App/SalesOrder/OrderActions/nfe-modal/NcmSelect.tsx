import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { ncmService, NcmSearchResult } from '@/services/fiscal/ncmService';
import { formatNcmSubtitle } from '@/services/fiscal/ncmDisplay';

function parseNcmCode(val: string): string {
  if (!val) return '';
  const firstPart = val.includes(' - ') ? val.split(' - ')[0] : val;
  const digits = firstPart.replace(/\D/g, '');
  return digits.length >= 8 ? digits.slice(0, 8) : firstPart.trim();
}

interface NcmSelectProps {
  id?: string;
  value: string;
  description?: string;
  onChange: (ncm: string, description?: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  hasError?: boolean;
}

export const NcmSelect: React.FC<NcmSelectProps> = ({
  id,
  value,
  description,
  onChange,
  onBlur,
  placeholder = 'Selecione ou digite o NCM...',
  hasError = false,
}) => {
  const [currentDescription, setCurrentDescription] = useState(description || '');
  const [currentInternalDescription, setCurrentInternalDescription] = useState('');
  const [searchQuery, setSearchQuery] = useState(() => parseNcmCode(value || ''));
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [results, setResults] = useState<NcmSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);

  useLayoutEffect(() => {
    if (!isDropdownOpen || !inputRef.current) {
      setDropdownPosition(null);
      return;
    }
    const updatePosition = () => {
      const rect = inputRef.current?.getBoundingClientRect();
      if (!rect) return;
      const width = Math.min(Math.max(rect.width, 288), window.innerWidth - 16);
      setDropdownPosition({
        top: Math.min(rect.bottom + 6, window.innerHeight - 240),
        left: Math.max(8, Math.min(rect.right - width, window.innerWidth - width - 8)),
        width,
      });
    };
    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isDropdownOpen, searchQuery, results.length]);

  useEffect(() => {
    const clean = (value || '').trim();
    const code = parseNcmCode(clean);
    const digits = clean.replace(/\D/g, '').slice(0, 8);
    setCurrentDescription(description || '');
    setCurrentInternalDescription('');
    setSearchQuery(digits.length === 8 ? digits : clean);
    if (digits.length !== 8 || typeof ncmService?.getCatalogEntry !== 'function') return;

    let cancelled = false;
    Promise.resolve(ncmService.getCatalogEntry(digits))
      .then((entry) => {
        if (!cancelled && entry) {
          setCurrentDescription(description || entry.official_description || '');
          setCurrentInternalDescription(entry.internal_description || '');
          setSearchQuery(digits);
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [value, description]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const clickedControl = dropdownRef.current?.contains(target);
      const clickedResults = resultsRef.current?.contains(target);
      if (!clickedControl && !clickedResults) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const term = searchQuery.includes(' - ')
      ? searchQuery.split(' - ')[0].trim()
      : searchQuery.trim();
    if (term.length < 2) {
      setResults([]);
      return;
    }
    if (!isDropdownOpen && /^\d{8}$/.test(term.replace(/\D/g, ''))) {
      setResults([]);
      return;
    }
    setIsLoading(true);
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const res = await ncmService.searchNcms(term, 10);
        if (!cancelled) setResults(res);
      } catch (err) {
        console.error('Erro ao buscar NCMs:', err);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [searchQuery, isDropdownOpen]);

  const cleanVal = parseNcmCode(searchQuery).replace(/\D/g, '').slice(0, 8);
  const isNcmValid = cleanVal.length === 8;
  const displayDescription = formatNcmSubtitle(currentDescription, currentInternalDescription);
  const hasDescription = isNcmValid && Boolean(displayDescription);
  const descriptionId = id ? `${id}-description` : undefined;

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <div className="relative">
        <input
          id={id}
          ref={inputRef}
          aria-label="NCM"
          aria-describedby={hasDescription ? descriptionId : undefined}
          title={displayDescription || searchQuery}
          type="text"
          value={searchQuery}
          onChange={(e) => {
            const val = e.target.value;
            setSearchQuery(val);
            setCurrentDescription('');
            setCurrentInternalDescription('');
            const code = val.includes(' - ') ? parseNcmCode(val) : val;
            onChange(code);
            setIsDropdownOpen(true);
          }}
          onFocus={(e) => {
            setIsDropdownOpen(true);
            e.target.select();
          }}
          onBlur={() => {
            const code = parseNcmCode(searchQuery);
            if (/^\d{8}$/.test(code) && typeof ncmService?.getCatalogEntry === 'function') {
              Promise.resolve(ncmService.getCatalogEntry(code))
                .then((entry) => {
                  if (entry?.official_description) {
                    setCurrentDescription(entry.official_description);
                    setCurrentInternalDescription(entry.internal_description || '');
                    setSearchQuery(code);
                    onChange(code, entry.official_description);
                  }
                })
                .catch(() => undefined);
            }
            setTimeout(() => onBlur?.(), 150);
          }}
          placeholder={placeholder}
          className={`h-[62px] w-full pl-3 pr-7 pt-2 pb-7 bg-white dark:bg-slate-950 border-0 border-b-2 rounded-none outline-none text-xs leading-4 font-mono font-bold transition-all ${
            hasError
              ? 'border-rose-500 bg-rose-50/50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 focus:border-rose-600 ring-1 ring-rose-500/30'
              : isNcmValid
                ? 'border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:border-blue-500'
                : 'border-red-400 bg-red-50/40 dark:bg-red-950/30 text-red-700 dark:text-red-300 focus:border-red-500'
          }`}
        />
        {hasDescription && (
          <p
            id={descriptionId}
            data-testid={id ? `${id}-description` : 'ncm-select-description'}
            title={displayDescription}
            className="pointer-events-none absolute left-3 right-7 top-8 line-clamp-2 text-[9px] leading-3 text-slate-500 dark:text-slate-400"
          >
            {displayDescription}
          </p>
        )}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsDropdownOpen((prev) => !prev);
          }}
          className="absolute right-2 top-3 text-slate-400 hover:text-slate-600 transition-transform p-0.5"
        >
          <i
            className={`bi bi-chevron-down text-[10px] transition-transform block ${isDropdownOpen ? 'rotate-180' : ''}`}
          />
        </button>
      </div>

      {isDropdownOpen &&
        dropdownPosition &&
        (searchQuery.length >= 2 || results.length > 0) &&
        createPortal(
          <div
            ref={resultsRef}
            className="fixed z-[100000000] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-1.5 max-h-56 overflow-y-auto custom-scrollbar flex flex-col gap-0.5"
            style={{
              top: dropdownPosition.top,
              left: dropdownPosition.left,
              width: dropdownPosition.width,
            }}
          >
            {isLoading ? (
              <div className="p-3 text-center text-xs text-slate-400">
                <i className="bi bi-arrow-repeat animate-spin mr-2" /> Buscando...
              </div>
            ) : results.length > 0 ? (
              results.map((item) => (
                <div
                  key={item.code}
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentDescription(item.official_description);
                    setCurrentInternalDescription(item.internal_description || '');
                    setSearchQuery(item.code);
                    onChange(item.code, item.official_description);
                    setIsDropdownOpen(false);
                  }}
                  className="px-2.5 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/70 cursor-pointer transition-colors text-left rounded-xl group"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-black text-blue-600 dark:text-blue-400 tracking-wider font-mono shrink-0 group-hover:text-blue-700">
                      {item.code}
                    </span>
                    {item.code === cleanVal && (
                      <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded">
                        Selecionado
                      </span>
                    )}
                  </div>
                  <p
                    title={formatNcmSubtitle(item.official_description, item.internal_description)}
                    className="text-[10px] text-slate-600 dark:text-slate-300 font-semibold leading-tight mt-0.5 line-clamp-2"
                  >
                    {formatNcmSubtitle(item.official_description, item.internal_description)}
                  </p>
                </div>
              ))
            ) : (
              <div className="p-3 text-center text-xs text-slate-400">
                Nenhum NCM encontrado.
              </div>
            )}
          </div>,
          document.body
        )}
    </div>
  );
};
