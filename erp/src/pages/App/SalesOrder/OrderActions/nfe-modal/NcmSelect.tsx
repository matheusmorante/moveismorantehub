import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { ncmService, NcmSearchResult } from '@/services/fiscal/ncmService';

interface NcmSelectProps {
  value: string;
  onChange: (ncm: string) => void;
  placeholder?: string;
  hasError?: boolean;
  onBlur?: (value: string) => void;
  disabled?: boolean;
}

const MIN_SEARCH_LENGTH = 3;

export const NcmSelect: React.FC<NcmSelectProps> = ({
  value,
  onChange,
  placeholder = 'Selecione ou digite o NCM...',
  hasError = false,
  onBlur,
  disabled = false,
}) => {
  const [searchQuery, setSearchQuery] = useState(value || '');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [results, setResults] = useState<NcmSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number; width: number } | null>(null);

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
    setSearchQuery(value || '');
  }, [value]);

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
    const fetchNcms = async () => {
      if (searchQuery.trim().length < MIN_SEARCH_LENGTH) {
        setResults([]);
        return;
      }
      setIsLoading(true);
      try {
        const res = await ncmService.searchNcms(searchQuery, 10);
        setResults(res);
      } catch (err) {
        console.error('Erro ao buscar NCMs:', err);
      } finally {
        setIsLoading(false);
      }
    };

    const timer = setTimeout(fetchNcms, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const cleanVal = (searchQuery || '').replace(/\D/g, '');
  const isNcmValid = cleanVal.length === 8;

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <div className="relative flex items-center">
        <input
          ref={inputRef}
          aria-label="NCM"
          disabled={disabled}
          type="text"
          value={searchQuery}
          onChange={(e) => {
            const val = e.target.value;
            setSearchQuery(val);
            // Even an incomplete/invalid edit must replace the form value and be rejected,
            // rather than displaying it while submitting the previous valid code.
            onChange(val);
            setIsDropdownOpen(true);
          }}
          onFocus={() => setIsDropdownOpen(true)}
          onBlur={(event) => {
            const nextFocus = event.relatedTarget as Node | null;
            if (!nextFocus || (!dropdownRef.current?.contains(nextFocus) && !resultsRef.current?.contains(nextFocus))) {
              onBlur?.(searchQuery);
            }
          }}
          placeholder={placeholder}
          aria-invalid={hasError && !isNcmValid}
          className={`w-full pl-1 pr-7 py-1.5 bg-transparent border-0 border-b rounded-none outline-none text-xs font-mono font-bold transition-all ${
            hasError && !isNcmValid
              ? 'border-red-400 text-red-700 dark:text-red-300 focus:border-red-500'
              : 'border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-200 focus:border-blue-500'
          }`}
        />
        <button
          type="button"
          disabled={disabled}
          onClick={(e) => {
            e.stopPropagation();
            setIsDropdownOpen((prev) => !prev);
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-transform p-0.5"
        >
          <i
            className={`bi bi-chevron-down text-[10px] transition-transform block ${isDropdownOpen ? 'rotate-180' : ''}`}
          />
        </button>
      </div>

      {isDropdownOpen && dropdownPosition && (searchQuery.trim().length >= MIN_SEARCH_LENGTH || results.length > 0) && createPortal(
        <div
          ref={resultsRef}
          className="fixed z-[100000000] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-1.5 max-h-56 overflow-y-auto custom-scrollbar flex flex-col gap-0.5"
          style={{ top: dropdownPosition.top, left: dropdownPosition.left, width: dropdownPosition.width }}
        >
          {isLoading ? (
            <div className="p-3 text-center text-xs text-slate-400">
              <i className="bi bi-arrow-repeat animate-spin mr-2" /> Buscando...
            </div>
          ) : results.length > 0 ? (
            results.map((item) => (
              <div
                key={item.code}
                onMouseDown={(event) => event.preventDefault()}
                onClick={(e) => {
                  e.stopPropagation();
                  onChange(item.code);
                  setSearchQuery(item.code);
                  setIsDropdownOpen(false);
                  onBlur?.(item.code);
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
                <p className="text-[10px] text-slate-600 dark:text-slate-300 font-semibold leading-tight mt-0.5 line-clamp-2">
                  {item.official_description}
                </p>
                {item.alias_match && (
                  <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-1 italic flex items-center gap-1">
                    <i className="bi bi-tag-fill" /> {item.alias_match}
                  </p>
                )}
              </div>
            ))
          ) : (
            <div className="p-3 text-center text-xs text-slate-400">
              Nenhum NCM encontrado para "{searchQuery}".
            </div>
          )}
        </div>,
        document.body
      )}
    </div>
  );
};
