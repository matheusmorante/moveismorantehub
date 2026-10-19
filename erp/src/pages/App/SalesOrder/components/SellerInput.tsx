import { type FC, useEffect, useId, useRef, useState } from 'react';
import type Person from '@/pages/types/person.type';
import { isValidEmployee } from '@/pages/utils/accessRoles';
import { subscribeToPeople } from '@/pages/utils/personService';
import { normalizeSearchTerm } from '@/pages/utils/textUtils';

const findExactEmployee = (searchTerm: string, employees: Person[]): Person | undefined => {
  const normalizedTerm = normalizeSearchTerm(searchTerm);
  if (!normalizedTerm) return undefined;

  const matches = employees.filter((employee) =>
    [employee.fullName, employee.nickname].some(
      (name) => normalizeSearchTerm(name || '') === normalizedTerm
    )
  );

  return matches.length === 1 && matches[0].id ? matches[0] : undefined;
};

interface SellerInputProps {
  value: string;
  sellerId?: string;
  onChange: (sellerName: string) => void;
  onSelectSeller?: (seller: { name: string; id?: string }) => void;
  onAddNewSeller?: () => void;
  placeholder?: string;
  className?: string;
  isAIFilling?: boolean;
}

export const SellerInput: FC<SellerInputProps> = ({
  value,
  sellerId,
  onChange,
  onSelectSeller,
  onAddNewSeller,
  placeholder = 'Digite para buscar vendedor...',
  className = '',
  isAIFilling = false,
}) => {
  const inputId = useId();
  const [isOpen, setIsOpen] = useState(false);
  const [employees, setEmployees] = useState<Person[]>([]);
  const [filterText, setFilterText] = useState(value || '');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setFilterText(value || '');
  }, [value]);

  useEffect(() => {
    if (sellerId || !onSelectSeller) return;

    const exactEmployee = findExactEmployee(value, employees);
    if (!exactEmployee?.id) return;

    const sellerName = exactEmployee.nickname || exactEmployee.fullName;
    if (sellerName !== value) onChange(sellerName);
    onSelectSeller({ name: sellerName, id: String(exactEmployee.id) });
  }, [employees, onChange, onSelectSeller, sellerId, value]);

  useEffect(() => {
    const unsub = subscribeToPeople('employees', (data) => {
      const validEmployees = data.filter((e) => isValidEmployee(e));
      setEmployees(validEmployees);
    });
    return unsub;
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filtered = employees.filter((e) => {
    const term = normalizeSearchTerm(filterText);
    return (
      normalizeSearchTerm(e.fullName || '').includes(term) ||
      normalizeSearchTerm(e.nickname || '').includes(term) ||
      normalizeSearchTerm(e.position || '').includes(term)
    );
  });
  const exactEmployeeForValue = findExactEmployee(value, employees);
  const isSellerSelected = Boolean(sellerId || exactEmployeeForValue);

  return (
    <div ref={containerRef} className={`relative flex-1 flex flex-col group ${className}`}>
      <div className="flex items-center justify-between mb-2 ml-1">
        <label
          htmlFor={inputId}
          className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 flex items-center gap-1.5"
        >
          <i className="bi bi-person-badge text-blue-500 text-xs" />
          Vendedor <span className="text-red-500">*</span>
        </label>

        {isAIFilling && (
          <span className="px-2.5 py-0.5 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-[9px] font-black uppercase tracking-wider flex items-center gap-1 shadow-sm animate-pulse">
            <i className="bi bi-stars" /> IA trabalhando neste campo...
          </span>
        )}
      </div>

      <div className="relative flex items-center">
        <input
          id={inputId}
          type="text"
          value={filterText}
          onChange={(e) => {
            const typedValue = e.target.value;
            const exactEmployee = findExactEmployee(typedValue, employees);
            const sellerName = exactEmployee
              ? exactEmployee.nickname || exactEmployee.fullName
              : typedValue;

            setFilterText(sellerName);
            onChange(sellerName);
            onSelectSeller?.({
              name: sellerName,
              id: exactEmployee?.id ? String(exactEmployee.id) : undefined,
            });
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className={`w-full bg-transparent px-3 py-3 text-sm font-bold placeholder:text-slate-400 outline-none transition-colors dark:placeholder:text-slate-600 ${
            isSellerSelected
              ? 'border-b-2 border-emerald-500 text-emerald-700 focus:border-emerald-600 dark:text-emerald-400 dark:border-emerald-500 dark:focus:border-emerald-400'
              : isAIFilling
                ? 'border-b-2 border-violet-500 animate-pulse bg-violet-50/20 dark:bg-violet-950/20 text-slate-800 dark:text-slate-100'
                : 'border-b-2 border-slate-200 text-slate-800 dark:text-slate-100 dark:border-slate-700 focus:border-blue-600 dark:focus:border-blue-500'
          }`}
        />
        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
          {isSellerSelected && (
            <i
              data-testid="seller-selected-check"
              className="bi bi-check-circle-fill text-emerald-600 dark:text-emerald-400 text-sm"
              aria-hidden="true"
              title="Vendedor selecionado"
            />
          )}
          {filterText ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setFilterText('');
                onChange('');
                onSelectSeller?.({ name: '' });
                setIsOpen(true);
              }}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              title="Limpar vendedor"
            >
              <i className="bi bi-x-circle-fill text-sm" />
            </button>
          ) : (
            <i
              className={`bi bi-chevron-down text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            />
          )}
        </div>
      </div>

      {/* Dropdown Modal que aparece diretamente abaixo do campo de texto com base no filtro */}
      {isOpen && (
        <div className="absolute top-[calc(100%+6px)] left-0 right-0 z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-h-64 overflow-y-auto custom-scrollbar p-1.5 animate-slide-up">
          {filtered.length > 0 ? (
            <div className="flex flex-col gap-0.5">
              {filtered.map((e) => {
                const sellerName = e.nickname || e.fullName;
                const isSelected =
                  (sellerId && String(e.id) === String(sellerId)) ||
                  (!sellerId && String(exactEmployeeForValue?.id) === String(e.id));
                return (
                  <button
                    key={e.id}
                    type="button"
                    onClick={() => {
                      onChange(sellerName);
                      if (onSelectSeller) {
                        onSelectSeller({ name: sellerName, id: e.id ? String(e.id) : undefined });
                      }
                      setFilterText(sellerName);
                      setIsOpen(false);
                    }}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-xl transition-all text-left w-full ${
                      isSelected
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 font-bold'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    <span className="text-xs font-bold truncate">{e.fullName}</span>
                    {isSelected && (
                      <i className="bi bi-check-lg text-emerald-600 dark:text-emerald-400 text-base ml-2 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="p-4 text-center">
              <span className="text-xs font-medium text-slate-400 block mb-1">
                Nenhum vendedor encontrado
              </span>
            </div>
          )}

          {onAddNewSeller && (
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onAddNewSeller();
              }}
              className="flex items-center justify-center gap-2 w-full p-2.5 mt-1 border-t border-slate-100 dark:border-slate-800 text-xs font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-xl transition-all"
            >
              <i className="bi bi-plus-circle-fill text-sm" />
              <span>Cadastrar Novo Vendedor</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
export default SellerInput;
