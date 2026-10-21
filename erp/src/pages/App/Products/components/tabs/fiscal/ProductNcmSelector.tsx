import React, { useState, useEffect, useRef } from 'react';
import Product from '../../../../../types/product.type';
import { ncmService, NcmSearchResult } from '@/services/fiscal/ncmService';
import type { PendingNcmSuggestion } from '../../../hooks/fiscal/useProductJevClassification';

function formatNcmDisplay(code?: string, description?: string | null): string {
  if (!code) return '';
  const cleanCode = code.replace(/\D/g, '').slice(0, 8);
  if (!cleanCode) return code;
  if (description && description.trim()) {
    return `${cleanCode} - ${description.trim()}`;
  }
  return cleanCode;
}

function parseNcmCode(val: string): string {
  if (!val) return '';
  const firstPart = val.includes(' - ') ? val.split(' - ')[0] : val;
  const digits = firstPart.replace(/\D/g, '');
  return digits.length >= 8 ? digits.slice(0, 8) : firstPart.trim();
}

interface ProductNcmSelectorProps {
  formData: Partial<Product>;
  setFormData: React.Dispatch<React.SetStateAction<Partial<Product>>>;
  hasError?: boolean;
  suggestion?: PendingNcmSuggestion | null;
  onAcceptSuggestion?: () => void;
  onRejectSuggestion?: () => void;
}

export const ProductNcmSelector: React.FC<ProductNcmSelectorProps> = ({
  formData,
  setFormData,
  hasError = false,
  suggestion,
  onAcceptSuggestion,
  onRejectSuggestion,
}) => {
  const initialCode = formData.fiscal?.ncm || '';
  const initialDesc = formData.fiscal?.ncmDescription || '';
  const [searchQuery, setSearchQuery] = useState(() => formatNcmDisplay(initialCode, initialDesc));
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [results, setResults] = useState<NcmSearchResult[]>([]);
  const [isLoadingNcms, setIsLoadingNcms] = useState(false);
  const [currentCatalogEntry, setCurrentCatalogEntry] =
    useState<Awaited<ReturnType<typeof ncmService.getCatalogEntry>>>(null);
  const [hasCheckedCatalogEntry, setHasCheckedCatalogEntry] = useState(false);

  useEffect(() => {
    const rawCode = (formData.fiscal?.ncm || '').trim();
    if (!rawCode) {
      setSearchQuery('');
      return;
    }
    const clean = rawCode.replace(/\D/g, '').slice(0, 8);
    const desc = formData.fiscal?.ncmDescription || currentCatalogEntry?.official_description || '';
    setSearchQuery(formatNcmDisplay(clean || rawCode, desc));
  }, [formData.fiscal?.ncm, formData.fiscal?.ncmDescription]);

  useEffect(() => {
    if (currentCatalogEntry?.code) {
      const currentCode = (formData.fiscal?.ncm || '').replace(/\D/g, '').slice(0, 8);
      if (currentCatalogEntry.code === currentCode && currentCatalogEntry.official_description) {
        setSearchQuery(formatNcmDisplay(currentCatalogEntry.code, currentCatalogEntry.official_description));
        if (!formData.fiscal?.ncmDescription) {
          setFormData((prev) => ({
            ...prev,
            fiscal: {
              ...prev.fiscal!,
              ncmDescription: currentCatalogEntry.official_description,
            },
          }));
        }
      }
    }
  }, [currentCatalogEntry]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const term = searchQuery.includes(' - ') ? searchQuery.split(' - ')[0].trim() : searchQuery.trim();
    if (term.length < 2) {
      setResults([]);
      return;
    }
    if (!isDropdownOpen && searchQuery.includes(' - ')) {
      return;
    }
    setIsLoadingNcms(true);
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const res = await ncmService.searchNcms(term, 10);
        if (!cancelled) setResults(res);
      } catch (err) {
        console.error('Erro ao buscar NCMs:', err);
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setIsLoadingNcms(false);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [searchQuery, isDropdownOpen]);

  useEffect(() => {
    const code = (formData.fiscal?.ncm || '').replace(/\D/g, '').slice(0, 8);
    if (code.length !== 8) {
      setCurrentCatalogEntry(null);
      setHasCheckedCatalogEntry(false);
      return;
    }
    let cancelled = false;
    setHasCheckedCatalogEntry(false);
    const timer = window.setTimeout(async () => {
      try {
        const entry = await ncmService.getCatalogEntry(code);
        if (!cancelled) setCurrentCatalogEntry(entry);
      } catch (error) {
        console.warn('[NCM] Não foi possível consultar a vigência do código.', error);
        if (!cancelled) setCurrentCatalogEntry(null);
      } finally {
        if (!cancelled) setHasCheckedCatalogEntry(true);
      }
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [formData.fiscal?.ncm]);

  return (
    <div className="flex flex-col gap-2 relative" ref={dropdownRef}>
      <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">
        NCM <span className="text-red-500 ml-0.5" aria-hidden="true">*</span>
      </label>
      <div className="relative overflow-hidden rounded-2xl transition-all">
        <input
          type="text"
          aria-label="NCM do produto"
          title={searchQuery}
          aria-invalid={hasError}
          aria-describedby={hasError ? 'product-ncm-error' : undefined}
          value={searchQuery}
          onChange={(e) => {
            const val = e.target.value;
            setSearchQuery(val);
            const code = val.includes(' - ') ? parseNcmCode(val) : val;
            setFormData((prev) => ({
              ...prev,
              fiscal: {
                ...prev.fiscal!,
                ncm: code,
                ...(code !== (prev.fiscal?.ncm || '').replace(/\D/g, '') ? { ncmDescription: '' } : {}),
              },
            }));
            setIsDropdownOpen(true);
          }}
          onFocus={(e) => {
            setIsDropdownOpen(true);
            e.target.select();
          }}
          onBlur={() => {
            const code = parseNcmCode(searchQuery);
            if (/^\d{8}$/.test(code)) {
              if (currentCatalogEntry?.code === code && currentCatalogEntry.official_description) {
                setSearchQuery(formatNcmDisplay(code, currentCatalogEntry.official_description));
              } else {
                void ncmService.getCatalogEntry(code).then((entry) => {
                  if (entry?.official_description) {
                    setSearchQuery(formatNcmDisplay(code, entry.official_description));
                    setFormData((prev) => ({
                      ...prev,
                      fiscal: {
                        ...prev.fiscal!,
                        ncm: code,
                        ncmDescription: entry.official_description,
                      },
                    }));
                  }
                }).catch(() => undefined);
              }
            }
          }}
          placeholder="Digite ou pesquise o NCM..."
          className={`w-full pl-1 pr-8 py-2.5 bg-transparent border-b-2 border-t-0 border-x-0 outline-none text-xs font-bold dark:text-slate-200 tracking-wider font-mono transition-colors ${
            hasError
              ? 'border-red-500 focus:border-red-600'
              : 'border-slate-200 dark:border-slate-800 focus:border-blue-600 dark:focus:border-blue-400'
          }`}
        />
        <i
          className={`bi bi-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition-transform pointer-events-none ${isDropdownOpen ? 'rotate-180' : ''}`}
        />
      </div>
      {hasError && (
        <p id="product-ncm-error" role="alert" className="text-[10px] font-bold text-red-500">
          Informe um NCM válido com 8 dígitos.
        </p>
      )}
      {suggestion && !formData.fiscal?.ncm && (
        <div
          role="status"
          className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200"
        >
          <div className="min-w-0 flex-1 text-[10px]">
            <strong>Sugestão de NCM aguardando confirmação: {suggestion.code}</strong>
            <p className="truncate">{suggestion.description}</p>
          </div>
          <button
            type="button"
            aria-label="Aceitar sugestão de NCM"
            title="Aceitar sugestão de NCM"
            onClick={onAcceptSuggestion}
            className="rounded px-2 py-1 font-bold hover:bg-amber-100 dark:hover:bg-amber-900"
          >
            ✓
          </button>
          <button
            type="button"
            aria-label="Rejeitar sugestão de NCM"
            title="Rejeitar sugestão de NCM"
            onClick={onRejectSuggestion}
            className="rounded px-2 py-1 font-bold hover:bg-amber-100 dark:hover:bg-amber-900"
          >
            ×
          </button>
        </div>
      )}

      {currentCatalogEntry && !currentCatalogEntry.active && (
        <p
          role="alert"
          className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[10px] leading-relaxed text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200"
        >
          Este NCM não está vigente na base local. Revise a classificação antes de usar em novas
          operações.
        </p>
      )}
      {currentCatalogEntry?.active && !currentCatalogEntry.is_active && (
        <p
          role="status"
          className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[10px] leading-relaxed text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
        >
          Este NCM está desativado para novas seleções da loja. O código já salvo foi preservado;
          escolha um NCM ativo se quiser substituí-lo.
        </p>
      )}
      {hasCheckedCatalogEntry && currentCatalogEntry === null && (
        <p className="text-[10px] text-slate-500">
          Não foi possível confirmar a vigência deste NCM. Sincronize a tabela oficial antes de
          emitir documentos fiscais.
        </p>
      )}
      {currentCatalogEntry?.active && currentCatalogEntry.is_active && currentCatalogEntry.official_description && (
        <p
          data-testid="product-ncm-official-description"
          className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium leading-relaxed bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-900/40 rounded-lg px-2.5 py-1.5 flex items-start gap-1.5"
        >
          <i className="bi bi-check-circle-fill text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
          <span>{currentCatalogEntry.official_description}</span>
        </p>
      )}
      {isDropdownOpen && (
        <div className="absolute left-0 right-0 top-full mt-2 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl shadow-xl z-50 p-2 max-h-60 overflow-y-auto custom-scrollbar flex flex-col gap-0.5">
          {isLoadingNcms ? (
            <div className="p-3 text-center text-xs text-slate-400">
              <i className="bi bi-arrow-repeat animate-spin mr-2" /> Buscando NCMs...
            </div>
          ) : results.length > 0 ? (
            results.map((item) => (
              <div
                key={item.code}
                onClick={(e) => {
                  e.stopPropagation();
                  const formatted = `${item.code} - ${item.official_description}`;
                  setFormData((prev) => ({
                    ...prev,
                    fiscal: {
                      ...prev.fiscal!,
                      ncm: item.code,
                      ncmDescription: item.official_description,
                    },
                  }));
                  setSearchQuery(formatted);
                  setIsDropdownOpen(false);
                }}
                className="px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer transition-colors text-left rounded-xl group"
              >
                <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-100 group-hover:text-blue-600">
                  {item.code}
                </span>
                <p className="text-[10px] text-slate-500 line-clamp-2">
                  {item.official_description}
                </p>
                {item.alias_match && (
                  <p className="text-[9px] text-slate-400 mt-1 italic flex items-center gap-1">
                    <i className="bi bi-tag-fill" /> {item.alias_match}
                  </p>
                )}
              </div>
            ))
          ) : searchQuery.length >= 2 ? (
            <div className="p-3 text-center text-xs text-slate-400">Nenhum NCM encontrado.</div>
          ) : (
            <div className="p-3 text-center text-xs text-slate-400">
              Digite pelo menos 2 caracteres para buscar...
            </div>
          )}
        </div>
      )}
    </div>
  );
};
