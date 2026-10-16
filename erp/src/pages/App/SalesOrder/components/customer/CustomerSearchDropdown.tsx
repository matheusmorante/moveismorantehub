import React from 'react';
import DropdownPortal from '@/components/shared/DropdownPortal';
import Person from '@/pages/types/person.type';
import { toTitleCase } from '@/pages/utils/formatters';

interface CustomerSearchDropdownProps {
  anchorRef: React.RefObject<HTMLDivElement>;
  isOpen: boolean;
  filteredCustomers: Person[];
  selectedCustomerId?: string;
  onSelectCustomer: (customer: Person) => void;
}

export const CustomerSearchDropdown: React.FC<CustomerSearchDropdownProps> = ({
  anchorRef,
  isOpen,
  filteredCustomers,
  selectedCustomerId,
  onSelectCustomer,
}) => {
  return (
    <DropdownPortal anchorRef={anchorRef} isOpen={isOpen}>
      <div className="mt-1 border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
        {filteredCustomers.length === 0 ? (
          <p className="p-4 text-center text-sm text-slate-400">Nenhum cliente encontrado.</p>
        ) : (
          filteredCustomers.map((customer) => (
            <button
              key={customer.id}
              type="button"
              onClick={() => onSelectCustomer(customer)}
              className="flex w-full items-center gap-4 border-b border-slate-100 px-3 py-2.5 text-left transition-colors last:border-0 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800"
            >
              <strong className="min-w-0 flex-1 truncate text-sm text-slate-800 dark:text-slate-200">
                {toTitleCase(customer.fullName || customer.tradeName)}
              </strong>
              {customer.phone && (
                <small className="shrink-0 text-xs text-slate-400">{customer.phone}</small>
              )}
              {customer.fullAddress?.street && (
                <small className="min-w-0 max-w-[40%] truncate text-xs text-slate-400">
                  {toTitleCase(customer.fullAddress.street)}
                  {customer.fullAddress.number ? `, ${customer.fullAddress.number}` : ''}
                </small>
              )}
              {selectedCustomerId === customer.id && (
                <i className="bi bi-check-lg shrink-0 text-blue-600" />
              )}
            </button>
          ))
        )}
      </div>
    </DropdownPortal>
  );
};

export default CustomerSearchDropdown;
