import { useEffect, useMemo, useRef, useState } from 'react';
import type { Product } from '@/pages/types/product.type';
import type { Person } from '../../../../types/person.type';
import { normalizeProductSupplierIds } from '../../../../../../../shared-utils/productSupplierIds';
import { resolveProductSupplierPricingDefaults } from '../../../../../../../shared-utils/productSupplierPricingDefaults';
import {
  getProductSupplierDisplayName,
  matchesProductSupplierSearch,
} from '../../../../../../../shared-utils/productSupplierDisplayName';
import {
  getProductSupplierStockOrigin,
  supplierProvidesStockOrigin,
} from '../../../../../../../shared-utils/productSupplierStockOrigin';
import DropdownPortal from '@/components/shared/DropdownPortal';
import PersonFormModal from '../../../Registrations/shared/modals/PersonFormModal';

interface ProductSupplierFieldProps {
  readonly formData: Partial<Product>;
  readonly suppliers: readonly Person[];
  readonly onChange: (fields: Partial<Product>) => void;
  readonly hasError?: boolean;
}

const MAX_SUPPLIERS = 3;

export function ProductSupplierField({
  formData,
  suppliers,
  onChange,
  hasError = false,
}: ProductSupplierFieldProps) {
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isPersonFormOpen, setIsPersonFormOpen] = useState(false);
  const [extraSuppliers, setExtraSuppliers] = useState<Person[]>([]);
  const anchorRef = useRef<HTMLDivElement>(null);
  const requiredStockOrigin = getProductSupplierStockOrigin(formData.productKind);

  // Fechar dropdown ao pressionar Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const allSuppliers = useMemo(() => {
    const map = new Map<string, Person>();
    (suppliers || []).forEach((s) => {
      if (s && s.id) map.set(String(s.id), s);
    });
    extraSuppliers.forEach((s) => {
      if (s && s.id) map.set(String(s.id), s);
    });
    return Array.from(map.values());
  }, [suppliers, extraSuppliers]);

  const selectedIds = useMemo(() => {
    return normalizeProductSupplierIds(
      formData.supplierIds,
      formData.mainSupplierId,
      formData.supplierId
    );
  }, [formData.supplierIds, formData.mainSupplierId, formData.supplierId]);

  const visibleSuppliers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (query.length < 2) return [];
    return allSuppliers.filter((supplier) => {
      const sid = String(supplier.id || '');
      if (selectedIds.includes(sid)) return false;
      if (!supplierProvidesStockOrigin(supplier.stockOrigins, requiredStockOrigin)) return false;
      return matchesProductSupplierSearch(supplier, query);
    });
  }, [allSuppliers, selectedIds, requiredStockOrigin, search]);

  const addSupplier = (supplier: Person) => {
    if (!supplier || !supplier.id) return;
    if (!supplierProvidesStockOrigin(supplier.stockOrigins, requiredStockOrigin)) return;
    const sid = String(supplier.id);
    if (selectedIds.includes(sid) || selectedIds.length >= MAX_SUPPLIERS) return;

    setExtraSuppliers((prev) => {
      if (prev.some((s) => String(s.id) === sid)) return prev;
      return [...prev, supplier];
    });

    const supplierIds = [...selectedIds, sid];
    onChange({
      supplierIds,
      mainSupplierId: supplierIds[0],
      supplierId: supplierIds[0],
      ...resolveProductSupplierPricingDefaults(formData, supplier),
    });

    setSearch('');
    setIsOpen(false);
  };

  const removeSupplier = (supplierId: string) => {
    const sid = String(supplierId);
    const supplierIds = selectedIds.filter((id) => id !== sid);
    onChange({
      supplierIds,
      mainSupplierId: supplierIds[0] || '',
      supplierId: supplierIds[0] || '',
    });
  };

  return (
    <div
      id="field-main-supplier"
      className="relative flex flex-col gap-2 rounded-2xl p-2 md:col-span-2"
      ref={anchorRef}
    >
      <label
        className={`flex h-6 items-center justify-between text-[10px] font-black uppercase tracking-widest ${hasError ? 'text-red-500 dark:text-red-400' : 'text-slate-400'}`}
      >
        <span>
          Fornecedores{' '}
          <span className="text-red-500" aria-hidden="true">
            *
          </span>
        </span>
        <button
          type="button"
          onClick={() => setIsPersonFormOpen(true)}
          className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-blue-600 hover:underline cursor-pointer"
        >
          <i className="bi bi-plus-lg" aria-hidden="true" /> Novo
        </button>
      </label>

      <div className="relative">
        <i
          className="bi bi-search absolute left-2 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none"
          aria-hidden="true"
        />
        <input
          type="text"
          role="combobox"
          aria-expanded={isOpen && visibleSuppliers.length > 0}
          aria-autocomplete="list"
          aria-haspopup="listbox"
          aria-invalid={hasError}
          aria-label="Buscar fornecedor por nome ou razão social"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Digite 2 ou mais letras para buscar fornecedor..."
          className={`w-full bg-transparent border-b-2 border-t-0 border-x-0 py-2.5 pl-8 pr-4 text-xs font-bold outline-none transition-all dark:text-slate-200 ${
            hasError
              ? 'border-red-500 text-red-600 focus:border-red-600'
              : 'border-slate-200 focus:border-blue-600 dark:focus:border-blue-400 dark:border-slate-800'
          }`}
        />
      </div>

      {hasError && (
        <span role="alert" className="text-[9px] font-bold text-red-500">
          Adicione ao menos um fornecedor.
        </span>
      )}

      <DropdownPortal anchorRef={anchorRef} isOpen={isOpen && visibleSuppliers.length > 0}>
        <div
          role="listbox"
          aria-label="Sugestões de fornecedores"
          className="mt-2 max-h-60 overflow-y-auto rounded-xl border border-slate-100 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900"
        >
          {visibleSuppliers.map((supplier) => {
            const name = getProductSupplierDisplayName(supplier) || 'Fornecedor sem nome';
            return (
              <button
                key={supplier.id}
                type="button"
                role="option"
                aria-selected="false"
                onClick={() => addSupplier(supplier)}
                className="w-full border-b border-slate-50 p-3 text-left text-xs font-black text-slate-800 hover:bg-slate-50 last:border-0 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800 cursor-pointer"
              >
                {name}
              </button>
            );
          })}
        </div>
      </DropdownPortal>

      {selectedIds.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-1" aria-label="Fornecedores vinculados">
          {selectedIds.map((id) => {
            const supplier = allSuppliers.find((item) => String(item.id) === String(id));
            const name = getProductSupplierDisplayName(supplier) || 'Fornecedor';
            return (
              <span
                key={id}
                className="flex items-center gap-2 rounded-lg bg-blue-50 px-2.5 py-1.5 text-[10px] font-black text-blue-700 dark:bg-blue-900/20 dark:text-blue-300"
              >
                {name}
                <button
                  type="button"
                  onClick={() => removeSupplier(id)}
                  className="text-blue-500 hover:text-red-500 cursor-pointer"
                  aria-label={`Remover fornecedor ${name}`}
                  title="Remover fornecedor"
                >
                  <i className="bi bi-x-lg" aria-hidden="true" />
                </button>
              </span>
            );
          })}
          <span className="self-center text-[9px] font-bold text-slate-400">
            {selectedIds.length}/{MAX_SUPPLIERS}
          </span>
        </div>
      )}

      {isPersonFormOpen && (
        <PersonFormModal
          isOpen={isPersonFormOpen}
          onClose={() => setIsPersonFormOpen(false)}
          onSuccess={(createdPerson) => {
            if (createdPerson && createdPerson.id) {
              addSupplier(createdPerson);
            }
            setIsPersonFormOpen(false);
          }}
          collectionName="suppliers"
          title="Novo Fornecedor"
        />
      )}
    </div>
  );
}
