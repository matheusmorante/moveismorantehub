import React, { useState, useEffect, useRef } from 'react';
import Product from '../../../../../types/product.type';
import { ncmService, NcmSearchResult } from '@/services/fiscal/ncmService';

interface ProductNcmSelectorProps {
  formData: Partial<Product>;
  setFormData: React.Dispatch<React.SetStateAction<Partial<Product>>>;
}

export const ProductNcmSelector: React.FC<ProductNcmSelectorProps> = ({
  formData,
  setFormData,
}) => {
  const [searchQuery, setSearchQuery] = useState(formData.fiscal?.ncm || '');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => setSearchQuery(formData.fiscal?.ncm || ''), [formData.fiscal?.ncm]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const [results, setResults] = useState<NcmSearchResult[]>([]);
  const [isLoadingNcms, setIsLoadingNcms] = useState(false);
  const [currentCatalogEntry, setCurrentCatalogEntry] =
    useState<Awaited<ReturnType<typeof ncmService.getCatalogEntry>>>(null);
  const [hasCheckedCatalogEntry, setHasCheckedCatalogEntry] = useState(false);

  useEffect(() => {
    const fetchNcms = async () => {
      if (searchQuery.trim().length < 2) {
        setResults([]);
        return;
      }
      setIsLoadingNcms(true);
      try {
        const res = await ncmService.searchNcms(searchQuery, 10);
        setResults(res);
      } catch (err) {
        console.error('Erro ao buscar NCMs:', err);
        setResults([]);
      } finally {
        setIsLoadingNcms(false);
      }
    };
    const timer = setTimeout(fetchNcms, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    const code = (formData.fiscal?.ncm || '').replace(/\D/g, '');
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
      <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">NCM *</label>
      <div className="relative overflow-hidden rounded-2xl transition-all">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => {
            const val = e.target.value;
            setSearchQuery(val);
            setFormData((prev) => ({
              ...prev,
              fiscal: {
                ...prev.fiscal!,
                ncm: val,
              },
            }));
            setIsDropdownOpen(true);
          }}
          onFocus={() => setIsDropdownOpen(true)}
          placeholder="Digite ou pesquise o NCM..."
          className="w-full pl-1 pr-8 py-2.5 bg-transparent border-b-2 border-t-0 border-x-0 border-slate-200 dark:border-slate-800 outline-none text-xs font-bold dark:text-slate-200 tracking-wider font-mono transition-colors focus:border-blue-600 dark:focus:border-blue-400"
        />
        <i
          className={`bi bi-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition-transform pointer-events-none ${isDropdownOpen ? 'rotate-180' : ''}`}
        />
      </div>

      {currentCatalogEntry && !currentCatalogEntry.active && (
        <p
          role="alert"
          className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[10px] leading-relaxed text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200"
        >
          Este NCM não está vigente na base local. Revise a classificação antes de usar em novas
          operações.
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
                  setFormData((prev) => ({
                    ...prev,
                    fiscal: {
                      ...prev.fiscal!,
                      ncm: item.code,
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
