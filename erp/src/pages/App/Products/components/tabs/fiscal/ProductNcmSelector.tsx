import React, { useState, useEffect, useRef } from 'react';
import Product from '../../../../../types/product.type';
import { ncmService, NcmSearchResult } from '@/services/fiscal/ncmService';
import { formatNcmSubtitle } from '@/services/fiscal/ncmDisplay';
import type { PendingNcmSuggestion } from '../../../hooks/fiscal/useProductJevClassification';
import {
  fillMissingProductFiscalNcmDescription,
  updateProductFiscalNcmCode,
} from '../../../../../../../../shared-utils/productFiscalNcm';

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
  const [searchQuery, setSearchQuery] = useState(() => parseNcmCode(initialCode));
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [results, setResults] = useState<NcmSearchResult[]>([]);
  const [isLoadingNcms, setIsLoadingNcms] = useState(false);
  const [currentCatalogEntry, setCurrentCatalogEntry] =
    useState<Awaited<ReturnType<typeof ncmService.getCatalogEntry>>>(null);
  const [hasCheckedCatalogEntry, setHasCheckedCatalogEntry] = useState(false);
  const [selectedInternalDescription, setSelectedInternalDescription] = useState('');
  const [selectedInternalDescriptionCode, setSelectedInternalDescriptionCode] = useState('');

  useEffect(() => {
    const rawCode = (formData.fiscal?.ncm || '').trim();
    if (!rawCode) {
      setSearchQuery('');
      return;
    }
    const clean = rawCode.replace(/\D/g, '').slice(0, 8);
    setSearchQuery(clean || rawCode);
  }, [formData.fiscal?.ncm, formData.fiscal?.ncmDescription]);

  useEffect(() => {
    if (currentCatalogEntry?.code) {
      const currentCode = (formData.fiscal?.ncm || '').replace(/\D/g, '').slice(0, 8);
      if (currentCatalogEntry.code === currentCode && currentCatalogEntry.official_description) {
        setSearchQuery(currentCatalogEntry.code);
        setSelectedInternalDescription(currentCatalogEntry.internal_description || '');
        setSelectedInternalDescriptionCode(currentCatalogEntry.code);
        if (!formData.fiscal?.ncmDescription) {
          setFormData((prev) => {
            const fiscal = fillMissingProductFiscalNcmDescription(
              prev.fiscal,
              currentCatalogEntry.code,
              currentCatalogEntry.official_description
            );
            return fiscal === prev.fiscal ? prev : { ...prev, fiscal };
          });
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
    if (!isDropdownOpen && /^\d{8}$/.test(term.replace(/\D/g, ''))) {
      setResults([]);
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
      setSelectedInternalDescription('');
      setSelectedInternalDescriptionCode('');
      return;
    }
    let cancelled = false;
    setHasCheckedCatalogEntry(false);
    const timer = window.setTimeout(async () => {
      try {
        const entry = await ncmService.getCatalogEntry(code);
        if (!cancelled) {
          setCurrentCatalogEntry(entry);
          setSelectedInternalDescription(entry?.internal_description || '');
          setSelectedInternalDescriptionCode(entry ? code : '');
        }
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

  const currentCode = (formData.fiscal?.ncm || '').replace(/\D/g, '').slice(0, 8);
  const matchingCatalogEntry = currentCatalogEntry?.code === currentCode ? currentCatalogEntry : null;
  const currentOfficialDescription =
    formData.fiscal?.ncmDescription || matchingCatalogEntry?.official_description || '';
  const currentInternalDescription =
    selectedInternalDescriptionCode === currentCode
      ? selectedInternalDescription
      : matchingCatalogEntry?.internal_description || '';
  const ncmSubtitle = formatNcmSubtitle(currentOfficialDescription, currentInternalDescription);
  const descriptionId = 'product-ncm-description';
  const hasSubtitle = currentCode.length === 8 && Boolean(ncmSubtitle);

  return (
    <div className="flex flex-col gap-2 relative" ref={dropdownRef}>
      <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">
        NCM <span className="text-red-500 ml-0.5" aria-hidden="true">*</span>
      </label>
      <div className="relative overflow-hidden rounded-2xl transition-all">
        <input
          type="text"
          aria-label="NCM do produto"
          title={ncmSubtitle || searchQuery}
          aria-invalid={hasError}
          aria-describedby={
            [hasError ? 'product-ncm-error' : '', hasSubtitle ? descriptionId : ''].filter(Boolean).join(' ') ||
            undefined
          }
          value={searchQuery}
          onChange={(e) => {
            const val = e.target.value;
            const code = val.includes(' - ') ? parseNcmCode(val) : val;
            setSearchQuery(code);
            if (code.replace(/\D/g, '').slice(0, 8) !== currentCode) {
              setCurrentCatalogEntry(null);
              setSelectedInternalDescription('');
              setSelectedInternalDescriptionCode('');
            }
            setFormData((prev) => ({
              ...prev,
              fiscal: updateProductFiscalNcmCode(prev.fiscal, code),
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
                setSearchQuery(code);
              } else {
                void ncmService.getCatalogEntry(code).then((entry) => {
                  if (entry?.official_description) {
                    setCurrentCatalogEntry(entry);
                    setSelectedInternalDescription(entry.internal_description || '');
                    setSelectedInternalDescriptionCode(code);
                    setSearchQuery(code);
                    setFormData((prev) => ({
                      ...prev,
                      fiscal: {
                        ...updateProductFiscalNcmCode(prev.fiscal, code),
                        ncmDescription: entry.official_description,
                      },
                    }));
                  }
                }).catch(() => undefined);
              }
            }
          }}
          placeholder="Digite ou pesquise o NCM..."
          className={`h-[62px] w-full pl-1 pr-8 pt-2 pb-7 bg-transparent border-b-2 border-t-0 border-x-0 outline-none text-xs leading-4 font-bold dark:text-slate-200 tracking-wider font-mono transition-colors ${
            hasError
              ? 'border-red-500 focus:border-red-600'
              : 'border-slate-200 dark:border-slate-800 focus:border-blue-600 dark:focus:border-blue-400'
          }`}
        />
        {hasSubtitle && (
          <p
            id={descriptionId}
            data-testid="product-ncm-official-description"
            title={ncmSubtitle}
            className="pointer-events-none absolute left-1 right-8 top-8 line-clamp-2 text-[9px] leading-3 text-slate-500 dark:text-slate-400"
          >
            {ncmSubtitle}
          </p>
        )}
        <i
          className={`bi bi-chevron-down absolute right-4 top-3 text-slate-400 transition-transform pointer-events-none ${isDropdownOpen ? 'rotate-180' : ''}`}
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
                  setSelectedInternalDescription(item.internal_description || '');
                  setSelectedInternalDescriptionCode(item.code);
                  setFormData((prev) => ({
                    ...prev,
                    fiscal: {
                      ...updateProductFiscalNcmCode(prev.fiscal, item.code),
                      ncmDescription: item.official_description,
                    },
                  }));
                  setSearchQuery(item.code);
                  setIsDropdownOpen(false);
                }}
                className="px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer transition-colors text-left rounded-xl group"
              >
                <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-100 group-hover:text-blue-600">
                  {item.code}
                </span>
                <p
                  title={formatNcmSubtitle(item.official_description, item.internal_description)}
                  className="text-[10px] text-slate-500 line-clamp-2"
                >
                  {formatNcmSubtitle(item.official_description, item.internal_description)}
                </p>
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
