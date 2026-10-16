import React from 'react';
import CustomerData from '@/pages/types/customerData.type';
import { ValidationErrors } from '@/pages/utils/validations';
import PersonFormModal from '@/pages/App/Registrations/shared/modals/PersonFormModal';
import { useCustomerSelection } from './customer/useCustomerSelection';
import CustomerSearchDropdown from './customer/CustomerSearchDropdown';

interface Props {
  customerData: CustomerData;
  setCustomerData: React.Dispatch<React.SetStateAction<CustomerData>>;
  errors: ValidationErrors;
  isPickup: boolean;
  marketingOrigin?: string;
  setMarketingOrigin?: (origin: string) => void;
  isBudget?: boolean;
}

const CustomerDataInputs: React.FC<Props> = ({
  customerData,
  setCustomerData,
  errors,
  marketingOrigin,
  setMarketingOrigin,
}) => {
  const {
    wrapperRef,
    searchTerm,
    isOpen,
    setIsOpen,
    isNewCustomerOpen,
    setIsNewCustomerOpen,
    editingPerson,
    setEditingPerson,
    isFinalConsumer,
    isCustomerSelected,
    filteredCustomers,
    selectCustomer,
    clearCustomer,
    toggleFinalConsumer,
    handleEditCustomer,
    handleSearchInputChange,
    handleSearchInputKeyDown,
    handleNewCustomerSuccess,
    handleEditCustomerSuccess,
  } = useCustomerSelection({
    customerData,
    setCustomerData,
    marketingOrigin,
    setMarketingOrigin,
  });

  const hasError = !isFinalConsumer && Boolean(errors.customer_fullName || errors.customer_phone);

  return (
    <div ref={wrapperRef} className="relative w-full">
      <div className="mb-2 ml-1 flex flex-wrap items-center justify-between gap-3">
        <label
          className={`text-[10px] font-black uppercase tracking-widest ${hasError ? 'text-red-600 dark:text-red-400' : 'text-slate-400 dark:text-slate-500'}`}
        >
          Selecionar cliente <span className="text-red-500">*</span>
        </label>
        <div className="flex flex-wrap items-center justify-end gap-3">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Consumidor final?
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={isFinalConsumer}
              aria-label="Consumidor final"
              onClick={toggleFinalConsumer}
              className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 dark:focus:ring-offset-slate-900 ${
                isFinalConsumer
                  ? 'border-emerald-500 bg-emerald-500'
                  : 'border-slate-300 bg-slate-200 hover:bg-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:hover:bg-slate-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${isFinalConsumer ? 'translate-x-6' : 'translate-x-1'}`}
              />
            </button>
          </div>
          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              setIsNewCustomerOpen(true);
            }}
            className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-blue-600 transition-colors hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
          >
            <i className="bi bi-plus-lg" />
            Novo cliente
          </button>
        </div>
      </div>
      <div className="relative">
        {isCustomerSelected && (
          <div className="pointer-events-none absolute left-3 top-1/2 flex -translate-y-1/2 items-center text-emerald-600 dark:text-emerald-400 animate-fade-in">
            <i className="bi bi-check-circle-fill text-sm sm:text-base" />
          </div>
        )}
        <input
          type="text"
          disabled={isFinalConsumer}
          value={searchTerm}
          onKeyDown={handleSearchInputKeyDown}
          onChange={(e) => handleSearchInputChange(e.target.value)}
          onFocus={() => setIsOpen(Boolean(searchTerm.trim().length >= 2))}
          placeholder="Busque pelo nome ou telefone..."
          className={`w-full border-b-2 bg-transparent py-3 pr-20 text-sm outline-none transition-all placeholder:text-slate-300 dark:placeholder:text-slate-700 ${
            isFinalConsumer
              ? 'cursor-not-allowed pl-9 border-slate-300 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300'
              : hasError
                ? 'pl-3 border-red-500 focus:border-red-600 text-red-700 dark:text-red-300'
                : isCustomerSelected
                  ? 'pl-9 border-emerald-500 focus:border-emerald-600 dark:border-emerald-500 dark:focus:border-emerald-400 font-medium text-slate-800 dark:text-slate-100'
                  : 'pl-3 border-slate-200 focus:border-blue-600 dark:border-slate-700 dark:text-slate-300 dark:focus:border-blue-500'
          }`}
        />
        <div className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-2.5">
          {!isFinalConsumer && Boolean(customerData.id || customerData.fullName) && (
            <button
              type="button"
              onClick={handleEditCustomer}
              className="text-slate-400 transition-colors hover:text-blue-600 dark:hover:text-blue-400"
              title="Editar cliente selecionado"
            >
              <i className="bi bi-pencil-fill text-xs" />
            </button>
          )}
          {!isFinalConsumer && searchTerm && (
            <button
              type="button"
              onClick={clearCustomer}
              className="text-slate-400 transition-colors hover:text-slate-700 dark:hover:text-slate-200"
              title="Limpar cliente"
            >
              <i className="bi bi-x-circle-fill" />
            </button>
          )}
          {!isFinalConsumer && (
            <i
              className={`bi bi-chevron-down text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            />
          )}
        </div>
      </div>

      {hasError && (
        <p className="mt-2 text-xs font-bold text-red-500">
          {errors.customer_fullName || errors.customer_phone}
        </p>
      )}

      <CustomerSearchDropdown
        anchorRef={wrapperRef}
        isOpen={isOpen}
        filteredCustomers={filteredCustomers}
        selectedCustomerId={customerData.id}
        onSelectCustomer={selectCustomer}
      />

      <PersonFormModal
        isOpen={isNewCustomerOpen}
        onClose={() => setIsNewCustomerOpen(false)}
        onSuccess={handleNewCustomerSuccess}
        collectionName="customers"
        title="Cliente"
      />

      <PersonFormModal
        isOpen={Boolean(editingPerson)}
        onClose={() => setEditingPerson(null)}
        person={editingPerson}
        onSuccess={handleEditCustomerSuccess}
        collectionName="customers"
        title="Editar Cliente"
      />
    </div>
  );
};

export default CustomerDataInputs;
